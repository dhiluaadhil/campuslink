const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');
const { emitNotification } = require('../socket');

const router = express.Router();

// ─── POST /api/follows/:id ─────────────────────────────────────
router.post('/:id', authenticate, async (req, res) => {
  try {
    const followingId = req.params.id;
    const followerId = req.user.id;

    if (followingId === followerId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check target user exists
    const target = await query('SELECT id, username FROM users WHERE id = $1', [followingId]);
    if (!target.rows[0]) return res.status(404).json({ error: 'User not found' });

    await query(
      'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [followerId, followingId]
    );

    // Create + emit notification
    const notifId = uuidv4();
    await query(
      `INSERT INTO notifications (id, recipient_id, actor_id, type)
       VALUES ($1, $2, $3, 'follow')`,
      [notifId, followingId, followerId]
    );

    try {
      emitNotification(followingId, {
        id: notifId,
        type: 'follow',
        actor: { id: req.user.id, username: req.user.username },
        created_at: new Date(),
      });
    } catch (_) {}

    res.json({ message: `Now following ${target.rows[0].username}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Follow failed' });
  }
});

// ─── DELETE /api/follows/:id ───────────────────────────────────
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await query(
      'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
      [req.user.id, req.params.id]
    );
    res.json({ message: 'Unfollowed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unfollow failed' });
  }
});

// Check if current user follows target
router.get('/check/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2',
      [req.user.id, req.params.id]
    );
    res.json({ following: rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: 'Check failed' });
  }
});

module.exports = router;
