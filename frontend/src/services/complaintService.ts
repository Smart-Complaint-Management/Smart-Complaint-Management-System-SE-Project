```typescript
import {
  mockComplaints,
  mockUpdates,
  statusLabels,
} from '@/data/mockData';

import type {
  Complaint,
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
  ComplaintUpdate,
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

const PRIORITY_LEVELS: ComplaintPriority[] = [
  'low',
  'medium',
  'high',
  'critical',
];

/**
 * Assign a priority automatically from the complaint's subject,
 * description and category.
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
    'fire',
    'electric shock',
    'serious crime',
    'immediate danger',
    'critical safety',
  ];

  const highKeywords = [
    'urgent',
    'danger',
    'unsafe',
    'harassment',
    'security breach',
    'severe',
    'not working',
    'equipment damage',
    'injury',
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
 * Read persisted complaints, falling back to the existing mock data.
 */
function readComplaints(): Complaint[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      return JSON.parse(saved) as Complaint[];
    }
  } catch (error) {
    console.error('Unable to load saved complaints:', error);
  }

  return mockComplaints;
}

/**
 * Save complaint records to browser storage.
 */
function saveComplaints(complaints: Complaint[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(complaints));
  } catch (error) {
    console.error('Unable to save complaints:', error);
  }
}

function readUpdates(): ComplaintUpdate[] {
  try {
    const saved = localStorage.getItem(UPDATES_STORAGE_KEY);

    if (saved) {
      return JSON.parse(saved) as ComplaintUpdate[];
    }
  } catch (error) {
    console.error('Unable to load complaint updates:', error);
  }

  return mockUpdates;
}

function saveUpdates(updates: ComplaintUpdate[]): void {
  try {
    localStorage.setItem(UPDATES_STORAGE_KEY, JSON.stringify(updates));
  } catch (error) {
    console.error('Unable to save complaint updates:', error);
  }
}

function nextComplaintId(): string {
  const year = new Date().getFullYear();

  const complaints = readComplaints();

  const highest = complaints.reduce((max, complaint) => {
    const match = /^CMP-\d{4}-(\d+)$/.exec(complaint.id);

    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  return `CMP-${year}-${String(highest + 1).padStart(3, '0')}`;
}

export async function createComplaint(
  input: NewComplaintInput,
): Promise<Complaint> {
  await new Promise((resolve) => setTimeout(resolve, 100));

  const now = new Date().toISOString();

  const complaint: Complaint = {
    id: nextComplaintId(),
    subject: input.subject.trim(),
    description: input.description.trim(),
    category: input.category,
    status: 'submitted',
    priority: classifyComplaintPriority(
      input.subject,
      input.description,
      input.category,
    ),
    submittedBy: input.submittedBy,
    assignedTo: null,
    submittedAt: now,
    updatedAt: now,
    isEscalated: false,
    possibleDuplicateId: null,
  };

  const complaints = readComplaints();

  complaints.unshift(complaint);
  saveComplaints(complaints);

  const updates = readUpdates();

  updates.push({
    id: `UPD-${String(updates.length + 1).padStart(3, '0')}`,
    complaintId: complaint.id,
    status: 'submitted',
    message: 'Complaint registered. Awaiting triage and assignment.',
    author: 'System',
    timestamp: now,
  });

  saveUpdates(updates);

  return complaint;
}

export function searchComplaints(
  query: string,
  complaints: Complaint[] = readComplaints(),
): Complaint[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return complaints;
  }

  return complaints.filter((complaint) =>
    [
      complaint.id,
      complaint.subject,
      complaint.description,
      complaint.submittedBy,
      complaint.assignedTo ?? '',
      complaint.category,
      complaint.status,
      complaint.priority,
    ].some((value) => value.toLowerCase().includes(normalizedQuery)),
  );
}

export interface ComplaintFilters {
  query?: string;
  category?: ComplaintCategory | 'all';
  status?: ComplaintStatus | 'all';
  priority?: ComplaintPriority | 'all';
  submittedBy?: string;
}

export function filterComplaints(
  filters: ComplaintFilters,
  complaints: Complaint[] = readComplaints(),
): Complaint[] {
  const query = filters.query?.trim().toLowerCase() ?? '';

  return complaints.filter((complaint) => {
    const matchesQuery =
      !query ||
      [
        complaint.id,
        complaint.subject,
        complaint.description,
        complaint.submittedBy,
        complaint.assignedTo ?? '',
        complaint.category,
        complaint.status,
        complaint.priority,
      ].some((value) => value.toLowerCase().includes(query));

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

    return (
      matchesQuery &&
      matchesCategory &&
      matchesStatus &&
      matchesPriority &&
      matchesUser
    );
  });
}

export function getComplaints(): Complaint[] {
  return readComplaints();
}

export function getMyComplaints(session: AuthSession | null): Complaint[] {
  if (session?.role !== 'user') {
    return [];
  }

  return readComplaints().filter(
    (complaint) => complaint.submittedBy === session.fullName,
  );
}

export function getPriorityLevels(): ComplaintPriority[] {
  return [...PRIORITY_LEVELS];
}

export type UpdateComplaintStatusResult =
  | { outcome: 'updated'; update: ComplaintUpdate }
  | { outcome: 'unchanged' }
  | { outcome: 'not_found' }
  | { outcome: 'unauthorized' };

export function updateComplaintStatus(
  complaintId: string,
  status: ComplaintStatus,
  author: string,
  session: AuthSession | null,
): UpdateComplaintStatusResult {
  if (session?.role !== 'admin') {
    return { outcome: 'unauthorized' };
  }

  const complaints = readComplaints();
  const complaint = complaints.find((item) => item.id === complaintId);

  if (!complaint) {
    return { outcome: 'not_found' };
  }

  if (complaint.status === status) {
    return { outcome: 'unchanged' };
  }

  const timestamp = new Date().toISOString();

  const update: ComplaintUpdate = {
    id: `UPD-${String(readUpdates().length + 1).padStart(3, '0')}`,
    complaintId,
    status,
    message: `Status changed to ${statusLabels[status]}.`,
    author,
    timestamp,
  };

  complaint.status = status;
  complaint.updatedAt = timestamp;

  saveComplaints(complaints);

  const updates = readUpdates();
  updates.push(update);
  saveUpdates(updates);

  return { outcome: 'updated', update };
}

export type SubmitEscalationResult =
  | { outcome: 'submitted'; update: ComplaintUpdate }
  | { outcome: 'invalid_reason' }
  | { outcome: 'unauthorized' }
  | { outcome: 'not_found' }
  | { outcome: 'ineligible' };

export function submitComplaintEscalation(
  complaintId: string,
  reason: string,
  session: AuthSession | null,
): SubmitEscalationResult {
  if (session?.role !== 'user') {
    return { outcome: 'unauthorized' };
  }

  const complaints = readComplaints();

  const complaint = complaints.find((item) => item.id === complaintId);

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

  const updates = readUpdates();

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

  saveComplaints(complaints);

  updates.push(update);
  saveUpdates(updates);

  return { outcome: 'submitted', update };
}
```
