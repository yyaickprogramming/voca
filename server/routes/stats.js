const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  const userId = req.session.userId;

  try {
    const result = await db.query(
      `
        SELECT
          (SELECT COUNT(*)::int FROM user_ideas WHERE user_id = $1) AS "savedIdeas",
          (SELECT COUNT(*)::int FROM tasks WHERE user_id = $1) AS tasks,
          (SELECT COUNT(*)::int FROM tasks WHERE user_id = $1 AND completed = TRUE) AS "completedTasks"
      `,
      [userId]
    );

    const stats = result.rows[0];
    stats.progress =
      stats.tasks === 0
        ? 0
        : Math.round((stats.completedTasks / stats.tasks) * 100);

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
