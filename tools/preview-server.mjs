// preview-server.mjs — local preview of the dashboard with live data, no deps.
// Serves the repo statically and answers /api/snapshot from the local snapshot.json
// (tools/aggregate/snapshot.json), so you can review the hydrated dashboard exactly
// as production will render it, BEFORE pushing.
//
//   node tools\preview-server.mjs        # then open http://localhost:8787
//
// Regenerate the snapshot first with:
//   node tools\aggregate\index.mjs --only=academic --dry-run populi.key
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT = path.join(ROOT, 'tools', 'aggregate', 'snapshot.json');
const PORT = process.env.PORT || 8787;

const TYPES = {
  '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.jsx': 'application/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
};

http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);

  if (url === '/api/snapshot') {
    if (!fs.existsSync(SNAPSHOT)) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'no local snapshot.json — run the aggregator --dry-run first' }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(fs.readFileSync(SNAPSHOT));
  }

  // Static file serve, constrained to the repo root (no path traversal).
  const rel = url === '/' ? 'index.html' : url.replace(/^\/+/, '');
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end('not found');
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => {
  console.log(`PRTS dashboard preview → http://localhost:${PORT}`);
  console.log(`  /api/snapshot ← ${fs.existsSync(SNAPSHOT) ? SNAPSHOT : '(missing — run aggregator --dry-run)'}`);
});
