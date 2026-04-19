const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/random', authMiddleware, async (req, res) => {
  try {
    const idea = await db.get('SELECT * FROM ideas ORDER BY RANDOM() LIMIT 1');
    res.json(idea);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.post('/save', authMiddleware, async (req, res) => {
  const { ideaId } = req.body;
  const userId = req.session.userId;

  try {
    await db.run(
      'INSERT INTO user_ideas (user_id, idea_id) VALUES (?, ?)',
      [userId, ideaId]
    );

    res.json({ message: 'Идея сохранена' });
  } catch (error) {
    if (error.message && error.message.includes('idx_user_ideas_unique')) {
      return res.status(409).json({ message: 'Эта идея уже есть в ваших сохраненных' });
    }

    res.status(500).json({ message: 'Ошибка сохранения' });
  }
});

router.post('/remove', authMiddleware, async (req, res) => {
  const { ideaId } = req.body;
  const userId = req.session.userId;

  try {
    const result = await db.run(
      'DELETE FROM user_ideas WHERE user_id = ? AND idea_id = ?',
      [userId, ideaId]
    );

    if (result.changes === 0) {
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
    const ideas = await db.all(
      `
        SELECT ideas.*, user_ideas.is_main
        FROM user_ideas
        JOIN ideas ON ideas.id = user_ideas.idea_id
        WHERE user_ideas.user_id = ?
        ORDER BY user_ideas.is_main DESC, ideas.title ASC
      `,
      [userId]
    );

    res.json(ideas);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.post('/set-main', authMiddleware, async (req, res) => {
  const { ideaId } = req.body;
  const userId = req.session.userId;

  try {
    await db.transaction(async (tx) => {
      await tx.run('UPDATE user_ideas SET is_main = 0 WHERE user_id = ?', [userId]);

      const result = await tx.run(
        'UPDATE user_ideas SET is_main = 1 WHERE user_id = ? AND idea_id = ?',
        [userId, ideaId]
      );

      if (result.changes === 0) {
        const error = new Error('NOT_FOUND');
        error.code = 'NOT_FOUND';
        throw error;
      }
    });

    res.json({ message: 'Основная идея выбрана' });
  } catch (error) {
    if (error.code === 'NOT_FOUND') {
      return res.status(404).json({ message: 'Идея не найдена в сохраненных' });
    }

    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
