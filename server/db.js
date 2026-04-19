const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const useSsl = process.env.DATABASE_SSL === 'true';

const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined
});

pool.on('error', (error) => {
  console.error('Неожиданная ошибка PostgreSQL:', error.message);
});

async function query(text, params = []) {
  return pool.query(text, params);
}

async function getClient() {
  return pool.connect();
}

async function close() {
  await pool.end();
}

module.exports = {
  pool,
  query,
  getClient,
  close
};
