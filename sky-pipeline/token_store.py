"""
Refresh-token store backed by Azure Blob Storage.

The SKY refresh token ROTATES on every refresh: each successful refresh returns a
brand-new refresh token and invalidates the old one. Losing a rotated token (or
overwriting a newer one with a stale one) breaks the pipeline until a human
re-runs the one-time consent bootstrap. So writes use OPTIMISTIC CONCURRENCY:

    read()          -> (refresh_token, etag)     # capture the blob's ETag
    ... refresh against SKY, get a new refresh_token ...
    write_rotated(new_token, etag)               # If-Match: etag  -> 412 if it moved

If another run rotated the token in between, the ETag no longer matches, the write
fails with 412, and we raise TokenRotationConflict instead of clobbering the newer
token. The caller MUST abort the run on that exception (do not proceed to query).

The token blob is seeded once by the consent bootstrap (see README) and lives ONLY
here in Blob Storage — never in git, never in Application Settings (which would go
stale on the first rotation).
"""

import logging

from azure.core import MatchConditions
from azure.core.exceptions import ResourceModifiedError, ResourceNotFoundError
from azure.storage.blob import BlobClient

log = logging.getLogger(__name__)


class TokenRotationConflict(Exception):
    """The refresh-token blob changed between read and write (ETag mismatch / HTTP 412)."""


class TokenStoreNotSeeded(Exception):
    """The refresh-token blob does not exist or is empty; run the consent bootstrap."""


class TokenStore:
    """Reads and rotates the SKY refresh token in a single Blob blob."""

    def __init__(self, connection_string: str, container: str, blob_name: str):
        self._blob: BlobClient = BlobClient.from_connection_string(
            connection_string, container_name=container, blob_name=blob_name
        )

    def read(self) -> tuple[str, str]:
        """
        Return (refresh_token, etag). The ETag must be passed back to
        write_rotated() to guard the rotation.

        Raises TokenStoreNotSeeded if the blob is missing or empty.
        """
        try:
            downloader = self._blob.download_blob(encoding="utf-8")
        except ResourceNotFoundError as e:
            raise TokenStoreNotSeeded(
                f"Refresh-token blob '{self._blob.blob_name}' not found in container "
                f"'{self._blob.container_name}'. Seed it once via the consent bootstrap."
            ) from e

        etag = downloader.properties.etag
        token = (downloader.readall() or "").strip()
        if not token:
            raise TokenStoreNotSeeded(
                f"Refresh-token blob '{self._blob.blob_name}' is empty. Re-seed it."
            )
        log.info("Read refresh token (etag=%s)", etag)
        return token, etag

    def write_rotated(self, new_token: str, etag: str) -> None:
        """
        Overwrite the token ONLY if the blob still carries `etag`. Sends
        If-Match: <etag> so a concurrent rotation cannot be clobbered.

        Raises TokenRotationConflict on ETag mismatch (HTTP 412). The caller
        must abort the run without querying when this is raised.
        """
        new_token = (new_token or "").strip()
        if not new_token:
            raise ValueError("Refusing to write an empty rotated refresh token.")
        try:
            self._blob.upload_blob(
                new_token.encode("utf-8"),
                overwrite=True,
                etag=etag,
                match_condition=MatchConditions.IfNotModified,
            )
        except ResourceModifiedError as e:
            raise TokenRotationConflict(
                "Refresh-token blob was modified by another run since it was read "
                f"(expected etag={etag}); aborting to avoid clobbering the newer token."
            ) from e
        log.info("Rotated refresh token written back (If-Match on etag=%s)", etag)
