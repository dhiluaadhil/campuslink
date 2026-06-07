require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const socketModule = require('./socket');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
socketModule.init(server);

// ─── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/posts',         require('./routes/posts'));
app.use('/api/feed',          require('./routes/feed'));
app.use('/api/follows',       require('./routes/follows'));
app.use('/api/likes',         require('./routes/likes'));
app.use('/api/comments',      require('./routes/comments'));
app.use('/api/search',        require('./routes/search'));
app.use('/api/clubs',         require('./routes/clubs'));
app.use('/api/notifications', require('./routes/notifications'));

// ─── Health Check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ─── Error Handler ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 CampusLink backend running on port ${PORT}`);
});
