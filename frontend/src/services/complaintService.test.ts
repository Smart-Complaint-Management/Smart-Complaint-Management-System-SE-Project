
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Complaint, ComplaintUpdate } from '@/types';
import type { AuthSession } from '@/pages/auth/authContext';

const api = vi.hoisted(() => ({
  createComplaintRequest: vi.fn(),
  listComplaintsRequest: vi.fn(),
  getComplaintRequest: vi.fn(),
  patchComplaintStatus: vi.fn(),
  submitEscalationRequest: vi.fn(),
  reviewEscalationRequest: vi.fn(),
}));

vi.mock('./authApi', () => api);

import {
  createComplaint,
  getComplaints,
  getComplaintUpdates,
  getMyComplaints,
  updateComplaintStatus,
  submitComplaintEscalation,
  reviewComplaintEscalation,
  getMyNotifications,
} from './complaintService';

import {
  getAdminAuditEvents,
} from './adminAuditService';

const userSession: AuthSession = {
  email: 'user@example.test',
  fullName: 'Test User',
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
    databaseId: 1,
    subject: 'Network access',
    description: 'Unable to access the campus network.',
    category: 'it_infrastructure',
    status: 'submitted',
    priority: 'medium',
    submittedBy: 'Test User',
    assignedTo: null,
    submittedAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    isEscalated: false,
    possibleDuplicateId: null,
    ...overrides,
  };
}

function update(overrides: Partial<ComplaintUpdate> = {}): ComplaintUpdate {
  return {
    id: 'UPD-001',
    complaintId: 'CMP-2026-001',
    status: 'in_progress',
    message: 'Status updated.',
    author: 'Test Admin',
    timestamp: '2026-01-02T10:00:00.000Z',
    ...overrides,
  };
}

