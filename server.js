const http = require('http');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const PORT = process.env.PORT || 4173;
const DB_PATH = path.join(__dirname, 'data.json');

const ADMIN_USER = 'Enzo_labubu';
const ADMIN_PASS = '20121710';
const MAX_BODY_SIZE = 12 * 1024 * 1024;

function ensureDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: [], gossips: [] }, null, 2));
  }
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function json(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY_SIZE) {
        reject(new Error('PAYLOAD_TOO_LARGE'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('INVALID_JSON'));
      }
    });
    req.on('error', () => reject(new Error('BODY_READ_ERROR')));
  });
}

function badBodyError(res, error) {
  if (error.message === 'PAYLOAD_TOO_LARGE') {
    return json(res, 413, { error: 'Imagem muito grande. Envie uma imagem menor.' });
  }
  return json(res, 400, { error: 'Requisição inválida.' });
}

function isAdmin(creds) {
  return creds?.adminUser === ADMIN_USER && creds?.adminPass === ADMIN_PASS;
}

function serveFile(res, filepath) {
  const ext = path.extname(filepath);
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  };

  fs.readFile(filepath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain; charset=utf-8' });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (url.pathname === '/api/state' && req.method === 'GET') {
    const db = readDb();
    json(res, 200, { gossips: db.gossips });
    return;
  }

  if (url.pathname === '/api/register' && req.method === 'POST') {
    let body;
    try {
      body = await parseBody(req);
    } catch (error) {
      return badBodyError(res, error);
    }
    const username = String(body.username || '').trim();
    const password = String(body.password || '');

    if (!username || !password) return json(res, 400, { error: 'Dados inválidos.' });
    if (username.toLowerCase() === ADMIN_USER.toLowerCase()) return json(res, 400, { error: 'Nome reservado.' });

    const db = readDb();
    const exists = db.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (exists) return json(res, 409, { error: 'Nome já existe.' });

    db.users.push({ username, password, banned: false });
    writeDb(db);
    return json(res, 201, { username, banned: false });
  }

  if (url.pathname === '/api/login' && req.method === 'POST') {
    let body;
    try {
      body = await parseBody(req);
    } catch (error) {
      return badBodyError(res, error);
    }
    const username = String(body.username || '').trim();
    const password = String(body.password || '');

    const db = readDb();
    const user = db.users.find((u) => u.username === username && u.password === password);
    if (!user) return json(res, 401, { error: 'Usuário ou senha inválidos.' });
    if (user.banned) return json(res, 403, { error: 'Conta banida.' });

    return json(res, 200, { username: user.username, banned: user.banned });
  }

  if (url.pathname === '/api/post' && req.method === 'POST') {
    let body;
    try {
      body = await parseBody(req);
    } catch (error) {
      return badBodyError(res, error);
    }
    const username = String(body.username || '').trim();
    const title = String(body.title || '').trim();
    const content = String(body.content || '').trim();
    const image = String(body.image || '');

    if (!username || !title) return json(res, 400, { error: 'Título e usuário são obrigatórios.' });

    const db = readDb();
    const user = db.users.find((u) => u.username === username);
    if (!user) return json(res, 401, { error: 'Sessão inválida.' });
    if (user.banned) return json(res, 403, { error: 'Conta banida.' });

    db.gossips.unshift({
      id: randomUUID(),
      title,
      content,
      image,
      author: username,
      createdAt: new Date().toISOString(),
    });

    writeDb(db);
    return json(res, 201, { ok: true });
  }

  if (url.pathname === '/api/admin/login' && req.method === 'POST') {
    let body;
    try {
      body = await parseBody(req);
    } catch (error) {
      return badBodyError(res, error);
    }
    if (!isAdmin(body)) return json(res, 401, { error: 'Credenciais inválidas.' });
    return json(res, 200, { ok: true });
  }

  if (url.pathname === '/api/admin/state' && req.method === 'POST') {
    let body;
    try {
      body = await parseBody(req);
    } catch (error) {
      return badBodyError(res, error);
    }
    if (!isAdmin(body)) return json(res, 401, { error: 'Sem permissão.' });
    const db = readDb();
    return json(res, 200, db);
  }

  if (url.pathname === '/api/admin/ban' && req.method === 'POST') {
    let body;
    try {
      body = await parseBody(req);
    } catch (error) {
      return badBodyError(res, error);
    }
    if (!isAdmin(body)) return json(res, 401, { error: 'Sem permissão.' });
    const username = String(body.username || '');
    const db = readDb();
    const user = db.users.find((u) => u.username === username);
    if (!user) return json(res, 404, { error: 'Usuário não encontrado.' });
    user.banned = !user.banned;
    writeDb(db);
    return json(res, 200, { ok: true, banned: user.banned });
  }

  if (url.pathname === '/api/admin/gossip/delete' && req.method === 'POST') {
    let body;
    try {
      body = await parseBody(req);
    } catch (error) {
      return badBodyError(res, error);
    }
    if (!isAdmin(body)) return json(res, 401, { error: 'Sem permissão.' });
    const id = String(body.id || '');
    const db = readDb();
    db.gossips = db.gossips.filter((g) => g.id !== id);
    writeDb(db);
    return json(res, 200, { ok: true });
  }

  if (url.pathname === '/api/admin/reset' && req.method === 'POST') {
    let body;
    try {
      body = await parseBody(req);
    } catch (error) {
      return badBodyError(res, error);
    }
    if (!isAdmin(body)) return json(res, 401, { error: 'Sem permissão.' });
    writeDb({ users: [], gossips: [] });
    return json(res, 200, { ok: true });
  }

  let target = url.pathname === '/' ? '/index.html' : url.pathname;
  target = path.normalize(target).replace(/^\.\.(\/|\\|$)/, '');
  const filePath = path.join(__dirname, target);

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  serveFile(res, filePath);
});

server.listen(PORT, () => {
  console.log(`Servidor iniciado em http://0.0.0.0:${PORT}`);
});
