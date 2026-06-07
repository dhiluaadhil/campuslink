import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import Avatar from './Avatar';

const TYPE_LABELS = {
  like:    '❤️ liked your post',
  comment: '💬 commented on your post',
  follow:  '👥 started following you',
};

export default function NotificationItem({ notif }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (notif.post_id) navigate(`/post/${notif.post_id}`);
    else navigate(`/profile/${notif.actor_username}`);
  };

  return (
    <div
      className={`notif-item ${!notif.read ? 'unread' : ''} fade-in`}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      {!notif.read && (
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'var(--accent)', flexShrink: 0, marginTop: 6,
        }} />
      )}
      <Avatar src={notif.actor_avatar} username={notif.actor_username} size={40} />
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
          <span className="font-bold">@{notif.actor_username}</span>
          {' '}{TYPE_LABELS[notif.type] || 'interacted with you'}
        </p>
        <p className="text-muted text-sm" style={{ marginTop: 2 }}>
          {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}
