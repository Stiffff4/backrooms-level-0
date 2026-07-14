import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import process from 'node:process';
import { URL } from 'node:url';
import { createGzip } from 'node:zlib';

const MIME_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
]);
const COMPRESSIBLE_EXTENSIONS = new Set(['.css', '.html', '.js', '.json', '.md', '.svg', '.txt']);
const HASHED_ASSET_PATTERN = /\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\.[A-Za-z0-9]+$/;
const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy':
    "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; img-src 'self' data:; media-src 'self'; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; worker-src 'self'",
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
});

function readArgument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

function normalizeBase(value) {
  if (!value || value === '/') return '/';
  return `/${value.replace(/^\/+|\/+$/g, '')}/`;
}

function writeHeaders(response, headers = {}) {
  for (const [name, value] of Object.entries({ ...SECURITY_HEADERS, ...headers })) {
    response.setHeader(name, value);
  }
}

const root = resolve(readArgument('--root', 'dist'));
const host = readArgument('--host', '127.0.0.1');
const port = Number(readArgument('--port', '4174'));
const base = normalizeBase(readArgument('--base', '/'));

if (!existsSync(root) || !statSync(root).isDirectory()) {
  throw new Error(`Static build directory does not exist: ${root}`);
}
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error(`Invalid port: ${String(port)}`);
}

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? host}`);
  const pathname = decodeURIComponent(requestUrl.pathname);
  const baseWithoutTrailingSlash = base === '/' ? '/' : base.slice(0, -1);
  if (base !== '/' && pathname === baseWithoutTrailingSlash) {
    writeHeaders(response, { Location: base, 'Cache-Control': 'no-store' });
    response.writeHead(308).end();
    return;
  }
  if (!pathname.startsWith(base)) {
    writeHeaders(response, { 'Cache-Control': 'no-store' });
    response.writeHead(404).end('Not found');
    return;
  }

  const relativeUrl = pathname.slice(base.length).replace(/^\/+/, '') || 'index.html';
  const filePath = resolve(root, relativeUrl);
  if (
    !filePath.startsWith(`${root}${sep}`) ||
    !existsSync(filePath) ||
    !statSync(filePath).isFile()
  ) {
    writeHeaders(response, { 'Cache-Control': 'no-store' });
    response.writeHead(404).end('Not found');
    return;
  }

  const extension = extname(filePath).toLowerCase();
  const cacheControl =
    relativeUrl === 'index.html'
      ? 'no-cache, no-store, must-revalidate'
      : HASHED_ASSET_PATTERN.test(pathname)
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=3600';
  const acceptsGzip = /(?:^|,)\s*gzip\s*(?:,|$)/i.test(request.headers['accept-encoding'] ?? '');
  const compress = acceptsGzip && COMPRESSIBLE_EXTENSIONS.has(extension);
  writeHeaders(response, {
    'Cache-Control': cacheControl,
    'Content-Type': MIME_TYPES.get(extension) ?? 'application/octet-stream',
    ...(compress ? { 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' } : {}),
  });
  response.writeHead(200);
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  const source = createReadStream(filePath);
  source.on('error', () => response.destroy());
  if (compress) source.pipe(createGzip({ level: 9 })).pipe(response);
  else source.pipe(response);
});

server.listen(port, host, () => {
  process.stdout.write(`THRESHOLD static build: http://${host}:${port}${base}\n`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => server.close(() => process.exit(0)));
}
