import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FiArrowLeft, FiUsers } from 'react-icons/fi';
import Sidebar from '../components/Sidebar';
import PostCard from '../components/PostCard';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function ClubDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['club', id],
    queryFn: () => api.get(`/clubs/${id}`).then((r) => r.data),
  });

  const joinMutation = useMutation({
    mutationFn: () => api.post(`/clubs/${id}/join`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['club', id] }); toast.success('Joined!'); },
  });
  const leaveMutation = useMutation({
    mutationFn: () => api.delete(`/clubs/${id}/leave`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['club', id] }); toast.success('Left club'); },
  });

  if (isLoading) return (
    <div className="page-layout no-sidebar">
      <Sidebar />
      <main className="main-content loading-center"><div className="spinner" /></main>
    </div>
  );

  const { club, posts = [] } = data || {};
  if (!club) return (
    <div className="page-layout no-sidebar">
      <Sidebar />
      <main className="main-content">
        <div className="empty-state"><h3>Club not found</h3></div>
      </main>
    </div>
  );

  return (
    <div className="page-layout no-sidebar">
      <Sidebar />
      <main className="main-content">
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="action-btn" onClick={() => navigate(-1)}>
            <FiArrowLeft size={20} />
          </button>
          <h2>{club.name}</h2>
        </div>

        {/* Club hero */}
        {club.banner_url ? (
          <img src={club.banner_url} alt={club.name} style={{ width: '100%', height: 180, objectFit: 'cover' }} />
        ) : (
          <div style={{ height: 180, background: 'linear-gradient(135deg, #1e1b4b, #4c1d95)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
            🎓
          </div>
        )}

        <div style={{ padding: 20, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2>{club.name}</h2>
            <p className="text-muted text-sm" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <FiUsers size={13} /> {club.member_count} members · Created by @{club.created_by_username}
            </p>
            {club.description && <p style={{ marginTop: 8, fontSize: '0.9rem' }}>{club.description}</p>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button className="btn btn-primary btn-sm" onClick={() => joinMutation.mutate()} disabled={joinMutation.isPending}>
              Join
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => leaveMutation.mutate()} disabled={leaveMutation.isPending}>
              Leave
            </button>
          </div>
        </div>

        {/* Club posts */}
        <div>
          {posts.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📝</div>
              <h3>No posts in this club yet</h3>
            </div>
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </div>
      </main>
    </div>
  );
}
