// lib/blob.mjs — upload the snapshot to Azure Blob (private container).
// The SWA /api/snapshot function reads it back server-side, so the blob stays
// private and no storage credentials ever reach the browser.
import { BlobServiceClient } from '@azure/storage-blob';

const CONTAINER = process.env.AZURE_STORAGE_CONTAINER || 'dashboard';
const BLOB = process.env.SNAPSHOT_BLOB || 'snapshot.json';

export async function uploadSnapshot(snapshot) {
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!conn) throw new Error('AZURE_STORAGE_CONNECTION_STRING not set');
  const svc = BlobServiceClient.fromConnectionString(conn);
  const container = svc.getContainerClient(CONTAINER);
  await container.createIfNotExists(); // private by default
  const body = JSON.stringify(snapshot);
  const bytes = Buffer.byteLength(body);
  await container.getBlockBlobClient(BLOB).upload(body, bytes, {
    blobHTTPHeaders: { blobContentType: 'application/json' },
  });
  return { container: CONTAINER, blob: BLOB, bytes };
}
