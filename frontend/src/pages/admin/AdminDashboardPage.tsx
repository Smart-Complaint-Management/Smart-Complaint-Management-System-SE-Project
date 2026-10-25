
import { Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Inbox,
} from 'lucide-react';

import { PageHeader } from '@/components/ui/PageHeader';
import { SummaryMetric } from '@/components/ui/SummaryMetric';
import { ComplaintTable } from '@/components/ui/ComplaintTable';
import { getAdminComplaints } from '@/data/adminComplaintData';

export function AdminDashboardPage() {
  // Read the latest saved complaint data, including team assignments.
  const complaints = getAdminComplaints();

  const total = complaints.length;

  const open = complaints.filter(
    (c) =>
      c.status === 'submitted' ||
      c.status === 'under_review' ||
      c.status === 'in_progress',
  );

  const resolved = complaints.filter((c) => c.status === 'resolved');

  const escalated = complaints.filter((c) => c.isEscalated);

  const unassigned = complaints.filter((c) => c.assignedTo === null);

  const recent = [...complaints]
    .sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() -
        new Date(a.submittedAt).getTime(),
    )
    .slice(0, 5);

  const needsAttention = complaints.filter(
    (c) =>
      c.priority === 'critical' ||
      (c.priority === 'high' && c.assignedTo === null),
  );

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Operational overview of complaint activity across the platform."
      />

      {/* Summary metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryMetric
          label="Total Complaints"
          value={total}
          icon={FileText}
          hint="All registered complaints."
        />

        <SummaryMetric
          label="Open"
          value={open.length}
          icon={Clock}
          accent="warning"
          hint="Awaiting resolution."
        />

        <SummaryMetric
          label="Resolved"
          value={resolved.length}
          icon={CheckCircle2}
          accent="success"
          hint="Successfully closed."
        />

        <SummaryMetric
          label="Escalated"
          value={escalated.length}
          icon={AlertTriangle}
          accent="danger"
          hint="Require administrative review."
        />
      </div>

      {/* Unassigned complaints alert */}
      {unassigned.length > 0 && (
        <div className="card mt-6 flex items-center gap-4 border-accent-200 bg-accent-50/40 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-100 text-accent-700">
            <Inbox className="h-5 w-5" />
          </div>

          <div className="flex-1">
            <p className="text-sm font-medium text-ink-800">
              {unassigned.length} complaint
              {unassigned.length !== 1 ? 's' : ''} awaiting assignment
            </p>

            <p className="text-xs text-ink-500">
              Review and assign these complaints to the appropriate team.
            </p>
          </div>

          <Link
            to="/admin/assignments"
            className="btn btn-secondary shrink-0"
          >
            Review <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Dashboard sections */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent complaints */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink-900">
              Recent Complaints
            </h2>

            <Link
              to="/admin/complaints"
              className="flex items-center gap-1 text-sm font-medium text-accent-600 hover:text-accent-700"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="card">
            <ComplaintTable
              complaints={recent}
              showPriority
              showAssignedTo
              showEscalation
            />
          </div>
        </div>

        {/* Complaints requiring attention */}
        <div>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-ink-900">
              Requires Attention
            </h2>
          </div>

          <div className="card divide-y divide-ink-100">
            {needsAttention.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink-400">
                No complaints require immediate attention.
              </p>
            ) : (
              needsAttention.map((c) => (
                <Link
                  key={c.id}
                  to={`/complaints/${c.id}`}
                  className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-ink-50"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-800 group-hover:text-accent-700">
                      {c.subject}
                    </p>

                    <p className="font-mono text-xs text-ink-400">
                      {c.id}
                    </p>
                  </div>

                  <ArrowRight className="h-4 w-4 shrink-0 text-ink-300 group-hover:text-accent-500" />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Escalated complaints */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink-900">
              Escalated
            </h2>

            <Link
              to="/admin/escalations"
              className="flex items-center gap-1 text-sm font-medium text-accent-600 hover:text-accent-700"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="card divide-y divide-ink-100">
            {escalated.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink-400">
                No escalated complaints.
              </p>
            ) : (
              escalated.map((c) => (
                <Link
                  key={c.id}
                  to={`/complaints/${c.id}`}
                  className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-ink-50"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-800 group-hover:text-accent-700">
                      {c.subject}
                    </p>

                    <p className="font-mono text-xs text-ink-400">
                      {c.id}
                    </p>
                  </div>

                  <ArrowRight className="h-4 w-4 shrink-0 text-ink-300 group-hover:text-accent-500" />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
