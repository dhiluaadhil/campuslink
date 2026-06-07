const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { z } = require('zod');
const { query } = require('../db');

const router = express.Router();

// ─── Allowed email domains ─────────────────────────────────────
const ALLOWED_DOMAINS = (process.env.ALLOWED_DOMAINS || '.edu')
  .split(',')
  .map((d) => d.trim());

const isValidCollegeEmail = (email) => {
  return ALLOWED_DOMAINS.some((domain) => email.endsWith(domain));
};

// ─── Schemas ──────────────────────────────────────────────────
const registerSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(8),
  college: z.string().min(2).max(120),
  interests: z.array(z.string().uuid()).min(3, 'Select at least 3 interests'),
  bio: z.string().max(300).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ─── POST /api/auth/register ───────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const body = registerSchema.parse(req.body);

    if (!isValidCollegeEmail(body.email)) {
      return res.status(400).json({ error: 'Only college email addresses are allowed (.edu or approved domains)' });
    }

    // Check uniqueness
    const existing = await query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [body.email, body.username]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email or username already in use' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(body.password, 12);
    const userId = uuidv4();

    // Insert user
    const { rows } = await query(
      `INSERT INTO users (id, username, email, password_hash, bio, college)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, email, bio, college, avatar_url, created_at`,
      [userId, body.username, body.email, password_hash, body.bio || null, body.college]
    );
    const user = rows[0];

    // Insert interests (validate tag IDs exist)
    const tagCheck = await query(
      'SELECT id FROM tags WHERE id = ANY($1::uuid[])',
      [body.interests]
    );
    if (tagCheck.rows.length !== body.interests.length) {
      return res.status(400).json({ error: 'One or more interest tags are invalid' });
    }

    for (const tagId of body.interests) {
      await query(
        'INSERT INTO user_interests (user_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, tagId]
      );
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ user, token });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ─── POST /api/auth/login ──────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = rows[0];

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─── GET /api/auth/tags ─────────────────────────────────────────
router.get('/tags', async (req, res) => {
  try {
    const { rows } = await query('SELECT id, name FROM tags ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

module.exports = router;
