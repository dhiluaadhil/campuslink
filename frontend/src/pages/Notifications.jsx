import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FiBell, FiCheckCircle } from 'react-icons/fi';
import Sidebar from '../components/Sidebar';
import NotificationItem from '../components/NotificationItem';
import api from '../api/axios';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

export default function Notifications({ setUnreadCount }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data),
  });

  // Reset badge when page opens
  useEffect(() => {
    setUnreadCount?.(0);
  }, []);

  const markAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All marked as read');
    },
  });

  const notifications = data?.notifications ?? [];
  const unread = data?.unread_count ?? 0;

  return (
    <div className="page-layout no-sidebar">
      <Sidebar />
      <main className="main-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>
              <FiBell size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
              Notifications
              {unread > 0 && (
                <span className="badge" style={{ position: 'relative', top: -2, marginLeft: 8, fontSize: '0.7rem' }}>
                  {unread}
                </span>
              )}
            </h2>
          </div>
          {unread > 0 && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
            >
              <FiCheckCircle size={14} /> Mark all read
            </button>
          )}
        </div>

        {isLoading && <div className="spinner" />}

        {!isLoading && notifications.length === 0 && (
          <div className="empty-state">
            <div className="icon">🔔</div>
            <h3>All caught up!</h3>
            <p>You have no notifications right now</p>
          </div>
        )}

        <div>
          {notifications.map((notif) => (
            <NotificationItem key={notif.id} notif={notif} />
          ))}
        </div>
      </main>
    </div>
  );
}