describe('backend-connected complaint services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    api.listComplaintsRequest.mockResolvedValue([complaint()]);
  });

  it('loads complaints from the backend', async () => {
    const result = await getComplaints();

    expect(result).toEqual([complaint()]);
    expect(api.listComplaintsRequest).toHaveBeenCalledOnce();
  });

  it('creates a complaint through the backend', async () => {
    api.createComplaintRequest.mockResolvedValue(
      complaint({
        subject: 'Projector not working',
        priority: 'high',
      }),
    );

    const result = await createComplaint({
      subject: 'Projector not working',
      category: 'facilities',
      priority: 'low',
      description: 'The projector is not working.',
      submittedBy: 'Test User',
    });

    expect(result.subject).toBe('Projector not working');
    expect(api.createComplaintRequest).toHaveBeenCalledWith({
      title: 'Projector not working',
      description: 'The projector is not working.',
      category: 'facilities',
      priority: 'high',
    });
  });

  it('rejects complaints with empty subject or description', async () => {
    await expect(
      createComplaint({
        subject: '   ',
        category: 'facilities',
        priority: 'low',
        description: 'Description',
        submittedBy: 'Test User',
      }),
    ).rejects.toThrow('Subject and description are required.');

    expect(api.createComplaintRequest).not.toHaveBeenCalled();
  });

  it('loads complaint timeline updates from backend details', async () => {
    api.getComplaintRequest.mockResolvedValue({
      complaint: complaint(),
      updates: [update()],
    });

    const result = await getComplaintUpdates();

    expect(api.getComplaintRequest).toHaveBeenCalledWith('CMP-2026-001');
    expect(result).toHaveLength(1);
    expect(result[0].message).toBe('Status updated.');
  });

  it('returns complaints only for user sessions', async () => {
    expect(await getMyComplaints(userSession)).toEqual([complaint()]);
    expect(await getMyComplaints(adminSession)).toEqual([]);
    expect(await getMyComplaints(null)).toEqual([]);
  });

  it('rejects status updates from non-admin sessions', async () => {
    const result = await updateComplaintStatus(
      'CMP-2026-001',
      'in_progress',
      'Test Admin',
      userSession,
    );

    expect(result).toEqual({ outcome: 'unauthorized' });
    expect(api.patchComplaintStatus).not.toHaveBeenCalled();
  });

  it('returns not_found when the complaint does not exist', async () => {
    api.listComplaintsRequest.mockResolvedValue([]);

    const result = await updateComplaintStatus(
      'CMP-unknown',
      'in_progress',
      'Test Admin',
      adminSession,
    );

    expect(result).toEqual({ outcome: 'not_found' });
  });

  it('returns unchanged when the status is already set', async () => {
    api.listComplaintsRequest.mockResolvedValue([
      complaint({ status: 'in_progress' }),
    ]);

    const result = await updateComplaintStatus(
      'CMP-2026-001',
      'in_progress',
      'Test Admin',
      adminSession,
    );

    expect(result).toEqual({ outcome: 'unchanged' });
    expect(api.patchComplaintStatus).not.toHaveBeenCalled();
  });

  it('updates status through the backend and records an audit event', async () => {
    api.patchComplaintStatus.mockResolvedValue({
      changed: true,
      update: update(),
    });

    const result = await updateComplaintStatus(
      'CMP-2026-001',
      'in_progress',
      'Test Admin',
      adminSession,
    );

    expect(result.outcome).toBe('updated');
    expect(api.patchComplaintStatus).toHaveBeenCalledWith('1', 'in_progress');

    const auditEvents = getAdminAuditEvents('CMP-2026-001');
    expect(auditEvents).toHaveLength(1);
    expect(auditEvents[0].action).toBe('STATUS_CHANGED');
  });

  it('rejects escalation from an admin session', async () => {
    const result = await submitComplaintEscalation(
      'CMP-2026-001',
      'Please review',
      adminSession,
    );

    expect(result).toEqual({ outcome: 'unauthorized' });
  });

  it('rejects escalation with an empty reason', async () => {
    const result = await submitComplaintEscalation(
      'CMP-2026-001',
      '   ',
      userSession,
    );

    expect(result).toEqual({ outcome: 'invalid_reason' });
  });

  it('rejects escalation for a complaint not owned by the user', async () => {
    api.listComplaintsRequest.mockResolvedValue([
      complaint({ submittedBy: 'Another User' }),
    ]);

    const result = await submitComplaintEscalation(
      'CMP-2026-001',
      'Please review',
      userSession,
    );

    expect(result).toEqual({ outcome: 'unauthorized' });
    expect(api.submitEscalationRequest).not.toHaveBeenCalled();
  });

  it('submits an eligible escalation through the backend', async () => {
    api.submitEscalationRequest.mockResolvedValue({});
    api.getComplaintRequest.mockResolvedValue({
      complaint: complaint({ isEscalated: true }),
      updates: [
        update({
          message: 'Escalation reason: Please review again.',
        }),
      ],
    });

    const result = await submitComplaintEscalation(
      'CMP-2026-001',
      '  Please review again.  ',
      userSession,
    );

    expect(result.outcome).toBe('submitted');
    expect(api.submitEscalationRequest).toHaveBeenCalledWith(
      'CMP-2026-001',
      'Please review again.',
    );
  });

  it('rejects escalation for resolved complaints', async () => {
    api.listComplaintsRequest.mockResolvedValue([
      complaint({ status: 'resolved' }),
    ]);

    const result = await submitComplaintEscalation(
      'CMP-2026-001',
      'Please review',
      userSession,
    );

    expect(result).toEqual({ outcome: 'ineligible' });
  });

  it('rejects escalation reviews from non-admin sessions', async () => {
    const result = await reviewComplaintEscalation(
      'CMP-2026-001',
      'Reviewed',
      userSession,
    );

    expect(result).toEqual({ outcome: 'unauthorized' });
  });

  it('reviews an escalation and records an audit event', async () => {
    api.listComplaintsRequest.mockResolvedValue([
      complaint({ isEscalated: true }),
    ]);

    api.reviewEscalationRequest.mockResolvedValue({
      id: 10,
      note: 'Prioritized',
      reviewedBy: 'Test Admin',
      reviewedAt: '2026-01-03T10:00:00.000Z',
    });

    const result = await reviewComplaintEscalation(
      'CMP-2026-001',
      'Prioritized',
      adminSession,
    );

    expect(result.outcome).toBe('reviewed');

    const auditEvents = getAdminAuditEvents('CMP-2026-001');
    expect(auditEvents).toHaveLength(1);
    expect(auditEvents[0].action).toBe('ESCALATION_REVIEWED');
  });

  it('keeps local notification ownership filtering working', () => {
    const complaints = [
      complaint(),
      complaint({
        id: 'CMP-2026-002',
        submittedBy: 'Another User',
      }),
    ];

    localStorage.setItem('scms_complaints', JSON.stringify(complaints));
    localStorage.setItem(
      'scms_notifications',
      JSON.stringify([
        {
          id: 'NOT-001',
          complaintId: 'CMP-2026-001',
          type: 'status_update',
          title: 'Status update',
          message: 'Updated.',
          read: false,
          timestamp: '2026-01-02T10:00:00.000Z',
        },
      ]),
    );

    expect(getMyNotifications(userSession)).toHaveLength(1);
  });
});
