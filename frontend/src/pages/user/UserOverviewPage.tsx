import { Link } from 'react-router-dom';
import { Plus, FileText, Clock, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SummaryMetric } from '@/components/ui/SummaryMetric';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useRole } from '@/context/RoleContext';
import { mockComplaints } from '@/data/mockData';
import { formatDate, relativeTime } from '@/services/api';

// Demo data: these counts are derived from the local mock dataset, not from a
// live backend. They are recalculated on each render so the overview stays in
// sync if the mock data changes.
export function UserOverviewPage() {
  const { user } = useRole();
  const myComplaints = mockComplaints.filter((c) => c.submittedBy === user.name);
  const active = myComplaints.filter((c) => c.status === 'submitted' || c.status === 'under_review' || c.status === 'in_progress');
  const resolved = myComplaints.filter((c) => c.status === 'resolved');
  const escalated = myComplaints.filter((c) => c.isEscalated);
  const recent = [...myComplaints].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  ).slice(0, 4);

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user.name.split(' ')[0]}`}
        description="Track, manage, and register complaints from your personal workspace."
        actions={
          <Link to="/complaints/new" className="btn btn-primary">
            <Plus className="h-4 w-4" /> New Complaint
          </Link>
        }
      />

      {/* Metrics row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryMetric label="Total Complaints" value={myComplaints.length} icon={FileText} hint="All complaints you have registered." />
        <SummaryMetric label="Active" value={active.length} icon={Clock} accent="warning" hint="Awaiting resolution or review." />
        <SummaryMetric label="Resolved" value={resolved.length} icon={CheckCircle2} accent="success" hint="Successfully closed complaints." />
        <SummaryMetric label="Escalated" value={escalated.length} icon={AlertTriangle} accent="danger" hint="Complaints you have escalated." />
      </div>

      {/* Recent complaints */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink-900">Recent Complaints</h2>
          <Link to="/complaints" className="flex items-center gap-1 text-sm font-medium text-accent-600 hover:text-accent-700">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="card divide-y divide-ink-100">
          {recent.map((complaint) => (
            <Link
              key={complaint.id}
              to={`/complaints/${complaint.id}`}
              className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-ink-50 group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-medium text-ink-400">{complaint.id}</span>
                  {complaint.isEscalated && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-600">
                      <AlertTriangle className="h-3 w-3" /> Escalated
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-sm font-medium text-ink-800 group-hover:text-accent-700">
                  {complaint.subject}
                </p>
                <p className="mt-0.5 text-xs text-ink-400">
                  Updated {relativeTime(complaint.updatedAt)} · Submitted {formatDate(complaint.submittedAt)}
                </p>
              </div>
              <StatusBadge status={complaint.status} />
              <ArrowRight className="h-4 w-4 shrink-0 text-ink-300 group-hover:text-accent-500" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
