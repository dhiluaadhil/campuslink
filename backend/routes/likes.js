const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');
const { emitNotification } = require('../socket');

const router = express.Router();

// ─── POST /api/likes/:postId ───────────────────────────────────
router.post('/:postId', authenticate, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    // Check post exists and get owner
    const postRes = await query('SELECT user_id FROM posts WHERE id = $1', [postId]);
    if (!postRes.rows[0]) return res.status(404).json({ error: 'Post not found' });
    const postOwnerId = postRes.rows[0].user_id;

    await query(
      'INSERT INTO likes (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, postId]
    );

    // Send notification to post owner (not to self)
    if (postOwnerId !== userId) {
      const notifId = uuidv4();
      await query(
        `INSERT INTO notifications (id, recipient_id, actor_id, type, post_id)
         VALUES ($1, $2, $3, 'like', $4)`,
        [notifId, postOwnerId, userId, postId]
      );
      try {
        emitNotification(postOwnerId, {
          id: notifId,
          type: 'like',
          post_id: postId,
          actor: { id: req.user.id, username: req.user.username },
          created_at: new Date(),
        });
      } catch (_) {}
    }

    // Return updated like count
    const countRes = await query(
      'SELECT COUNT(*)::int AS like_count FROM likes WHERE post_id = $1',
      [postId]
    );
    res.json({ liked: true, like_count: countRes.rows[0].like_count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to like post' });
  }
});

// ─── DELETE /api/likes/:postId ─────────────────────────────────
router.delete('/:postId', authenticate, async (req, res) => {
  try {
    const { postId } = req.params;
    await query(
      'DELETE FROM likes WHERE user_id = $1 AND post_id = $2',
      [req.user.id, postId]
    );
    const countRes = await query(
      'SELECT COUNT(*)::int AS like_count FROM likes WHERE post_id = $1',
      [postId]
    );
    res.json({ liked: false, like_count: countRes.rows[0].like_count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to unlike post' });
  }
});

module.exports = router;
