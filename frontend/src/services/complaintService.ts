import {
  mockComplaints,
  mockNotifications,
  mockUpdates,
  statusLabels,
} from '@/data/mockData';

import {
  createComplaintRequest,
  listComplaintsRequest,
  getComplaintRequest,
  listNotificationsRequest,
  patchComplaintStatus,
  submitEscalationRequest,
  reviewEscalationRequest,
  reviewDuplicateRequest,
} from './authApi';

import type {
  Complaint,
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
  ComplaintUpdate,
  AppNotification,
  DuplicateReviewStatus,
} from '@/types';

import type { AuthSession } from '@/pages/auth/authContext';

import {
  createAuditEvent,
  getAdminAuditEvents,
  ADMIN_AUDIT_STORAGE_KEY,
} from './adminAuditService';

import { migrateComplaintData } from './dataMigrationService';
import { findPotentialDuplicates } from './duplicateDetectionService';

export interface NewComplaintInput {
  subject: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  description: string;
  submittedBy: string;
}

const STORAGE_KEY = 'scms_complaints';
const UPDATES_STORAGE_KEY = 'scms_complaint_updates';
const NOTIFICATIONS_STORAGE_KEY = 'scms_notifications';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function saveStorageBatch(entries: [string, unknown][]): void {
  if (!isBrowser()) return;

  const previous: (readonly [string, string | null])[] = [];

  try {
    for (const [key] of entries) {
      previous.push([key, window.localStorage.getItem(key)]);
    }

    for (const [key, value] of entries) {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (error) {
    for (const [key, value] of previous) {
      try {
        if (value === null) {
          window.localStorage.removeItem(key);
        } else {
          window.localStorage.setItem(key, value);
        }
      } catch {
        // Best effort rollback.
      }
    }

    console.error('Unable to save complaint updates:', error);

    throw new Error(
      'Could not save this change in browser storage. Your previous data was restored where possible.',
    );
  }
}

const PRIORITY_LEVELS: ComplaintPriority[] = [
  'low',
  'medium',
  'high',
  'critical',
];

/**
 * Automatically classify complaint priority.
 */
export function classifyComplaintPriority(
  subject: string,
  description: string,
  category: ComplaintCategory,
): ComplaintPriority {
  const text = `${subject} ${description}`.toLowerCase();

  const criticalKeywords = [
    'emergency',
    'life threatening',
    'life-threatening',
    'immediate danger',
    'fire',
    'explosion',
    'electric shock',
    'serious crime',
    'physical assault',
    'sexual assault',
    'severe injury',
    'weapon',
  ];

  const highKeywords = [
    'urgent',
    'unsafe',
    'harassment',
    'security breach',
    'danger',
    'severe',
    'injury',
    'water leakage',
    'power outage',
    'server down',
    'network down',
    'not working',
    'cannot access',
  ];

  const mediumKeywords = [
    'delay',
    'repeated',
    'frequently',
    'discrepancy',
    'malfunction',
    'intermittent',
  ];

  if (criticalKeywords.some((keyword) => text.includes(keyword))) {
    return 'critical';
  }

  if (highKeywords.some((keyword) => text.includes(keyword))) {
    return 'high';
  }

  if (category === 'harassment') {
    return 'high';
  }

  if (mediumKeywords.some((keyword) => text.includes(keyword))) {
    return 'medium';
  }

  return 'low';
}

/**
 * Load complaints from browser storage.
 */
function readComplaints(): Complaint[] {
  if (isBrowser()) {
    try {
      migrateComplaintData();
    } catch (error) {
      console.warn(
        'Data migration check failed on readComplaints:',
        error,
      );
    }
  }

  if (!isBrowser()) {
    return mockComplaints;
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (saved !== null) {
      const parsed: unknown = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        return parsed as Complaint[];
      }
    }
  } catch (error) {
    console.error('Unable to load saved complaints:', error);
  }

  return mockComplaints;
}

/**
 * Load complaint timeline updates.
 */
function readUpdates(): ComplaintUpdate[] {
  if (!isBrowser()) {
    return mockUpdates;
  }

  try {
    const saved = window.localStorage.getItem(UPDATES_STORAGE_KEY);

    if (saved !== null) {
      const parsed: unknown = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        return parsed as ComplaintUpdate[];
      }
    }
  } catch (error) {
    console.error('Unable to load complaint updates:', error);
  }

  return mockUpdates;
}

