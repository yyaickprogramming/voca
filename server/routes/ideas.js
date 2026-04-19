const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/random', authMiddleware, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM ideas ORDER BY RANDOM() LIMIT 1');
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.post('/save', authMiddleware, async (req, res) => {
  const { ideaId } = req.body;
  const userId = req.session.userId;

  try {
    await db.query(
      'INSERT INTO user_ideas (user_id, idea_id) VALUES ($1, $2)',
      [userId, ideaId]
    );

    res.json({ message: 'Идея сохранена' });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Эта идея уже есть в ваших сохраненных' });
    }

    res.status(500).json({ message: 'Ошибка сохранения' });
  }
});

router.post('/remove', authMiddleware, async (req, res) => {
  const { ideaId } = req.body;
  const userId = req.session.userId;

  try {
    const result = await db.query(
      'DELETE FROM user_ideas WHERE user_id = $1 AND idea_id = $2',
      [userId, ideaId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Идея не найдена в сохраненных' });
    }

    res.json({ message: 'Идея удалена из сохраненных' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка удаления идеи' });
  }
});

router.get('/my', authMiddleware, async (req, res) => {
  const userId = req.session.userId;

  try {
    const result = await db.query(
      `
        SELECT ideas.*, user_ideas.is_main
        FROM user_ideas
        JOIN ideas ON ideas.id = user_ideas.idea_id
        WHERE user_ideas.user_id = $1
        ORDER BY user_ideas.is_main DESC, ideas.title ASC
      `,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.post('/set-main', authMiddleware, async (req, res) => {
  const { ideaId } = req.body;
  const userId = req.session.userId;
  const client = await db.getClient();

  try {
    await client.query('BEGIN');
    await client.query('UPDATE user_ideas SET is_main = FALSE WHERE user_id = $1', [userId]);

    const result = await client.query(
      'UPDATE user_ideas SET is_main = TRUE WHERE user_id = $1 AND idea_id = $2 RETURNING id',
      [userId, ideaId]
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Идея не найдена в сохраненных' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Основная идея выбрана' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Ошибка сервера' });
  } finally {
    client.release();
  }
});

module.exports = router;
