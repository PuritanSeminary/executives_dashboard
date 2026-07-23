"""
Timer-triggered SKY -> Blob pipeline (Azure Functions, Python v2 model).

Runs on a schedule (NCRONTAB in the SKY_SCHEDULE_CRON app setting) and executes
the token-rotation-safe sequence EXACTLY in this order:

    1. read refresh token from Blob, capturing its ETag
    2. refresh against SKY  -> new access token + ROTATED refresh token
    3. write the rotated refresh token back to Blob with If-Match on that ETag
       (a concurrent run that already rotated it -> 412 -> TokenRotationConflict
        -> ABORT before any query, so we never proceed on a token we failed to persist)
    4. run Financial Edge query 71 (Transactions)
    5. transform -> v1 financial payload
    6. write the payload to the cache blob the Static Web App API serves

Secrets come from Application Settings (never committed). The rotating refresh
token lives ONLY in Blob (never in settings, which would go stale on rotation).
"""

import csv
import datetime
import io
import json
import logging
import os

import azure.functions as func
from azure.storage.blob import BlobClient, ContentSettings

from sky_client import SkyError, refresh_access_token, run_query_csv
from token_store import TokenRotationConflict, TokenStore, TokenStoreNotSeeded
from transform import build_financial

log = logging.getLogger(__name__)

app = func.FunctionApp()


def _env(name: str, default: str | None = None) -> str:
    val = os.environ.get(name, default)
    if val is None or val == "":
        raise RuntimeError(f"Missing required application setting: {name}")
    return val


def run_pipeline(today: datetime.date | None = None) -> dict:
    """Execute the full pipeline once. Importable so it can be run/tested directly."""
    now = datetime.datetime.now(datetime.timezone.utc)
    today = today or now.date()

    client_id = _env("SKY_CLIENT_ID")
    client_secret = _env("SKY_CLIENT_SECRET")
    subscription_key = _env("SKY_SUBSCRIPTION_KEY")
    conn = _env("BLOB_CONNECTION_STRING")

    token_container = _env("TOKEN_CONTAINER", "secrets")
    token_blob = _env("TOKEN_BLOB", "sky-refresh-token.txt")
    cache_container = _env("CACHE_CONTAINER", "cache")
    cache_blob = _env("CACHE_BLOB", "financial.json")
    query_id = int(_env("QUERY_ID_TRANSACTIONS", "71"))

    store = TokenStore(conn, token_container, token_blob)

    # 1. read current refresh token + capture ETag
    refresh_token, etag = store.read()

    # 2. refresh against SKY (returns a rotated refresh token)
    tokens = refresh_access_token(client_id, client_secret, refresh_token)
    access_token = tokens["access_token"]
    new_refresh = tokens.get("refresh_token")

    # 3. persist the rotated token BEFORE querying. If another run beat us to it,
    #    write_rotated raises TokenRotationConflict and we abort here (no query).
    if new_refresh and new_refresh != refresh_token:
        store.write_rotated(new_refresh, etag)
    else:
        # SKY rotates on every refresh, so this is unexpected; keep the existing token.
        log.warning("No rotated refresh token returned by SKY; keeping the current token.")

    # 4. run Financial Edge query 71 (Transactions)
    csv_text = run_query_csv(query_id, access_token, subscription_key)

    # 5. transform -> v1 payload
    generated_at = now.isoformat(timespec="seconds")
    rows = csv.DictReader(io.StringIO(csv_text))
    payload = build_financial(rows, today, generated_at)

    # 6. write the cache blob the SWA API serves
    body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    cache = BlobClient.from_connection_string(conn, cache_container, cache_blob)
    cache.upload_blob(
        body,
        overwrite=True,
        content_settings=ContentSettings(
            content_type="application/json",
            cache_control="no-cache",
        ),
    )
    log.info("Wrote %s/%s (%d bytes)", cache_container, cache_blob, len(body))
    return payload


@app.timer_trigger(
    arg_name="timer",
    schedule="%SKY_SCHEDULE_CRON%",  # NCRONTAB lives in app settings, e.g. "0 30 6 * * *"
    run_on_startup=False,
    use_monitor=True,
)
def sky_pipeline_timer(timer: func.TimerRequest) -> None:
    if timer.past_due:
        log.warning("Timer is past due; running now.")
    try:
        run_pipeline()
        log.info("SKY pipeline completed successfully.")
    except TokenRotationConflict as e:
        # Another run rotated the token first. We aborted BEFORE querying; the newer
        # token is intact. Next scheduled run recovers. Re-raise so it shows as failed.
        log.error("Aborted (token rotation conflict), no query issued: %s", e)
        raise
    except TokenStoreNotSeeded as e:
        log.error("Refresh token not seeded — run the consent bootstrap: %s", e)
        raise
    except SkyError as e:
        log.error("SKY pipeline failed: %s", e)
        raise
