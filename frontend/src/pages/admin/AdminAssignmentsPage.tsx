
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList, CheckCircle2 } from 'lucide-react';

import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { AssignmentAuditHistory } from '@/components/ui/AssignmentAuditHistory';
import { getAdminComplaints } from '@/data/adminComplaintData';
import { formatDate } from '@/services/api';
import type { Complaint } from '@/types';

const ASSIGNEES = [
  'IT Support Desk',
  'Facilities Maintenance',
  'Registrar Office',
  'Finance Office',
];

const ASSIGNMENTS_STORAGE_KEY = 'scms-complaint-assignments';
const AUDIT_STORAGE_KEY = 'scms-assignment-audit';

type AuditEntry = {
  id: string;
  complaintId: string;
  action: 'ASSIGNED' | 'REASSIGNED';
  previousTeam: string | null;
  newTeam: string;
  timestamp: string;
  performedBy: string;
};

function createAuditId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

function loadSavedComplaints(): Complaint[] {
  return getAdminComplaints();
}

function loadAuditEntries(): AuditEntry[] {
  try {
    const saved = localStorage.getItem(AUDIT_STORAGE_KEY);
    const parsed: unknown = saved ? JSON.parse(saved) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (entry): entry is Record<string, unknown> =>
          typeof entry === 'object' && entry !== null,
      )
      .map((entry) => ({
        id: typeof entry.id === 'string' ? entry.id : createAuditId(),
        complaintId:
          typeof entry.complaintId === 'string' ? entry.complaintId : 'Unknown',
        action:
          entry.action === 'REASSIGNED'
            ? ('REASSIGNED' as const)
            : ('ASSIGNED' as const),
        previousTeam:
          typeof entry.previousTeam === 'string' ? entry.previousTeam : null,
        newTeam: typeof entry.newTeam === 'string' ? entry.newTeam : 'Unknown',
        timestamp:
          typeof entry.timestamp === 'string'
            ? entry.timestamp
            : new Date().toISOString(),
        performedBy:
          typeof entry.performedBy === 'string'
            ? entry.performedBy
            : 'Unknown administrator',
      }));
  } catch (error) {
    console.error('Could not load assignment history:', error);
    return [];
  }
}

export function AdminAssignmentsPage() {
  const [complaints, setComplaints] =
    useState<Complaint[]>(loadSavedComplaints);

  const [selectedTeams, setSelectedTeams] =
    useState<Record<string, string>>({});

  const [message, setMessage] = useState('');

  const [auditEntries, setAuditEntries] =
    useState<AuditEntry[]>(loadAuditEntries);

  const unassigned = complaints.filter((complaint) => !complaint.assignedTo);
  const assigned = complaints.filter((complaint) => Boolean(complaint.assignedTo));

  function handleTeamChange(complaintId: string, team: string) {
    setSelectedTeams((previous) => ({
      ...previous,
      [complaintId]: team,
    }));

    setMessage('');
  }

  function handleAssign(complaintId: string) {
    const team = selectedTeams[complaintId];

    if (!team) {
      setMessage('Please select a team before assigning the complaint.');
      return;
    }

    const complaint = complaints.find((item) => item.id === complaintId);

    if (!complaint) {
      setMessage('Complaint not found.');
      return;
    }

    if (complaint.assignedTo === team) {
      setMessage('This complaint is already assigned to that team.');
      return;
    }

    const previousTeam = complaint.assignedTo;
    const timestamp = new Date().toISOString();

    const updatedComplaints = complaints.map((item) =>
      item.id === complaintId
        ? {
            ...item,
            assignedTo: team,
            updatedAt: timestamp,
          }
        : item,
    );

    const auditEntry: AuditEntry = {
      id: createAuditId(),
      complaintId,
      action: previousTeam ? 'REASSIGNED' : 'ASSIGNED',
      previousTeam,
      newTeam: team,
      timestamp,
      performedBy: 'Admin (demo mode)',
    };

    const updatedAudit = [...auditEntries, auditEntry];

    let previousAssignments: string | null;
    let previousAudit: string | null;

    try {
      previousAssignments = localStorage.getItem(ASSIGNMENTS_STORAGE_KEY);
      previousAudit = localStorage.getItem(AUDIT_STORAGE_KEY);
    } catch (error) {
      console.error('Could not read existing assignment data:', error);
      setMessage(
        'Could not read browser storage. No assignment changes were made.',
      );
      return;
    }

    try {
      localStorage.setItem(
        ASSIGNMENTS_STORAGE_KEY,
        JSON.stringify(updatedComplaints),
      );

      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updatedAudit));

      setComplaints(updatedComplaints);
      setAuditEntries(updatedAudit);

      setSelectedTeams((previous) => {
        const updated = { ...previous };
        delete updated[complaintId];
        return updated;
      });

      setMessage(
        previousTeam
          ? 'Complaint reassigned successfully.'
          : 'Complaint assigned successfully.',
      );
    } catch (error) {
      console.error('Could not save assignment or audit history:', error);

      let rollbackSucceeded = true;

      try {
        if (previousAssignments === null) {
          localStorage.removeItem(ASSIGNMENTS_STORAGE_KEY);
        } else {
          localStorage.setItem(
            ASSIGNMENTS_STORAGE_KEY,
            previousAssignments,
          );
        }
      } catch (rollbackError) {
        rollbackSucceeded = false;
        console.error('Could not restore previous assignments:', rollbackError);
      }

      try {
        if (previousAudit === null) {
          localStorage.removeItem(AUDIT_STORAGE_KEY);
        } else {
          localStorage.setItem(AUDIT_STORAGE_KEY, previousAudit);
        }
      } catch (rollbackError) {
        rollbackSucceeded = false;
        console.error('Could not restore previous audit history:', rollbackError);
      }

      setMessage(
        rollbackSucceeded
          ? 'Assignment was not saved. Previous data was restored; please try again.'
          : 'Save failed and rollback was incomplete. Browser storage may be inconsistent; check storage before continuing.',
      );
    }
  }

  return (
    <div>
      <PageHeader
        title="Assignments"
        description="Review complaints and assign them to the appropriate team."
      />

      {message && (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {message}
        </div>
      )}

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
                    to={'/complaints/' + complaint.id}
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
                    aria-label={'Select team for complaint ' + complaint.id}
                  >
                    <option value="" disabled>
                      Select team...
                    </option>
                    {ASSIGNEES.map((team) => (
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
                  to={'/complaints/' + complaint.id}
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
                    aria-label={'Reassign complaint ' + complaint.id}
                  >
                    <option value="" disabled>
                      Reassign team...
                    </option>
                    {ASSIGNEES.map((team) => (
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
                    to={'/complaints/' + complaint.id}
                    aria-label={'View complaint ' + complaint.id}
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

      <section className="card mt-8 p-5">
        <h2 className="mb-3 text-base font-semibold text-ink-900">
          Recent Assignment Activity
        </h2>
        <AssignmentAuditHistory auditEntries={auditEntries} />
      </section>

      <p className="mt-4 text-xs text-ink-400">
        Demo mode: assignments and audit history are saved in this browser.
        They are not stored in a shared database. Browser-stored audit entries
        can be modified or deleted and are not tamper-proof security records.
      </p>
    </div>
  );
}
