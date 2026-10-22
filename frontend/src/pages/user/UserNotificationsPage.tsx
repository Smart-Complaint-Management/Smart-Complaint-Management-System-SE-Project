import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { NotificationItem } from '@/components/ui/NotificationItem';
import { mockNotifications } from '@/data/mockData';
import { Bell } from 'lucide-react';

export function UserNotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const notifications = filter === 'unread'
    ? mockNotifications.filter((n) => !n.read)
    : mockNotifications;

  const unreadCount = mockNotifications.filter((n) => !n.read).length;

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
              All ({mockNotifications.length})
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
        {notifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-6 w-6" />}
            title="No notifications"
            description={filter === 'unread' ? 'You have read all your notifications.' : 'You have no notifications yet.'}
          />
        ) : (
          notifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))
        )}
      </div>
    </div>
  );
}
