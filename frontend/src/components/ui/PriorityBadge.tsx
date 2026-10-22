import { priorityLabels } from '@/data/mockData';
import type { ComplaintPriority } from '@/types';

const priorityStyles: Record<ComplaintPriority, string> = {
  low: 'bg-ink-50 text-ink-500 border-ink-100',
  medium: 'bg-sky-50 text-sky-700 border-sky-100',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  critical: 'bg-rose-50 text-rose-700 border-rose-200',
};

export function PriorityBadge({ priority }: { priority: ComplaintPriority }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${priorityStyles[priority]}`}
    >
      {priorityLabels[priority]}
    </span>
  );
}
