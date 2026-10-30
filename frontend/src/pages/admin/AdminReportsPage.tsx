
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Download,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Users,
  RefreshCw,
} from 'lucide-react';

import { PageHeader } from '@/components/ui/PageHeader';
import { SummaryMetric } from '@/components/ui/SummaryMetric';
import { getAdminComplaints } from '@/data/adminComplaintData';
import { categoryLabels, statusLabels } from '@/data/mockData';

export function AdminReportsPage() {
  // Read saved complaints on mount, and again when the admin refreshes.
  const [complaints, setComplaints] = useState(getAdminComplaints);

  const downloadCsv = () => {
    const columns: Array<{ label: string; value: (complaint: (typeof complaints)[number]) => string | number | boolean | null }> = [
      { label: 'ID', value: (c) => c.id },
      { label: 'Subject', value: (c) => c.subject },
      { label: 'Description', value: (c) => c.description },
      { label: 'Category', value: (c) => categoryLabels[c.category] ?? c.category },
      { label: 'Status', value: (c) => statusLabels[c.status] ?? c.status },
      { label: 'Priority', value: (c) => c.priority },
      { label: 'Submitted By', value: (c) => c.submittedBy },
      { label: 'Assigned To', value: (c) => c.assignedTo },
      { label: 'Submitted At', value: (c) => c.submittedAt },
      { label: 'Updated At', value: (c) => c.updatedAt },
      { label: 'Escalated', value: (c) => c.isEscalated },
      { label: 'Possible Duplicate ID', value: (c) => c.possibleDuplicateId },
    ];
    const escapeCsv = (value: string | number | boolean | null) => {
      const text = value == null ? '' : String(value);
      return `"${text.replace(/"/g, '""')}"`;
    };
    const csv = [
      columns.map(({ label }) => escapeCsv(label)).join(','),
      ...complaints.map((complaint) =>
        columns.map(({ value }) => escapeCsv(value(complaint))).join(','),
      ),
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'complaint-reports.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const total = complaints.length;
  const resolved = complaints.filter((c) => c.status === 'resolved');
  const open = complaints.filter(
    (c) => c.status !== 'resolved' && c.status !== 'rejected',
  );
  const rejected = complaints.filter((c) => c.status === 'rejected');
  const escalated = complaints.filter((c) => c.isEscalated);

  const assigned = complaints.filter(
    (c) => c.assignedTo !== null && c.assignedTo.trim() !== '',
  );
  const unassigned = complaints.filter(
    (c) => c.assignedTo === null || c.assignedTo.trim() === '',
  );

  const resolutionRate =
    total > 0 ? Math.round((resolved.length / total) * 100) : 0;

  const escalationRate =
    total > 0 ? Math.round((escalated.length / total) * 100) : 0;

  const assignmentRate =
    total > 0 ? Math.round((assigned.length / total) * 100) : 0;

  // Category breakdown
  const byCategory = Object.entries(categoryLabels)
    .map(([value, label]) => ({
      label,
      count: complaints.filter((c) => c.category === value).length,
    }))
    .filter((category) => category.count > 0);

  const maxCategory = Math.max(...byCategory.map((c) => c.count), 1);

  // Status breakdown
  const byStatus = Object.entries(statusLabels)
    .map(([value, label]) => ({
      value,
      label,
      count: complaints.filter((c) => c.status === value).length,
    }))
    .filter((status) => status.count > 0);

  const maxStatus = Math.max(...byStatus.map((s) => s.count), 1);

  // Team assignment breakdown
  const teamCounts = new Map<string, number>();

  complaints.forEach((complaint) => {
    const team =
      complaint.assignedTo && complaint.assignedTo.trim() !== ''
        ? complaint.assignedTo.trim()
        : 'Unassigned';

    teamCounts.set(team, (teamCounts.get(team) ?? 0) + 1);
  });

  const byTeam = Array.from(teamCounts.entries())
    .map(([team, count]) => ({ team, count }))
    .sort((a, b) => b.count - a.count);

  const maxTeam = Math.max(...byTeam.map((team) => team.count), 1);

  // Calculate average resolution time from resolved complaints.
  // This uses submittedAt and updatedAt as a demo approximation.
  const resolutionDurations = resolved
    .map((complaint) => {
      const submitted = new Date(complaint.submittedAt).getTime();
      const updated = new Date(complaint.updatedAt).getTime();

      if (
        !Number.isFinite(submitted) ||
        !Number.isFinite(updated) ||
        updated < submitted
      ) {
        return null;
      }

      return updated - submitted;
    })
    .filter((duration): duration is number => duration !== null);

  const averageResolutionDays =
    resolutionDurations.length > 0
      ? (
          resolutionDurations.reduce((sum, duration) => sum + duration, 0) /
          resolutionDurations.length /
          (1000 * 60 * 60 * 24)
        ).toFixed(1)
      : null;

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="Summary of complaint activity, category distribution, team assignments, and status breakdown."
        actions={
          <>
            <button
              type="button"
              onClick={() => setComplaints(getAdminComplaints())}
              className="btn btn-secondary inline-flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button
              type="button"
              onClick={downloadCsv}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <Download className="h-4 w-4" /> Download CSV
            </button>
          </>
        }
      />

      <p className="mb-5 text-xs text-ink-400">
        Demo analytics based on complaint data saved in this browser. These
        figures are not live, shared backend statistics.
      </p>

      {/* Top metrics */}
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
          hint="Not resolved or rejected."
        />

        <SummaryMetric
          label="Resolved"
          value={resolved.length}
          icon={CheckCircle2}
          accent="success"
          hint="Successfully closed."
        />

        <SummaryMetric
          label="Resolution Rate"
          value={`${resolutionRate}%`}
          icon={TrendingUp}
          accent="success"
          hint={`${resolved.length} of ${total} resolved`}
        />
      </div>

      {/* Assignment metrics */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm text-ink-500">Assigned Complaints</p>
          <p className="mt-1 text-2xl font-semibold text-ink-900">
            {assigned.length}
          </p>
          <p className="mt-1 text-xs text-ink-400">
            {assignmentRate}% of all complaints
          </p>
        </div>

        <div className="card p-5">
          <p className="text-sm text-ink-500">Awaiting Assignment</p>
          <p className="mt-1 text-2xl font-semibold text-ink-900">
            {unassigned.length}
          </p>
          <p className="mt-1 text-xs text-ink-400">
            Complaints without a team
          </p>
        </div>

        <div className="card p-5">
          <p className="text-sm text-ink-500">Teams Handling Complaints</p>
          <p className="mt-1 text-2xl font-semibold text-ink-900">
            {byTeam.filter((team) => team.team !== 'Unassigned').length}
          </p>
          <p className="mt-1 text-xs text-ink-400">
            Distinct assigned teams
          </p>
        </div>
      </div>

      {/* Category and status charts */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category distribution */}
        <div className="card p-6">
          <h2 id="category-chart-heading" className="mb-1 text-base font-semibold text-ink-900">
            Complaints by Category
          </h2>
          <p id="category-chart-description" className="mb-5 text-sm text-ink-600">
            Distribution across complaint categories.
          </p>

          {byCategory.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400">
              No category data available.
            </p>
          ) : (
            <div role="group" aria-labelledby="category-chart-heading" aria-describedby="category-chart-description" className="space-y-3">
              {byCategory.map((category) => (
                <div key={category.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-ink-600">{category.label}</span>
                    <span className="font-medium text-ink-800">
                      {category.count}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-ink-50">
                    <div
                      className="h-full rounded-full bg-accent-500 transition-all duration-300"
                      style={{
                        width: `${(category.count / maxCategory) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status breakdown */}
        <div className="card p-6">
          <h2 id="status-chart-heading" className="mb-1 text-base font-semibold text-ink-900">
            Status Breakdown
          </h2>
          <p id="status-chart-description" className="mb-5 text-sm text-ink-600">
            Current status of all complaints.
          </p>

          {byStatus.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400">
              No status data available.
            </p>
          ) : (
            <div role="group" aria-labelledby="status-chart-heading" aria-describedby="status-chart-description" className="space-y-3">
              {byStatus.map((status) => {
                const statusColor: Record<string, string> = {
                  submitted: 'bg-ink-400',
                  under_review: 'bg-amber-500',
                  in_progress: 'bg-accent-500',
                  resolved: 'bg-emerald-500',
                  rejected: 'bg-rose-500',
                };

                return (
                  <div key={status.value}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-ink-600">{status.label}</span>
                      <span className="font-medium text-ink-800">
                        {status.count}
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-ink-50">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${statusColor[status.value] ?? 'bg-ink-400'}`}
                        style={{
                          width: `${(status.count / maxStatus) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Team assignment breakdown */}
      <div className="card mt-6 p-6">
        <div className="mb-1 flex items-center gap-2">
          <Users className="h-5 w-5 text-accent-600" />
          <h2 id="team-chart-heading" className="text-base font-semibold text-ink-900">
            Team Assignment Breakdown
          </h2>
        </div>

        <p id="team-chart-description" className="mb-5 text-sm text-ink-600">
          Number of complaints assigned to each team, including unassigned
          complaints.
        </p>

        {byTeam.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-400">
            No assignment data available.
          </p>
        ) : (
          <div role="group" aria-labelledby="team-chart-heading" aria-describedby="team-chart-description" className="space-y-4">
            {byTeam.map(({ team, count }) => (
              <div key={team}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span className="text-ink-600">{team}</span>
                  <span className="font-medium text-ink-800">
                    {count} ({total > 0 ? Math.round((count / total) * 100) : 0}%)
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-ink-50">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      team === 'Unassigned' ? 'bg-amber-500' : 'bg-accent-500'
                    }`}
                    style={{ width: `${(count / maxTeam) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary footer */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-ink-500">Escalation Rate</p>
              <p className="text-xl font-semibold text-ink-900">
                {escalationRate}%
              </p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink-50 text-ink-500">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-ink-500">Rejected</p>
              <p className="text-xl font-semibold text-ink-900">
                {rejected.length}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-ink-500">Avg. Resolution</p>
              <p className="text-xl font-semibold text-ink-900">
                {averageResolutionDays === null
                  ? 'N/A'
                  : `${averageResolutionDays} days`}
              </p>
            </div>
          </div>
          <p className="mt-1 text-sm text-ink-600">
            Demo estimate using submitted and updated timestamps.
          </p>
        </div>
      </div>

      {/* Link to all complaints */}
      <div className="mt-6">
        <Link
          to="/admin/complaints"
          className="flex items-center gap-1 text-sm font-medium text-accent-600 hover:text-accent-700"
        >
          Browse full complaint list <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
