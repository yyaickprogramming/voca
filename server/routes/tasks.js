const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  const userId = req.session.userId;

  try {
    const result = await db.query(
      'SELECT * FROM tasks WHERE user_id = $1 ORDER BY id DESC',
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.post('/create', authMiddleware, async (req, res) => {
  const { text } = req.body;
  const userId = req.session.userId;

  if (!text) {
    return res.status(400).json({ message: 'Введите текст задачи' });
  }

  try {
    await db.query(
      'INSERT INTO tasks (user_id, text) VALUES ($1, $2)',
      [userId, text]
    );

    res.json({ message: 'Задача создана' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка создания' });
  }
});

router.post('/delete', authMiddleware, async (req, res) => {
  const { id } = req.body;
  const userId = req.session.userId;

  try {
    const result = await db.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Задача не найдена' });
    }

    res.json({ message: 'Задача удалена' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка удаления' });
  }
});

router.post('/toggle', authMiddleware, async (req, res) => {
  const { id } = req.body;
  const userId = req.session.userId;

  try {
    const result = await db.query(
      `
        UPDATE tasks
        SET completed = NOT completed
        WHERE id = $1 AND user_id = $2
        RETURNING completed
      `,
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Задача не найдена' });
    }

    res.json({ message: 'Статус обновлён' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
