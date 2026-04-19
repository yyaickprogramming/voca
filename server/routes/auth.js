const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');

const router = express.Router();
const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

function isPasswordValid(password) {
  return passwordPattern.test(password);
}

function normalizeUsername(username) {
  return username.trim().toLowerCase();
}

router.post('/register', async (req, res) => {
  const username = req.body.username ? req.body.username.trim() : '';
  const password = req.body.password || '';

  if (!username || !password) {
    return res.status(400).json({ message: 'Введите логин и пароль' });
  }

  if (!isPasswordValid(password)) {
    return res.status(400).json({
      message: 'Пароль должен содержать минимум 6 символов, включая буквы и цифры'
    });
  }

  try {
    const existingUser = await db.query(
      'SELECT id FROM users WHERE lower(trim(username)) = $1',
      [normalizeUsername(username)]
    );

    if (existingUser.rows[0]) {
      return res.status(400).json({ message: 'Этот логин уже занят' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const createdUser = await db.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
      [username, hashedPassword]
    );

    req.session.userId = createdUser.rows[0].id;
    req.session.username = createdUser.rows[0].username;

    res.json({ message: 'Регистрация успешна' });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Этот логин уже занят' });
    }

    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.post('/login', async (req, res) => {
  const username = req.body.username ? req.body.username.trim() : '';
  const password = req.body.password || '';

  if (!username || !password) {
    return res.status(400).json({ message: 'Введите логин и пароль' });
  }

  try {
    const result = await db.query(
      'SELECT * FROM users WHERE lower(trim(username)) = $1',
      [normalizeUsername(username)]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ message: 'Пользователь не найден' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Неверный пароль' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({ message: 'Вход выполнен успешно' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Вы вышли из аккаунта' });
  });
});

router.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Пользователь не авторизован' });
  }

  res.json({
    id: req.session.userId,
    username: req.session.username
  });
});

module.exports = router;
