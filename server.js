// app.dubaivisaportal.ae — the client dashboard address. Every request is passed, unchanged, to the
// Dubai Visa Portal app running on this same server (same database, same login); the address stays
// app.dubaivisaportal.ae so the app shows the client dashboard.
'use strict';
const http = require('http');

const TARGET_HOST = process.env.TARGET_HOST || '127.0.0.1';
const TARGET_PORT = Number(process.env.TARGET_PORT || 3004);
const PORT = Number(process.env.PORT || 3000);
const PUBLIC_HOST = process.env.PUBLIC_HOST || 'app.dubaivisaportal.ae';

const server = http.createServer((req, res) => {
  const headers = { ...req.headers };
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || PUBLIC_HOST).split(',')[0].trim();
  headers.host = host;
  headers['x-forwarded-host'] = host;
  headers['x-forwarded-proto'] = String(req.headers['x-forwarded-proto'] || 'https');
  const ip = req.socket.remoteAddress || '';
  headers['x-forwarded-for'] = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'] + ', ' + ip : ip;

  const up = http.request({ host: TARGET_HOST, port: TARGET_PORT, method: req.method, path: req.url, headers }, (r) => {
    res.writeHead(r.statusCode || 502, r.rawHeaders.length ? pairs(r.rawHeaders) : r.headers);
    r.pipe(res);
  });
  up.setTimeout(120000, () => up.destroy(new Error('timeout')));
  up.on('error', () => {
    if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('The client dashboard is restarting. Please try again in a minute.');
  });
  req.pipe(up);
});

/** response headers as they came (keeps every Set-Cookie line) */
function pairs(raw) {
  const out = [];
  for (let i = 0; i < raw.length; i += 2) {
    const k = raw[i].toLowerCase();
    if (k === 'connection' || k === 'keep-alive' || k === 'transfer-encoding') continue;
    out.push(raw[i], raw[i + 1]);
  }
  return out;
}

server.keepAliveTimeout = 65000;
server.listen(PORT, process.env.HOST || '127.0.0.1', () => console.log('[app-gateway] port ' + PORT + ' -> ' + TARGET_HOST + ':' + TARGET_PORT));
