import { Link } from 'react-router-dom';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { formatDate } from '@/services/api';
import { categoryLabels } from '@/data/mockData';
import type { Complaint } from '@/types';

interface ComplaintTableProps {
  complaints: Complaint[];
  showPriority?: boolean;
  showAssignedTo?: boolean;
  showEscalation?: boolean;
}

export function ComplaintTable({
  complaints,
  showPriority = false,
  showAssignedTo = false,
  showEscalation = false,
}: ComplaintTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-ink-100 text-left">
            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Complaint</th>
            <th className="hidden px-3 py-3 text-xs font-semibold uppercase tracking-wide text-ink-400 md:table-cell">Category</th>
            {showPriority && (
              <th className="hidden px-3 py-3 text-xs font-semibold uppercase tracking-wide text-ink-400 lg:table-cell">Priority</th>
            )}
            <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Status</th>
            {showAssignedTo && (
              <th className="hidden px-3 py-3 text-xs font-semibold uppercase tracking-wide text-ink-400 lg:table-cell">Assigned</th>
            )}
            <th className="hidden px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-400 lg:table-cell">Submitted</th>
            <th className="px-5 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {complaints.map((complaint) => (
            <tr
              key={complaint.id}
              className="border-b border-ink-50 transition-colors hover:bg-ink-50 last:border-0 group"
            >
              <td className="px-5 py-3.5">
                <Link to={`/complaints/${complaint.id}`} className="block">
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
                </Link>
              </td>
              <td className="hidden px-3 py-3.5 md:table-cell">
                <span className="text-xs text-ink-500">{categoryLabels[complaint.category]}</span>
              </td>
              {showPriority && (
                <td className="hidden px-3 py-3.5 lg:table-cell">
                  <PriorityBadge priority={complaint.priority} />
                </td>
              )}
              <td className="px-3 py-3.5">
                <StatusBadge status={complaint.status} />
              </td>
              {showAssignedTo && (
                <td className="hidden px-3 py-3.5 lg:table-cell">
                  <span className="text-xs text-ink-500">{complaint.assignedTo ?? '— Unassigned'}</span>
                </td>
              )}
              <td className="hidden px-3 py-3.5 text-right lg:table-cell">
                <span className="text-xs text-ink-400">{formatDate(complaint.submittedAt)}</span>
              </td>
              <td className="px-5 py-3.5 text-right">
                <Link to={`/complaints/${complaint.id}`}>
                  <ChevronRight className="ml-auto h-4 w-4 text-ink-300 group-hover:text-accent-500" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
