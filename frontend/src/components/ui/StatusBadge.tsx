import { categoryLabels, statusLabels } from '@/data/mockData';
import type { ComplaintCategory, ComplaintStatus } from '@/types';

const statusStyles: Record<ComplaintStatus, string> = {
  submitted: 'bg-ink-100 text-ink-600 border-ink-200',
  under_review: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-accent-50 text-accent-700 border-accent-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
};

const statusDot: Record<ComplaintStatus, string> = {
  submitted: 'bg-ink-400',
  under_review: 'bg-amber-500',
  in_progress: 'bg-accent-500',
  resolved: 'bg-emerald-500',
  rejected: 'bg-rose-500',
};

interface StatusBadgeProps {
  status: ComplaintStatus;
  showDot?: boolean;
}

export function StatusBadge({ status, showDot = true }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyles[status]}`}
    >
      {showDot && <span className={`h-1.5 w-1.5 rounded-full ${statusDot[status]}`} />}
      {statusLabels[status]}
    </span>
  );
}

export function CategoryBadge({ category }: { category: ComplaintCategory }) {
  return (
    <span className="inline-flex items-center rounded-full bg-ink-50 px-2.5 py-0.5 text-xs font-medium text-ink-500 border border-ink-100">
      {categoryLabels[category]}
    </span>
  );
}
