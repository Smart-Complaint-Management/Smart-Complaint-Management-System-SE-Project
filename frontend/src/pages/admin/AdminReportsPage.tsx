
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Users,
  RefreshCw,
  Download,
} from 'lucide-react';

import { PageHeader } from '@/components/ui/PageHeader';
import { SummaryMetric } from '@/components/ui/SummaryMetric';
import { getAdminComplaints } from '@/data/adminComplaintData';
import { categoryLabels, statusLabels } from '@/data/mockData';

export function AdminReportsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const complaints = getAdminComplaints();
  void refreshKey;

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

  const byCategory = Object.entries(categoryLabels)
    .map(([value, label]) => ({
      label,
      count: complaints.filter((c) => c.category === value).length,
    }))
    .filter((category) => category.count > 0);

  const maxCategory = Math.max(...byCategory.map((c) => c.count), 1);

  const byStatus = Object.entries(statusLabels)
    .map(([value, label]) => ({
      value,
      label,
      count: complaints.filter((c) => c.status === value).length,
    }))
    .filter((status) => status.count > 0);

  const maxStatus = Math.max(...byStatus.map((s) => s.count), 1);

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

  // Export the current report metrics and breakdowns as a CSV file.
  const handleExportReport = () => {
    const rows: (string | number)[][] = [
      ['Smart Complaint Management System - Report'],
      ['Generated At', new Date().toLocaleString()],
      [],
      ['Metric', 'Value'],
      ['Total Complaints', total],
      ['Open Complaints', open.length],
      ['Resolved Complaints', resolved.length],
      ['Rejected Complaints', rejected.length],
      ['Resolution Rate', `${resolutionRate}%`],
      ['Escalation Rate', `${escalationRate}%`],
      ['Assigned Complaints', assigned.length],
      ['Awaiting Assignment', unassigned.length],
      [
        'Average Resolution Time (days)',
        averageResolutionDays ?? 'N/A',
      ],
      [],
      ['Complaints by Category'],
      ['Category', 'Count'],
      ...byCategory.map((item) => [item.label, item.count]),
      [],
      ['Complaints by Status'],
      ['Status', 'Count'],
      ...byStatus.map((item) => [item.label, item.count]),
      [],
      ['Team Assignment Breakdown'],
      ['Team', 'Count'],
      ...byTeam.map((item) => [item.team, item.count]),
    ];

    const escapeCsv = (value: string | number) =>
      `"${String(value).replace(/"/g, '""')}"`;

    const csv = rows
      .map((row) => row.map(escapeCsv).join(','))
      .join('\r\n');

    const blob = new Blob(['\uFEFF', csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `scms-report-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    // Revoke after the browser has had time to start the download.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <PageHeader
            title="Reports & Analytics"
            description="Summary of complaint activity, category distribution, team assignments, and status breakdown."
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setRefreshKey((previous) => previous + 1)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-700 shadow-sm transition-colors hover:bg-ink-50 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2"
            aria-label="Refresh reports"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Reports
          </button>

          <button
            type="button"
            onClick={handleExportReport}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ink-800 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2"
          >
            <Download className="h-4 w-4" />
            Download Report
          </button>
        </div>
      </div>

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

      {/* Category and status breakdowns */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-1 text-base font-semibold text-ink-900">
            Complaints by Category
          </h2>
          <p className="mb-5 text-xs text-ink-400">
            Distribution across complaint categories.
          </p>

          {byCategory.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400">
              No category data available.
            </p>
          ) : (
            <div className="space-y-3">
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

        <div className="card p-6">
          <h2 className="mb-1 text-base font-semibold text-ink-900">
            Status Breakdown
          </h2>
          <p className="mb-5 text-xs text-ink-400">
            Current status of all complaints.
          </p>

          {byStatus.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400">
              No status data available.
            </p>
          ) : (
            <div className="space-y-3">
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
          <h2 className="text-base font-semibold text-ink-900">
            Team Assignment Breakdown
          </h2>
        </div>

        <p className="mb-5 text-xs text-ink-400">
          Number of complaints assigned to each team, including unassigned
          complaints.
        </p>

        {byTeam.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-400">
            No assignment data available.
          </p>
        ) : (
          <div className="space-y-4">
            {byTeam.map(({ team, count }) => (
              <div key={team}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span className="text-ink-600">{team}</span>
                  <span className="font-medium text-ink-800">
                    {count} (
                    {total > 0 ? Math.round((count / total) * 100) : 0}%)
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

      {/* Summary metrics */}
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
          <p className="mt-1 text-[10px] text-ink-400">
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
