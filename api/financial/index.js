// GET /api/financial
// Streams the cached financial JSON that the SKY timer pipeline writes to Blob
// Storage. Same-origin with the static site, so the frontend needs no CORS.
// Read-only: this function never writes, and never touches the refresh token.

const { BlobServiceClient, RestError } = require("@azure/storage-blob");

module.exports = async function (context, req) {
  const conn = process.env.BLOB_CONNECTION_STRING;
  const container = process.env.CACHE_CONTAINER || "cache";
  const blobName = process.env.CACHE_BLOB || "financial.json";

  if (!conn) {
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Storage connection not configured." }),
    };
    return;
  }

  try {
    const svc = BlobServiceClient.fromConnectionString(conn);
    const blob = svc.getContainerClient(container).getBlobClient(blobName);
    const buf = await blob.downloadToBuffer();
    context.res = {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Cache briefly at the edge; the pipeline refreshes on its own schedule.
        "Cache-Control": "public, max-age=300",
      },
      body: buf,
    };
  } catch (err) {
    const status = err instanceof RestError ? err.statusCode : undefined;
    if (status === 404) {
      // Cache not generated yet (pipeline hasn't run / token not seeded).
      context.res = {
        status: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Financial cache not available yet." }),
      };
    } else {
      context.log.error("financial read failed:", err && err.message);
      context.res = {
        status: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Failed to read financial cache." }),
      };
    }
  }
};
