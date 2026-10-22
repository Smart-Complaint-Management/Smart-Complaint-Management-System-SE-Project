import { Link } from 'react-router-dom';
import { formatDateTime, relativeTime } from '@/services/api';
import type { AppNotification, NotificationType } from '@/types';

const typeIcon: Record<NotificationType, string> = {
  status_update: 'bg-accent-50 text-accent-600',
  assignment: 'bg-sky-50 text-sky-600',
  escalation: 'bg-rose-50 text-rose-600',
  resolution: 'bg-emerald-50 text-emerald-600',
};

const typeLabel: Record<NotificationType, string> = {
  status_update: 'Status Update',
  assignment: 'Assignment',
  escalation: 'Escalation',
  resolution: 'Resolution',
};

interface NotificationItemProps {
  notification: AppNotification;
}

export function NotificationItem({ notification }: NotificationItemProps) {
  return (
    <Link
      to={`/complaints/${notification.complaintId}`}
      className={`flex gap-4 border-b border-ink-100 px-5 py-4 transition-colors hover:bg-ink-50 last:border-0 ${
        !notification.read ? 'bg-accent-50/30' : ''
      }`}
    >
      <div className="flex flex-col items-center gap-1 pt-1">
        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${typeIcon[notification.type]}`}>
          {notification.complaintId.slice(-2)}
        </span>
        {!notification.read && <span className="h-2 w-2 rounded-full bg-accent-500" aria-label="Unread" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-ink-800">{notification.title}</p>
          <span className="rounded bg-ink-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-400">
            {typeLabel[notification.type]}
          </span>
        </div>
        <p className="mt-1 text-sm text-ink-500">{notification.message}</p>
        <p className="mt-1.5 text-xs text-ink-400">
          {formatDateTime(notification.timestamp)} · {relativeTime(notification.timestamp)}
        </p>
      </div>
    </Link>
  );
}
