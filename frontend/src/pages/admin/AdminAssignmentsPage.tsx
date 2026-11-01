import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList, CheckCircle2, AlertCircle } from 'lucide-react';

import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { AdminAuditHistory } from '@/components/admin/AdminAuditHistory';
import { formatDate } from '@/services/api';
import {
  getAssignmentComplaints,
  assignComplaint,
} from '@/services/adminAssignmentService';
import {
  ALLOWED_ASSIGNMENT_TEAMS,
  type AuditActor,
} from '@/types/admin';
import { useAuth } from '@/pages/auth/authContext';
import type { Complaint } from '@/types';

export function AdminAssignmentsPage() {
  const { session } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>(getAssignmentComplaints);
  const [selectedTeams, setSelectedTeams] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);

  // Sync state if complaints change
  const reloadData = () => {
    setComplaints(getAssignmentComplaints());
  };

  useEffect(() => {
    reloadData();
  }, []);

  const unassigned = complaints.filter(
    (c) => c.assignedTo === null || c.assignedTo.trim() === ''
  );

  const assigned = complaints.filter(
    (c) => c.assignedTo !== null && c.assignedTo.trim() !== ''
  );

  function handleTeamChange(complaintId: string, team: string) {
    setSelectedTeams((previous) => ({
      ...previous,
      [complaintId]: team,
    }));
    setFeedback(null);
  }

  function handleAssign(complaintId: string) {
    const team = selectedTeams[complaintId];

    if (!team) {
      setFeedback({
        type: 'error',
        text: 'Please select a team before assigning the complaint.',
      });
      return;
    }

    const actor: AuditActor = {
      name: session?.fullName || 'Administrator',
      email: session?.email || 'admin@university.edu',
      role: session?.role || 'admin',
    };

    const result = assignComplaint({
      complaintId,
      team,
      actor,
    });

    if (result.outcome === 'assigned' || result.outcome === 'reassigned') {
      reloadData();
      setSelectedTeams((prev) => {
        const copy = { ...prev };
        delete copy[complaintId];
        return copy;
      });
      setFeedback({
        type: 'success',
        text:
          result.outcome === 'assigned'
            ? `Complaint ${complaintId} successfully assigned to ${team}.`
            : `Complaint ${complaintId} successfully reassigned to ${team}.`,
      });
      setAuditRefreshKey((k) => k + 1);
    } else if (result.outcome === 'unchanged') {
      setFeedback({
        type: 'error',
        text: `Complaint ${complaintId} is already assigned to ${team}.`,
      });
    } else {
      setFeedback({
        type: 'error',
        text: result.error || 'Unable to update assignment.',
      });
    }
  }

  return (
    <div>
      <PageHeader
        title="Assignments"
        description="Review complaints and assign them to the appropriate university department or team."
      />

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`mb-6 flex items-center gap-2 rounded-lg border p-3 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          {feedback.text}
        </div>
      )}

      {/* Awaiting Assignment */}
      <section className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-ink-900">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
            {unassigned.length}
          </span>
          Awaiting Assignment
        </h2>

        {unassigned.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<ClipboardList className="h-6 w-6" />}
              title="All complaints are assigned"
              description="There are no complaints waiting for assignment right now."
            />
          </div>
        ) : (
          <div className="space-y-3">
            {unassigned.map((complaint) => (
              <div
                key={complaint.id}
                className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium text-ink-400">
                      {complaint.id}
                    </span>
                    <PriorityBadge priority={complaint.priority} />
                  </div>

                  <Link
                    to={`/complaints/${complaint.id}`}
                    className="mt-0.5 block text-sm font-medium text-ink-800 hover:text-accent-700"
                  >
                    {complaint.subject}
                  </Link>

                  <p className="mt-0.5 text-xs text-ink-400">
                    Submitted by {complaint.submittedBy} on{' '}
                    {formatDate(complaint.submittedAt)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={complaint.status} />

                  <select
                    className="input w-48 cursor-pointer"
                    value={selectedTeams[complaint.id] || ''}
                    onChange={(event) =>
                      handleTeamChange(complaint.id, event.target.value)
                    }
                    aria-label={`Select team for complaint ${complaint.id}`}
                  >
                    <option value="" disabled>
                      Select team...
                    </option>
                    {ALLOWED_ASSIGNMENT_TEAMS.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="btn btn-primary shrink-0"
                    disabled={!selectedTeams[complaint.id]}
                    onClick={() => handleAssign(complaint.id)}
                  >
                    Assign
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Currently Assigned */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-ink-900">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
            {assigned.length}
          </span>
          Currently Assigned
        </h2>

        {assigned.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<ClipboardList className="h-6 w-6" />}
              title="No assigned complaints"
              description="Assigned complaints will appear here."
            />
          </div>
        ) : (
          <div className="card divide-y divide-ink-100">
            {assigned.map((complaint) => (
              <div
                key={complaint.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
              >
                <Link
                  to={`/complaints/${complaint.id}`}
                  className="group min-w-0 flex-1"
                >
                  <span className="font-mono text-xs font-medium text-ink-400">
                    {complaint.id}
                  </span>

                  <p className="mt-0.5 truncate text-sm font-medium text-ink-800 group-hover:text-accent-700">
                    {complaint.subject}
                  </p>
                </Link>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-lg bg-ink-50 px-2.5 py-1 text-xs font-medium text-ink-600">
                    {complaint.assignedTo}
                  </span>

                  <StatusBadge status={complaint.status} />

                  <select
                    className="input w-48 cursor-pointer"
                    value={selectedTeams[complaint.id] || ''}
                    onChange={(event) =>
                      handleTeamChange(complaint.id, event.target.value)
                    }
                    aria-label={`Reassign complaint ${complaint.id}`}
                  >
                    <option value="" disabled>
                      Reassign team...
                    </option>
                    {ALLOWED_ASSIGNMENT_TEAMS.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="btn btn-primary shrink-0"
                    disabled={
                      !selectedTeams[complaint.id] ||
                      selectedTeams[complaint.id] === complaint.assignedTo
                    }
                    onClick={() => handleAssign(complaint.id)}
                  >
                    Reassign
                  </button>

                  <Link
                    to={`/complaints/${complaint.id}`}
                    aria-label={`View complaint ${complaint.id}`}
                    className="inline-flex items-center"
                  >
                    <ArrowRight className="h-4 w-4 text-ink-300 hover:text-accent-500" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reusable Audit Trail Component */}
      <section className="card mt-8 p-5">
        <h2 className="mb-3 text-base font-semibold text-ink-900">
          Recent Administrative Activity
        </h2>
        <AdminAuditHistory key={auditRefreshKey} maxEntries={20} />
      </section>
    </div>
  );
}
