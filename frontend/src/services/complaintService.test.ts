import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAdminAuditEvents, ADMIN_AUDIT_STORAGE_KEY } from './adminAuditService';
import type { AuthSession } from '@/pages/auth/authContext';
import type { AppNotification, Complaint, ComplaintUpdate } from '@/types';
import {
  createComplaint,
  getComplaints,
  getMyNotifications,
  submitComplaintEscalation,
  updateComplaintStatus,
  reviewComplaintEscalation,
} from './complaintService';

const COMPLAINTS_KEY = 'scms_complaints';
const UPDATES_KEY = 'scms_complaint_updates';
const NOTIFICATIONS_KEY = 'scms_notifications';

const userSession: AuthSession = {
  email: 'user@example.test',
  fullName: 'Test User',
  role: 'user',
};
const otherUserSession: AuthSession = {
  email: 'other@example.test',
  fullName: 'Other User',
  role: 'user',
};
const adminSession: AuthSession = {
  email: 'admin@example.test',
  fullName: 'Test Admin',
  role: 'admin',
};

function complaint(overrides: Partial<Complaint> = {}): Complaint {
  return {
    id: 'CMP-2026-001',
    subject: 'Network access',
    description: 'Unable to access the campus network.',
    category: 'it_infrastructure',
    status: 'submitted',
    priority: 'medium',
    submittedBy: userSession.fullName,
    assignedTo: null,
    submittedAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    isEscalated: false,
    possibleDuplicateId: null,
    ...overrides,
  };
}

function notification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 'NOT-UPD-001',
    complaintId: 'CMP-2026-001',
    type: 'status_update',
    title: 'Status update',
    message: 'Status changed.',
    read: false,
    timestamp: '2026-01-02T10:00:00.000Z',
    ...overrides,
  };
}

function stored<T>(key: string): T {
  return JSON.parse(localStorage.getItem(key) ?? 'null') as T;
}

function seedStorage(
  complaints: Complaint[] = [complaint()],
  updates: ComplaintUpdate[] = [],
  notifications: AppNotification[] = [],
) {
  localStorage.setItem(COMPLAINTS_KEY, JSON.stringify(complaints));
  localStorage.setItem(UPDATES_KEY, JSON.stringify(updates));
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
}

