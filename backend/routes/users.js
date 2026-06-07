const express = require('express');
const { z } = require('zod');
const multer = require('multer');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');
const { uploadToSupabase } = require('../supabase');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ─── GET /api/users/:id ────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.username, u.email, u.avatar_url, u.bio, u.college, u.created_at,
              COUNT(DISTINCT f1.follower_id)::int AS follower_count,
              COUNT(DISTINCT f2.following_id)::int AS following_count,
              COUNT(DISTINCT p.id)::int AS post_count
       FROM users u
       LEFT JOIN follows f1 ON f1.following_id = u.id
       LEFT JOIN follows f2 ON f2.follower_id = u.id
       LEFT JOIN posts p ON p.user_id = u.id
       WHERE u.id = $1 OR u.username = $1
       GROUP BY u.id`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ─── PUT /api/users/me ─────────────────────────────────────────
router.put('/me', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    const updateSchema = z.object({
      bio: z.string().max(300).optional(),
      college: z.string().max(120).optional(),
    });
    const body = updateSchema.parse(req.body);

    let avatarUrl;
    if (req.file) {
      avatarUrl = await uploadToSupabase(req.file.buffer, req.file.originalname, 'avatars');
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (body.bio !== undefined)   { fields.push(`bio = $${idx++}`);        values.push(body.bio); }
    if (body.college !== undefined){ fields.push(`college = $${idx++}`);   values.push(body.college); }
    if (avatarUrl)                 { fields.push(`avatar_url = $${idx++}`); values.push(avatarUrl); }

    if (fields.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    values.push(req.user.id);
    const { rows } = await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, username, email, avatar_url, bio, college`,
      values
    );
    res.json(rows[0]);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ─── GET /api/users/:id/followers ─────────────────────────────
router.get('/:id/followers', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.username, u.avatar_url, u.bio
       FROM follows f JOIN users u ON u.id = f.follower_id
       WHERE f.following_id = $1
       ORDER BY f.created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

// ─── GET /api/users/:id/following ─────────────────────────────
router.get('/:id/following', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.username, u.avatar_url, u.bio
       FROM follows f JOIN users u ON u.id = f.following_id
       WHERE f.follower_id = $1
       ORDER BY f.created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch following' });
  }
});

// ─── GET /api/users/:id/posts ──────────────────────────────────
router.get('/:id/posts', async (req, res) => {
  try {
    const limit = 20;
    const offset = parseInt(req.query.offset) || 0;
    const { rows } = await query(
      `SELECT p.id, p.caption, p.image_url, p.created_at,
              u.id AS author_id, u.username, u.avatar_url,
              COUNT(DISTINCT l.user_id)::int AS like_count,
              COUNT(DISTINCT c.id)::int AS comment_count
       FROM posts p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN likes l ON l.post_id = p.id
       LEFT JOIN comments c ON c.post_id = p.id
       WHERE u.id = $1 OR u.username = $1
       GROUP BY p.id, u.id
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.params.id, limit, offset]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user posts' });
  }
});

module.exports = router;
