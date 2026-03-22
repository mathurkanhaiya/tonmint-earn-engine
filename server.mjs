import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const distDir = join(__dirname, 'dist');
const PORT = parseInt(process.env.PORT || '5000');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
};

const server = createServer(async (req, res) => {
  try {
    const urlPath = req.url.split('?')[0];
    let filePath = join(distDir, urlPath === '/' ? 'index.html' : urlPath);

    try {
      const s = await stat(filePath);
      if (s.isDirectory()) filePath = join(filePath, 'index.html');
    } catch {
      // Not found — SPA fallback to index.html
      filePath = join(distDir, 'index.html');
    }

    const ext = extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    const content = await readFile(filePath);
    const isHtml = ext === '.html' || !ext;

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': isHtml ? 'no-cache, no-store, must-revalidate' : 'public, max-age=31536000, immutable',
    });
    res.end(content);
  } catch (err) {
    console.error('Server error:', err);
    res.writeHead(500);
    res.end('Internal server error');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`TonMint running on port ${PORT}`);
});
