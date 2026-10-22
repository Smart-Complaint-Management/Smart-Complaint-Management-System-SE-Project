import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { mockComplaints, mockUpdates } from '@/data/mockData';
import { formatDate, relativeTime } from '@/services/api';

export function AdminEscalationsPage() {
  const escalated = mockComplaints.filter((c) => c.isEscalated);

  return (
    <div>
      <PageHeader
        title="Escalations"
        description="Review and handle complaints that have been escalated by users."
      />

      {escalated.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<AlertTriangle className="h-6 w-6" />}
            title="No escalated complaints"
            description="There are no escalations to review at this time."
          />
        </div>
      ) : (
        <div className="space-y-4">
          {escalated.map((c) => {
            const escalationUpdate = mockUpdates
              .filter((u) => u.complaintId === c.id)
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

            return (
              <div key={c.id} className="card border-rose-100 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                  {/* Left: info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600">
                        <AlertTriangle className="h-3 w-3" /> Escalated
                      </span>
                      <span className="font-mono text-xs font-medium text-ink-400">{c.id}</span>
                      <PriorityBadge priority={c.priority} />
                    </div>
                    <Link
                      to={`/complaints/${c.id}`}
                      className="mt-1.5 block text-sm font-semibold text-ink-800 hover:text-accent-700"
                    >
                      {c.subject}
                    </Link>
                    <p className="mt-1 text-sm text-ink-500">{c.description}</p>
                    {escalationUpdate && (
                      <div className="mt-3 rounded-lg bg-rose-50/50 px-3 py-2">
                        <p className="text-xs font-medium text-rose-700">
                          Escalation reason — {relativeTime(escalationUpdate.timestamp)}
                        </p>
                        <p className="mt-0.5 text-sm text-ink-600">{escalationUpdate.message}</p>
                        <p className="mt-1 text-xs text-ink-400">
                          Requested by {escalationUpdate.author} · {formatDate(escalationUpdate.timestamp)}
                        </p>
                      </div>
                    )}
                  </div>
                  {/* Right: actions */}
                  <div className="flex shrink-0 flex-col items-start gap-2 lg:w-48">
                    <StatusBadge status={c.status} />
                    <span className="text-xs text-ink-400">Assigned: {c.assignedTo ?? 'Unassigned'}</span>
                    <Link to={`/complaints/${c.id}`} className="btn btn-secondary w-full">
                      Review & Handle <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
