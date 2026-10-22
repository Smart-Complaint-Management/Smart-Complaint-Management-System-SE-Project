import { AlertTriangle, Clock, CheckCircle2, XCircle, CircleDashed } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDateTime, relativeTime } from '@/services/api';
import type { ComplaintStatus, ComplaintUpdate } from '@/types';

const statusIcon: Record<ComplaintStatus, typeof Clock> = {
  submitted: CircleDashed,
  under_review: Clock,
  in_progress: AlertTriangle,
  resolved: CheckCircle2,
  rejected: XCircle,
};

const lineColor: Record<ComplaintStatus, string> = {
  submitted: 'bg-ink-200',
  under_review: 'bg-amber-400',
  in_progress: 'bg-accent-500',
  resolved: 'bg-emerald-500',
  rejected: 'bg-rose-500',
};

interface ComplaintTimelineProps {
  updates: ComplaintUpdate[];
}

export function ComplaintTimeline({ updates }: ComplaintTimelineProps) {
  if (updates.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-ink-400">No status updates have been recorded yet.</p>
    );
  }

  const sorted = [...updates].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <ol className="relative">
      {sorted.map((update, index) => {
        const Icon = statusIcon[update.status];
        const isLast = index === sorted.length - 1;
        return (
          <li key={update.id} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Connector line */}
            {!isLast && (
              <span
                className={`absolute left-4 top-9 h-full w-0.5 ${lineColor[update.status]}`}
                aria-hidden
              />
            )}
            {/* Icon node */}
            <span
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white shadow-sm ${lineColor[update.status]} text-white`}
            >
              <Icon className="h-4 w-4" />
            </span>
            {/* Content */}
            <div className="flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={update.status} showDot={false} />
                <time className="text-xs text-ink-400" dateTime={update.timestamp}>
                  {formatDateTime(update.timestamp)} · {relativeTime(update.timestamp)}
                </time>
              </div>
              <p className="mt-1.5 text-sm text-ink-700">{update.message}</p>
              <p className="mt-1 text-xs text-ink-400">By {update.author}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
