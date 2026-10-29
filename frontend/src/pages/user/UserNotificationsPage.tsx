import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { NotificationItem } from '@/components/ui/NotificationItem';
import { Bell } from 'lucide-react';
import { useAuth } from '@/pages/auth/authContext';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import type { AppNotification } from '@/types';

export function UserNotificationsPage() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    api.getNotifications(session)
      .then((items) => {
        if (active) {
          setNotifications(
            [...items].sort((a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
            ),
          );
        }
      })
      .catch((reason: unknown) => {
        if (!active) return;
        const status = (reason as { status?: number }).status;
        if (status === 401) {
          logout();
          navigate('/login', { replace: true });
          return;
        }
        setError(reason instanceof Error ? reason.message : 'Could not load notifications.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session, logout, navigate, reloadKey]);

  const visibleNotifications = filter === 'unread'
    ? notifications.filter((notification) => !notification.read)
    : notifications;

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Updates about your complaints, assignments, and resolutions."
        actions={
          <div className="flex items-center rounded-lg bg-ink-50 p-0.5">
            <button
              onClick={() => setFilter('all')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === 'all' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400 hover:text-ink-600'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === 'unread' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400 hover:text-ink-600'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>
        }
      />

      <div className="card overflow-hidden">
        {loading ? (
          <p role="status" className="p-8 text-center text-sm text-ink-400">Loading notifications...</p>
        ) : error ? (
          <div role="alert" className="p-6 text-center">
            <p className="text-sm text-rose-600">{error}</p>
            <button type="button" className="btn btn-secondary mt-3" onClick={() => setReloadKey((key) => key + 1)}>
              Try again
            </button>
          </div>
        ) : visibleNotifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-6 w-6" />}
            title="No notifications"
            description={filter === 'unread' ? 'You have read all your notifications.' : 'You have no notifications yet.'}
          />
        ) : (
          visibleNotifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))
        )}
      </div>
    </div>
  );
}
