import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FiSearch } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import PostCard from '../components/PostCard';
import Avatar from '../components/Avatar';
import api from '../api/axios';
import { useDebounce } from '../hooks/useDebounce';

export default function Search() {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('people');
  const navigate = useNavigate();
  const debouncedQuery = useDebounce(query, 400);

  const { data, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => api.get(`/search?q=${encodeURIComponent(debouncedQuery)}`).then((r) => r.data),
    enabled: debouncedQuery.trim().length > 0,
  });

  const users = data?.users ?? [];
  const posts = data?.posts ?? [];

  return (
    <div className="page-layout no-sidebar">
      <Sidebar />
      <main className="main-content">
        <div className="search-input-wrap">
          <div style={{ position: 'relative' }}>
            <FiSearch size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="search-input"
              placeholder="Search people, posts, topics…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="tabs">
          <button className={`tab-btn ${tab === 'people' ? 'active' : ''}`} onClick={() => setTab('people')}>
            👥 People {users.length > 0 && `(${users.length})`}
          </button>
          <button className={`tab-btn ${tab === 'posts' ? 'active' : ''}`} onClick={() => setTab('posts')}>
            📝 Posts {posts.length > 0 && `(${posts.length})`}
          </button>
        </div>

        {isLoading && <div className="spinner" />}

        {!isLoading && debouncedQuery && tab === 'people' && (
          <div>
            {users.length === 0 ? (
              <div className="empty-state">
                <div className="icon">🔍</div>
                <h3>No people found</h3>
              </div>
            ) : (
              users.map((u) => (
                <div
                  key={u.id}
                  className="notif-item"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/profile/${u.username}`)}
                >
                  <Avatar src={u.avatar_url} username={u.username} size={44} />
                  <div style={{ flex: 1 }}>
                    <div className="font-bold">@{u.username}</div>
                    {u.bio && <p className="text-muted text-sm">{u.bio}</p>}
                    <p className="text-muted text-sm">{u.follower_count} followers</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {!isLoading && debouncedQuery && tab === 'posts' && (
          <div>
            {posts.length === 0 ? (
              <div className="empty-state">
                <div className="icon">🔍</div>
                <h3>No posts found</h3>
              </div>
            ) : (
              posts.map((post) => <PostCard key={post.id} post={post} />)
            )}
          </div>
        )}

        {!debouncedQuery && (
          <div className="empty-state" style={{ paddingTop: 80 }}>
            <div className="icon">🔍</div>
            <h3>Search CampusLink</h3>
            <p>Find people, posts and topics</p>
          </div>
        )}
      </main>
    </div>
  );
}
