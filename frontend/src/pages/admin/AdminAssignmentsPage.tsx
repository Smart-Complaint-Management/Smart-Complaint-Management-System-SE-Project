import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { mockComplaints } from '@/data/mockData';
import { formatDate } from '@/services/api';

export function AdminAssignmentsPage() {
  const unassigned = mockComplaints.filter((c) => c.assignedTo === null);
  const assigned = mockComplaints.filter((c) => c.assignedTo !== null);

  const assignees = ['IT Support Desk', 'Facilities Maintenance', 'Registrar Office', 'Finance Office'];

  return (
    <div>
      <PageHeader
        title="Assignments"
        description="Review unassigned complaints and assign them to the appropriate team."
      />

      {/* Unassigned */}
      <div className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-ink-900">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
            {unassigned.length}
          </span>
          Awaiting Assignment
        </h2>
        {unassigned.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<ClipboardList className="h-6 w-6" />}
              title="All complaints are assigned"
              description="There are no complaints waiting for assignment right now."
            />
          </div>
        ) : (
          <div className="space-y-3">
            {unassigned.map((c) => (
              <div key={c.id} className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium text-ink-400">{c.id}</span>
                    <PriorityBadge priority={c.priority} />
                  </div>
                  <Link
                    to={`/complaints/${c.id}`}
                    className="mt-0.5 block text-sm font-medium text-ink-800 hover:text-accent-700"
                  >
                    {c.subject}
                  </Link>
                  <p className="mt-0.5 text-xs text-ink-400">
                    Submitted by {c.submittedBy} on {formatDate(c.submittedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={c.status} />
                  <select
                    className="input w-48 cursor-pointer"
                    defaultValue=""
                    aria-label={`Assign ${c.id}`}
                  >
                    <option value="" disabled>Select team...</option>
                    {assignees.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  <button className="btn btn-primary shrink-0" disabled>
                    Assign
                  </button>
                </div>
              </div>
            ))}
            <p className="px-1 text-xs text-ink-400">
              Assignment controls are UI affordances only. No changes are persisted in this demo.
            </p>
          </div>
        )}
      </div>

      {/* Assigned */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-ink-900">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
            {assigned.length}
          </span>
          Currently Assigned
        </h2>
        <div className="card divide-y divide-ink-100">
          {assigned.map((c) => (
            <Link
              key={c.id}
              to={`/complaints/${c.id}`}
              className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-ink-50 group"
            >
              <div className="min-w-0 flex-1">
                <span className="font-mono text-xs font-medium text-ink-400">{c.id}</span>
                <p className="mt-0.5 truncate text-sm font-medium text-ink-800 group-hover:text-accent-700">
                  {c.subject}
                </p>
              </div>
              <div className="hidden sm:block">
                <span className="rounded-lg bg-ink-50 px-2.5 py-1 text-xs font-medium text-ink-600">
                  {c.assignedTo}
                </span>
              </div>
              <StatusBadge status={c.status} />
              <ArrowRight className="h-4 w-4 shrink-0 text-ink-300 group-hover:text-accent-500" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
