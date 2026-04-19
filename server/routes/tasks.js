const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  const userId = req.session.userId;

  try {
    const tasks = await db.all(
      'SELECT * FROM tasks WHERE user_id = ? ORDER BY id DESC',
      [userId]
    );

    res.json(tasks.map((task) => ({
      ...task,
      completed: Boolean(task.completed)
    })));
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
    await db.run(
      'INSERT INTO tasks (user_id, text) VALUES (?, ?)',
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
    const result = await db.run(
      'DELETE FROM tasks WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.changes === 0) {
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
    const result = await db.run(
      `
        UPDATE tasks
        SET completed = CASE completed WHEN 1 THEN 0 ELSE 1 END
        WHERE id = ? AND user_id = ?
      `,
      [id, userId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Задача не найдена' });
    }

    res.json({ message: 'Статус обновлён' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
