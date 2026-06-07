const express = require('express');
const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');
const { emitNotification } = require('../socket');

const router = express.Router();

// ─── POST /api/comments/:postId ────────────────────────────────
router.post('/:postId', authenticate, async (req, res) => {
  try {
    const { body: bodyText } = z.object({ body: z.string().min(1).max(1000) }).parse(req.body);
    const { postId } = req.params;
    const userId = req.user.id;

    // Get post owner
    const postRes = await query('SELECT user_id FROM posts WHERE id = $1', [postId]);
    if (!postRes.rows[0]) return res.status(404).json({ error: 'Post not found' });
    const postOwnerId = postRes.rows[0].user_id;

    const commentId = uuidv4();
    const { rows } = await query(
      `INSERT INTO comments (id, user_id, post_id, body)
       VALUES ($1, $2, $3, $4)
       RETURNING id, body, created_at`,
      [commentId, userId, postId, bodyText]
    );

    const comment = {
      ...rows[0],
      author_id: req.user.id,
      username: req.user.username,
    };

    // Notify post owner
    if (postOwnerId !== userId) {
      const notifId = uuidv4();
      await query(
        `INSERT INTO notifications (id, recipient_id, actor_id, type, post_id)
         VALUES ($1, $2, $3, 'comment', $4)`,
        [notifId, postOwnerId, userId, postId]
      );
      try {
        emitNotification(postOwnerId, {
          id: notifId,
          type: 'comment',
          post_id: postId,
          actor: { id: req.user.id, username: req.user.username },
          created_at: new Date(),
        });
      } catch (_) {}
    }

    res.status(201).json(comment);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error(err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// ─── GET /api/comments/:postId ─────────────────────────────────
router.get('/:postId', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT c.id, c.body, c.created_at,
              u.id AS author_id, u.username, u.avatar_url
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC`,
      [req.params.postId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// ─── DELETE /api/comments/:id ──────────────────────────────────
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await query('SELECT user_id FROM comments WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Comment not found' });
    if (rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    await query('DELETE FROM comments WHERE id = $1', [req.params.id]);
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

module.exports = router;
