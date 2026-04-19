require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const pgSessionFactory = require('connect-pg-simple');

const { pool } = require('./db');
const { initializeDatabase } = require('./initDb');
const statsRoutes = require('./routes/stats');
const authRoutes = require('./routes/auth');
const ideasRoutes = require('./routes/ideas');
const tasksRoutes = require('./routes/tasks');
const authMiddleware = require('./middleware/authMiddleware');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET || 'my_secret_key';
const PgSessionStore = pgSessionFactory(session);
const sessionTableName = process.env.SESSION_TABLE_NAME || 'user_sessions';
const sessionPruneInterval = Number(process.env.SESSION_PRUNE_INTERVAL_SECONDS) || 900;
const sessionStore = new PgSessionStore({
  pool,
  tableName: sessionTableName,
  createTableIfMissing: true,
  pruneSessionInterval: sessionPruneInterval
});

app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  name: 'voca.sid',
  store: sessionStore,
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

app.use(express.static(path.join(__dirname, '../public')));

function getSiteUrl(req) {
  return process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *\nAllow: /\n\nSitemap: ${getSiteUrl(req)}/sitemap.xml\n`);
});

app.get('/sitemap.xml', (req, res) => {
  const siteUrl = getSiteUrl(req);
  const pages = ['/', '/index.html', '/register.html', '/login.html'];

  const urls = pages
    .map((page) => `<url><loc>${siteUrl}${page === '/' ? '' : page}</loc></url>`)
    .join('');

  res.type('application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);
});

app.use('/api/stats', statsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/ideas', ideasRoutes);
app.use('/api/tasks', tasksRoutes);

app.get('/api/protected', authMiddleware, (req, res) => {
  res.json({ message: 'Доступ есть!' });
});

app.get('/api', (req, res) => {
  res.json({ message: 'Сервер работает!' });
});

async function startServer() {
  await initializeDatabase();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Не удалось запустить сервер:', error.message);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  await sessionStore.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await sessionStore.close();
  process.exit(0);
});
