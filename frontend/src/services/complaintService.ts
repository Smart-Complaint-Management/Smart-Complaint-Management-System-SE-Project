import {
  mockComplaints,
  mockNotifications,
  mockUpdates,
  statusLabels,
} from '@/data/mockData';

import type {
  Complaint,
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
  ComplaintUpdate,
  AppNotification,
} from '@/types';

import type { AuthSession } from '@/pages/auth/authContext';

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

function saveStorageBatch(entries: [string, unknown][]): void {
  if (!isBrowser()) return;
  const previous: (readonly [string, string | null])[] = [];
  try {
    for (const [key] of entries) previous.push([key, window.localStorage.getItem(key)]);
    for (const [key, value] of entries) window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    for (const [key, value] of previous) {
      try {
        if (value === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, value);
      } catch { /* Best effort rollback if browser storage is unavailable. */ }
    }
    console.error('Unable to save complaint updates:', error);
    throw new Error('Could not save this change in browser storage. Your previous data was restored where possible.');
  }
}

const PRIORITY_LEVELS: ComplaintPriority[] = [
  'low',
  'medium',
  'high',
  'critical',
];

/**
 * Safely checks whether browser storage is available.
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Assign priority using transparent, rule-based classification.
 *
 * Critical: immediate safety risks or emergencies.
 * High: urgent incidents requiring prompt attention.
 * Medium: recurring or disruptive problems.
 * Low: ordinary requests and minor issues.
 *
 * This is a heuristic classifier, not a trained ML model.
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
 * Load complaints from localStorage.
 *
 * Existing mock records are used when no saved records exist.
 */
