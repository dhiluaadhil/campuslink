import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FiUsers, FiPlus } from 'react-icons/fi';
import Sidebar from '../components/Sidebar';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function Clubs() {
  const qc = useQueryClient();

  const { data: clubs = [], isLoading } = useQuery({
    queryKey: ['clubs'],
    queryFn: () => api.get('/clubs').then((r) => r.data),
  });

  const joinMutation = useMutation({
    mutationFn: (id) => api.post(`/clubs/${id}/join`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clubs'] }); toast.success('Joined!'); },
  });

  return (
    <div className="page-layout no-sidebar">
      <Sidebar />
      <main className="main-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>🏛️ Clubs</h2>
          <Link to="/clubs/new" className="btn btn-primary btn-sm">
            <FiPlus size={14} /> Create Club
          </Link>
        </div>

        {isLoading && <div className="spinner" />}

        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {clubs.map((club) => (
            <div key={club.id} className="club-card fade-in">
              {club.banner_url ? (
                <img src={club.banner_url} alt={club.name} className="club-banner" />
              ) : (
                <div className="club-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                  🎓
                </div>
              )}
              <div className="club-info">
                <Link to={`/clubs/${club.id}`}>
                  <h3 style={{ marginBottom: 4 }}>{club.name}</h3>
                </Link>
                {club.description && (
                  <p className="text-muted text-sm" style={{ marginBottom: 10, lineHeight: 1.4 }}>
                    {club.description.slice(0, 80)}{club.description.length > 80 ? '…' : ''}
                  </p>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-muted text-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FiUsers size={13} /> {club.member_count} members
                  </span>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => joinMutation.mutate(club.id)}
                    disabled={joinMutation.isPending}
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!isLoading && clubs.length === 0 && (
          <div className="empty-state">
            <div className="icon">🏛️</div>
            <h3>No clubs yet</h3>
            <p>Be the first to create one!</p>
          </div>
        )}
      </main>
    </div>
  );
}
