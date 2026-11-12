import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthSession } from '@/pages/auth/authContext';
import type { Complaint } from '@/types';
import {
  getAdminAuditEvents,
  ADMIN_AUDIT_STORAGE_KEY,
} from './adminAuditService';
import { updateComplaintPriority } from './complaintService';

const COMPLAINTS_KEY = 'scms_complaints';

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

function seedStorage() {
  localStorage.setItem(
    COMPLAINTS_KEY,
    JSON.stringify([complaint()]),
  );
}

function storedComplaints(): Complaint[] {
  return JSON.parse(
    localStorage.getItem(COMPLAINTS_KEY) ?? '[]',
  ) as Complaint[];
}

describe('admin complaint priority override', () => {
  beforeEach(() => {
    localStorage.clear();
    seedStorage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('does not allow a normal user to change complaint priority', () => {
    const result = updateComplaintPriority(
      'CMP-2026-001',
      'critical',
      userSession,
    );

    expect(result).toEqual({ outcome: 'unauthorized' });
    expect(storedComplaints()[0].priority).toBe('medium');
  });

  it('does not allow an unauthenticated session to change priority', () => {
    const result = updateComplaintPriority(
      'CMP-2026-001',
      'critical',
      null,
    );

    expect(result).toEqual({ outcome: 'unauthorized' });
    expect(storedComplaints()[0].priority).toBe('medium');
  });

  it('returns not_found when the complaint does not exist', () => {
    const result = updateComplaintPriority(
      'CMP-UNKNOWN',
      'high',
      adminSession,
    );

    expect(result).toEqual({ outcome: 'not_found' });
    expect(storedComplaints()[0].priority).toBe('medium');
  });

  it('returns unchanged when the selected priority is already assigned', () => {
    const result = updateComplaintPriority(
      'CMP-2026-001',
      'medium',
      adminSession,
    );

    expect(result).toEqual({ outcome: 'unchanged' });
    expect(getAdminAuditEvents('CMP-2026-001')).toEqual([]);
  });

  it('allows an admin to change priority and records an audit event', () => {
    const result = updateComplaintPriority(
      'CMP-2026-001',
      'critical',
      adminSession,
    );

    expect(result.outcome).toBe('updated');

    if (result.outcome !== 'updated') {
      throw new Error('Expected a successful priority update.');
    }

    expect(result.complaint.priority).toBe('critical');

    expect(storedComplaints()[0].priority).toBe('critical');

    const auditEvents = getAdminAuditEvents('CMP-2026-001');

    expect(auditEvents).toHaveLength(1);
    expect(auditEvents[0].action).toBe('PRIORITY_CHANGED');
    expect(auditEvents[0].previousValue).toBe('medium');
    expect(auditEvents[0].newValue).toBe('critical');
    expect(auditEvents[0].actor.role).toBe('admin');
  });

it('restores the previous priority if the audit log cannot be saved', () => {
  const originalSetItem = Storage.prototype.setItem;

  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
    function (this: Storage, key: string, value: string) {
      if (key === ADMIN_AUDIT_STORAGE_KEY) {
        throw new Error('Audit storage failure');
      }

      return originalSetItem.call(this, key, value);
    },
  );

  expect(() =>
    updateComplaintPriority(
      'CMP-2026-001',
      'critical',
      adminSession,
    ),
  ).toThrow(
    'Could not save this change in browser storage. Your previous data was restored where possible.',
  );

  expect(storedComplaints()[0].priority).toBe('medium');
  expect(getAdminAuditEvents('CMP-2026-001')).toEqual([]);
});
});