/**
 * Load notifications.
 */
function readNotifications(): AppNotification[] {
  if (!isBrowser()) {
    return mockNotifications;
  }

  try {
    const saved = window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);

    if (saved !== null) {
      const parsed: unknown = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        return parsed as AppNotification[];
      }
    }
  } catch (error) {
    console.error('Unable to load saved notifications:', error);
  }

  return mockNotifications;
}

/**
 * Generate the next complaint ID.
 */
function nextComplaintId(): string {
  const year = new Date().getFullYear();

  const highest = readComplaints().reduce((max, complaint) => {
    const match = /^CMP-\d{4}-(\d+)$/.exec(complaint.id);

    return match
      ? Math.max(max, Number(match[1]))
      : max;
  }, 0);

  return `CMP-${year}-${String(highest + 1).padStart(3, '0')}`;
}

/**
 * Create a new complaint and identify possible duplicates.
 */
export async function createComplaint(
  input: NewComplaintInput,
): Promise<Complaint> {
  const subject = input.subject.trim();
  const description = input.description.trim();

  if (!subject || !description) {
    throw new Error('Subject and description are required.');
  }

  const priority = classifyComplaintPriority(
    subject,
    description,
    input.category,
  );

  return createComplaintRequest({
    title: subject,
    description,
    category: input.category,
    priority,
  });
}

/**
 * Return one complaint.
 */
export function getComplaint(id: string): Complaint | undefined {
  return readComplaints().find((complaint) => complaint.id === id);
}

/**
 * Return all complaints.
 */
export async function getComplaints(): Promise<Complaint[]> {
  return listComplaintsRequest();
}

/**
 * Return complaint timeline updates.
 */
export async function getComplaintUpdates(): Promise<ComplaintUpdate[]> {
  const complaints = await listComplaintsRequest();

  const results = await Promise.all(
    complaints.map((complaint) =>
      getComplaintRequest(complaint.id),
    ),
  );

  return results.flatMap((result) => result.updates);
}

/**
 * Return complaints belonging to the authenticated user.
 */

export async function getMyComplaints(
  session: AuthSession | null,
): Promise<Complaint[]> {
  if (session?.role !== 'user') {
    return [];
  }

  return listComplaintsRequest();
}

/**
 * Return notifications belonging to the authenticated user.
 */
export function getMyNotifications(
  session: AuthSession | null,
): AppNotification[] {
  if (session?.role !== 'user') {
    return [];
  }
  

  const ownedComplaintIds = new Set(
    readComplaints()
      .filter(
        (complaint) => complaint.submittedBy === session.fullName,
      )
      .map((complaint) => complaint.id),
  );

  return readNotifications().filter((notification) =>
    ownedComplaintIds.has(notification.complaintId),
  );
}

/**
 * Return predefined priority levels.
 */
export function getPriorityLevels(): ComplaintPriority[] {
  return [...PRIORITY_LEVELS];
}

/**
 * Search complaints across relevant fields.
 */
export function searchComplaints(
  query: string,
  complaints: Complaint[] = readComplaints(),
): Complaint[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return complaints;
  }

  return complaints.filter((complaint) => {
    const fields = [
      complaint.id,
      complaint.subject,
      complaint.description,
      complaint.submittedBy,
      complaint.assignedTo ?? '',
      complaint.category ?? '',
      complaint.status,
      complaint.priority,
      complaint.possibleDuplicateId ?? '',
    ];

    return fields.some((field) =>
      field.toLowerCase().includes(normalizedQuery),
    );
  });
}

