const express = require('express');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/feed/latest ──────────────────────────────────────
// Cursor-based pagination: pass ?cursor=<created_at ISO> to get next page
router.get('/latest', async (req, res) => {
  try {
    const limit = 20;
    const cursor = req.query.cursor || null;

    // Optionally get requester userId to show liked status
    let userId = null;
    if (req.headers.authorization) {
      try {
        const jwt = require('jsonwebtoken');
        userId = jwt.verify(req.headers.authorization.split(' ')[1], process.env.JWT_SECRET).id;
      } catch (_) {}
    }

    const params = cursor ? [cursor, limit] : [limit];
    const cursorClause = cursor ? 'AND p.created_at < $1' : '';
    const limitParam = cursor ? '$2' : '$1';

    const { rows } = await query(
      `SELECT p.id, p.caption, p.image_url, p.created_at, p.club_id,
              u.id AS author_id, u.username, u.avatar_url,
              COUNT(DISTINCT l.user_id) AS like_count,
              COUNT(DISTINCT c.id) AS comment_count
              ${userId ? `, EXISTS(SELECT 1 FROM likes WHERE user_id = '${userId}' AND post_id = p.id) AS liked` : ', false AS liked'}
       FROM posts p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN likes l ON l.post_id = p.id
       LEFT JOIN comments c ON c.post_id = p.id
       WHERE 1=1 ${cursorClause}
       GROUP BY p.id, u.id
       ORDER BY p.created_at DESC
       LIMIT ${limitParam}`,
      params
    );

    const nextCursor = rows.length === limit ? rows[rows.length - 1].created_at : null;
    res.json({ posts: rows, nextCursor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch latest feed' });
  }
});

// ─── GET /api/feed/foryou ──────────────────────────────────────
// Scoring: (tag_match * 3) + (is_followed * 2) + recency_score
// recency_score = 1 / (1 + hours_since_posted), normalized to 0-1
router.get('/foryou', authenticate, async (req, res) => {
  try {
    const limit = 20;
    const offset = parseInt(req.query.offset) || 0;
    const userId = req.user.id;

    const { rows } = await query(
      `WITH user_tag_ids AS (
         SELECT tag_id FROM user_interests WHERE user_id = $1
       ),
       followed_ids AS (
         SELECT following_id FROM follows WHERE follower_id = $1
       ),
       scored_posts AS (
         SELECT
           p.id, p.caption, p.image_url, p.created_at, p.club_id,
           u.id AS author_id, u.username, u.avatar_url,
           COUNT(DISTINCT l.user_id) AS like_count,
           COUNT(DISTINCT c.id) AS comment_count,
           EXISTS(SELECT 1 FROM likes WHERE user_id = $1 AND post_id = p.id) AS liked,
           -- tag match score
           (SELECT COUNT(*) FROM post_tags pt WHERE pt.post_id = p.id AND pt.tag_id IN (SELECT tag_id FROM user_tag_ids))::float * 3 AS tag_score,
           -- followed score
           CASE WHEN p.user_id IN (SELECT following_id FROM followed_ids) THEN 2 ELSE 0 END AS follow_score,
           -- recency score: 1 / (1 + hours_elapsed)
           1.0 / (1.0 + EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600.0) AS recency_score
         FROM posts p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN likes l ON l.post_id = p.id
         LEFT JOIN comments c ON c.post_id = p.id
         WHERE p.user_id != $1
         GROUP BY p.id, u.id
       )
       SELECT *, (tag_score + follow_score + recency_score) AS total_score
       FROM scored_posts
       ORDER BY total_score DESC, created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const hasMore = rows.length === limit;
    res.json({ posts: rows, hasMore, nextOffset: offset + limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch for-you feed' });
  }
});

module.exports = router;
