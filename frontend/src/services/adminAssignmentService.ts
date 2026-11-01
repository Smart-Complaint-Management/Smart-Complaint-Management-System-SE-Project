import type { Complaint, ComplaintUpdate } from '@/types';
import {
  ALLOWED_ASSIGNMENT_TEAMS,
  type AssignmentResult,
  type AuditActor,
} from '@/types/admin';
import { recordAdminAction } from './adminAuditService';
import { migrateComplaintData, PRIMARY_COMPLAINTS_KEY } from './dataMigrationService';
import { mockComplaints, mockUpdates } from '@/data/mockData';

const UPDATES_STORAGE_KEY = 'scms_complaint_updates';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function readStoredComplaints(): Complaint[] {
  if (!isBrowser()) return mockComplaints.map((c) => ({ ...c }));

  // Ensure any legacy assignment data is migrated first
  migrateComplaintData();

  try {
    const raw = window.localStorage.getItem(PRIMARY_COMPLAINTS_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as Complaint[];
    }
  } catch (error) {
    console.error('Failed to read primary complaints for assignments:', error);
  }

  return mockComplaints.map((c) => ({ ...c }));
}

function readStoredUpdates(): ComplaintUpdate[] {
  if (!isBrowser()) return mockUpdates.map((u) => ({ ...u }));

  try {
    const raw = window.localStorage.getItem(UPDATES_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as ComplaintUpdate[];
    }
  } catch (error) {
    console.error('Failed to read updates:', error);
  }

  return mockUpdates.map((u) => ({ ...u }));
}

/**
 * Validates whether a given team name is one of the supported university departments.
 */
export function isValidAssignmentTeam(team: string | null | undefined): boolean {
  if (!team || typeof team !== 'string') return false;
  const trimmed = team.trim();
  return (ALLOWED_ASSIGNMENT_TEAMS as readonly string[]).includes(trimmed);
}

/**
 * Retrieve complaints for assignment views from the unified data store.
 */
export function getAssignmentComplaints(): Complaint[] {
  return readStoredComplaints();
}

/**
 * Retrieve only unassigned complaints.
 */
export function getUnassignedComplaints(): Complaint[] {
  return readStoredComplaints().filter(
    (c) => c.assignedTo === null || c.assignedTo.trim() === ''
  );
}

/**
 * Retrieve only assigned complaints.
 */
export function getAssignedComplaints(): Complaint[] {
  return readStoredComplaints().filter(
    (c) => c.assignedTo !== null && c.assignedTo.trim() !== ''
  );
}

export interface AssignComplaintParams {
  complaintId: string;
  team: string;
  actor: AuditActor;
}

/**
 * Assign or reassign a complaint to a department team.
 * Updates the complaint record and updatedAt timestamp, appends a timeline update,
 * and records an administrative audit event atomically with rollback protection.
 */
export function assignComplaint(params: AssignComplaintParams): AssignmentResult {
  const { complaintId, team, actor } = params;
  const trimmedTeam = (team || '').trim();

  if (!isValidAssignmentTeam(trimmedTeam)) {
    return {
      outcome: 'invalid_team',
      error: `"${team}" is not a valid assignment department. Must be one of: ${ALLOWED_ASSIGNMENT_TEAMS.join(', ')}.`,
    };
  }

  const complaints = readStoredComplaints();
  const complaintIndex = complaints.findIndex((c) => c.id === complaintId);

  if (complaintIndex === -1) {
    return {
      outcome: 'not_found',
      error: `Complaint with ID "${complaintId}" was not found.`,
    };
  }

  const existingComplaint = complaints[complaintIndex];
  const previousTeam = existingComplaint.assignedTo;

  if (previousTeam === trimmedTeam) {
    return {
      outcome: 'unchanged',
      complaint: existingComplaint,
    };
  }

  const isReassignment = previousTeam !== null && previousTeam.trim() !== '';
  const timestamp = new Date().toISOString();

  // Create updated complaint record with new timestamp (SCMS-37)
  const updatedComplaint: Complaint = {
    ...existingComplaint,
    assignedTo: trimmedTeam,
    updatedAt: timestamp,
  };

  const updatedComplaints = [...complaints];
  updatedComplaints[complaintIndex] = updatedComplaint;

  // Create timeline update
  const currentUpdates = readStoredUpdates();
  const updateId = `UPD-${String(currentUpdates.length + 1).padStart(3, '0')}`;
  const timelineUpdate: ComplaintUpdate = {
    id: updateId,
    complaintId,
    status: updatedComplaint.status,
    message: isReassignment
      ? `Reassigned from ${previousTeam} to ${trimmedTeam}.`
      : `Assigned to ${trimmedTeam}.`,
    author: actor.name,
    timestamp,
  };
  const updatedUpdates = [...currentUpdates, timelineUpdate];

  // Capture previous storage state for rollback
  const prevComplaintsRaw = isBrowser()
    ? window.localStorage.getItem(PRIMARY_COMPLAINTS_KEY)
    : null;
  const prevUpdatesRaw = isBrowser()
    ? window.localStorage.getItem(UPDATES_STORAGE_KEY)
    : null;

  try {
    if (isBrowser()) {
      window.localStorage.setItem(
        PRIMARY_COMPLAINTS_KEY,
        JSON.stringify(updatedComplaints)
      );
      window.localStorage.setItem(
        UPDATES_STORAGE_KEY,
        JSON.stringify(updatedUpdates)
      );
    }

    // Record audit event
    const auditEvent = recordAdminAction({
      complaintId,
      action: isReassignment ? 'REASSIGNED' : 'ASSIGNED',
      actor,
      previousValue: previousTeam,
      newValue: trimmedTeam,
      timestamp,
      details: isReassignment
        ? `Reassigned department from "${previousTeam}" to "${trimmedTeam}"`
        : `Initial assignment to "${trimmedTeam}"`,
    });

    return {
      outcome: isReassignment ? 'reassigned' : 'assigned',
      complaint: updatedComplaint,
      auditEvent,
    };
  } catch (error) {
    // Rollback localStorage on failure
    if (isBrowser()) {
      try {
        if (prevComplaintsRaw === null) {
          window.localStorage.removeItem(PRIMARY_COMPLAINTS_KEY);
        } else {
          window.localStorage.setItem(PRIMARY_COMPLAINTS_KEY, prevComplaintsRaw);
        }
        if (prevUpdatesRaw === null) {
          window.localStorage.removeItem(UPDATES_STORAGE_KEY);
        } else {
          window.localStorage.setItem(UPDATES_STORAGE_KEY, prevUpdatesRaw);
        }
      } catch {
        // Best effort rollback
      }
    }

    console.error('Assignment persistence failed:', error);
    return {
      outcome: 'storage_error',
      error: 'Failed to save assignment to browser storage. Previous data was preserved.',
    };
  }
}