export interface ComplaintFilters {
  query?: string;
  category?: ComplaintCategory | 'all';
  status?: ComplaintStatus | 'all';
  priority?: ComplaintPriority | 'all';
  submittedBy?: string;
  assignedTo?: string | 'unassigned';
}

/**
 * Filter complaints using multiple criteria.
 */
export function filterComplaints(
  filters: ComplaintFilters,
  complaints: Complaint[] = readComplaints(),
): Complaint[] {
  const query = filters.query?.trim().toLowerCase() ?? '';

  return complaints.filter((complaint) => {
    const searchableFields = [
      complaint.id,
      complaint.subject,
      complaint.description,
      complaint.submittedBy,
      complaint.assignedTo ?? '',
      complaint.category ?? '',
      complaint.status,
      complaint.priority,
      complaint.possibleDuplicateId ?? '',
    ];

    const matchesQuery =
      query === '' ||
      searchableFields.some((field) =>
        field.toLowerCase().includes(query),
      );

    const matchesCategory =
      !filters.category ||
      filters.category === 'all' ||
      complaint.category === filters.category;

    const matchesStatus =
      !filters.status ||
      filters.status === 'all' ||
      complaint.status === filters.status;

    const matchesPriority =
      !filters.priority ||
      filters.priority === 'all' ||
      complaint.priority === filters.priority;

    const matchesUser =
      !filters.submittedBy ||
      complaint.submittedBy === filters.submittedBy;

    const matchesAssignee =
      filters.assignedTo === undefined ||
      (filters.assignedTo === 'unassigned'
        ? complaint.assignedTo === null
        : complaint.assignedTo === filters.assignedTo);

    return (
      matchesQuery &&
      matchesCategory &&
      matchesStatus &&
      matchesPriority &&
      matchesUser &&
      matchesAssignee
    );
  });
}

/* -------------------------------------------------------
   ADMIN PRIORITY OVERRIDE
------------------------------------------------------- */

export type UpdateComplaintPriorityResult =
  | { outcome: 'updated'; complaint: Complaint }
  | { outcome: 'unchanged' }
  | { outcome: 'not_found' }
  | { outcome: 'unauthorized' }
  | { outcome: 'invalid_priority' };

/**
 * Allow administrators to manually change complaint priority.
 */
export function updateComplaintPriority(
  complaintId: string,
  priority: ComplaintPriority,
  session: AuthSession | null,
): UpdateComplaintPriorityResult {
  if (session?.role !== 'admin') {
    return { outcome: 'unauthorized' };
  }

  if (!PRIORITY_LEVELS.includes(priority)) {
    return { outcome: 'invalid_priority' };
  }

  const complaints = [...readComplaints()].map((item) => ({
    ...item,
  }));

  const complaint = complaints.find(
    (item) => item.id === complaintId,
  );

  if (!complaint) {
    return { outcome: 'not_found' };
  }

  if (complaint.priority === priority) {
    return { outcome: 'unchanged' };
  }

  const previousPriority = complaint.priority;
  const timestamp = new Date().toISOString();

  complaint.priority = priority;
  complaint.updatedAt = timestamp;

  const currentAudit = getAdminAuditEvents();

  const auditEvent = createAuditEvent({
    complaintId,
    action: 'PRIORITY_CHANGED',
    actor: {
      name: session.fullName,
      email: session.email || '',
      role: session.role,
    },
    previousValue: previousPriority,
    newValue: priority,
    timestamp,
    details: `Priority manually changed from ${previousPriority} to ${priority}.`,
  });

  const updatedAudit = [auditEvent, ...currentAudit];

  saveStorageBatch([
    [STORAGE_KEY, complaints],
    [ADMIN_AUDIT_STORAGE_KEY, updatedAudit],
  ]);

  return {
    outcome: 'updated',
    complaint,
  };
}

/* -------------------------------------------------------
   ADMIN DUPLICATE REVIEW
------------------------------------------------------- */

