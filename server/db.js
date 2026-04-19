const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const defaultDatabasePath =
  process.env.DATABASE_PATH ||
  (process.env.NODE_ENV === 'production'
    ? '/data/voca.sqlite'
    : path.join(__dirname, '../database/database.sqlite'));

const resolvedDatabasePath = path.resolve(defaultDatabasePath);

fs.mkdirSync(path.dirname(resolvedDatabasePath), { recursive: true });

const connection = new sqlite3.Database(resolvedDatabasePath, (error) => {
  if (error) {
    console.error('Не удалось открыть SQLite:', error.message);
  }
});

connection.serialize(() => {
  connection.run('PRAGMA foreign_keys = ON');
});

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.run(sql, params, function onRun(error) {
      if (error) {
        return reject(error);
      }

      resolve({
        id: this.lastID,
        changes: this.changes
      });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.get(sql, params, (error, row) => {
      if (error) {
        return reject(error);
      }

      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.all(sql, params, (error, rows) => {
      if (error) {
        return reject(error);
      }

      resolve(rows);
    });
  });
}

function exec(sql) {
  return new Promise((resolve, reject) => {
    connection.exec(sql, (error) => {
      if (error) {
        return reject(error);
      }

      resolve();
    });
  });
}

async function transaction(work) {
  await exec('BEGIN IMMEDIATE TRANSACTION');

  try {
    const result = await work(api);
    await exec('COMMIT');
    return result;
  } catch (error) {
    try {
      await exec('ROLLBACK');
    } catch (rollbackError) {
      console.error('Не удалось откатить транзакцию SQLite:', rollbackError.message);
    }

    throw error;
  }
}

function close() {
  return new Promise((resolve, reject) => {
    connection.close((error) => {
      if (error) {
        return reject(error);
      }

      resolve();
    });
  });
}

const api = {
  all,
  close,
  exec,
  get,
  path: resolvedDatabasePath,
  run,
  transaction
};

module.exports = api;
