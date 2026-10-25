
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Inbox,
  Search,
  X,
} from 'lucide-react';

import { PageHeader } from '@/components/ui/PageHeader';
import { SummaryMetric } from '@/components/ui/SummaryMetric';
import { ComplaintTable } from '@/components/ui/ComplaintTable';
import { getAdminComplaints } from '@/data/adminComplaintData';

const statusLabels: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

const priorityLabels: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export function AdminDashboardPage() {
  const complaints = useMemo(() => getAdminComplaints(), []);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const { total, open, resolved, escalated, unassigned, recent, needsAttention } =
    useMemo(() => {
      const openComplaints = [];
      const resolvedComplaints = [];
      const escalatedComplaints = [];
      const unassignedComplaints = [];
      const attentionComplaints = [];

      for (const complaint of complaints) {
        if (
          complaint.status === 'submitted' ||
          complaint.status === 'under_review' ||
          complaint.status === 'in_progress'
        ) {
          openComplaints.push(complaint);
        }

        if (complaint.status === 'resolved') {
          resolvedComplaints.push(complaint);
        }

        if (complaint.isEscalated) {
          escalatedComplaints.push(complaint);
        }

        if (
          complaint.assignedTo === null ||
          complaint.assignedTo.trim() === ''
        ) {
          unassignedComplaints.push(complaint);
        }

        if (
          complaint.priority === 'critical' ||
          (complaint.priority === 'high' &&
            (complaint.assignedTo === null ||
              complaint.assignedTo.trim() === ''))
        ) {
          attentionComplaints.push(complaint);
        }
      }

      const recentComplaints = [...complaints]
        .sort(
          (a, b) =>
            new Date(b.submittedAt).getTime() -
            new Date(a.submittedAt).getTime(),
        )
        .slice(0, 5);

      return {
        total: complaints.length,
        open: openComplaints,
        resolved: resolvedComplaints,
        escalated: escalatedComplaints,
        unassigned: unassignedComplaints,
        recent: recentComplaints,
        needsAttention: attentionComplaints,
      };
    }, [complaints]);

  const filteredComplaints = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return complaints.filter((complaint) => {
      const matchesSearch =
        normalizedQuery === '' ||
        complaint.id.toLowerCase().includes(normalizedQuery) ||
        complaint.subject.toLowerCase().includes(normalizedQuery);

      const matchesStatus =
        statusFilter === 'all' || complaint.status === statusFilter;

      const matchesPriority =
        priorityFilter === 'all' || complaint.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [complaints, searchQuery, statusFilter, priorityFilter]);

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

      {/* Search and filters */}
      <section className="card mt-8 p-5">
        <h2 className="mb-1 text-base font-semibold text-ink-900">
          Search & Filter Complaints
        </h2>
        <p className="mb-4 text-xs text-ink-500">
          Search by complaint ID or subject, or narrow the results by status
          and priority.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label
              htmlFor="dashboard-complaint-search"
              className="mb-1.5 block text-sm font-medium text-ink-700"
            >
              Search
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                id="dashboard-complaint-search"
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Complaint ID or subject..."
                className="w-full rounded-lg border border-ink-200 bg-white py-2 pl-9 pr-3 text-sm text-ink-900 outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="dashboard-status-filter"
              className="mb-1.5 block text-sm font-medium text-ink-700"
            >
              Status
            </label>
            <select
              id="dashboard-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
            >
              <option value="all">All statuses</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="dashboard-priority-filter"
              className="mb-1.5 block text-sm font-medium text-ink-700"
            >
              Priority
            </label>
            <select
              id="dashboard-priority-filter"
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
            >
              <option value="all">All priorities</option>
              {Object.entries(priorityLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-500" aria-live="polite">
            Showing {filteredComplaints.length} of {total} complaints
          </p>

          {(searchQuery ||
            statusFilter !== 'all' ||
            priorityFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setPriorityFilter('all');
              }}
              className="inline-flex items-center gap-1 text-sm font-medium text-accent-600 hover:text-accent-700"
            >
              <X className="h-4 w-4" />
              Clear filters
            </button>
          )}
        </div>

        <div className="mt-4 overflow-x-auto">
          {filteredComplaints.length === 0 ? (
            <p className="rounded-lg bg-ink-50 px-4 py-8 text-center text-sm text-ink-500">
              No complaints match your search or selected filters.
            </p>
          ) : (
            <ComplaintTable
              complaints={filteredComplaints}
              showPriority
              showAssignedTo
              showEscalation
            />
          )}
        </div>
      </section>

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
              needsAttention.map((complaint) => (
                <Link
                  key={complaint.id}
                  to={`/complaints/${complaint.id}`}
                  className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-ink-50"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-800 group-hover:text-accent-700">
                      {complaint.subject}
                    </p>
                    <p className="font-mono text-xs text-ink-400">
                      {complaint.id}
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
              escalated.map((complaint) => (
                <Link
                  key={complaint.id}
                  to={`/complaints/${complaint.id}`}
                  className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-ink-50"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-800 group-hover:text-accent-700">
                      {complaint.subject}
                    </p>
                    <p className="font-mono text-xs text-ink-400">
                      {complaint.id}
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
