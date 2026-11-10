import { Link } from 'react-router-dom';
import { History, ShieldCheck, UserCheck, RefreshCw, AlertCircle } from 'lucide-react';
import type { AdminActionType, AdminAuditEvent } from '@/types/admin';
import { getAdminAuditEvents } from '@/services/adminAuditService';

interface AdminAuditHistoryProps {
  entries?: AdminAuditEvent[];
  complaintId?: string;
  maxEntries?: number;
  emptyMessage?: string;
}

function getActionBadge(action: AdminActionType) {
  switch (action) {
    case 'ASSIGNED':
      return {
        label: 'Assigned',
        classes: 'bg-accent-50 text-accent-700 border-accent-200',
        icon: UserCheck,
      };
    case 'REASSIGNED':
      return {
        label: 'Reassigned',
        classes: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: RefreshCw,
      };
    case 'STATUS_CHANGED':
      return {
        label: 'Status Changed',
        classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: ShieldCheck,
      };
    case 'ESCALATION_REVIEWED':
      return {
        label: 'Escalation Reviewed',
        classes: 'bg-rose-50 text-rose-700 border-rose-200',
        icon: AlertCircle,
      };
    default:
      return {
        label: action,
        classes: 'bg-ink-50 text-ink-700 border-ink-200',
        icon: History,
      };
  }
}

export function AdminAuditHistory({
  entries,
  complaintId,
  maxEntries = 50,
  emptyMessage = 'No administrative activity recorded yet.',
}: AdminAuditHistoryProps) {
  const allEvents = entries ?? getAdminAuditEvents(complaintId);
  const displayEvents = allEvents.slice(0, maxEntries);

  if (displayEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-ink-200 py-8 text-center">
        <History className="h-8 w-8 text-ink-300" />
        <p className="mt-2 text-sm text-ink-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-ink-100" role="feed" aria-label="Administrative audit trail">
      {displayEvents.map((event) => {
        const badge = getActionBadge(event.action);
        const IconComponent = badge.icon;

        return (
          <article
            key={event.id}
            className="flex flex-col gap-2 py-3.5 first:pt-1 last:pb-1 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${badge.classes}`}
                >
                  <IconComponent className="h-3 w-3" />
                  {badge.label}
                </span>

                <Link
                  to={`/complaints/${event.complaintId}`}
                  className="font-mono text-xs font-semibold text-accent-700 hover:underline"
                >
                  {event.complaintId}
                </Link>

                <span className="font-mono text-[11px] text-ink-400">
                  ID: {event.id}
                </span>
              </div>

              <div className="mt-1.5 text-sm text-ink-800">
                {event.previousValue ? (
                  <span>
                    <span className="font-medium text-ink-600 line-through">
                      {event.previousValue}
                    </span>{' '}
                    <span className="text-ink-400 font-bold">→</span>{' '}
                    <span className="font-semibold text-ink-900">
                      {event.newValue}
                    </span>
                  </span>
                ) : (
                  <span>
                    Set to{' '}
                    <span className="font-semibold text-ink-900">
                      {event.newValue}
                    </span>
                  </span>
                )}
              </div>

              {event.details && (
                <p className="mt-0.5 text-xs text-ink-500">{event.details}</p>
              )}
            </div>

            <div className="shrink-0 text-left sm:text-right">
              <p className="text-xs font-medium text-ink-700">
                {event.actor.name}{' '}
                <span className="text-ink-400">({event.actor.role})</span>
              </p>
              <time
                dateTime={event.timestamp}
                className="text-[11px] text-ink-400"
              >
                {new Date(event.timestamp).toLocaleString()}
              </time>
            </div>
          </article>
        );
      })}
    </div>
  );
}
