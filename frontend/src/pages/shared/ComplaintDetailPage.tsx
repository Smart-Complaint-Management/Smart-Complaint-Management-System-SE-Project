import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Send } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { ComplaintTimeline } from '@/components/ui/ComplaintTimeline';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/pages/auth/authContext';
import { categoryLabels } from '@/data/mockData';
import { formatDateTime, loadComplaint, USE_REAL_API } from '@/services/api';

import {
  submitComplaintEscalation,
  updateComplaintStatus,
  updateComplaintPriority,
  getPriorityLevels,
  reviewDuplicate,
} from '@/services/complaintService';

import type {
  ComplaintPriority,
  ComplaintStatus,
  ComplaintUpdate,
  Complaint,
  DuplicateReviewStatus,
} from '@/types';

import {
  getComplaintStatus,
  patchComplaintStatus,
} from '@/services/authApi';

export function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { session, logout } = useAuth();
  const isAdmin = session?.role === 'admin';
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState<Complaint>();
  const [complaintLoading, setComplaintLoading] = useState(true);
  const [complaintLoadError, setComplaintLoadError] = useState('');
  const [updates, setUpdates] = useState<ComplaintUpdate[]>([]);
  const isDemoComplaint = !complaint?.databaseId;

  const [showEscalationForm, setShowEscalationForm] =
    useState(false);

  const [escalationReason, setEscalationReason] = useState('');
  const [escalationSubmitted, setEscalationSubmitted] =
    useState(false);

  const [isSubmittingEscalation, setIsSubmittingEscalation] =
    useState(false);

  const [escalationError, setEscalationError] = useState('');

  const escalationSubmissionLock = useRef(false);
  const statusSubmissionLock = useRef(false);
  const prioritySubmissionLock = useRef(false);

  const [pendingStatus, setPendingStatus] =
    useState<ComplaintStatus | null>(null);

  const [statusMessage, setStatusMessage] = useState('');

  const [displayedStatus, setDisplayedStatus] =
    useState<ComplaintStatus>(
      'submitted',
    );

  const [isUpdatingStatus, setIsUpdatingStatus] =
    useState(false);

  const [statusLoadRetry, setStatusLoadRetry] = useState(0);
  const [statusLoadFailed, setStatusLoadFailed] = useState(false);

  // Priority override state
  const [displayedPriority, setDisplayedPriority] =
    useState<ComplaintPriority>(
      'low',
    );

  const [pendingPriority, setPendingPriority] =
    useState<ComplaintPriority | null>(null);

  const [priorityMessage, setPriorityMessage] = useState('');
  const [isUpdatingPriority, setIsUpdatingPriority] =
    useState(false);

  // Duplicate review state
  const [duplicateReviewStatus, setDuplicateReviewStatus] =
    useState<DuplicateReviewStatus>(
      'pending',
    );
  const [duplicateReviewMessage, setDuplicateReviewMessage] =
    useState('');
  const [isReviewingDuplicate, setIsReviewingDuplicate] =
    useState(false);

  useEffect(() => {
    let active = true;
    setComplaintLoading(true);
    setComplaintLoadError('');
    loadComplaint(id ?? '', session).then((detail) => {
      if (!active) return;
      setComplaint(detail?.complaint);
      setUpdates(detail?.updates ?? []);
      if (detail) {
        setDisplayedStatus(detail.complaint.status);
        setDisplayedPriority(detail.complaint.priority);
        setDuplicateReviewStatus(detail.complaint.duplicateReviewStatus ?? 'pending');
      }
    }).catch((error: unknown) => {
      if (active) setComplaintLoadError(error instanceof Error ? error.message : 'Could not load this complaint.');
    }).finally(() => { if (active) setComplaintLoading(false); });
    setPendingStatus(null);
    setStatusMessage('');
    setStatusLoadFailed(false);

    setPendingPriority(null);
    setPriorityMessage('');
    setDuplicateReviewMessage('');
    return () => {
      active = false;
    };
  }, [
    id,
    session,
  ]);

  useEffect(() => {
    if (!USE_REAL_API || !complaint?.databaseId) return;
    let active = true;
    getComplaintStatus(String(complaint.databaseId)).then((result) => {
      if (!active) return;
      setDisplayedStatus(result.status);
      setUpdates(result.updates.map((update) => ({ ...update, complaintId: complaint.id })));
    }).catch((error: unknown) => {
      if (!active) return;
      const status = (error as { status?: number }).status;
      if (status === 401) {
        logout();
        navigate('/login', { replace: true });
        return;
      }
      setStatusMessage(error instanceof Error ? error.message : 'Could not load complaint status history.');
      setStatusLoadFailed(true);
    });
    return () => { active = false; };
  }, [complaint?.databaseId, complaint?.id, logout, navigate, statusLoadRetry]);

  if (complaintLoading) return <p role="status" className="text-sm text-ink-500">Loading complaint…</p>;

  if (!complaint) {
    return (
      <div className="card">
        {complaintLoadError && <p role="alert" className="mb-4 text-sm text-rose-700">{complaintLoadError}</p>}
        <EmptyState
          icon={<AlertTriangle className="h-6 w-6" />}
          title="Complaint not found"
          description="This complaint may have been removed or the ID is incorrect."
          action={
            <button
              onClick={() =>
                navigate(
                  isAdmin
                    ? '/admin/complaints'
                    : '/complaints',
                )
              }
              className="btn btn-secondary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Complaints
            </button>
          }
        />
      </div>
    );
  }

  const canEscalate =
    isDemoComplaint &&
    !isAdmin &&
    !complaint.isEscalated &&
    displayedStatus !== 'resolved' &&
    displayedStatus !== 'rejected';

  // Submit escalation
  const handleEscalationSubmit = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    if (escalationSubmissionLock.current) return;

    if (!id) {
      setEscalationError('Complaint not found.');
      return;
    }

    escalationSubmissionLock.current = true;
    setIsSubmittingEscalation(true);
    setEscalationError('');

    try {
      const result = await Promise.resolve().then(() =>
        submitComplaintEscalation(
          id,
          escalationReason,
          session,
        ),
      );

      if (result.outcome === 'submitted') {
        setEscalationSubmitted(true);
      } else if (result.outcome === 'invalid_reason') {
        setEscalationError(
          'Please provide a reason for escalation.',
        );
      } else if (result.outcome === 'unauthorized') {
        setEscalationError(
          'Access denied. You can only escalate your own complaint.',
        );
      } else if (result.outcome === 'not_found') {
        setEscalationError('Complaint not found.');
      } else {
        setEscalationError(
          'This complaint has already been escalated or is no longer eligible.',
        );
      }
    } catch (error) {
      setEscalationError(
        error instanceof Error
          ? error.message
          : 'Could not save your escalation. Please try again.',
      );
    } finally {
      escalationSubmissionLock.current = false;
      setIsSubmittingEscalation(false);
    }
  };

  // Update complaint status
  const handleStatusUpdate = async () => {
    if (
      statusSubmissionLock.current ||
      isUpdatingStatus
    ) {
      return;
    }

    if (session?.role !== 'admin') {
      setStatusMessage(
        'Access denied. Only administrators can update complaint status.',
      );
      return;
    }

    if (!id || !pendingStatus) return;

    statusSubmissionLock.current = true;
    setIsUpdatingStatus(true);

    try {
      if (!complaint.databaseId) {
        const result = updateComplaintStatus(
          id,
          pendingStatus,
          session.fullName,
          session,
        );

        if (result.outcome === 'unauthorized') {
          setStatusMessage(
            'Access denied. Only administrators can update complaint status.',
          );
          return;
        }

        if (result.outcome === 'not_found') {
          setStatusMessage('Complaint not found.');
          return;
        }

        if (result.outcome === 'unchanged') {
          setPendingStatus(null);
          setStatusMessage(
            'Complaint status is already up to date.',
          );
          return;
        }

        setDisplayedStatus(result.update.status);

        setUpdates((current) => [
          ...current,
          result.update,
        ]);

        setPendingStatus(null);

        setStatusMessage(
          result.update.status === 'resolved'
            ? 'Complaint resolved and case closed in browser storage only; it is not saved to MySQL.'
            : 'Demo status updated in browser storage only; it is not saved to MySQL.',
        );

        return;
      }

      const result = await patchComplaintStatus(
        String(complaint.databaseId),
        pendingStatus,
      );

      setDisplayedStatus(result.status);
      setPendingStatus(null);

      if (result.changed && result.update) {
        setUpdates((current) =>
          current.some(
            (update) =>
              update.id === result.update?.id,
          )
            ? current
            : [...current, result.update!],
        );
      }

      setStatusMessage(
        result.changed
          ? result.status === 'resolved'
            ? 'Complaint resolved and case closed.'
            : 'Complaint status updated.'
          : 'Complaint status is already up to date.',
      );
    } catch (error) {
      const status = (error as { status?: number }).status;

      if (status === 401) {
        logout();
        navigate('/login', { replace: true });
        return;
      }

      setStatusMessage(
        status === 403
          ? 'Access denied. Only administrators can update complaint status.'
          : error instanceof Error
            ? error.message
            : 'Could not update complaint status.',
      );
    } finally {
      statusSubmissionLock.current = false;
      setIsUpdatingStatus(false);
    }
  };

  // Update complaint priority
  const handlePriorityUpdate = async () => {
    if (
      prioritySubmissionLock.current ||
      isUpdatingPriority
    ) {
      return;
    }

    if (session?.role !== 'admin') {
      setPriorityMessage(
        'Access denied. Only administrators can change priority.',
      );
      return;
    }

    if (!id || !pendingPriority) return;

    // Backend priority update API is not available yet.
    if (complaint.databaseId) {
      setPriorityMessage(
        'Priority override is currently available for demo complaints only. Backend API support is required for database complaints.',
      );
      return;
    }

    prioritySubmissionLock.current = true;
    setIsUpdatingPriority(true);
    setPriorityMessage('');

    try {
      const result = updateComplaintPriority(
        id,
        pendingPriority,
        session,
      );

      if (result.outcome === 'unauthorized') {
        setPriorityMessage(
          'Access denied. Only administrators can change priority.',
        );
        return;
      }

      if (result.outcome === 'not_found') {
        setPriorityMessage('Complaint not found.');
        return;
      }

      if (result.outcome === 'unchanged') {
        setPendingPriority(null);
        setPriorityMessage(
          'Complaint priority is already up to date.',
        );
        return;
      }

      if (result.outcome === 'invalid_priority') {
        setPriorityMessage(
          'Please select a valid priority level.',
        );
        return;
      }

      setDisplayedPriority(result.complaint.priority);
      setPendingPriority(null);

      setPriorityMessage(
        `Priority successfully changed to ${result.complaint.priority}. The change has been recorded in the admin audit log.`,
      );
    } catch (error) {
      setPriorityMessage(
        error instanceof Error
          ? error.message
          : 'Could not update complaint priority.',
      );
    } finally {
      prioritySubmissionLock.current = false;
      setIsUpdatingPriority(false);
    }
  };

  // Admin decision for a suspected duplicate pair
  const handleDuplicateReview = async (
    decision: 'confirmed' | 'not_duplicate',
  ) => {
    if (isReviewingDuplicate) return;

    if (session?.role !== 'admin') {
      setDuplicateReviewMessage(
        'Access denied. Only administrators can review possible duplicates.',
      );
      return;
    }

    if (!id || !complaint.possibleDuplicateId) {
      setDuplicateReviewMessage('No linked complaint is available to review.');
      return;
    }

    if (complaint.databaseId) {
      setDuplicateReviewMessage(
        'Duplicate review is currently available for demo complaints only. Backend API support is required for database complaints.',
      );
      return;
    }

    setIsReviewingDuplicate(true);
    setDuplicateReviewMessage('');

    try {
      const result = reviewDuplicate(id, decision, session);

      if (result.outcome === 'unauthorized') {
        setDuplicateReviewMessage(
          'Access denied. Only administrators can review possible duplicates.',
        );
        return;
      }

      if (result.outcome === 'not_found') {
        setDuplicateReviewMessage(
          'The complaint or its linked complaint could not be found.',
        );
        return;
      }

      if (result.outcome === 'reviewed') {
        setDuplicateReviewStatus(decision);
        setDuplicateReviewMessage(
          decision === 'confirmed'
            ? 'Duplicate confirmed. Both complaints remain separate records.'
            : 'Marked as not a duplicate. Both complaints remain separate records.',
        );
      }
    } catch (error) {
      setDuplicateReviewMessage(
        error instanceof Error
          ? error.message
          : 'Could not save the duplicate review. Please try again.',
      );
    } finally {
      setIsReviewingDuplicate(false);
    }
  };

  return (
    <div>
      <button
        onClick={() =>
          navigate(
            isAdmin
              ? '/admin/complaints'
              : '/complaints',
          )
        }
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {isAdmin ? 'All Complaints' : 'My Complaints'}
      </button>

      <PageHeader
        title={complaint.subject}
        description={
          <span className="font-mono text-sm text-ink-400">
            {complaint.id}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={displayedStatus} />
            <PriorityBadge priority={displayedPriority} />
          </div>
        }
      />

      {statusMessage && (
        <p
          role={
            statusMessage.startsWith('Access denied.')
              ? 'alert'
              : 'status'
          }
          className={`mb-4 text-sm ${
            statusMessage.startsWith('Access denied.')
              ? 'text-rose-600'
              : 'text-ink-500'
          }`}
        >
          {statusMessage}
        </p>
      )}

      {statusLoadFailed && (
        <button
          type="button"
          className="btn btn-secondary mb-4"
          onClick={() =>
            setStatusLoadRetry((key) => key + 1)
          }
        >
          Retry loading status history
        </button>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-400">
              Description
            </h2>

            <p className="text-sm leading-relaxed text-ink-700">
              {complaint.description}
            </p>
          </div>

          <div className="card p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-400">
              Status & Progress Timeline
            </h2>

            <ComplaintTimeline updates={updates} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-400">
              Details
            </h2>

            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-ink-400">
                  Category
                </dt>
                <dd className="mt-0.5 text-sm text-ink-700">
                  {categoryLabels[complaint.category ?? ''] ?? complaint.category ?? 'Uncategorized'}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-ink-400">
                  Priority
                </dt>
                <dd className="mt-0.5">
                  <PriorityBadge priority={displayedPriority} />
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-ink-400">
                  Submitted By
                </dt>
                <dd className="mt-0.5 text-sm text-ink-700">
                  {complaint.submittedBy}
                </dd>
              </div>

              {complaint.assignedTo !== undefined && <div>
                <dt className="text-xs font-medium text-ink-400">
                  Assigned To
                </dt>
                <dd className="mt-0.5 text-sm text-ink-700">
                  {complaint.assignedTo ?? '— Unassigned'}
                </dd>
              </div>}

              <div>
                <dt className="text-xs font-medium text-ink-400">
                  Submitted
                </dt>
                <dd className="mt-0.5 text-sm text-ink-700">
                  {formatDateTime(complaint.submittedAt)}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-ink-400">
                  Last Updated
                </dt>
                <dd className="mt-0.5 text-sm text-ink-700">
                  {formatDateTime(complaint.updatedAt)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Administrator management */}
          {isAdmin && (
            <div className="card p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-400">
                Management
              </h2>

              <div className="space-y-5">
                {/* Status management */}
                <div>
                  <label className="text-xs font-medium text-ink-400">
                    Update Status
                  </label>

                  <select
                    className="input mt-1"
                    value={pendingStatus ?? displayedStatus}
                    onChange={(event) => {
                      setPendingStatus(
                        event.target.value as ComplaintStatus,
                      );
                      setStatusMessage('');
                    }}
                    aria-label="Update status"
                    disabled={
                      isUpdatingStatus ||
                      displayedStatus === 'resolved'
                    }
                  >
                    <option value="submitted">Submitted</option>
                    <option value="under_review">Under Review</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved and closed</option>
                    <option value="rejected">Rejected</option>
                  </select>

                  <button
                    type="button"
                    className="btn btn-primary mt-2 w-full"
                    onClick={handleStatusUpdate}
                    disabled={
                      isUpdatingStatus ||
                      displayedStatus === 'resolved' ||
                      !pendingStatus ||
                      pendingStatus === displayedStatus
                    }
                  >
                    {isUpdatingStatus
                      ? 'Updating...'
                      : pendingStatus === 'resolved'
                        ? 'Resolve and Close Case'
                        : 'Save Status'}
                  </button>
                </div>

                {/* Priority override remains available for the local demo records. */}
                {!complaint.databaseId && <div className="border-t border-ink-100 pt-4">
                  <label
                    htmlFor="priority-override"
                    className="text-xs font-medium text-ink-400"
                  >
                    Override Complaint Priority
                  </label>

                  <select
                    id="priority-override"
                    className="input mt-1"
                    value={
                      pendingPriority ?? displayedPriority
                    }
                    onChange={(event) => {
                      setPendingPriority(
                        event.target.value as ComplaintPriority,
                      );
                      setPriorityMessage('');
                    }}
                    disabled={isUpdatingPriority}
                  >
                    {getPriorityLevels().map((priority) => (
                      <option
                        key={priority}
                        value={priority}
                      >
                        {priority.charAt(0).toUpperCase() +
                          priority.slice(1)}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="btn btn-primary mt-2 w-full"
                    onClick={handlePriorityUpdate}
                    disabled={
                      isUpdatingPriority ||
                      !pendingPriority ||
                      pendingPriority === displayedPriority
                    }
                  >
                    {isUpdatingPriority
                      ? 'Updating Priority...'
                      : 'Save Priority'}
                  </button>

                  {priorityMessage && (
                    <p
                      role="status"
                      className="mt-2 text-xs text-ink-500"
                    >
                      {priorityMessage}
                    </p>
                  )}
                </div>}

                {/* Assignment */}
                {complaint.assignedTo !== undefined && <div className="border-t border-ink-100 pt-4">
                  <label className="text-xs font-medium text-ink-400">
                    Assign To
                  </label>

                  <select
                    className="input mt-1"
                    defaultValue={complaint.assignedTo ?? ''}
                    aria-label="Assign to"
                  >
                    <option value="">— Unassigned</option>
                    <option value="IT Support Desk">
                      IT Support Desk
                    </option>
                    <option value="Facilities Maintenance">
                      Facilities Maintenance
                    </option>
                    <option value="Registrar Office">
                      Registrar Office
                    </option>
                    <option value="Finance Office">
                      Finance Office
                    </option>
                  </select>
                </div>}

                {!complaint.databaseId && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Demo complaint status and priority changes
                  are stored in this browser only. Database
                  complaints require backend API support.
                </p>}
              </div>
            </div>
          )}

          {/* Duplicate indicator and administrative review */}
          {complaint.possibleDuplicateId && (
            <div className="card border-amber-200 bg-amber-50/50 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-amber-800">
                    Possible Duplicate Detected
                  </p>

                  <p className="mt-1 text-xs text-amber-700">
                    This complaint may be related to{' '}
                    <a
                      href={`/complaints/${complaint.possibleDuplicateId}`}
                      className="font-medium underline"
                    >
                      {complaint.possibleDuplicateId}
                    </a>
                    . Review both before proceeding.
                  </p>

                  <div className="mt-3 rounded-lg border border-amber-200 bg-white p-3">
                    <p className="text-xs font-semibold text-ink-700">
                      Duplicate review status:{' '}
                      <span className="capitalize">
                        {duplicateReviewStatus === 'pending'
                          ? 'Pending review'
                          : duplicateReviewStatus === 'confirmed'
                            ? 'Confirmed duplicate'
                            : 'Not a duplicate'}
                      </span>
                    </p>

                    {complaint.duplicateReviewedBy && (
                      <p className="mt-1 text-xs text-ink-500">
                        Reviewed by {complaint.duplicateReviewedBy}
                        {complaint.duplicateReviewedAt
                          ? ` on ${formatDateTime(complaint.duplicateReviewedAt)}`
                          : ''}
                      </p>
                    )}

                    {isAdmin && duplicateReviewStatus === 'pending' && (
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          className="btn btn-primary flex-1"
                          onClick={() => handleDuplicateReview('confirmed')}
                          disabled={isReviewingDuplicate}
                        >
                          {isReviewingDuplicate
                            ? 'Saving review...'
                            : 'Confirm Duplicate'}
                        </button>

                        <button
                          type="button"
                          className="btn btn-secondary flex-1"
                          onClick={() => handleDuplicateReview('not_duplicate')}
                          disabled={isReviewingDuplicate}
                        >
                          Mark as Not Duplicate
                        </button>
                      </div>
                    )}

                    {duplicateReviewMessage && (
                      <p
                        role="status"
                        className="mt-2 text-xs text-ink-600"
                      >
                        {duplicateReviewMessage}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Escalation indicator */}
          {complaint.isEscalated && (
            <div className="card border-rose-200 bg-rose-50/50 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />

                <div>
                  <p className="text-sm font-medium text-rose-800">
                    Escalated
                  </p>

                  <p className="mt-1 text-xs text-rose-700">
                    This complaint has been escalated and is
                    awaiting administrative review.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!complaint.isEscalated &&
            canEscalate &&
            !showEscalationForm && (
              <div className="card p-4">
                <p className="mb-3 text-sm text-ink-500">
                  Not satisfied with the progress? You can
                  request an escalation.
                </p>

                <button
                  onClick={() => setShowEscalationForm(true)}
                  className="btn btn-secondary w-full"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Request Escalation
                </button>
              </div>
            )}

          {!complaint.isEscalated &&
            canEscalate &&
            showEscalationForm &&
            !escalationSubmitted && (
              <form
                onSubmit={handleEscalationSubmit}
                className="card p-5"
              >
                <h3 className="mb-3 text-sm font-semibold text-ink-800">
                  Request Escalation
                </h3>

                <label
                  htmlFor="escalation-reason"
                  className="text-xs font-medium text-ink-400"
                >
                  Reason for escalation
                </label>

                <textarea
                  id="escalation-reason"
                  value={escalationReason}
                  onChange={(e) => {
                    setEscalationReason(e.target.value);
                    setEscalationError('');
                  }}
                  placeholder="Explain why this complaint needs to be escalated..."
                  className="input mt-1 min-h-[80px] resize-y"
                  rows={3}
                  disabled={isSubmittingEscalation}
                  aria-invalid={
                    escalationError ? true : undefined
                  }
                  aria-describedby={
                    escalationError
                      ? 'escalation-reason-error'
                      : undefined
                  }
                />

                {escalationError && (
                  <p
                    id="escalation-reason-error"
                    role="alert"
                    className="mt-2 text-sm text-rose-600"
                  >
                    {escalationError}
                  </p>
                )}

                <div className="mt-3 flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary flex-1"
                    disabled={
                      !escalationReason.trim() ||
                      isSubmittingEscalation
                    }
                  >
                    <Send className="h-4 w-4" />
                    {isSubmittingEscalation
                      ? 'Submitting…'
                      : 'Submit Request'}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setShowEscalationForm(false)
                    }
                    className="btn btn-secondary"
                    disabled={isSubmittingEscalation}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

          {escalationSubmitted && (
            <div
              role="status"
              className="card border-emerald-200 bg-emerald-50/50 p-4"
            >
              <p className="text-sm font-medium text-emerald-800">
                Escalation request submitted
              </p>

              <p className="mt-1 text-xs text-emerald-700">
                Your request has been recorded in this
                session's mock data. An administrator can
                review it.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
