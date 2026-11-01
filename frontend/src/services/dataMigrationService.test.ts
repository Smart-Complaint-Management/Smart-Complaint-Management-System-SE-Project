import { beforeEach, describe, expect, it } from 'vitest';
import {
  migrateComplaintData,
  PRIMARY_COMPLAINTS_KEY,
  LEGACY_ASSIGNMENTS_KEY,
  PRIMARY_AUDIT_KEY,
  LEGACY_AUDIT_KEY,
  MIGRATION_FLAG_KEY,
} from './dataMigrationService';
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

    const updatedPrimary: Complaint[] = JSON.parse(
      window.localStorage.getItem(PRIMARY_COMPLAINTS_KEY)!
    );
    expect(updatedPrimary.length).toBe(2);
    expect(updatedPrimary.some((c) => c.id === 'CMP-2026-999')).toBe(true);
  });

  it('migrates legacy audit entries into the unified AdminAuditEvent format', () => {
    const legacyAudit = [
      {
        complaintId: 'CMP-2026-001',
        action: 'ASSIGNED',
        previousTeam: null,
        newTeam: 'Facilities Maintenance',
        timestamp: '2026-01-11T12:00:00.000Z',
      },
    ];
    window.localStorage.setItem(LEGACY_AUDIT_KEY, JSON.stringify(legacyAudit));

    const result = migrateComplaintData();
    expect(result.migratedAuditCount).toBe(1);

    const primaryAudit: AdminAuditEvent[] = JSON.parse(
      window.localStorage.getItem(PRIMARY_AUDIT_KEY)!
    );
    expect(primaryAudit.length).toBe(1);
    expect(primaryAudit[0].complaintId).toBe('CMP-2026-001');
    expect(primaryAudit[0].action).toBe('ASSIGNED');
    expect(primaryAudit[0].previousValue).toBeNull();
    expect(primaryAudit[0].newValue).toBe('Facilities Maintenance');
    expect(primaryAudit[0].actor.role).toBe('admin');
    expect(primaryAudit[0].id).toBeDefined();
  });

  it('is idempotent and prevents duplicate audit entries on subsequent runs', () => {
    const legacyAudit = [
      {
        complaintId: 'CMP-2026-001',
        action: 'ASSIGNED',
        previousTeam: null,
        newTeam: 'Facilities Maintenance',
        timestamp: '2026-01-11T12:00:00.000Z',
      },
    ];
    window.localStorage.setItem(LEGACY_AUDIT_KEY, JSON.stringify(legacyAudit));

    const firstRun = migrateComplaintData();
    expect(firstRun.migratedAuditCount).toBe(1);

    const secondRun = migrateComplaintData();
    expect(secondRun.migratedAuditCount).toBe(0);

    const primaryAudit: AdminAuditEvent[] = JSON.parse(
      window.localStorage.getItem(PRIMARY_AUDIT_KEY)!
    );
    expect(primaryAudit.length).toBe(1);
  });
});
