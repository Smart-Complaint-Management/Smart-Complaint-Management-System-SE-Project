import { useState, useCallback, useTransition } from 'react';
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
import {
  getReportComplaints,
  generateReportData,
} from '@/services/adminReportService';
import {
  buildCsvContent,
  triggerCsvDownload,
  COMPLAINT_CSV_COLUMNS,
} from '@/services/csvExportService';

export function AdminReportsPage() {
  const [reportData, setReportData] = useState(() => generateReportData());
  const [complaints, setComplaints] = useState(() => getReportComplaints());
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRefresh = useCallback(() => {
    startTransition(() => {
      const freshComplaints = getReportComplaints();
      const freshData = generateReportData(freshComplaints);
      setComplaints(freshComplaints);
      setReportData(freshData);
      setRefreshMessage(`Reports reloaded at ${new Date().toLocaleTimeString()}`);
    });
  }, []);

  const handleDownloadCsv = () => {
    const csv = buildCsvContent(complaints, COMPLAINT_CSV_COLUMNS);
    triggerCsvDownload(csv);
  };

  const { metrics, byCategory, byStatus, byTeam } = reportData;

  const maxCategory = Math.max(...byCategory.map((c) => c.count), 1);
  const maxStatus = Math.max(...byStatus.map((s) => s.count), 1);
  const maxTeam = Math.max(...byTeam.map((t) => t.count), 1);

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="Comprehensive analysis of complaint activity, category distribution, department allocations, and resolution rates."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isPending}
              aria-label="Refresh report metrics"
              className="btn btn-secondary inline-flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${isPending ? 'animate-spin text-accent-600' : ''}`}
              />
              {isPending ? 'Refreshing...' : 'Refresh'}
            </button>

            <button
              type="button"
              onClick={handleDownloadCsv}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <Download className="h-4 w-4" /> Download CSV
            </button>
          </div>
        }
      />

      {refreshMessage && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 flex items-center justify-between rounded-lg border border-accent-200 bg-accent-50/50 px-4 py-2 text-xs font-medium text-accent-800"
        >
          <span>{refreshMessage}</span>
          <button
            type="button"
            onClick={() => setRefreshMessage(null)}
            className="text-xs underline hover:text-accent-950"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryMetric
          label="Total Complaints"
          value={metrics.total}
          icon={FileText}
          hint="All registered complaints in system."
        />

        <SummaryMetric
          label="Open"
          value={metrics.open}
          icon={Clock}
          accent="warning"
          hint="Awaiting triage or resolution."
        />

        <SummaryMetric
          label="Resolved"
          value={metrics.resolved}
          icon={CheckCircle2}
          accent="success"
          hint="Successfully resolved."
        />

        <SummaryMetric
          label="Resolution Rate"
          value={`${metrics.resolutionRate}%`}
          icon={TrendingUp}
          accent="success"
          hint={`${metrics.resolved} of ${metrics.total} resolved`}
        />
      </div>

      {/* Assignment Metrics Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm text-ink-500">Assigned Complaints</p>
          <p className="mt-1 text-2xl font-semibold text-ink-900">
            {metrics.assigned}
          </p>
          <p className="mt-1 text-xs text-ink-400">
            {metrics.assignmentRate}% of all complaints
          </p>
        </div>

        <div className="card p-5">
          <p className="text-sm text-ink-500">Awaiting Assignment</p>
          <p className="mt-1 text-2xl font-semibold text-ink-900">
            {metrics.unassigned}
          </p>
          <p className="mt-1 text-xs text-ink-400">
            Complaints without assigned team
          </p>
        </div>

        <div className="card p-5">
          <p className="text-sm text-ink-500">Teams Handling Complaints</p>
          <p className="mt-1 text-2xl font-semibold text-ink-900">
            {byTeam.filter((t) => t.team !== 'Unassigned').length}
          </p>
          <p className="mt-1 text-xs text-ink-400">
            Active university departments
          </p>
        </div>
      </div>

      {/* Category and Status Charts */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category Breakdown */}
        <section className="card p-6" aria-labelledby="category-chart-heading">
          <h2 id="category-chart-heading" className="mb-1 text-base font-semibold text-ink-900">
            Complaints by Category
          </h2>
          <p className="mb-5 text-sm text-ink-600">
            Distribution across academic, facility, and administrative categories.
          </p>

          {byCategory.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400">
              No category data available.
            </p>
          ) : (
            <div className="space-y-3">
              {byCategory.map((cat) => (
                <div key={cat.category}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-ink-600">{cat.label}</span>
                    <span className="font-medium text-ink-800">
                      {cat.count} ({cat.percentage}%)
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-ink-50">
                    <div
                      className="h-full rounded-full bg-accent-500 transition-all duration-300"
                      style={{
                        width: `${(cat.count / maxCategory) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Status Breakdown */}
        <section className="card p-6" aria-labelledby="status-chart-heading">
          <h2 id="status-chart-heading" className="mb-1 text-base font-semibold text-ink-900">
            Status Breakdown
          </h2>
          <p className="mb-5 text-sm text-ink-600">
            Lifecycle state of all active and historical complaints.
          </p>

          {byStatus.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400">
              No status data available.
            </p>
          ) : (
            <div className="space-y-3">
              {byStatus.map((st) => {
                const statusColor: Record<string, string> = {
                  submitted: 'bg-ink-400',
                  under_review: 'bg-amber-500',
                  in_progress: 'bg-accent-500',
                  resolved: 'bg-emerald-500',
                  rejected: 'bg-rose-500',
                };

                return (
                  <div key={st.status}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-ink-600">{st.label}</span>
                      <span className="font-medium text-ink-800">
                        {st.count} ({st.percentage}%)
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-ink-50">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          statusColor[st.status] || 'bg-ink-400'
                        }`}
                        style={{
                          width: `${(st.count / maxStatus) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Team Assignment Breakdown */}
      <section className="card mt-6 p-6" aria-labelledby="team-chart-heading">
        <div className="mb-1 flex items-center gap-2">
          <Users className="h-5 w-5 text-accent-600" />
          <h2 id="team-chart-heading" className="text-base font-semibold text-ink-900">
            Team Assignment Breakdown
          </h2>
        </div>

        <p className="mb-5 text-sm text-ink-600">
          Complaints assigned to each university department, including unassigned items.
        </p>

        {byTeam.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-400">
            No assignment data available.
          </p>
        ) : (
          <div className="space-y-4">
            {byTeam.map(({ team, count, percentage }) => (
              <div key={team}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span className="text-ink-600">{team}</span>
                  <span className="font-medium text-ink-800">
                    {count} ({percentage}%)
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
      </section>

      {/* Summary Rates Footer */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-ink-500">Escalation Rate</p>
              <p className="text-xl font-semibold text-ink-900">
                {metrics.escalationRate}%
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-ink-400">
            {metrics.escalated} of {metrics.total} escalated
          </p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink-50 text-ink-500">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-ink-500">Rejected</p>
              <p className="text-xl font-semibold text-ink-900">
                {metrics.rejected}
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-ink-400">
            Ineligible or duplicate submissions
          </p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-ink-500">Avg. Resolution Time</p>
              <p className="text-xl font-semibold text-ink-900">
                {metrics.averageResolutionDays === null
                  ? 'N/A'
                  : `${metrics.averageResolutionDays} days`}
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-ink-400">
            Calculated across {metrics.resolved} resolved cases
          </p>
        </div>
      </div>

      {/* Navigation Link */}
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
