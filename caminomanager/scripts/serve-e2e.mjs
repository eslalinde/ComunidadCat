import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Serve the same static export used by SWA/Electron, on a dedicated loopback port.
const root = fileURLToPath(new URL('../out/', import.meta.url));
await stat(resolve(root, 'index.html'));
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
};
const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method ?? '')) {
    response.writeHead(405).end();
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1:3100').pathname);
    const path = resolve(root, `.${pathname}`);
    if (path !== resolve(root) && !path.startsWith(resolve(root) + sep)) {
      response.writeHead(403).end();
      return;
    }
    const candidates = pathname.endsWith('/') ? [resolve(path, 'index.html')] : [path, `${path}.html`, resolve(path, 'index.html')];
    for (const candidate of candidates) {
      const info = await stat(candidate).catch(() => null);
      if (!info?.isFile()) continue;
      const body = await readFile(candidate);
      response.writeHead(200, { 'Content-Type': mime[extname(candidate)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
      response.end(request.method === 'HEAD' ? undefined : body);
      return;
    }
    response.writeHead(404).end();
  } catch {
    response.writeHead(400).end();
  }
});
server.listen(3100, '127.0.0.1', () => console.log('E2E static export: http://127.0.0.1:3100'));
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => { server.close(); server.closeAllConnections(); });
}
