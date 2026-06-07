# CampusLink 🎓

A full-stack social media platform exclusively for college students. Think Twitter, but for your campus — with clubs, interest-based feeds, and real-time notifications.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React.js + Vite + React Query + React Router |
| Backend | Node.js + Express.js + Socket.io |
| Database | PostgreSQL (raw SQL, no ORM) |
| Auth | JWT + bcrypt |
| File Storage | Supabase Storage |
| Validation | Zod |

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL running locally (or a [Neon.tech](https://neon.tech) free cloud DB)
- A [Supabase](https://supabase.com) project (free tier)

### 1. Clone & Install

```bash
# Backend
cd campuslink/backend
npm install

# Frontend
cd campuslink/frontend
npm install
```

### 2. Set Up Environment Variables

```bash
cd campuslink/backend
cp .env.example .env
```

Fill in your `.env`:

```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/campuslink
JWT_SECRET=any_long_random_string_you_make_up
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
PORT=5000
CLIENT_URL=http://localhost:5173
```

### 3. Create the Database

```bash
# Create the campuslink database
psql -U postgres -c "CREATE DATABASE campuslink;"

# Run the schema
psql -U postgres -d campuslink -f backend/schema.sql
```

### 4. Set Up Supabase Storage

1. Go to your Supabase dashboard → Storage
2. Create a new bucket named **`campuslink`**
3. Set it to **Public**

### 5. Run the App

```bash
# Terminal 1 — Backend
cd campuslink/backend
npm run dev

# Terminal 2 — Frontend
cd campuslink/frontend
npm run dev
```

Open `http://localhost:5173` — sign up with a `.edu` email and start posting!

---

## API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | ❌ | Register with .edu email + 3 interests |
| POST | `/api/auth/login` | ❌ | Login, returns JWT |
| GET | `/api/auth/tags` | ❌ | Get all interest tags |

### Users
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/users/:id` | ❌ | Get profile by ID or username |
| PUT | `/api/users/me` | ✅ | Update bio/avatar |
| GET | `/api/users/:id/followers` | ❌ | Get follower list |
| GET | `/api/users/:id/following` | ❌ | Get following list |
| GET | `/api/users/:id/posts` | ❌ | Get user's posts |

### Posts
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/posts` | ✅ | Create post (multipart) |
| GET | `/api/posts/:id` | ❌ | Get single post |
| DELETE | `/api/posts/:id` | ✅ | Delete own post |

### Feed
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/feed/latest` | ❌ | Cursor-paginated latest posts |
| GET | `/api/feed/foryou` | ✅ | Scored personalized feed |

### Social
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/follows/:id` | ✅ | Follow user |
| DELETE | `/api/follows/:id` | ✅ | Unfollow user |
| GET | `/api/follows/check/:id` | ✅ | Check if following |
| POST | `/api/likes/:postId` | ✅ | Like post |
| DELETE | `/api/likes/:postId` | ✅ | Unlike post |
| POST | `/api/comments/:postId` | ✅ | Add comment |
| GET | `/api/comments/:postId` | ❌ | Get comments |
| DELETE | `/api/comments/:id` | ✅ | Delete own comment |

### Clubs
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/clubs` | ❌ | List all clubs |
| POST | `/api/clubs` | ✅ | Create club |
| GET | `/api/clubs/:id` | ❌ | Club detail + posts |
| POST | `/api/clubs/:id/join` | ✅ | Join club |
| DELETE | `/api/clubs/:id/leave` | ✅ | Leave club |
| GET | `/api/clubs/user/suggested` | ✅ | Clubs you haven't joined |

### Search & Notifications
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/search?q=` | ❌ | Search users + posts |
| GET | `/api/notifications` | ✅ | Get notifications |
| PATCH | `/api/notifications/read-all` | ✅ | Mark all read |

---

## For You Feed — How Scoring Works

Every post is scored before being returned:

```
total_score = tag_score + follow_score + recency_score

tag_score     = (number of matching interests) × 3
follow_score  = 2 if post author is followed, else 0
recency_score = 1 / (1 + hours_since_posted)
```

**Example:** A post about `coding` + `gaming` from someone you follow, posted 1 hour ago:
- tag_score = 2 × 3 = 6
- follow_score = 2
- recency_score = 1 / (1 + 1) = 0.5
- **total = 8.5**

Posts are sorted by `total_score DESC`. This ensures content that's both relevant and fresh rises to the top.

---

## Real-Time Notifications

Socket.io powers live notifications:
1. User connects → joins personal room `user:<id>`
2. When someone likes/comments/follows → server emits `notification` event to recipient's room
3. Frontend shows a toast and increments the bell badge

All notifications are also persisted to the `notifications` table for the `/notifications` page.

---

## Project Structure

```
campuslink/
├── backend/
│   ├── index.js           # Express + Socket.io entry
│   ├── db.js              # pg Pool
│   ├── socket.js          # Socket.io rooms + emit helper
│   ├── supabase.js        # Supabase Storage upload helper
│   ├── schema.sql         # Full DB schema
│   ├── .env.example       # Environment variable template
│   ├── middleware/
│   │   └── auth.js        # JWT verification middleware
│   └── routes/
│       ├── auth.js        # Register + Login
│       ├── users.js       # Profiles + followers
│       ├── posts.js       # Post CRUD + uploads
│       ├── feed.js        # Latest + For You feeds
│       ├── follows.js     # Follow/unfollow
│       ├── likes.js       # Like/unlike
│       ├── comments.js    # Comment CRUD
│       ├── search.js      # Full-text search
│       ├── clubs.js       # Club CRUD + membership
│       └── notifications.js
└── frontend/
    └── src/
        ├── api/axios.js         # Axios + JWT interceptor
        ├── context/AuthContext.jsx
        ├── hooks/
        │   ├── useSocket.js     # Socket.io hook
        │   └── useDebounce.js   # Search debounce
        ├── components/
        │   ├── PostCard.jsx
        │   ├── CommentSection.jsx
        │   ├── TagPicker.jsx
        │   ├── Sidebar.jsx
        │   ├── Avatar.jsx
        │   ├── NotificationItem.jsx
        │   └── ProtectedRoute.jsx
        ├── pages/
        │   ├── Register.jsx
        │   ├── Login.jsx
        │   ├── Home.jsx
        │   ├── Profile.jsx
        │   ├── PostDetail.jsx
        │   ├── Clubs.jsx
        │   ├── ClubDetail.jsx
        │   ├── Search.jsx
        │   └── Notifications.jsx
        ├── App.jsx
        └── index.css
```
