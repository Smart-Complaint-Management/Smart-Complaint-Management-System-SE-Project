import { mockComplaints, mockUpdates } from '@/data/mockData';
import type { Complaint, ComplaintCategory, ComplaintPriority } from '@/types';

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