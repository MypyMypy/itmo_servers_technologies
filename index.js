const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const { PNG } = require('pngjs');
const crypto = require('crypto');
const selfsigned = require('selfsigned');

const app = express();
const upload = multer();

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const LOGIN = 'mypymypy';

app.get('/login', (_req, res) => {
  res.type('text/plain').send(LOGIN);
});

app.get('/hour', (_req, res) => {
  try {
    const dtf = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', hour12: false });
    const parts = dtf.formatToParts(new Date());
    const hourPart = parts.find(p => p.type === 'hour');
    const hour = hourPart ? hourPart.value : new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }).split(',')[1].trim().split(':')[0];
    res.type('text/plain').send(hour.padStart(2, '0'));
  } catch (e) {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const mosk = new Date(utc + 3 * 3600000);
    res.type('text/plain').send(String(mosk.getHours()).padStart(2, '0'));
  }
});

// /decypher: multipart form fields: key (file), secret (file)
app.post('/decypher', upload.fields([{ name: 'key' }, { name: 'secret' }]), (req, res) => {
  try {
    const keyFile = req.files['key'] && req.files['key'][0];
    const secretFile = req.files['secret'] && req.files['secret'][0];
    if (!keyFile || !secretFile) return res.status(400).send('missing files');
    const keyPem = keyFile.buffer.toString('utf8');
    const secretBuf = secretFile.buffer;

    let decrypted;
    try {
      decrypted = crypto.privateDecrypt({ key: keyPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, secretBuf);
    } catch (e) {
      decrypted = crypto.privateDecrypt({ key: keyPem, padding: crypto.constants.RSA_PKCS1_PADDING }, secretBuf);
    }
    res.type('text/plain').send(decrypted.toString('utf8'));
  } catch (err) {
    res.status(500).send('decryption failed');
  }
});

app.get('/id/:n', async (req, res) => {
  const n = req.params.n;
  const url = `https://nd.kodaktor.ru/users/${encodeURIComponent(n)}`;
  try {
    const r = await fetch(url, { method: 'GET', headers: {} });
    const json = await r.json();
    if (json && json.login) return res.type('text/plain').send(String(json.login));
    return res.status(502).send('no login');
  } catch (e) {
    res.status(500).send('proxy error');
  }
});

app.get('/chunks', (req, res) => {
  try {
    const postData = `login=${encodeURIComponent(LOGIN)}`;
    const options = {
      hostname: 'kodaktor.ru',
      path: '/api/chunks',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    const reqUp = https.request(options, upstreamRes => {
      let count = 0;
      upstreamRes.on('data', () => { count++; });
      upstreamRes.on('end', () => { res.type('text/plain').send(String(count)); });
      upstreamRes.on('error', () => { res.status(500).send('upstream error'); });
    });
    reqUp.on('error', () => { res.status(500).send('request error'); });
    reqUp.write(postData);
    reqUp.end();
  } catch (e) {
    res.status(500).send('internal error');
  }
});

app.post('/size2json', upload.single('image'), (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).send('missing image');

    const buf = file.buffer;
    if (buf.length < 24) return res.status(400).send('not a png');

    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    res.type('application/json').send(JSON.stringify({ width, height }));
  } catch (e) {
    res.status(500).send('parse error');
  }
});

app.get('/makeimage', (req, res) => {
  const w = Math.max(1, Math.min(2000, parseInt(req.query.width || '1', 10) || 1));
  const h = Math.max(1, Math.min(2000, parseInt(req.query.height || '1', 10) || 1));
  const png = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (w * y + x) << 2;
      png.data[idx] = (x + y) % 256; // R
      png.data[idx + 1] = (x * 2) % 256; // G
      png.data[idx + 2] = (y * 2) % 256; // B
      png.data[idx + 3] = 255; // A
    }
  }
  res.setHeader('Content-Type', 'image/png');
  png.pack().pipe(res);
});

app.listen(PORT, HOST, () => {
  console.log(`HTTP server running at http://${HOST}:${PORT}`);
});

// const certDir = path.join(__dirname, 'certs');
// if (!fs.existsSync(certDir)) fs.mkdirSync(certDir);
// const keyPath = path.join(certDir, 'key.pem');
// const certPath = path.join(certDir, 'cert.pem');

// let credentials;
// if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
//   credentials = { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
// } else {
//   const attrs = [{ name: 'commonName', value: 'localhost' }];
//   const pems = selfsigned.generate(attrs, { days: 365 });
//   fs.writeFileSync(keyPath, pems.private);
//   fs.writeFileSync(certPath, pems.cert);
//   credentials = { key: pems.private, cert: pems.cert };
// }

// https.createServer(credentials, app).listen(PORT, HOST, () => {
//   console.log(`HTTPS server running at https://localhost:${PORT}`);
// });
