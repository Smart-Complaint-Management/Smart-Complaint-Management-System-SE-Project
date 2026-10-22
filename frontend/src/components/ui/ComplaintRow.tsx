import { Link } from 'react-router-dom';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { formatDate } from '@/services/api';
import { categoryLabels } from '@/data/mockData';
import type { Complaint } from '@/types';

interface ComplaintRowProps {
  complaint: Complaint;
  showPriority?: boolean;
  showAssignedTo?: boolean;
  showEscalation?: boolean;
}

export function ComplaintRow({
  complaint,
  showPriority = false,
  showAssignedTo = false,
  showEscalation = false,
}: ComplaintRowProps) {
  return (
    <Link
      to={`/complaints/${complaint.id}`}
      className="flex items-center gap-4 border-b border-ink-100 px-5 py-3.5 transition-colors hover:bg-ink-50 last:border-0 group"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-medium text-ink-400">{complaint.id}</span>
          {showEscalation && complaint.isEscalated && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-600">
              <AlertTriangle className="h-3 w-3" /> Escalated
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-sm font-medium text-ink-800 group-hover:text-accent-700">
          {complaint.subject}
        </p>
      </div>
      <div className="hidden w-32 shrink-0 md:block">
        <span className="text-xs text-ink-500">{categoryLabels[complaint.category]}</span>
      </div>
      {showPriority && (
        <div className="hidden w-24 shrink-0 lg:block">
          <PriorityBadge priority={complaint.priority} />
        </div>
      )}
      <div className="w-28 shrink-0">
        <StatusBadge status={complaint.status} />
      </div>
      {showAssignedTo && (
        <div className="hidden w-32 shrink-0 lg:block">
          <span className="text-xs text-ink-500">{complaint.assignedTo ?? '— Unassigned'}</span>
        </div>
      )}
      <div className="hidden w-28 shrink-0 text-right lg:block">
        <p className="text-xs text-ink-400">{formatDate(complaint.submittedAt)}</p>
      </div>
      <div className="w-6 shrink-0 text-right">
        <ChevronRight className="h-4 w-4 text-ink-300 group-hover:text-accent-500" />
      </div>
    </Link>
  );
}
