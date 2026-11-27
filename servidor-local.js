const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const signPhoto = require('./api/sign-photo');

const root = __dirname;
const port = Number(process.env.PORT) || 8000;
const host = '127.0.0.1';

function loadEnv(file) {
  if (!fs.existsSync(file)) return false;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (process.env[key] == null || process.env[key] === '') process.env[key] = value;
  }
  return true;
}

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2'
};

function sendJson(res, status, data, headers) {
  const body = JSON.stringify(data);
  res.writeHead(status, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, headers));
  res.end(body);
}

function adaptResponse(res) {
  const wrapped = {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(data) { sendJson(res, this.statusCode, data, this.headers); }
  };
  return wrapped;
}

function safeFile(urlPath) {
  let decoded;
  try { decoded = decodeURIComponent(urlPath.split('?')[0]); }
  catch { return null; }
  const resolved = path.resolve(root, `.${decoded}`);
  const relative = path.relative(root, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  if (path.basename(resolved) === '.env' || relative.split(path.sep).includes('.env')) return null;
  return resolved;
}

function serve(req, res, filePath) {
  fs.stat(filePath, (error, stat) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('File not found');
      return;
    }
    if (stat.isDirectory()) {
      serve(req, res, path.join(filePath, 'index.html'));
      return;
    }
    const type = mime[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    const range = req.headers.range;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      const start = match && match[1] !== '' ? Number(match[1]) : 0;
      const end = match && match[2] !== '' ? Number(match[2]) : stat.size - 1;
      if (!match || start > end || start >= stat.size) {
        res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
        res.end();
        return;
      }
      res.writeHead(206, {
        'Content-Type': type,
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes' });
    fs.createReadStream(filePath).pipe(res);
  });
}

loadEnv(path.join(root, '.env'));
const cloudinaryReady = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;
const printScript = path.join(root, 'imprimir-foto.ps1');
const maxImageBytes = 8 * 1024 * 1024;

function localOrigin(req) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.origin || '');
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limit) {
        const error = new Error('Payload too large');
        error.status = 413;
        reject(error);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function runPrintScript(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-File', printScript,
      ...args
    ], { windowsHide: true });
    let output = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('A impressao demorou demais.'));
    }, 60000);
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    child.on('error', error => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', code => {
      clearTimeout(timer);
      const text = output.trim();
      if (code === 0 && !text.startsWith('ERROR:')) resolve(text);
      else reject(new Error(text.replace(/^ERROR:/, '').trim() || 'Nao foi possivel imprimir.'));
    });
  });
}

function parsePrintOutput(text) {
  const printer = (/^PRINTER:(.*)$/m.exec(text) || [])[1] || '';
  const paper = (/^PAPER:(.*)$/m.exec(text) || [])[1] || '';
  return { printer: printer.trim(), paper: paper.trim() };
}

function printFailure(error) {
  const raw = error && error.message ? error.message : '';
  if (/foto para imprimir nao foi encontrada/i.test(raw)) return 'A foto não chegou inteira. Tire outra e toque em Imprimir de novo.';
  if (/Impressora nao encontrada/i.test(raw)) return 'A impressora configurada não foi encontrada. Veja o arquivo Como-imprimir.md.';
  if (/Nenhuma impressora/i.test(raw)) return 'Nenhuma impressora foi encontrada. Instale a Canon e siga o arquivo Como-imprimir.md.';
  if (/demorou demais/i.test(raw)) return 'A impressora não respondeu. Veja se a Canon está ligada.';
  return 'Não foi possível imprimir. Confira se a Canon está ligada e se o papel 10×15 está na bandeja de trás.';
}