function readComplaints(): Complaint[] {
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
 * Persist complaints in browser storage.
 */
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
 * Persist complaint timeline updates.
 */
/**
 * Load notifications recorded in this browser, falling back to the examples.
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
 * Persist notifications in browser storage.
 */
/**
 * Generate a complaint ID using the current year and existing IDs.
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
 * Create a complaint and persist the assigned priority.
 */
export async function createComplaint(
  input: NewComplaintInput,
): Promise<Complaint> {
  await new Promise((resolve) => setTimeout(resolve, 100));

  const subject = input.subject.trim();
  const description = input.description.trim();

  const priority = classifyComplaintPriority(
    subject,
    description,
    input.category,
  );

  const now = new Date().toISOString();

  const complaint: Complaint = {
    id: nextComplaintId(),
    subject,
    description,
    category: input.category,
    status: 'submitted',
    priority,
    submittedBy: input.submittedBy,
    assignedTo: null,
    submittedAt: now,
    updatedAt: now,
    isEscalated: false,
    possibleDuplicateId: null,
  };

  const complaints = [...readComplaints()];
  complaints.unshift(complaint);
  const updates = [...readUpdates()];

  updates.push({
    id: `UPD-${String(updates.length + 1).padStart(3, '0')}`,
    complaintId: complaint.id,
    status: 'submitted',
    message: 'Complaint registered. Awaiting triage and assignment.',
    author: 'System',
    timestamp: now,
  });

  saveStorageBatch([[STORAGE_KEY, complaints], [UPDATES_STORAGE_KEY, updates]]);

  return complaint;
}

/**
 * Return all complaints.
 */
export function getComplaints(): Complaint[] {
  return readComplaints();
}

/**
 * Return complaint timeline updates from browser storage or the mock fallback.
 */
export function getComplaintUpdates(): ComplaintUpdate[] {
  return readUpdates();
}

/**
 * Return complaints belonging to the authenticated user.
 */
export function getMyComplaints(
  session: AuthSession | null,
): Complaint[] {
  if (session?.role !== 'user') {
    return [];
  }

  return readComplaints().filter(
    (complaint) => complaint.submittedBy === session.fullName,
  );
}

/**
 * Return notifications only for complaints owned by the authenticated user.
 */
export function getMyNotifications(
  session: AuthSession | null,
): AppNotification[] {
  if (session?.role !== 'user') {
    return [];
  }

  const ownedComplaintIds = new Set(
    readComplaints()
      .filter((complaint) => complaint.submittedBy === session.fullName)
      .map((complaint) => complaint.id),
  );

  return readNotifications().filter((notification) =>
    ownedComplaintIds.has(notification.complaintId),
  );
}

/**
 * Return the predefined priority levels.
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
      complaint.category,
      complaint.status,
      complaint.priority,
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
 * Filter complaints using multiple criteria simultaneously.
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
      complaint.category,
      complaint.status,
      complaint.priority,
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

export type UpdateComplaintStatusResult =
  | { outcome: 'updated'; update: ComplaintUpdate }
  | { outcome: 'unchanged' }
  | { outcome: 'not_found' }
  | { outcome: 'unauthorized' };

/**
 * Update complaint status and append a timeline entry.
 */
export function updateComplaintStatus(
  complaintId: string,
  status: ComplaintStatus,
  author: string,
  session: AuthSession | null,
): UpdateComplaintStatusResult {
  if (session?.role !== 'admin') {
    return { outcome: 'unauthorized' };
  }

  const complaints = [...readComplaints()].map((item) => ({ ...item }));

  const complaint = complaints.find(
    (item) => item.id === complaintId,
  );

  if (!complaint) {
    return { outcome: 'not_found' };
  }

  if (complaint.status === status) {
    return { outcome: 'unchanged' };
  }

  const timestamp = new Date().toISOString();

  const updates = [...readUpdates()];

  const update: ComplaintUpdate = {
    id: `UPD-${String(updates.length + 1).padStart(3, '0')}`,
    complaintId,
    status,
    message: `Status changed to ${statusLabels[status]}.`,
    author,
    timestamp,
  };

  complaint.status = status;
  complaint.updatedAt = timestamp;

  updates.push(update);
  const isResolution = status === 'resolved';
  const notifications = [...readNotifications()];
  const notificationId = `NOT-${update.id}`;
  if (!notifications.some((item) => item.id === notificationId)) notifications.push({
    id: notificationId, complaintId, type: isResolution ? 'resolution' : 'status_update',
    title: isResolution ? 'Complaint resolved' : `Status update on ${complaintId}`,
    message: isResolution
      ? `Your complaint ${complaintId} has been marked as resolved.`
      : `Your complaint ${complaintId} status changed to ${statusLabels[status]}.`,
    read: false, timestamp: update.timestamp,
  });
  saveStorageBatch([[STORAGE_KEY, complaints], [UPDATES_STORAGE_KEY, updates], [NOTIFICATIONS_STORAGE_KEY, notifications]]);

  return { outcome: 'updated', update };
}

export type SubmitEscalationResult =
  | { outcome: 'submitted'; update: ComplaintUpdate }
  | { outcome: 'invalid_reason' }
  | { outcome: 'unauthorized' }
  | { outcome: 'not_found' }
  | { outcome: 'ineligible' };

/**
 * Record an escalation for a complaint owned by the current user.
 */
export function submitComplaintEscalation(
  complaintId: string,
  reason: string,
  session: AuthSession | null,
): SubmitEscalationResult {
  if (session?.role !== 'user') {
    return { outcome: 'unauthorized' };
  }

  const complaints = [...readComplaints()].map((item) => ({ ...item }));

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

  const trimmedReason = reason.trim();

  if (!trimmedReason) {
    return { outcome: 'invalid_reason' };
  }

  const timestamp = new Date().toISOString();

  const updates = [...readUpdates()];

  const update: ComplaintUpdate = {
    id: `UPD-${String(updates.length + 1).padStart(3, '0')}`,
    complaintId,
    status: complaint.status,
    message: `Escalation reason: ${trimmedReason}`,
    author: session.fullName,
    timestamp,
  };

  complaint.isEscalated = true;
  complaint.updatedAt = timestamp;

  updates.push(update);
  const notifications = [...readNotifications()];
  const notificationId = `NOT-${update.id}`;
  if (!notifications.some((item) => item.id === notificationId)) notifications.push({
    id: notificationId, complaintId, type: 'escalation', title: 'Complaint escalated',
    message: `Your escalation for ${complaintId} was submitted: ${trimmedReason}`,
    read: false, timestamp,
  });
  saveStorageBatch([[STORAGE_KEY, complaints], [UPDATES_STORAGE_KEY, updates], [NOTIFICATIONS_STORAGE_KEY, notifications]]);

  return { outcome: 'submitted', update };
}
