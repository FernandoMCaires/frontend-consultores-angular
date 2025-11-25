const http = require('http');
const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, 'dist', 'consultores-front', 'browser');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const port = process.env.PORT || 8080;

function sanitizeUrl(urlPath) {
  const decoded = decodeURI(urlPath.split('?')[0]);
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  return normalized.replace(/^[/\\]/, '');
}

function serveFile(res, filePath, statusCode = 200) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  const stream = fs.createReadStream(filePath);
  stream.on('open', () => {
    res.writeHead(statusCode, { 'Content-Type': contentType });
    stream.pipe(res);
  });
  stream.on('error', () => {
    res.writeHead(500);
    res.end('Internal Server Error');
  });
}

const server = http.createServer((req, res) => {
  const safePath = sanitizeUrl(req.url);
  let filePath = path.join(distPath, safePath);

  // Serve index.html for the root or directory-like paths
  if (!safePath || safePath.endsWith(path.sep)) {
    filePath = path.join(distPath, safePath, 'index.html');
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      serveFile(res, filePath);
      return;
    }

    // Fallback to index.html for Angular routes
    const fallback = path.join(distPath, 'index.html');
    fs.stat(fallback, (fallbackErr, fallbackStats) => {
      if (!fallbackErr && fallbackStats.isFile()) {
        serveFile(res, fallback);
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });
  });
});

server.listen(port, () => {
  console.log(`Servidor Angular estático ouvindo na porta ${port}`);
});