export type ReviewDuplicateResult =
  | {
      outcome: 'reviewed';
      complaint: Complaint;
      duplicate: Complaint;
    }
  | { outcome: 'unauthorized' }
  | { outcome: 'not_found' }
  | { outcome: 'no_duplicate' }
  | { outcome: 'duplicate_not_found' }
  | { outcome: 'unchanged' };

/**
 * Allow an administrator to confirm or reject a suspected duplicate.
 *
 * Both complaint records remain separate.
 * No complaint is merged, deleted, or automatically closed.
 */
export async function reviewDuplicate(
  complaintId: string,
  decision: Exclude<DuplicateReviewStatus, 'pending'>,
  session: AuthSession | null,
): Promise<ReviewDuplicateResult> {
  if (session?.role !== 'admin') {
    return { outcome: 'unauthorized' };
  }

  try {
    const result = await reviewDuplicateRequest(complaintId, decision);

    if (result.outcome === 'unchanged') {
      return { outcome: 'unchanged' };
    }

    // Refresh complaints from the backend.
    const complaints = await listComplaintsRequest();

    const complaint = complaints.find(
      (item) => item.id === result.complaintId,
    );

    const duplicate = complaints.find(
      (item) => item.id === result.duplicateId,
    );

    if (!complaint) {
      return { outcome: 'not_found' };
    }

    if (!duplicate) {
      return { outcome: 'duplicate_not_found' };
    }

    return {
      outcome: 'reviewed',
      complaint,
      duplicate,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '';

    if (message.includes('No possible duplicate')) {
      return { outcome: 'no_duplicate' };
    }

    if (message.includes('Duplicate complaint not found')) {
      return { outcome: 'duplicate_not_found' };
    }

    if (message.includes('Complaint not found')) {
      return { outcome: 'not_found' };
    }

    throw error;
  }
}/* -------------------------------------------------------
   COMPLAINT STATUS UPDATES
------------------------------------------------------- */

export type UpdateComplaintStatusResult =
  | { outcome: 'updated'; update: ComplaintUpdate }
  | { outcome: 'unchanged' }
  | { outcome: 'not_found' }
  | { outcome: 'unauthorized' };

/**
 * Update complaint status and append a timeline entry.
 */

export async function updateComplaintStatus(
  complaintId: string,
  status: ComplaintStatus,
  author: string,
  session: AuthSession | null,
): Promise<UpdateComplaintStatusResult> {
  if (session?.role !== 'admin') {
    return { outcome: 'unauthorized' };
  }

  const complaints = await listComplaintsRequest();

  const complaint = complaints.find(
    (item) => item.id === complaintId,
  );

  if (!complaint || !complaint.databaseId) {
    return { outcome: 'not_found' };
  }

  if (complaint.status === status) {
    return { outcome: 'unchanged' };
  }

  const previousStatus = complaint.status;

  const result = await patchComplaintStatus(
    String(complaint.databaseId),
    status,
  );

  if (!result.changed) {
    return { outcome: 'unchanged' };
  }

  if (!result.update) {
    throw new Error(
      'Status was updated, but the backend did not return the complaint history update.',
    );
  }

  const timestamp = result.update.timestamp;

  const update: ComplaintUpdate = {
    ...result.update,
    complaintId,
  };

  const currentAudit = getAdminAuditEvents();

  const auditEvent = createAuditEvent({
    complaintId,
    action: 'STATUS_CHANGED',
    actor: {
      name: session.fullName || author,
      email: session.email || '',
      role: session.role,
    },
    previousValue: previousStatus,
    newValue: status,
    timestamp,
    details: `Status changed from ${
      statusLabels[previousStatus] ?? previousStatus
    } to ${statusLabels[status] ?? status}.`,
  });

  saveStorageBatch([
    [ADMIN_AUDIT_STORAGE_KEY, [auditEvent, ...currentAudit]],
  ]);

  return {
    outcome: 'updated',
    update,
  };
}

/* -------------------------------------------------------
   ADMIN ESCALATION REVIEW
------------------------------------------------------- */

export type ReviewEscalationResult =
  | { outcome: 'reviewed'; update: ComplaintUpdate }
  | { outcome: 'unauthorized' }
  | { outcome: 'not_found' }
  | { outcome: 'not_escalated' };

/**
 * Record an administrative escalation review action.
 */

export async function reviewComplaintEscalation(
  complaintId: string,
  actionNote: string,
  session: AuthSession | null,
): Promise<ReviewEscalationResult> {
  if (session?.role !== 'admin') {
    return { outcome: 'unauthorized' };
  }

  const trimmedNote = actionNote.trim();

  if (!trimmedNote) {
    throw new Error('A review note is required.');
  }

  const complaints = await listComplaintsRequest();

  const complaint = complaints.find(
    (item) => item.id === complaintId,
  );

  if (!complaint) {
    return { outcome: 'not_found' };
  }

  if (!complaint.isEscalated) {
    return { outcome: 'not_escalated' };
  }

  const review = await reviewEscalationRequest(
    complaintId,
    trimmedNote,
  );

  const update: ComplaintUpdate = {
    id: `REV-${review.id}`,
    complaintId,
    status: complaint.status,
    message: `Admin escalation review: ${review.note}`,
    author: review.reviewedBy,
    timestamp: review.reviewedAt,
  };

  const auditEvent = createAuditEvent({
    complaintId,
    action: 'ESCALATION_REVIEWED',
    actor: {
      name: session.fullName,
      email: session.email || '',
      role: session.role,
    },
    previousValue: 'Escalated',
    newValue: 'Reviewed',
    timestamp: review.reviewedAt,
    details: trimmedNote,
  });

  const currentAudit = getAdminAuditEvents();

  saveStorageBatch([
    [ADMIN_AUDIT_STORAGE_KEY, [auditEvent, ...currentAudit]],
  ]);

  return {
    outcome: 'reviewed',
    update,
  };
}

/* -------------------------------------------------------
   USER COMPLAINT ESCALATION
------------------------------------------------------- */

export type SubmitEscalationResult =
  | { outcome: 'submitted'; update: ComplaintUpdate }
  | { outcome: 'invalid_reason' }
  | { outcome: 'unauthorized' }
  | { outcome: 'not_found' }
  | { outcome: 'ineligible' };

/**
 * Record an escalation for a complaint owned by the current user.
 */

export async function submitComplaintEscalation(
  complaintId: string,
  reason: string,
  session: AuthSession | null,
): Promise<SubmitEscalationResult> {
  if (session?.role !== 'user') {
    return { outcome: 'unauthorized' };
  }

  const trimmedReason = reason.trim();

  if (!trimmedReason) {
    return { outcome: 'invalid_reason' };
  }

  const complaints = await listComplaintsRequest();

  const complaint = complaints.find(
    (item) => item.id === complaintId,
  );

  if (!complaint) {
    return { outcome: 'not_found' };
  }

  if (complaint.submittedBy !== session.fullName) {
    return { outcome: 'unauthorized' };
  }

  if (
    complaint.isEscalated ||
    complaint.status === 'resolved' ||
    complaint.status === 'rejected'
  ) {
    return { outcome: 'ineligible' };
  }

  await submitEscalationRequest(complaintId, trimmedReason);

  const refreshed = await getComplaintRequest(complaintId);

  const existingUpdate = refreshed.updates.find(
    (item) => item.message.includes(trimmedReason),
  );

  const update: ComplaintUpdate = existingUpdate ?? {
    id: `ESC-${Date.now()}`,
    complaintId,
    status: refreshed.complaint.status,
    message: `Escalation reason: ${trimmedReason}`,
    author: session.fullName,
    timestamp: new Date().toISOString(),
  };

  return {
    outcome: 'submitted',
    update,
  };
}