describe('localStorage-backed complaint services', () => {
  beforeEach(() => {
    localStorage.clear();
    seedStorage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('loads persisted complaints for tracking lookup', () => {
    const complaints = getComplaints();
    expect(complaints).toHaveLength(1);
    expect(complaints.find((item) => item.id === 'CMP-2026-001')?.subject).toBe('Network access');
    expect(complaints.find((item) => item.id === 'CMP-unknown')).toBeUndefined();
  });
  
  
  it('stores the selected category, priority, and description correctly', async () => {
    const created = await createComplaint({
      subject: 'Projector not working',
      category: 'facilities',
      priority: 'high',
      description: 'The projector in the classroom is not working.',
      submittedBy: userSession.fullName,
    });

    expect(created).toMatchObject({
      subject: 'Projector not working',
      category: 'facilities',
      priority: 'high',
      description: 'The projector in the classroom is not working.',
      submittedBy: userSession.fullName,
    });

    expect(stored<Complaint[]>(COMPLAINTS_KEY)).toContainEqual(
      expect.objectContaining({
        id: created.id,
        category: 'facilities',
        priority: 'high',
      }),
    );
  });

  it('assigns unique IDs to separately registered complaints', async () => {
    const first = await createComplaint({
      subject: 'First complaint',
      category: 'academic',
      priority: 'low',
      description: 'First description.',
      submittedBy: userSession.fullName,
    });

    const second = await createComplaint({
      subject: 'Second complaint',
      category: 'facilities',
      priority: 'medium',
      description: 'Second description.',
      submittedBy: userSession.fullName,
    });

    expect(first.id).toBeTruthy();
    expect(second.id).toBeTruthy();
    expect(first.id).not.toBe(second.id);
    expect(stored<Complaint[]>(COMPLAINTS_KEY)).toHaveLength(3);
  });

  it('does not overwrite previously stored complaints during registration', async () => {
    const existing = stored<Complaint[]>(COMPLAINTS_KEY)[0];

    await createComplaint({
      subject: 'New complaint',
      category: 'academic',
      priority: 'medium',
      description: 'A new complaint.',
      submittedBy: userSession.fullName,
    });

    const saved = stored<Complaint[]>(COMPLAINTS_KEY);

    expect(saved).toHaveLength(2);
    expect(saved).toContainEqual(existing);
  });

  it('creates a complaint and persists its confirmation details', async () => {
  const created = await createComplaint({
    subject: 'Wi-Fi not working',
    category: 'it_infrastructure',
    priority: 'medium',
    description: 'Unable to connect to campus Wi-Fi.',
    submittedBy: userSession.fullName,
  
  });
  
  expect(created.id).toBeTruthy();
  expect(created.status).toBe('submitted');
  expect(created.subject).toBe('Wi-Fi not working');
  expect(created.submittedBy).toBe(userSession.fullName);

  const savedComplaints = stored<Complaint[]>(COMPLAINTS_KEY);
  expect(savedComplaints[0]).toMatchObject({
    id: created.id,
    subject: 'Wi-Fi not working',
    status: 'submitted',
  });

  const savedUpdates = stored<ComplaintUpdate[]>(UPDATES_KEY);
  expect(savedUpdates).toContainEqual(expect.objectContaining({
    complaintId: created.id,
    status: 'submitted',
    message: 'Complaint registered. Awaiting triage and assignment.',
  }));
});

  it('rejects status updates from non-admin and unauthenticated sessions', () => {
    expect(updateComplaintStatus('CMP-2026-001', 'in_progress', 'Test Admin', userSession))
      .toEqual({ outcome: 'unauthorized' });
    expect(updateComplaintStatus('CMP-2026-001', 'in_progress', 'Test Admin', null))
      .toEqual({ outcome: 'unauthorized' });
    expect(stored<Complaint[]>(COMPLAINTS_KEY)[0].status).toBe('submitted');
  });

  it('returns not_found and unchanged status outcomes without persistence changes', () => {
    expect(updateComplaintStatus('CMP-unknown', 'in_progress', 'Test Admin', adminSession))
      .toEqual({ outcome: 'not_found' });
    expect(updateComplaintStatus('CMP-2026-001', 'submitted', 'Test Admin', adminSession))
      .toEqual({ outcome: 'unchanged' });
    expect(stored<ComplaintUpdate[]>(UPDATES_KEY)).toEqual([]);
    expect(stored<AppNotification[]>(NOTIFICATIONS_KEY)).toEqual([]);
  });

  it('updates status, appends history, and creates a notification', () => {
    const result = updateComplaintStatus('CMP-2026-001', 'in_progress', 'Test Admin', adminSession);
    expect(result.outcome).toBe('updated');
    if (result.outcome !== 'updated') throw new Error('Expected a successful status update.');

    expect(stored<Complaint[]>(COMPLAINTS_KEY)[0]).toMatchObject({ status: 'in_progress' });
    expect(stored<ComplaintUpdate[]>(UPDATES_KEY)).toContainEqual(result.update);
    expect(stored<AppNotification[]>(NOTIFICATIONS_KEY)).toContainEqual(expect.objectContaining({
      id: `NOT-${result.update.id}`,
      complaintId: 'CMP-2026-001',
      type: 'status_update',
      message: 'Your complaint CMP-2026-001 status changed to In Progress.',
    }));
  });

  it('returns only notifications for the signed-in user’s complaints', () => {
    seedStorage(
      [complaint(), complaint({ id: 'CMP-2026-002', submittedBy: otherUserSession.fullName })],
      [],
      [
        notification(),
        notification({ id: 'NOT-UPD-002', complaintId: 'CMP-2026-002' }),
      ],
    );

    expect(getMyNotifications(userSession).map((item) => item.id)).toEqual(['NOT-UPD-001']);
    expect(getMyNotifications(adminSession)).toEqual([]);
    expect(getMyNotifications(null)).toEqual([]);
  });

  it('validates escalation role, record, ownership, and reason', () => {
    expect(submitComplaintEscalation('CMP-2026-001', 'Please review', adminSession))
      .toEqual({ outcome: 'unauthorized' });
    expect(submitComplaintEscalation('CMP-unknown', 'Please review', userSession))
      .toEqual({ outcome: 'not_found' });
    expect(submitComplaintEscalation('CMP-2026-001', 'Please review', otherUserSession))
      .toEqual({ outcome: 'unauthorized' });
    expect(submitComplaintEscalation('CMP-2026-001', '   ', userSession))
      .toEqual({ outcome: 'invalid_reason' });
    expect(stored<Complaint[]>(COMPLAINTS_KEY)[0].isEscalated).toBe(false);
    expect(stored<ComplaintUpdate[]>(UPDATES_KEY)).toEqual([]);
  });

  it('rejects escalated or closed complaints', () => {
    for (const ineligible of [
      complaint({ isEscalated: true }),
      complaint({ status: 'resolved' }),
      complaint({ status: 'rejected' }),
    ]) {
      seedStorage([ineligible]);
      expect(submitComplaintEscalation(ineligible.id, 'Please review', userSession))
        .toEqual({ outcome: 'ineligible' });
    }
  });

  it('persists a valid escalation and its notification', () => {
    const result = submitComplaintEscalation('CMP-2026-001', '  Please review again.  ', userSession);
    expect(result.outcome).toBe('submitted');
    if (result.outcome !== 'submitted') throw new Error('Expected a successful escalation.');

    expect(stored<Complaint[]>(COMPLAINTS_KEY)[0].isEscalated).toBe(true);
    expect(stored<ComplaintUpdate[]>(UPDATES_KEY)).toContainEqual(expect.objectContaining({
      complaintId: 'CMP-2026-001',
      message: 'Escalation reason: Please review again.',
      author: userSession.fullName,
    }));
    expect(stored<AppNotification[]>(NOTIFICATIONS_KEY)).toContainEqual(expect.objectContaining({
      id: `NOT-${result.update.id}`,
      type: 'escalation',
      message: 'Your escalation for CMP-2026-001 was submitted: Please review again.',
    }));
  });

  it('restores earlier storage values when a batch write fails', () => {
    const keys = [COMPLAINTS_KEY, UPDATES_KEY, NOTIFICATIONS_KEY];
    const before = keys.map((key) => localStorage.getItem(key));
    const originalSetItem = Storage.prototype.setItem;
    let writes = 0;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      writes += 1;
      if (writes === 3) throw new Error('Simulated quota failure');
      return originalSetItem.call(this, key, value);
    });

    expect(() => updateComplaintStatus('CMP-2026-001', 'in_progress', 'Test Admin', adminSession))
      .toThrow('Could not save this change in browser storage. Your previous data was restored where possible.');
    expect(keys.map((key) => localStorage.getItem(key))).toEqual(before);
  });

  it('records an audit event when an admin updates complaint status', () => {
    seedStorage([complaint({ id: 'CMP-2026-001', status: 'submitted' })]);
    const result = updateComplaintStatus('CMP-2026-001', 'in_progress', 'Test Admin', adminSession);
    expect(result.outcome).toBe('updated');

    const auditEvents = getAdminAuditEvents('CMP-2026-001');
    expect(auditEvents.length).toBe(1);
    expect(auditEvents[0].action).toBe('STATUS_CHANGED');
    expect(auditEvents[0].previousValue).toBe('submitted');
    expect(auditEvents[0].newValue).toBe('in_progress');
    expect(auditEvents[0].actor.role).toBe('admin');
  });

  it('records an escalation review audit event when an admin reviews an escalated complaint', () => {
    seedStorage([complaint({ id: 'CMP-2026-001', isEscalated: true })]);
    const result = reviewComplaintEscalation('CMP-2026-001', 'Prioritized with lab technician', adminSession);
    expect(result.outcome).toBe('reviewed');

    const auditEvents = getAdminAuditEvents('CMP-2026-001');
    expect(auditEvents.length).toBe(1);
    expect(auditEvents[0].action).toBe('ESCALATION_REVIEWED');
    expect(auditEvents[0].newValue).toBe('Reviewed');
    expect(auditEvents[0].details).toBe('Prioritized with lab technician');
  });

  it('rolls back complaint status and notifications when audit write fails (SCMS-82 atomicity)', () => {
    seedStorage([complaint({ id: 'CMP-2026-001', status: 'submitted' })]);
    const originalSetItem = Storage.prototype.setItem;

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === ADMIN_AUDIT_STORAGE_KEY) {
        throw new Error('Audit disk quota exceeded');
      }
      return originalSetItem.call(this, key, value);
    });

    expect(() => updateComplaintStatus('CMP-2026-001', 'in_progress', 'Test Admin', adminSession))
      .toThrow('Could not save this change in browser storage. Your previous data was restored where possible.');

    // Status MUST remain rolled back to submitted
    expect(stored<Complaint[]>(COMPLAINTS_KEY)[0].status).toBe('submitted');
    // Updates and notifications MUST remain empty
    expect(stored<ComplaintUpdate[]>(UPDATES_KEY)).toEqual([]);
    expect(stored<AppNotification[]>(NOTIFICATIONS_KEY)).toEqual([]);
    // Audit log must not contain unpersisted event
    expect(getAdminAuditEvents('CMP-2026-001')).toEqual([]);
  });

  it('rolls back escalation review update when audit write fails (SCMS-82 atomicity)', () => {
    seedStorage([complaint({ id: 'CMP-2026-001', isEscalated: true, updatedAt: '2026-01-01T10:00:00.000Z' })]);
    const originalSetItem = Storage.prototype.setItem;

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === ADMIN_AUDIT_STORAGE_KEY) {
        throw new Error('Audit disk quota exceeded');
      }
      return originalSetItem.call(this, key, value);
    });

    expect(() => reviewComplaintEscalation('CMP-2026-001', 'Reviewed and dispatched team', adminSession))
      .toThrow('Could not save this change in browser storage. Your previous data was restored where possible.');

    // Complaint must remain rolled back with original updatedAt
    expect(stored<Complaint[]>(COMPLAINTS_KEY)[0].updatedAt).toBe('2026-01-01T10:00:00.000Z');
    // Updates MUST remain empty
    expect(stored<ComplaintUpdate[]>(UPDATES_KEY)).toEqual([]);
    // Audit log must not contain unpersisted event
    expect(getAdminAuditEvents('CMP-2026-001')).toEqual([]);
  });
});
