import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socketInstance = null;

export function useSocket(onNotification) {
  const { user } = useAuth();
  const callbackRef = useRef(onNotification);
  callbackRef.current = onNotification;

  useEffect(() => {
    if (!user) return;

    if (!socketInstance) {
      socketInstance = io(SOCKET_URL, { transports: ['websocket'] });
    }

    socketInstance.emit('join', user.id);

    const handleNotification = (notif) => {
      callbackRef.current?.(notif);

      const messages = {
        like:    `❤️ ${notif.actor?.username} liked your post`,
        comment: `💬 ${notif.actor?.username} commented on your post`,
        follow:  `👥 ${notif.actor?.username} started following you`,
      };

      toast(messages[notif.type] || 'You have a new notification', {
        style: {
          background: '#1e1b4b',
          color: '#e0e7ff',
          border: '1px solid #4f46e5',
          borderRadius: '12px',
          padding: '12px 16px',
        },
        duration: 4000,
      });
    };

    socketInstance.on('notification', handleNotification);
    return () => { socketInstance?.off('notification', handleNotification); };
  }, [user]);

  return socketInstance;
}
