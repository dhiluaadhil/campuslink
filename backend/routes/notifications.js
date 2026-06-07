const express = require('express');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/notifications ────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT n.id, n.type, n.post_id, n.read, n.created_at,
              u.id AS actor_id, u.username AS actor_username, u.avatar_url AS actor_avatar
       FROM notifications n
       JOIN users u ON u.id = n.actor_id
       WHERE n.recipient_id = $1
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    const unreadCount = rows.filter((n) => !n.read).length;
    res.json({ notifications: rows, unread_count: unreadCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// ─── PATCH /api/notifications/read-all ────────────────────────
router.patch('/read-all', authenticate, async (req, res) => {
  try {
    await query(
      'UPDATE notifications SET read = true WHERE recipient_id = $1 AND read = false',
      [req.user.id]
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notifications read' });
  }
});

// ─── PATCH /api/notifications/:id/read ────────────────────────
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    await query(
      'UPDATE notifications SET read = true WHERE id = $1 AND recipient_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notification read' });
  }
});

module.exports = router;
