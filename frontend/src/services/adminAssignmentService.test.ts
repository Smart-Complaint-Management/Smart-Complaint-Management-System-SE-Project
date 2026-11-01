import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assignComplaint,
  getAssignmentComplaints,
  getUnassignedComplaints,
  getAssignedComplaints,
  isValidAssignmentTeam,
} from './adminAssignmentService';
import { PRIMARY_COMPLAINTS_KEY } from './dataMigrationService';
import { getAdminAuditEvents } from './adminAuditService';
import type { Complaint } from '@/types';
import type { AuditActor } from '@/types/admin';

function createComplaint(overrides: Partial<Complaint> = {}): Complaint {
  return {
    id: 'CMP-2026-001',
    subject: 'Broken Projector in Hall A',
    description: 'Hardware not powering on.',
    category: 'facilities',
    status: 'submitted',
    priority: 'high',
    submittedBy: 'Alice Student',
    assignedTo: null,
    submittedAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    isEscalated: false,
    possibleDuplicateId: null,
    ...overrides,
  };
}

describe('adminAssignmentService', () => {
  const mockActor: AuditActor = {
    name: 'Dr. Malik',
    email: 'malik@university.edu',
    role: 'admin',
  };

  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('isValidAssignmentTeam', () => {
    it('validates supported departments and rejects invalid ones', () => {
      expect(isValidAssignmentTeam('IT Support Desk')).toBe(true);
      expect(isValidAssignmentTeam('Facilities Maintenance')).toBe(true);
      expect(isValidAssignmentTeam('Registrar Office')).toBe(true);
      expect(isValidAssignmentTeam('Finance Office')).toBe(true);

      expect(isValidAssignmentTeam('')).toBe(false);
      expect(isValidAssignmentTeam('Random Department')).toBe(false);
      expect(isValidAssignmentTeam(null)).toBe(false);
      expect(isValidAssignmentTeam(undefined)).toBe(false);
    });
  });

  describe('assignComplaint', () => {
    it('rejects assignment when the team name is invalid', () => {
      const result = assignComplaint({
        complaintId: 'CMP-2026-001',
        team: 'Invalid Team',
        actor: mockActor,
      });

      expect(result.outcome).toBe('invalid_team');
      expect(result.error).toContain('is not a valid assignment department');
    });

    it('returns not_found when complaint does not exist', () => {
      window.localStorage.setItem(
        PRIMARY_COMPLAINTS_KEY,
        JSON.stringify([createComplaint({ id: 'CMP-2026-001' })])
      );

      const result = assignComplaint({
        complaintId: 'CMP-NONEXISTENT',
        team: 'IT Support Desk',
        actor: mockActor,
      });

      expect(result.outcome).toBe('not_found');
    });

    it('successfully assigns an unassigned complaint and updates updatedAt timestamp', () => {
      const initialComplaint = createComplaint({
        id: 'CMP-2026-001',
        assignedTo: null,
        updatedAt: '2026-01-01T10:00:00.000Z',
      });
      window.localStorage.setItem(
        PRIMARY_COMPLAINTS_KEY,
        JSON.stringify([initialComplaint])
      );

      const result = assignComplaint({
        complaintId: 'CMP-2026-001',
        team: 'IT Support Desk',
        actor: mockActor,
      });

      expect(result.outcome).toBe('assigned');
      expect(result.complaint?.assignedTo).toBe('IT Support Desk');
      expect(result.complaint?.updatedAt).not.toBe('2026-01-01T10:00:00.000Z');

      // Check stored complaints
      const stored = getAssignmentComplaints();
      const updated = stored.find((c) => c.id === 'CMP-2026-001');
      expect(updated?.assignedTo).toBe('IT Support Desk');

      // Check audit event
      const auditEvents = getAdminAuditEvents('CMP-2026-001');
      expect(auditEvents.length).toBe(1);
      expect(auditEvents[0].action).toBe('ASSIGNED');
      expect(auditEvents[0].previousValue).toBeNull();
      expect(auditEvents[0].newValue).toBe('IT Support Desk');
      expect(auditEvents[0].actor.name).toBe('Dr. Malik');
    });

    it('successfully reassigns an already assigned complaint with before/after audit values', () => {
      const initialComplaint = createComplaint({
        id: 'CMP-2026-001',
        assignedTo: 'Facilities Maintenance',
        updatedAt: '2026-01-01T10:00:00.000Z',
      });
      window.localStorage.setItem(
        PRIMARY_COMPLAINTS_KEY,
        JSON.stringify([initialComplaint])
      );

      const result = assignComplaint({
        complaintId: 'CMP-2026-001',
        team: 'Finance Office',
        actor: mockActor,
      });

      expect(result.outcome).toBe('reassigned');
      expect(result.complaint?.assignedTo).toBe('Finance Office');

      const auditEvents = getAdminAuditEvents('CMP-2026-001');
      expect(auditEvents.length).toBe(1);
      expect(auditEvents[0].action).toBe('REASSIGNED');
      expect(auditEvents[0].previousValue).toBe('Facilities Maintenance');
      expect(auditEvents[0].newValue).toBe('Finance Office');
    });

    it('returns unchanged when reassigning to the identical team', () => {
      const initialComplaint = createComplaint({
        id: 'CMP-2026-001',
        assignedTo: 'Finance Office',
      });
      window.localStorage.setItem(
        PRIMARY_COMPLAINTS_KEY,
        JSON.stringify([initialComplaint])
      );

      const result = assignComplaint({
        complaintId: 'CMP-2026-001',
        team: 'Finance Office',
        actor: mockActor,
      });

      expect(result.outcome).toBe('unchanged');
      const auditEvents = getAdminAuditEvents('CMP-2026-001');
      expect(auditEvents.length).toBe(0);
    });

    it('rolls back and returns storage_error when localStorage write fails', () => {
      const initialComplaint = createComplaint({ id: 'CMP-2026-001', assignedTo: null });
      window.localStorage.setItem(
        PRIMARY_COMPLAINTS_KEY,
        JSON.stringify([initialComplaint])
      );

      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      setItemSpy.mockImplementation(() => {
        throw new Error('Quota exceeded');
      });

      const result = assignComplaint({
        complaintId: 'CMP-2026-001',
        team: 'Finance Office',
        actor: mockActor,
      });

      expect(result.outcome).toBe('storage_error');
      expect(result.error).toContain('Failed to save assignment');

      setItemSpy.mockRestore();
    });
  });

  describe('getUnassignedComplaints and getAssignedComplaints', () => {
    it('correctly separates assigned and unassigned complaints', () => {
      const complaints = [
        createComplaint({ id: 'CMP-1', assignedTo: null }),
        createComplaint({ id: 'CMP-2', assignedTo: 'IT Support Desk' }),
        createComplaint({ id: 'CMP-3', assignedTo: '' }),
      ];
      window.localStorage.setItem(
        PRIMARY_COMPLAINTS_KEY,
        JSON.stringify(complaints)
      );

      const unassigned = getUnassignedComplaints();
      const assigned = getAssignedComplaints();

      expect(unassigned.length).toBe(2);
      expect(unassigned.map((c) => c.id)).toEqual(['CMP-1', 'CMP-3']);

      expect(assigned.length).toBe(1);
      expect(assigned[0].id).toBe('CMP-2');
    });
  });
});
