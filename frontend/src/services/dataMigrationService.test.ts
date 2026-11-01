import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  migrateComplaintData,
  PRIMARY_COMPLAINTS_KEY,
  LEGACY_ASSIGNMENTS_KEY,
  PRIMARY_AUDIT_KEY,
  LEGACY_AUDIT_KEY,
  MIGRATION_FLAG_KEY,
} from './dataMigrationService';
import { getComplaints } from './complaintService';
import type { Complaint } from '@/types';
import type { AdminAuditEvent } from '@/types/admin';

function createMockComplaint(overrides: Partial<Complaint> = {}): Complaint {
  return {
    id: 'CMP-2026-001',
    subject: 'Broken Projector in Lecture Hall A',
    description: 'The projector will not turn on.',
    category: 'facilities',
    status: 'submitted',
    priority: 'high',
    submittedBy: 'Alice Student',
    assignedTo: null,
    submittedAt: '2026-01-10T10:00:00.000Z',
    updatedAt: '2026-01-10T10:00:00.000Z',
    isEscalated: false,
    possibleDuplicateId: null,
    ...overrides,
  };
}

describe('dataMigrationService', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('runs safely when no legacy data exists in localStorage', () => {
    const result = migrateComplaintData();
    expect(result.applied).toBe(false);
    expect(result.success).toBe(true);
    expect(result.migratedAssignmentsCount).toBe(0);
    expect(result.migratedAuditCount).toBe(0);
    expect(window.localStorage.getItem(MIGRATION_FLAG_KEY)).not.toBeNull();
  });

  it('safely copies assignments from legacy key to unassigned primary complaints', () => {
    const primary = [
      createMockComplaint({ id: 'CMP-2026-001', assignedTo: null }),
      createMockComplaint({ id: 'CMP-2026-002', assignedTo: 'Existing Team' }),
    ];
    window.localStorage.setItem(PRIMARY_COMPLAINTS_KEY, JSON.stringify(primary));

    const legacy = [
      createMockComplaint({ id: 'CMP-2026-001', assignedTo: 'Facilities Maintenance' }),
      createMockComplaint({ id: 'CMP-2026-002', assignedTo: 'Old Team' }),
    ];
    window.localStorage.setItem(LEGACY_ASSIGNMENTS_KEY, JSON.stringify(legacy));

    const result = migrateComplaintData();
    expect(result.applied).toBe(true);
    expect(result.success).toBe(true);
    expect(result.migratedAssignmentsCount).toBe(1);

    const updatedPrimary: Complaint[] = JSON.parse(
      window.localStorage.getItem(PRIMARY_COMPLAINTS_KEY)!
    );
    expect(updatedPrimary.find((c) => c.id === 'CMP-2026-001')?.assignedTo).toBe(
      'Facilities Maintenance'
    );
    // Should preserve already assigned primary
    expect(updatedPrimary.find((c) => c.id === 'CMP-2026-002')?.assignedTo).toBe(
      'Existing Team'
    );
  });

  it('retains complaints present only in legacy store without discarding them', () => {
    const primary = [createMockComplaint({ id: 'CMP-2026-001' })];
    window.localStorage.setItem(PRIMARY_COMPLAINTS_KEY, JSON.stringify(primary));

    const legacy = [
      createMockComplaint({
        id: 'CMP-2026-999',
        subject: 'Custom Legacy Complaint',
        assignedTo: 'IT Support Desk',
      }),
    ];
    window.localStorage.setItem(LEGACY_ASSIGNMENTS_KEY, JSON.stringify(legacy));

    const result = migrateComplaintData();
    expect(result.applied).toBe(true);
    expect(result.success).toBe(true);

    const updatedPrimary: Complaint[] = JSON.parse(
      window.localStorage.getItem(PRIMARY_COMPLAINTS_KEY)!
    );
    expect(updatedPrimary.length).toBe(2);
    expect(updatedPrimary.some((c) => c.id === 'CMP-2026-999')).toBe(true);
  });

  it('honestly represents legacy audit actors without inventing identities or email addresses (SCMS-82)', () => {
    const legacyAudit = [
      {
        complaintId: 'CMP-2026-001',
        action: 'ASSIGNED',
        previousTeam: null,
        newTeam: 'Facilities Maintenance',
        timestamp: '2026-01-11T12:00:00.000Z',
        // No performedBy provided in legacy entry
      },
      {
        complaintId: 'CMP-2026-002',
        action: 'REASSIGNED',
        previousTeam: 'Facilities Maintenance',
        newTeam: 'Finance Office',
        timestamp: '2026-01-12T12:00:00.000Z',
        performedBy: 'Prof. David', // Provided legacy actor
      },
    ];
    window.localStorage.setItem(LEGACY_AUDIT_KEY, JSON.stringify(legacyAudit));

    const result = migrateComplaintData();
    expect(result.migratedAuditCount).toBe(2);

    const primaryAudit: AdminAuditEvent[] = JSON.parse(
      window.localStorage.getItem(PRIMARY_AUDIT_KEY)!
    );
    expect(primaryAudit.length).toBe(2);

    // Entry 1: Unknown legacy actor should be explicitly represented as unrecorded / system-migrated
    expect(primaryAudit[0].actor.name).toBe('Legacy System (Unrecorded Actor)');
    expect(primaryAudit[0].actor.email).toBe(''); // No invented email
    expect(primaryAudit[0].actor.role).toBe('system_migrated');

    // Entry 2: Preserves actual performedBy without inventing an email
    expect(primaryAudit[1].actor.name).toBe('Prof. David');
    expect(primaryAudit[1].actor.email).toBe('');
    expect(primaryAudit[1].actor.role).toBe('legacy_admin');
  });

  it('does not mark migration as complete if writing storage fails', () => {
    const legacy = [
      createMockComplaint({ id: 'CMP-2026-001', assignedTo: 'Facilities Maintenance' }),
    ];
    window.localStorage.setItem(LEGACY_ASSIGNMENTS_KEY, JSON.stringify(legacy));

    // Force setItem to fail on primary complaints key
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, val: string) {
      if (key === PRIMARY_COMPLAINTS_KEY) {
        throw new Error('Quota exceeded');
      }
      return originalSetItem.call(this, key, val);
    });

    const result = migrateComplaintData();
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    // Migration flag MUST NOT be marked complete
    expect(window.localStorage.getItem(MIGRATION_FLAG_KEY)).toBeNull();
  });

  it('migrates legacy-only state upon direct All Complaints navigation (readComplaints path)', () => {
    // Only legacy storage exists; primary storage is completely uninitialized
    const legacy = [
      createMockComplaint({
        id: 'CMP-2026-888',
        subject: 'Direct Navigation Test Complaint',
        assignedTo: 'Registrar Office',
      }),
    ];
    window.localStorage.setItem(LEGACY_ASSIGNMENTS_KEY, JSON.stringify(legacy));
    expect(window.localStorage.getItem(PRIMARY_COMPLAINTS_KEY)).toBeNull();

    // Directly call getComplaints() as All Complaints and Complaint Details do
    const complaints = getComplaints();

    expect(complaints.some((c) => c.id === 'CMP-2026-888')).toBe(true);
    expect(complaints.find((c) => c.id === 'CMP-2026-888')?.assignedTo).toBe('Registrar Office');
    // Primary storage must now be initialized with migrated data
    expect(window.localStorage.getItem(PRIMARY_COMPLAINTS_KEY)).not.toBeNull();
  });
});
