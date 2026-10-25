import { mockComplaints, mockUpdates, statusLabels } from '@/data/mockData';
import type { Complaint, ComplaintCategory, ComplaintPriority, ComplaintStatus, ComplaintUpdate } from '@/types';
import type { AuthSession } from '@/pages/auth/authContext';

export interface NewComplaintInput {
  subject: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  description: string;
  submittedBy: string;
}

function nextComplaintId(): string {
  const year = new Date().getFullYear();
  const highest = mockComplaints.reduce((max, c) => {
    const match = /^CMP-\d{4}-(\d+)$/.exec(c.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `CMP-${year}-${String(highest + 1).padStart(3, '0')}`;
}

// MOCK STORAGE: adds the complaint to the shared in-memory mock arrays so the
// other pages (My Complaints, tracking, admin lists) can see it. It is lost
// when the page is refreshed.
// TODO: replace with a POST to the Flask API once the endpoint is agreed. The
// backend must re-validate every field, generate the ID, and write to MySQL.
export async function createComplaint(input: NewComplaintInput): Promise<Complaint> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const now = new Date().toISOString();
  const complaint: Complaint = {
    id: nextComplaintId(),
    subject: input.subject.trim(),
    description: input.description.trim(),
    category: input.category,
    status: 'submitted',
    priority: input.priority, // TODO (SCMS-24): replaced by automatic classification
    submittedBy: input.submittedBy,
    assignedTo: null,
    submittedAt: now,
    updatedAt: now,
    isEscalated: false,
    possibleDuplicateId: null,
  };

  mockComplaints.unshift(complaint);
  mockUpdates.push({
    id: `UPD-${String(mockUpdates.length + 1).padStart(3, '0')}`,
    complaintId: complaint.id,
    status: 'submitted',
    message: 'Complaint registered. Awaiting triage and assignment.',
    author: 'System',
    timestamp: now,
  });

  return complaint;
}

export type UpdateComplaintStatusResult =
  | { outcome: 'updated'; update: ComplaintUpdate }
  | { outcome: 'unchanged' }
  | { outcome: 'not_found' }
  | { outcome: 'unauthorized' };

/** Update a complaint and append its status change to the in-memory mock timeline. */
export function updateComplaintStatus(
  complaintId: string,
  status: ComplaintStatus,
  author: string,
  session: AuthSession | null,
): UpdateComplaintStatusResult {
  if (session?.role !== 'admin') return { outcome: 'unauthorized' };

  const complaint = mockComplaints.find((item) => item.id === complaintId);
  if (!complaint) return { outcome: 'not_found' };
  if (complaint.status === status) return { outcome: 'unchanged' };

  const timestamp = new Date().toISOString();
  const update: ComplaintUpdate = {
    id: `UPD-${String(mockUpdates.length + 1).padStart(3, '0')}`,
    complaintId,
    status,
    message: `Status changed to ${statusLabels[status]}.`,
    author,
    timestamp,
  };

  complaint.status = status;
  complaint.updatedAt = timestamp;
  mockUpdates.push(update);

  return { outcome: 'updated', update };
}

export type SubmitEscalationResult =
  | { outcome: 'submitted'; update: ComplaintUpdate }
  | { outcome: 'invalid_reason' }
  | { outcome: 'unauthorized' }
  | { outcome: 'not_found' }
  | { outcome: 'ineligible' };

/** Record an escalation in the shared in-memory complaint and timeline data. */
export function submitComplaintEscalation(
  complaintId: string,
  reason: string,
  session: AuthSession | null,
): SubmitEscalationResult {
  if (session?.role !== 'user') return { outcome: 'unauthorized' };

  const complaint = mockComplaints.find((item) => item.id === complaintId);
  if (!complaint) return { outcome: 'not_found' };
  if (complaint.submittedBy !== session.fullName) return { outcome: 'unauthorized' };
  if (
    complaint.isEscalated ||
    complaint.status === 'resolved' ||
    complaint.status === 'rejected'
  ) {
    return { outcome: 'ineligible' };
  }

  const trimmedReason = reason.trim();
  if (!trimmedReason) return { outcome: 'invalid_reason' };

  const timestamp = new Date().toISOString();
  const update: ComplaintUpdate = {
    id: `UPD-${String(mockUpdates.length + 1).padStart(3, '0')}`,
    complaintId,
    status: complaint.status,
    message: `Escalation reason: ${trimmedReason}`,
    author: session.fullName,
    timestamp,
  };

  complaint.isEscalated = true;
  complaint.updatedAt = timestamp;
  mockUpdates.push(update);

  return { outcome: 'submitted', update };
}
