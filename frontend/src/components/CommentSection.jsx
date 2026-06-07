import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { FiSend, FiTrash2 } from 'react-icons/fi';
import Avatar from './Avatar';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function CommentSection({ postId }) {
  const [body, setBody] = useState('');
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => api.get(`/comments/${postId}`).then((r) => r.data),
  });

  const addMutation = useMutation({
    mutationFn: (text) => api.post(`/comments/${postId}`, { body: text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      setBody('');
    },
    onError: () => toast.error('Failed to post comment'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/comments/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', postId] }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    addMutation.mutate(body.trim());
  };

  return (
    <div>
      {/* Comment input */}
      <form onSubmit={handleSubmit} style={{
        display: 'flex', gap: 12, padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
      }}>
        <Avatar src={user?.avatar_url} username={user?.username} size={36} />
        <div style={{ flex: 1, display: 'flex', gap: 8 }}>
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment…"
            className="form-input"
            style={{ flex: 1 }}
            maxLength={1000}
          />
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={!body.trim() || addMutation.isPending}
          >
            <FiSend size={14} />
          </button>
        </div>
      </form>

      {/* Comment list */}
      <div>
        {isLoading && <div className="spinner" />}
        {!isLoading && comments.length === 0 && (
          <div className="empty-state" style={{ padding: '32px 20px' }}>
            <p style={{ color: 'var(--text-muted)' }}>No comments yet. Be the first!</p>
          </div>
        )}
        {comments.map((c) => (
          <div key={c.id} className="notif-item fade-in">
            <Avatar src={c.avatar_url} username={c.username} size={36} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="font-bold" style={{ fontSize: '0.875rem' }}>@{c.username}</span>
                <span className="text-muted text-sm">
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                </span>
              </div>
              <p style={{ marginTop: 4, fontSize: '0.9rem', lineHeight: 1.5 }}>{c.body}</p>
            </div>
            {user?.id === c.author_id && (
              <button
                className="action-btn"
                onClick={() => deleteMutation.mutate(c.id)}
                style={{ color: 'var(--text-muted)' }}
              >
                <FiTrash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
