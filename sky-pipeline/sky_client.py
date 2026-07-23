"""
Blackbaud SKY API client — OAuth refresh + Financial Edge Query execution.

Ported verbatim in behavior from the working local scripts
(sky_source/sky_run_revenue.py, sky_list_queries.py). The ONLY change is that
secrets are passed in (from Application Settings / .env) instead of hardcoded,
and the refresh-token file I/O is handled by the caller via token_store.

Query execution is the async job pattern FE uses:
    POST /query/queries/executebyid   -> job id
    GET  /query/jobs/{id}             -> poll until Completed, get sas_uri
    GET  sas_uri                      -> CSV export
"""

import io
import logging
import time
from typing import Iterator

import requests

log = logging.getLogger(__name__)

TOKEN_URL = "https://oauth2.sky.blackbaud.com/token"
QUERY_BASE = "https://api.sky.blackbaud.com/query"
QUERY_PARAMS = {"product": "FE", "module": "GeneralLedger"}

# Job polling — matches the local script (5s interval, up to 60 tries = 5 min).
POLL_INTERVAL_SECONDS = 5
POLL_MAX_TRIES = 60


class SkyError(Exception):
    """Any non-recoverable failure talking to SKY."""


def refresh_access_token(client_id: str, client_secret: str, refresh_token: str) -> dict:
    """
    Exchange the current refresh token for a new access token.

    Returns the full token response dict, which includes:
      - access_token   (bearer for query calls)
      - refresh_token   (ROTATED — the caller must persist this immediately)
      - expires_in
    Raises SkyError on failure (e.g. revoked/expired refresh token).
    """
    resp = requests.post(
        TOKEN_URL,
        auth=(client_id, client_secret),
        data={"grant_type": "refresh_token", "refresh_token": refresh_token},
        timeout=30,
    )
    if resp.status_code >= 400:
        # Do NOT log the response body — it can echo token material.
        raise SkyError(
            f"Token refresh failed ({resp.status_code}). The refresh token may be "
            f"expired or revoked; re-run the consent bootstrap to re-seed it."
        )
    tokens = resp.json()
    if not tokens.get("access_token"):
        raise SkyError("Token refresh returned no access_token.")
    log.info("Access token acquired (expires_in=%ss)", tokens.get("expires_in"))
    return tokens


def _headers(access_token: str, subscription_key: str) -> dict:
    return {
        "Authorization": f"Bearer {access_token}",
        "Bb-Api-Subscription-Key": subscription_key,
        "Content-Type": "application/json",
    }


def run_query_csv(query_id: int, access_token: str, subscription_key: str) -> str:
    """
    Execute a Financial Edge query by id and return the exported CSV as text.

    Uses the asynchronous job pattern: kick off the job, poll until it completes,
    then download the SAS-signed CSV export.
    """
    headers = _headers(access_token, subscription_key)

    log.info("Starting FE query %s (async job)...", query_id)
    start = requests.post(
        f"{QUERY_BASE}/queries/executebyid",
        headers=headers,
        params=QUERY_PARAMS,
        json={
            "id": query_id,
            "request": {
                "ux_mode": "Asynchronous",
                "formatting_options": {"show_formatted": True},
            },
        },
        timeout=60,
    )
    if start.status_code >= 400:
        raise SkyError(f"executebyid failed ({start.status_code}): {start.text[:400]}")
    job_id = start.json().get("id")
    if not job_id:
        raise SkyError("executebyid returned no job id.")

    job_info = None
    for attempt in range(POLL_MAX_TRIES):
        time.sleep(POLL_INTERVAL_SECONDS)
        st = requests.get(
            f"{QUERY_BASE}/jobs/{job_id}",
            headers=headers,
            params={**QUERY_PARAMS, "include_read_url": "OnceCompleted"},
            timeout=60,
        )
        if st.status_code >= 400:
            raise SkyError(f"job poll failed ({st.status_code}): {st.text[:400]}")
        job_info = st.json()
        status = job_info.get("status")
        if status == "Completed":
            break
        if status in ("Failed", "Error"):
            raise SkyError(f"query job {job_id} reported status {status}: {job_info}")
        log.info("query %s job %s status=%s (try %d/%d)",
                 query_id, job_id, status, attempt + 1, POLL_MAX_TRIES)
    else:
        raise SkyError(
            f"query {query_id} job {job_id} did not complete within "
            f"{POLL_INTERVAL_SECONDS * POLL_MAX_TRIES}s."
        )

    sas_uri = (job_info or {}).get("sas_uri")
    if not sas_uri:
        raise SkyError(f"query {query_id} completed but returned no sas_uri: {job_info}")

    log.info("Downloading query %s CSV export...", query_id)
    csv_resp = requests.get(sas_uri, timeout=300)
    if csv_resp.status_code >= 400:
        raise SkyError(f"CSV download failed ({csv_resp.status_code}).")
    return csv_resp.text


def iter_query_rows(query_id: int, access_token: str, subscription_key: str) -> Iterator[dict]:
    """Convenience: run a query and yield each row as a dict (csv.DictReader)."""
    import csv

    csv_text = run_query_csv(query_id, access_token, subscription_key)
    return csv.DictReader(io.StringIO(csv_text))
