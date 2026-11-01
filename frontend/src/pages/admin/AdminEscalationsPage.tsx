import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, MessageSquare, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { formatDate, relativeTime } from '@/services/api';
import {
  getComplaintUpdates,
  getComplaints,
  reviewComplaintEscalation,
} from '@/services/complaintService';
import { useAuth } from '@/pages/auth/authContext';

export function AdminEscalationsPage() {
  const { session } = useAuth();
  const [complaints, setComplaints] = useState(() => getComplaints());
  const [updates, setUpdates] = useState(() => getComplaintUpdates());
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{
    complaintId: string;
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const escalated = complaints.filter((c) => c.isEscalated);

  const handleOpenReview = (complaintId: string) => {
    setActiveReviewId((prev) => (prev === complaintId ? null : complaintId));
    setFeedback(null);
  };

  const handleNoteChange = (complaintId: string, value: string) => {
    setReviewNotes((prev) => ({ ...prev, [complaintId]: value }));
  };

  const handleSubmitReview = (complaintId: string) => {
    const note = (reviewNotes[complaintId] || '').trim();
    if (!note) {
      setFeedback({
        complaintId,
        type: 'error',
        message: 'Please enter review notes describing actions taken or triage decisions.',
      });
      return;
    }

    if (!session || session.role !== 'admin') {
      setFeedback({
        complaintId,
        type: 'error',
        message: 'Unauthorized. Administrator credentials are required to review escalations.',
      });
      return;
    }

    setIsSubmitting((prev) => ({ ...prev, [complaintId]: true }));
    setFeedback(null);

    try {
      const result = reviewComplaintEscalation(complaintId, note, session);

      if (result.outcome === 'reviewed') {
        // Refresh local complaint and update states
        setComplaints(getComplaints());
        setUpdates(getComplaintUpdates());
        setReviewNotes((prev) => ({ ...prev, [complaintId]: '' }));
        setActiveReviewId(null);
        setFeedback({
          complaintId,
          type: 'success',
          message: 'Escalation review recorded successfully and added to case audit history.',
        });
      } else if (result.outcome === 'unauthorized') {
        setFeedback({
          complaintId,
          type: 'error',
          message: 'Unauthorized. Only administrators can review escalations.',
        });
      } else if (result.outcome === 'not_escalated') {
        setFeedback({
          complaintId,
          type: 'error',
          message: 'This complaint is no longer marked as escalated.',
        });
      } else {
        setFeedback({
          complaintId,
          type: 'error',
          message: `Could not complete escalation review: ${result.outcome}`,
        });
      }
    } catch (error) {
      console.error('Escalation review submission failed:', error);
      setFeedback({
        complaintId,
        type: 'error',
        message: error instanceof Error ? error.message : 'Storage write failed during escalation review.',
      });
    } finally {
      setIsSubmitting((prev) => ({ ...prev, [complaintId]: false }));
    }
  };

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
            const complaintUpdates = updates.filter((u) => u.complaintId === c.id);
            const escalationUpdate = complaintUpdates
              .filter((u) => u.message.startsWith('Escalation reason:'))
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] ||
              complaintUpdates.sort(
                (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
              )[0];

            const latestReviewUpdate = complaintUpdates
              .filter((u) => u.message.startsWith('Admin escalation review:'))
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

            const isFormOpen = activeReviewId === c.id;
            const isBusy = Boolean(isSubmitting[c.id]);
            const cardFeedback = feedback?.complaintId === c.id ? feedback : null;

            return (
              <div key={c.id} className="card border-rose-100 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                  {/* Left: info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600">
                        <AlertTriangle className="h-3 w-3" /> Escalated
                      </span>
                      {latestReviewUpdate && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> Review Recorded
                        </span>
                      )}
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
                          Escalation details — {relativeTime(escalationUpdate.timestamp)}
                        </p>
                        <p className="mt-0.5 text-sm text-ink-600">{escalationUpdate.message}</p>
                        <p className="mt-1 text-xs text-ink-400">
                          Requested by {escalationUpdate.author} · {formatDate(escalationUpdate.timestamp)}
                        </p>
                      </div>
                    )}

                    {latestReviewUpdate && (
                      <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/40 px-3 py-2">
                        <div className="flex items-center gap-1 text-xs font-medium text-emerald-800">
                          <ShieldAlert className="h-3.5 w-3.5" /> Latest Admin Action
                        </div>
                        <p className="mt-0.5 text-sm text-ink-700">{latestReviewUpdate.message}</p>
                        <p className="mt-1 text-xs text-ink-400">
                          Reviewed by {latestReviewUpdate.author} · {formatDate(latestReviewUpdate.timestamp)}
                        </p>
                      </div>
                    )}

                    {/* Inline Review Form */}
                    {isFormOpen && (
                      <div className="mt-4 rounded-lg border border-accent-200 bg-accent-50/30 p-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-accent-900">
                          Record Administrative Escalation Review
                        </h4>
                        <p className="mt-1 text-xs text-ink-500">
                          Document triage actions, priority reassessment, or dispatch notes. This action is permanently recorded in the administrative audit log.
                        </p>
                        <textarea
                          rows={3}
                          className="input mt-2 w-full text-sm"
                          placeholder="Describe administrative actions taken, triage decisions, or resolution plan..."
                          value={reviewNotes[c.id] || ''}
                          onChange={(e) => handleNoteChange(c.id, e.target.value)}
                          aria-label={`Escalation review notes for ${c.id}`}
                          disabled={isBusy}
                        />
                        <div className="mt-3 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            className="btn btn-secondary text-xs"
                            onClick={() => setActiveReviewId(null)}
                            disabled={isBusy}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary text-xs"
                            onClick={() => handleSubmitReview(c.id)}
                            disabled={isBusy || !(reviewNotes[c.id] || '').trim()}
                            aria-busy={isBusy}
                          >
                            {isBusy ? 'Saving...' : 'Submit Escalation Review'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Feedback message */}
                    {cardFeedback && (
                      <div
                        role={cardFeedback.type === 'error' ? 'alert' : 'status'}
                        className={`mt-3 rounded-lg px-3 py-2 text-xs ${
                          cardFeedback.type === 'error'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-emerald-50 text-emerald-800'
                        }`}
                      >
                        {cardFeedback.message}
                      </div>
                    )}
                  </div>

                  {/* Right: actions */}
                  <div className="flex shrink-0 flex-col items-start gap-2 lg:w-48">
                    <StatusBadge status={c.status} />
                    <span className="text-xs text-ink-400">Assigned: {c.assignedTo ?? 'Unassigned'}</span>

                    <button
                      type="button"
                      className={`btn w-full ${isFormOpen ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={() => handleOpenReview(c.id)}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      {latestReviewUpdate ? 'Add Review Note' : 'Review Escalation'}
                    </button>

                    <Link to={`/complaints/${c.id}`} className="btn btn-ghost w-full text-xs">
                      View Details <ArrowRight className="h-3.5 w-3.5" />
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
