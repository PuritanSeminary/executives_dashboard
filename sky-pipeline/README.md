# SKY → Blob financial pipeline (v1)

Timer-triggered Azure Function (Python, Consumption) that pulls **Financial Edge
query 71 (Transactions)** from the Blackbaud SKY API, transforms it into the v1
figures the dashboard's Financial tab shows (**YTD revenue by category, total YTD
expense, net**), and writes the result as JSON to Blob Storage. The Static Web
App's `GET /api/financial` serves that JSON to the frontend.

**v1 scope:** revenue-by-category, total expense, and net only. Budget (72),
grants (74), projects (73), prior-year, and MTD stay on `src/data.js` mock values.

## Files

| File | Role |
|---|---|
| `function_app.py` | Timer trigger; orchestrates the token-rotation-safe sequence. |
| `token_store.py`  | Reads/writes the rotating refresh token in Blob with `If-Match` (ETag) concurrency. |
| `sky_client.py`   | SKY OAuth refresh + query-71 async job execution. |
| `transform.py`    | Prefix-rule Account Type, dept-code string join, runtime Aug-1 YTD window. |
| `host.json`, `requirements.txt` | Functions host config + deps. |
| `local.settings.json.example` | Template for local settings (copy to `local.settings.json`, git-ignored). |

## The token-rotation contract (critical)

The SKY refresh token **rotates on every refresh** — each refresh returns a new
one and invalidates the old. The pipeline therefore, in this exact order:

1. reads the refresh token from Blob, capturing its **ETag**;
2. refreshes against SKY → new access token + rotated refresh token;
3. writes the rotated token back **with `If-Match: <etag>`** — if another run
   already rotated it, the write fails with **412** and the run **aborts before
   any query** (`TokenRotationConflict`), so a stale run never proceeds;
4. only then runs query 71, transforms, and writes the cache.

The refresh token lives **only** in Blob — never in git, never in Application
Settings (which would go stale on the first rotation).

## Azure resources

1. **Storage account** (StorageV2, LRS). Create two private containers:
   - `secrets` — holds the rotating refresh token blob.
   - `cache` — holds `financial.json` (what the site serves).
2. **Function App** — Python 3.11, **Consumption (Y1)**, Linux (own runtime storage).
3. **Application Settings** on the Function App (see below).
4. **Static Web App** — one app setting so `GET /api/financial` can read `cache/`.

### Function App — Application Settings

| Setting | Value / example |
|---|---|
| `SKY_CLIENT_ID` | (from the SKY app registration) |
| `SKY_CLIENT_SECRET` | (secret) |
| `SKY_SUBSCRIPTION_KEY` | (Bb-Api-Subscription-Key) |
| `BLOB_CONNECTION_STRING` | connection string to the storage account |
| `TOKEN_CONTAINER` | `secrets` |
| `TOKEN_BLOB` | `sky-refresh-token.txt` |
| `CACHE_CONTAINER` | `cache` |
| `CACHE_BLOB` | `financial.json` |
| `QUERY_ID_TRANSACTIONS` | `71` |
| `SKY_SCHEDULE_CRON` | `0 30 6 * * *` (NCRONTAB — 06:30 UTC daily) |

Prefer **Key Vault references** for the three `SKY_*` secrets and the connection
string, with a managed identity on the Function App.

### Static Web App — Application Settings

| Setting | Value |
|---|---|
| `BLOB_CONNECTION_STRING` | read access to the storage account (or a read-only SAS) |
| `CACHE_CONTAINER` | `cache` |
| `CACHE_BLOB` | `financial.json` |

## One-time consent bootstrap (seed the first refresh token)

The first refresh token is minted by a human via the authorization-code flow,
then uploaded to Blob once. It is self-sustaining after that.

1. Run the existing consent script locally **as the SKY service user**:
   ```
   python sky_source/sky_consent.py
   ```
   Log in, approve access, copy the printed **REFRESH TOKEN**.
2. Upload it to the `secrets` container as `sky-refresh-token.txt` (single line,
   no trailing newline). For example, with Azure CLI:
   ```
   printf '%s' "<REFRESH_TOKEN>" > token.txt
   az storage blob upload --account-name <acct> --container-name secrets \
     --name sky-refresh-token.txt --file token.txt --overwrite
   rm token.txt
   ```
   > The token file is git-ignored and must never be committed. From here on the
   > pipeline reads and rotates this blob automatically.

If the token is ever revoked/expired the pipeline fails with
`TokenStoreNotSeeded` / a token-refresh error — re-run this bootstrap to re-seed.

## Local run

```
cp local.settings.json.example local.settings.json   # fill in real values
pip install -r requirements.txt
func start                                            # Azure Functions Core Tools
```
`run_pipeline()` in `function_app.py` is importable, so you can also invoke it
directly to compare its output against the Power BI report before going live.

## Deploy

```
# from sky-pipeline/
func azure functionapp publish <function-app-name>
```
The Static Web App's read API (`/api`) deploys automatically via the existing
GitHub Actions workflow on push to `main`.

## Validation before go-live

Run the pipeline once and compare `financial.json`
(`revenue.by_category`, `revenue.ytd_actual`, `expense.ytd_actual`,
`net.ytd_actual`) against the Power BI **Financial Dashboard** YTD figures. The
SKY API is the source of truth; the numbers should match Power BI because both
apply the same account-prefix and department-category logic.
