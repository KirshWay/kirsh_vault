import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

import { PRODUCTION_BASE_PATH } from '../lib/config/site.mjs';

const root = resolve('out');
await stat(resolve(root, 'index.html'));
const contentTypes = {
  '.html': 'text/html',
  '.txt': 'text/plain',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

// Test fixture: serve the production export under the same base path as GitHub Pages.
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname === PRODUCTION_BASE_PATH) {
      response.writeHead(301, { Location: `${PRODUCTION_BASE_PATH}/` }).end();
      return;
    }
    if (!pathname.startsWith(`${PRODUCTION_BASE_PATH}/`)) {
      response.writeHead(404).end();
      return;
    }
    const relative = pathname.slice(PRODUCTION_BASE_PATH.length + 1);
    const path = resolve(root, relative || 'index.html');
    if (!path.startsWith(`${root}${sep}`)) {
      response.writeHead(404).end();
      return;
    }
    let file = path;
    let details;
    try {
      details = await stat(file);
    } catch {
      file = `${path}.html`;
      details = await stat(file);
    }
    if (!details.isFile()) {
      file = resolve(file, 'index.html');
      await stat(file);
    }
    response.writeHead(200, {
      'Content-Type': contentTypes[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    if (request.method === 'HEAD') response.end();
    else createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404).end();
  }
}).listen(4173, 'localhost');
