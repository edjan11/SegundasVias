console.log('simple-static-server: starting');
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 5000;
const publicDir = path.join(process.cwd(), 'public');
const layoutPath = path.join(process.cwd(), 'ui', 'pages', 'Base2ViaLayout.html');

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg': case '.jpeg': return 'image/jpeg';
    case '.svg': return 'image/svg+xml';
    default: return 'application/octet-stream';
  }
}

const server = http.createServer((req, res) => {
  try {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    if (reqPath === '/' || reqPath.startsWith('/2via/')) {
      res.writeHead(200, { 'Content-Type': getContentType(layoutPath) });
      return fs.createReadStream(layoutPath).pipe(res);
    }
    // Normalize to a relative path (remove leading slash) to avoid path.join treating it as absolute
    const relPath = reqPath.replace(/^\\|^\//, '');
    const filePath = path.join(publicDir, relPath);

    if (!filePath.startsWith(publicDir)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    fs.stat(filePath, (err, stats) => {
      if (!err && stats && stats.isFile()) {
        res.writeHead(200, { 'Content-Type': getContentType(filePath) });
        return fs.createReadStream(filePath).pipe(res);
      }

      // fallback: try serving from project root or ui folder (useful for dev env)
      const altPaths = [
        path.join(process.cwd(), reqPath),
        path.join(process.cwd(), 'ui', reqPath),
        path.join(process.cwd(), 'ui', 'pages', path.basename(reqPath)),
      ];

      for (const alt of altPaths) {
        if (alt.startsWith(publicDir)) continue; // already checked
        try {
          const st = fs.statSync(alt);
          if (st && st.isFile()) {
            res.writeHead(200, { 'Content-Type': getContentType(alt) });
            return fs.createReadStream(alt).pipe(res);
          }
        } catch (e) {
          // ignore and continue
        }
      }

      res.writeHead(404);
      return res.end('Not found');
    });
  } catch (e) {
    res.writeHead(500);
    res.end('Server error');
  }
});

const os = require('os');

server.listen(port, '127.0.0.1', () => {
  console.log(`Simple static server running on http://127.0.0.1:${port}/ serving ${publicDir}`);
  console.log('Network interfaces:', Object.keys(os.networkInterfaces()).join(', '));
});
