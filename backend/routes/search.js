const express = require('express');
const { query } = require('../db');

const router = express.Router();

// ─── GET /api/search?q= ────────────────────────────────────────
// Searches users (by username) and posts (by caption) in parallel using GIN indexes
router.get('/', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q || q.trim().length === 0) {
      return res.json({ users: [], posts: [] });
    }

    const searchTerm = q.trim();
    const likeTerm = `%${searchTerm}%`;
    const tsQuery = searchTerm.split(' ').filter(Boolean).join(' & ');

    // Run both searches in parallel
    const [usersResult, postsResult] = await Promise.all([
      query(
        `SELECT u.id, u.username, u.avatar_url, u.bio, u.college,
                COUNT(DISTINCT f.follower_id)::int AS follower_count
         FROM users u
         LEFT JOIN follows f ON f.following_id = u.id
         WHERE to_tsvector('english', u.username) @@ to_tsquery('english', $1)
            OR u.username ILIKE $2
         GROUP BY u.id
         LIMIT 20`,
        [tsQuery, likeTerm]
      ),
      query(
        `SELECT p.id, p.caption, p.image_url, p.created_at,
                u.id AS author_id, u.username, u.avatar_url,
                COUNT(DISTINCT l.user_id)::int AS like_count,
                COUNT(DISTINCT c.id)::int AS comment_count
         FROM posts p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN likes l ON l.post_id = p.id
         LEFT JOIN comments c ON c.post_id = p.id
         WHERE to_tsvector('english', p.caption) @@ to_tsquery('english', $1)
            OR p.caption ILIKE $2
         GROUP BY p.id, u.id
         ORDER BY p.created_at DESC
         LIMIT 20`,
        [tsQuery, likeTerm]
      ),
    ]);

    res.json({ users: usersResult.rows, posts: postsResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
