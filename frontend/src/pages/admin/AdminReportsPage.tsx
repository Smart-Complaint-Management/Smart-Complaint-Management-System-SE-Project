import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, FileText, Clock, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SummaryMetric } from '@/components/ui/SummaryMetric';
import { mockComplaints, categoryLabels, statusLabels } from '@/data/mockData';

// All values in this page are derived from the local mock dataset and are
// clearly demo data — not real analytics from a backend.
export function AdminReportsPage() {
  const total = mockComplaints.length;
  const resolved = mockComplaints.filter((c) => c.status === 'resolved');
  const open = mockComplaints.filter((c) => c.status !== 'resolved' && c.status !== 'rejected');
  const rejected = mockComplaints.filter((c) => c.status === 'rejected');
  const escalated = mockComplaints.filter((c) => c.isEscalated);
  const resolutionRate = total > 0 ? Math.round((resolved.length / total) * 100) : 0;

  // Category breakdown
  const byCategory = Object.entries(categoryLabels).map(([value, label]) => ({
    label,
    count: mockComplaints.filter((c) => c.category === value).length,
  }));
  const maxCategory = Math.max(...byCategory.map((c) => c.count), 1);

  // Status breakdown
  const byStatus = Object.entries(statusLabels).map(([value, label]) => ({
    label,
    count: mockComplaints.filter((c) => c.status === value).length,
  }));
  const maxStatus = Math.max(...byStatus.map((s) => s.count), 1);

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="Summary of complaint activity, category distribution, and status breakdown."
      />

      {/* Top metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryMetric label="Total Complaints" value={total} icon={FileText} />
        <SummaryMetric label="Open" value={open.length} icon={Clock} accent="warning" />
        <SummaryMetric label="Resolved" value={resolved.length} icon={CheckCircle2} accent="success" />
        <SummaryMetric label="Resolution Rate" value={`${resolutionRate}%`} icon={TrendingUp} accent="success" hint={`${resolved.length} of ${total} resolved`} />
      </div>

      {/* Charts row */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category distribution */}
        <div className="card p-6">
          <h2 className="mb-1 text-base font-semibold text-ink-900">Complaints by Category</h2>
          <p className="mb-5 text-xs text-ink-400">Distribution across complaint categories.</p>
          <div className="space-y-3">
            {byCategory.map((cat) => (
              <div key={cat.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-ink-600">{cat.label}</span>
                  <span className="font-medium text-ink-800">{cat.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-ink-50">
                  <div
                    className="h-full rounded-full bg-accent-500 transition-all duration-300"
                    style={{ width: `${(cat.count / maxCategory) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status breakdown */}
        <div className="card p-6">
          <h2 className="mb-1 text-base font-semibold text-ink-900">Status Breakdown</h2>
          <p className="mb-5 text-xs text-ink-400">Current status of all complaints.</p>
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
                <div key={st.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-ink-600">{st.label}</span>
                    <span className="font-medium text-ink-800">{st.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-ink-50">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${statusColor[st.label.toLowerCase().replace(' ', '_')] ?? 'bg-ink-400'}`}
                      style={{ width: `${(st.count / maxStatus) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
                {total > 0 ? Math.round((escalated.length / total) * 100) : 0}%
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
              <p className="text-xl font-semibold text-ink-900">{rejected.length}</p>
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
              <p className="text-xl font-semibold text-ink-900">~5 days</p>
            </div>
          </div>
          <p className="mt-1 text-[10px] text-ink-400">Illustrative estimate from demo data.</p>
        </div>
      </div>

      {/* Link to all complaints */}
      <div className="mt-6">
        <Link to="/admin/complaints" className="flex items-center gap-1 text-sm font-medium text-accent-600 hover:text-accent-700">
          Browse full complaint list <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
