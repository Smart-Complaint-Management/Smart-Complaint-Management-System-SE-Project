import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  recordAdminAction,
  getAdminAuditEvents,
} from './adminAuditService';

describe('adminAuditService', () => {
  const mockActor = {
    name: 'Dr. Malik',
    email: 'hassan.malik@university.edu',
    role: 'admin',
  };

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('records an audit event with generated id, actor details, and ISO timestamp', () => {
    const event = recordAdminAction({
      complaintId: 'CMP-2026-001',
      action: 'ASSIGNED',
      actor: mockActor,
      previousValue: null,
      newValue: 'IT Support Desk',
      details: 'Initial triage assignment',
    });

    expect(event.id).toMatch(/^AUD-\d+-\d{3}$/);
    expect(event.complaintId).toBe('CMP-2026-001');
    expect(event.action).toBe('ASSIGNED');
    expect(event.actor.name).toBe('Dr. Malik');
    expect(event.previousValue).toBeNull();
    expect(event.newValue).toBe('IT Support Desk');
    expect(event.details).toBe('Initial triage assignment');
    expect(new Date(event.timestamp).getTime()).not.toBeNaN();

    const stored = getAdminAuditEvents();
    expect(stored.length).toBe(1);
    expect(stored[0].id).toBe(event.id);
  });

  it('filters audit events by complaintId and sorts newest first', () => {
    recordAdminAction({
      complaintId: 'CMP-2026-001',
      action: 'ASSIGNED',
      actor: mockActor,
      previousValue: null,
      newValue: 'IT Support Desk',
      timestamp: '2026-01-01T10:00:00.000Z',
    });

    recordAdminAction({
      complaintId: 'CMP-2026-002',
      action: 'STATUS_CHANGED',
      actor: mockActor,
      previousValue: 'submitted',
      newValue: 'in_progress',
      timestamp: '2026-01-02T10:00:00.000Z',
    });

    recordAdminAction({
      complaintId: 'CMP-2026-001',
      action: 'REASSIGNED',
      actor: mockActor,
      previousValue: 'IT Support Desk',
      newValue: 'Facilities Maintenance',
      timestamp: '2026-01-03T10:00:00.000Z',
    });

    const all = getAdminAuditEvents();
    expect(all.length).toBe(3);
    // Newest first
    expect(all[0].timestamp).toBe('2026-01-03T10:00:00.000Z');

    const filtered = getAdminAuditEvents('CMP-2026-001');
    expect(filtered.length).toBe(2);
    expect(filtered[0].action).toBe('REASSIGNED');
    expect(filtered[1].action).toBe('ASSIGNED');
  });

  it('rolls back and throws when localStorage persistence fails to prevent silent event loss', () => {
    // Seed an initial event
    recordAdminAction({
      complaintId: 'CMP-2026-001',
      action: 'ASSIGNED',
      actor: mockActor,
      previousValue: null,
      newValue: 'IT Support Desk',
    });

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    setItemSpy.mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() =>
      recordAdminAction({
        complaintId: 'CMP-2026-002',
        action: 'STATUS_CHANGED',
        actor: mockActor,
        previousValue: 'submitted',
        newValue: 'resolved',
      })
    ).toThrow(/Audit record could not be persisted/);

    setItemSpy.mockRestore();

    // Verify existing event was not corrupted
    const stored = getAdminAuditEvents();
    expect(stored.length).toBe(1);
    expect(stored[0].complaintId).toBe('CMP-2026-001');
  });
});