async function printPhoto(req, res) {
  if (!localOrigin(req)) {
    sendJson(res, 403, { error: 'Origin not allowed' });
    return;
  }
  let body;
  try {
    body = await readBody(req, maxImageBytes + 64 * 1024);
  } catch (error) {
    sendJson(res, error.status || 400, { error: 'A foto é grande demais para imprimir.' });
    return;
  }
  let payload;
  try {
    payload = JSON.parse(body.toString('utf8'));
  } catch {
    sendJson(res, 400, { error: 'Pedido inválido.' });
    return;
  }
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/=\r\n]+)$/.exec(payload && payload.image || '');
  if (!match) {
    sendJson(res, 400, { error: 'A foto não está pronta para imprimir.' });
    return;
  }
  const image = Buffer.from(match[1], 'base64');
  if (image.length < 4 || image.length > maxImageBytes || image[0] !== 0xff || image[1] !== 0xd8) {
    sendJson(res, 400, { error: 'A foto não está pronta para imprimir.' });
    return;
  }
  const file = path.join(os.tmpdir(), `santoselfie-${crypto.randomBytes(8).toString('hex')}.jpg`);
  try {
    fs.writeFileSync(file, image);
    const args = ['-ImagePath', file];
    if (process.env.PRINTER_NAME) args.push('-PrinterName', process.env.PRINTER_NAME);
    const result = parsePrintOutput(await runPrintScript(args));
    console.log(`Foto enviada para ${result.printer || 'a impressora'}${result.paper ? ` (${result.paper})` : ''}`);
    sendJson(res, 200, { ok: true, printer: result.printer, paper: result.paper });
  } catch (error) {
    console.log(error.message);
    sendJson(res, 500, { error: printFailure(error) });
  } finally {
    fs.rm(file, { force: true }, () => {});
  }
}

const server = http.createServer((req, res) => {
  const pathname = (req.url || '/').split('?')[0];
  if (pathname === '/api/sign-photo') {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }
    req.on('error', () => sendJson(res, 400, { error: 'Bad request' }));
    Promise.resolve(signPhoto(req, adaptResponse(res))).catch(error => {
      console.error(error);
      if (!res.headersSent) sendJson(res, 500, { error: 'Internal error' });
    });
    return;
  }
  if (pathname === '/api/print') {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }
    printPhoto(req, res).catch(error => {
      console.error(error);
      if (!res.headersSent) sendJson(res, 500, { error: 'Não foi possível imprimir.' });
    });
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method not allowed');
    return;
  }
  const filePath = safeFile(pathname === '/' ? '/index.html' : pathname);
  if (!filePath) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }
  if (req.method === 'HEAD') {
    fs.stat(filePath, (error, stat) => {
      if (error || !stat.isFile()) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': mime[path.extname(filePath).toLowerCase()] || 'application/octet-stream', 'Content-Length': stat.size });
      res.end();
    });
    return;
  }
  serve(req, res, filePath);
});

server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.log(`A porta ${port} ja esta em uso.`);
    console.log('Feche a janela antiga do servidor e abra este atalho de novo.');
  } else {
    console.log(error.message);
  }
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`SantoSelfie em http://localhost:${port}`);
  console.log(`QR Code em http://localhost:${port}/api/sign-photo`);
  console.log('Impressao direta em /api/print');
  const probeArgs = ['-ListOnly'];
  if (process.env.PRINTER_NAME) probeArgs.push('-PrinterName', process.env.PRINTER_NAME);
  runPrintScript(probeArgs).then(text => {
    const printer = parsePrintOutput(text);
    console.log(`Impressora: ${printer.printer || 'nao encontrada'}`);
    if (printer.paper) console.log(`Papel padrao desta impressora: ${printer.paper}`);
    if (printer.paper && !/10\s*x\s*15|4\s*x\s*6|100\s*x\s*150/i.test(printer.paper)) {
      console.log('O papel padrao ainda nao e 10x15. Siga o arquivo Como-imprimir.md antes do evento.');
    }
    console.log('O passo a passo para configurar a Canon esta em Como-imprimir.md');
  }).catch(error => {
    console.log(printFailure(error));
    console.log('O passo a passo esta em Como-imprimir.md');
  });
  if (!cloudinaryReady) {
    console.log('');
    console.log('O QR Code ainda nao consegue enviar a foto.');
    console.log('Crie um arquivo .env nesta pasta com:');
    console.log('CLOUDINARY_CLOUD_NAME=');
    console.log('CLOUDINARY_API_KEY=');
    console.log('CLOUDINARY_API_SECRET=');
  }
});
