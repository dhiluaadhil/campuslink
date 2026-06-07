const express = require('express');
const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');
const { uploadToSupabase } = require('../supabase');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Helper: fetch a single post with counts
const fetchPost = async (postId, requestingUserId = null) => {
  const likedSubquery = requestingUserId
    ? `EXISTS(SELECT 1 FROM likes WHERE user_id = '${requestingUserId}' AND post_id = p.id)`
    : 'false';

  const { rows } = await query(
    `SELECT p.id, p.caption, p.image_url, p.created_at, p.club_id,
            u.id AS author_id, u.username, u.avatar_url,
            COUNT(DISTINCT l.user_id)::int AS like_count,
            COUNT(DISTINCT c.id)::int AS comment_count,
            ${likedSubquery} AS liked
     FROM posts p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN likes l ON l.post_id = p.id
     LEFT JOIN comments c ON c.post_id = p.id
     WHERE p.id = $1
     GROUP BY p.id, u.id`,
    [postId]
  );
  return rows[0] || null;
};

// ─── POST /api/posts ───────────────────────────────────────────
router.post('/', authenticate, upload.single('image'), async (req, res) => {
  try {
    const postSchema = z.object({
      caption: z.string().min(1).max(2000),
      club_id: z.string().uuid().optional().nullable(),
      tag_ids: z.array(z.string().uuid()).optional(),
    });

    const body = postSchema.parse({
      caption: req.body.caption,
      club_id: req.body.club_id || null,
      tag_ids: req.body.tag_ids ? JSON.parse(req.body.tag_ids) : [],
    });

    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadToSupabase(req.file.buffer, req.file.originalname, 'posts');
    }

    const postId = uuidv4();
    await query(
      `INSERT INTO posts (id, user_id, caption, image_url, club_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [postId, req.user.id, body.caption, imageUrl, body.club_id]
    );

    if (body.tag_ids && body.tag_ids.length > 0) {
      for (const tagId of body.tag_ids) {
        await query(
          'INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [postId, tagId]
        );
      }
    }

    const post = await fetchPost(postId, req.user.id);
    res.status(201).json(post);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error(err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// ─── GET /api/posts/:id ────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    let userId = null;
    if (req.headers.authorization) {
      try {
        const jwt = require('jsonwebtoken');
        userId = jwt.verify(req.headers.authorization.split(' ')[1], process.env.JWT_SECRET).id;
      } catch (_) {}
    }
    const post = await fetchPost(req.params.id, userId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// ─── DELETE /api/posts/:id ─────────────────────────────────────
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await query('SELECT user_id FROM posts WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Post not found' });
    if (rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    await query('DELETE FROM posts WHERE id = $1', [req.params.id]);
    res.json({ message: 'Post deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

module.exports = router;
