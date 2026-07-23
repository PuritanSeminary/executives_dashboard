// GET /api/snapshot — serves the cached dashboard snapshot from private Blob.
// Storage credentials live only in SWA app settings; the browser never sees them.
const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');

app.http('snapshot', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'snapshot',
  handler: async (request, context) => {
    try {
      const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
      if (!conn) return { status: 500, jsonBody: { error: 'storage not configured' } };
      const container = process.env.AZURE_STORAGE_CONTAINER || 'dashboard';
      const blobName = process.env.SNAPSHOT_BLOB || 'snapshot.json';

      const svc = BlobServiceClient.fromConnectionString(conn);
      const blob = svc.getContainerClient(container).getBlockBlobClient(blobName);
      const buf = await blob.downloadToBuffer();

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          // Nightly data — a few minutes of edge/browser caching is fine.
          'Cache-Control': 'public, max-age=300',
        },
        body: buf,
      };
    } catch (err) {
      context.error('snapshot read failed', err);
      // Frontend treats a non-200 as "no live data" and falls back to mock.
      return { status: 502, jsonBody: { error: 'snapshot unavailable' } };
    }
  },
});
