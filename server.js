/**
 * Local Static Web Server (Zero-Dependency) — Út Út (utut.vn)
 * Chạy ngay lập tức bằng lệnh: node server.js
 * Không cần cài đặt bất kỳ thư viện hay package bên ngoài nào.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.mjs': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.csv': 'text/csv; charset=UTF-8',
  '.txt': 'text/plain; charset=UTF-8'
};

function startServer(port) {
  const srv = http.createServer((req, res) => {
    // Loại bỏ query string và hash
    const urlPath = req.url.split('?')[0].split('#')[0];
    let safePath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');

    if (safePath === '/' || safePath === '\\') {
      safePath = '/index.html';
    }

    let filePath = path.join(ROOT_DIR, safePath);

    // Nếu là thư mục, thử tìm index.html bên trong
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        // 404 Not Found
        res.writeHead(404, { 'Content-Type': 'text/html; charset=UTF-8' });
        res.end(`
          <!DOCTYPE html>
          <html lang="vi">
          <head><meta charset="UTF-8"><title>404 — Không tìm thấy</title></head>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h2>404 — Không tìm thấy trang</h2>
            <p>Đường dẫn <code>${safePath}</code> không tồn tại trên hệ thống.</p>
            <a href="/index.html">Quay về Trang Chủ Út Út</a>
          </body>
          </html>
        `);
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });

      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);
    });
  });

  srv.listen(port, () => {
    console.log('====================================================');
    console.log(`🌾 TIỆM ĐẶC SẢN MIỀN TÂY ÚT ÚT ĐANG CHẠY TẠI:`);
    console.log(`👉 http://localhost:${port}/index.html`);
    console.log(`👉 Trang Quản Trị: http://localhost:${port}/admin/login.html`);
    console.log('====================================================');
    console.log('Nhấn Ctrl + C để dừng máy chủ bất cứ lúc nào.');
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️ Cổng ${port} đang bận, tự động chuyển sang cổng ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Lỗi khởi động máy chủ:', err);
    }
  });
}

startServer(PORT);
