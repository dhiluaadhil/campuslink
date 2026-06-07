const express = require('express');
const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');
const { uploadToSupabase } = require('../supabase');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ─── GET /api/clubs ────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT c.id, c.name, c.description, c.banner_url, c.created_at,
              u.username AS created_by_username,
              COUNT(DISTINCT cm.user_id)::int AS member_count
       FROM clubs c
       JOIN users u ON u.id = c.created_by
       LEFT JOIN club_members cm ON cm.club_id = c.id
       GROUP BY c.id, u.username
       ORDER BY member_count DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch clubs' });
  }
});

// ─── POST /api/clubs ───────────────────────────────────────────
router.post('/', authenticate, upload.single('banner'), async (req, res) => {
  try {
    const clubSchema = z.object({
      name: z.string().min(2).max(80),
      description: z.string().max(500).optional(),
    });
    const body = clubSchema.parse(req.body);

    let bannerUrl = null;
    if (req.file) {
      bannerUrl = await uploadToSupabase(req.file.buffer, req.file.originalname, 'banners');
    }

    const clubId = uuidv4();
    await query(
      'INSERT INTO clubs (id, name, description, banner_url, created_by) VALUES ($1, $2, $3, $4, $5)',
      [clubId, body.name, body.description || null, bannerUrl, req.user.id]
    );

    // Auto-join as admin
    await query(
      `INSERT INTO club_members (club_id, user_id, role) VALUES ($1, $2, 'admin')`,
      [clubId, req.user.id]
    );

    const { rows } = await query('SELECT * FROM clubs WHERE id = $1', [clubId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error(err);
    res.status(500).json({ error: 'Failed to create club' });
  }
});

// ─── GET /api/clubs/:id ────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT c.id, c.name, c.description, c.banner_url, c.created_at,
              u.username AS created_by_username,
              COUNT(DISTINCT cm.user_id)::int AS member_count
       FROM clubs c
       JOIN users u ON u.id = c.created_by
       LEFT JOIN club_members cm ON cm.club_id = c.id
       WHERE c.id = $1
       GROUP BY c.id, u.username`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Club not found' });

    // Get club posts
    const postsRes = await query(
      `SELECT p.id, p.caption, p.image_url, p.created_at,
              u.id AS author_id, u.username, u.avatar_url,
              COUNT(DISTINCT l.user_id)::int AS like_count,
              COUNT(DISTINCT c2.id)::int AS comment_count
       FROM posts p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN likes l ON l.post_id = p.id
       LEFT JOIN comments c2 ON c2.post_id = p.id
       WHERE p.club_id = $1
       GROUP BY p.id, u.id
       ORDER BY p.created_at DESC
       LIMIT 20`,
      [req.params.id]
    );

    res.json({ club: rows[0], posts: postsRes.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch club' });
  }
});

// ─── POST /api/clubs/:id/join ──────────────────────────────────
router.post('/:id/join', authenticate, async (req, res) => {
  try {
    const club = await query('SELECT id FROM clubs WHERE id = $1', [req.params.id]);
    if (!club.rows[0]) return res.status(404).json({ error: 'Club not found' });

    await query(
      `INSERT INTO club_members (club_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING`,
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Joined club' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to join club' });
  }
});

// ─── DELETE /api/clubs/:id/leave ──────────────────────────────
router.delete('/:id/leave', authenticate, async (req, res) => {
  try {
    await query(
      'DELETE FROM club_members WHERE club_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Left club' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to leave club' });
  }
});

// ─── GET /api/clubs/suggested ─────────────────────────────────
// Returns clubs the user hasn't joined, sorted by member count
router.get('/user/suggested', authenticate, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT c.id, c.name, c.description, c.banner_url,
              COUNT(DISTINCT cm.user_id)::int AS member_count
       FROM clubs c
       LEFT JOIN club_members cm ON cm.club_id = c.id
       WHERE c.id NOT IN (
         SELECT club_id FROM club_members WHERE user_id = $1
       )
       GROUP BY c.id
       ORDER BY member_count DESC
       LIMIT 5`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch suggested clubs' });
  }
});

module.exports = router;
