import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Send, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { ComplaintTimeline } from '@/components/ui/ComplaintTimeline';
import { EmptyState } from '@/components/ui/EmptyState';
import { useRole } from '@/context/RoleContext';
import { mockComplaints, mockUpdates, categoryLabels } from '@/data/mockData';
import { formatDate, formatDateTime } from '@/services/api';

export function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useRole();
  const isAdmin = user.role === 'admin';
  const navigate = useNavigate();

  const complaint = mockComplaints.find((c) => c.id === id);
  const updates = mockUpdates.filter((u) => u.complaintId === id);

  const [showEscalationForm, setShowEscalationForm] = useState(false);
  const [escalationReason, setEscalationReason] = useState('');
  const [escalationSubmitted, setEscalationSubmitted] = useState(false);

  if (!complaint) {
    return (
      <div className="card">
        <EmptyState
          icon={<AlertTriangle className="h-6 w-6" />}
          title="Complaint not found"
          description="This complaint may have been removed or the ID is incorrect."
          action={
            <button
              onClick={() => navigate(isAdmin ? '/admin/complaints' : '/complaints')}
              className="btn btn-secondary"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Complaints
            </button>
          }
        />
      </div>
    );
  }

  const canEscalate = !isAdmin && !complaint.isEscalated && complaint.status !== 'resolved' && complaint.status !== 'rejected';

  const handleEscalationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (escalationReason.trim()) {
      // Demo interaction only — no backend persistence.
      setEscalationSubmitted(true);
    }
  };

  return (
    <div>
      {/* Back link */}
      <button
        onClick={() => navigate(isAdmin ? '/admin/complaints' : '/complaints')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {isAdmin ? 'All Complaints' : 'My Complaints'}
      </button>

      <PageHeader
        title={complaint.subject}
        description={
          <span className="font-mono text-sm text-ink-400">{complaint.id}</span>
        }
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={complaint.status} />
            <PriorityBadge priority={complaint.priority} />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Description */}
          <div className="card p-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-400">Description</h2>
            <p className="text-sm leading-relaxed text-ink-700">{complaint.description}</p>
          </div>

          {/* Timeline */}
          <div className="card p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-400">
              Status & Progress Timeline
            </h2>
            <ComplaintTimeline updates={updates} />
          </div>
        </div>

        {/* Sidebar column */}
        <div className="space-y-4">
          {/* Details card */}
          <div className="card p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-400">Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-ink-400">Category</dt>
                <dd className="mt-0.5 text-sm text-ink-700">{categoryLabels[complaint.category]}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-ink-400">Priority</dt>
                <dd className="mt-0.5"><PriorityBadge priority={complaint.priority} /></dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-ink-400">Submitted By</dt>
                <dd className="mt-0.5 text-sm text-ink-700">{complaint.submittedBy}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-ink-400">Assigned To</dt>
                <dd className="mt-0.5 text-sm text-ink-700">{complaint.assignedTo ?? '— Unassigned'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-ink-400">Submitted</dt>
                <dd className="mt-0.5 text-sm text-ink-700">{formatDateTime(complaint.submittedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-ink-400">Last Updated</dt>
                <dd className="mt-0.5 text-sm text-ink-700">{formatDateTime(complaint.updatedAt)}</dd>
              </div>
            </dl>
          </div>

          {/* Admin-only: management controls */}
          {isAdmin && (
            <div className="card p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-400">Management</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-ink-400">Update Status</label>
                  <select className="input mt-1" defaultValue={complaint.status} aria-label="Update status">
                    <option value="submitted">Submitted</option>
                    <option value="under_review">Under Review</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-ink-400">Assign To</label>
                  <select className="input mt-1" defaultValue={complaint.assignedTo ?? ''} aria-label="Assign to">
                    <option value="">— Unassigned</option>
                    <option value="IT Support Desk">IT Support Desk</option>
                    <option value="Facilities Maintenance">Facilities Maintenance</option>
                    <option value="Registrar Office">Registrar Office</option>
                    <option value="Finance Office">Finance Office</option>
                  </select>
                </div>
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  These controls are UI affordances only. Status and assignment changes are not persisted in this demo.
                </p>
              </div>
            </div>
          )}

          {/* Duplicate indicator */}
          {complaint.possibleDuplicateId && (
            <div className="card border-amber-200 bg-amber-50/50 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Possible Duplicate Detected</p>
                  <p className="mt-1 text-xs text-amber-700">
                    This complaint may be related to{' '}
                    <a href={`/complaints/${complaint.possibleDuplicateId}`} className="font-medium underline">
                      {complaint.possibleDuplicateId}
                    </a>
                    . Review both before proceeding.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Escalation */}
          {complaint.isEscalated && (
            <div className="card border-rose-200 bg-rose-50/50 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <div>
                  <p className="text-sm font-medium text-rose-800">Escalated</p>
                  <p className="mt-1 text-xs text-rose-700">
                    This complaint has been escalated and is awaiting administrative review.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!complaint.isEscalated && canEscalate && !showEscalationForm && (
            <div className="card p-4">
              <p className="mb-3 text-sm text-ink-500">
                Not satisfied with the progress? You can request an escalation.
              </p>
              <button
                onClick={() => setShowEscalationForm(true)}
                className="btn btn-secondary w-full"
              >
                <AlertTriangle className="h-4 w-4" /> Request Escalation
              </button>
            </div>
          )}

          {!complaint.isEscalated && canEscalate && showEscalationForm && !escalationSubmitted && (
            <form onSubmit={handleEscalationSubmit} className="card p-5">
              <h3 className="mb-3 text-sm font-semibold text-ink-800">Request Escalation</h3>
              <label className="text-xs font-medium text-ink-400">Reason for escalation</label>
              <textarea
                value={escalationReason}
                onChange={(e) => setEscalationReason(e.target.value)}
                placeholder="Explain why this complaint needs to be escalated..."
                className="input mt-1 min-h-[80px] resize-y"
                rows={3}
              />
              <div className="mt-3 flex gap-2">
                <button type="submit" className="btn btn-primary flex-1" disabled={!escalationReason.trim()}>
                  <Send className="h-4 w-4" /> Submit Request
                </button>
                <button type="button" onClick={() => setShowEscalationForm(false)} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {escalationSubmitted && (
            <div className="card border-emerald-200 bg-emerald-50/50 p-4">
              <p className="text-sm font-medium text-emerald-800">Escalation request submitted</p>
              <p className="mt-1 text-xs text-emerald-700">
                Your request has been recorded (demo only). An administrator will review it.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
