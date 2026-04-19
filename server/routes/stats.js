const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  const userId = req.session.userId;

  try {
    const savedIdeasRow = await db.get(
      'SELECT COUNT(*) AS count FROM user_ideas WHERE user_id = ?',
      [userId]
    );
    const tasksRow = await db.get(
      'SELECT COUNT(*) AS count FROM tasks WHERE user_id = ?',
      [userId]
    );
    const completedTasksRow = await db.get(
      'SELECT COUNT(*) AS count FROM tasks WHERE user_id = ? AND completed = 1',
      [userId]
    );

    const stats = {
      savedIdeas: savedIdeasRow ? savedIdeasRow.count : 0,
      tasks: tasksRow ? tasksRow.count : 0,
      completedTasks: completedTasksRow ? completedTasksRow.count : 0
    };

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
