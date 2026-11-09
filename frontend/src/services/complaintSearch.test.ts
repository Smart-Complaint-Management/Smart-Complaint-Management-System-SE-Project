import { describe, expect, it } from 'vitest';
import type { Complaint } from '@/types';
import {
  searchComplaints,
  filterComplaints,
} from './complaintService';

const complaints: Complaint[] = [
  {
    id: 'CMP-001',
    subject: 'Wi-Fi not working',
    description: 'Unable to connect to the campus network.',
    category: 'it_infrastructure',
    status: 'submitted',
    priority: 'high',
    submittedBy: 'Student One',
    assignedTo: 'IT Support Desk',
    submittedAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    isEscalated: false,
    possibleDuplicateId: null,
  },
  {
    id: 'CMP-002',
    subject: 'Broken classroom projector',
    description: 'The projector is not displaying anything.',
    category: 'facilities',
    status: 'in_progress',
    priority: 'medium',
    submittedBy: 'Student Two',
    assignedTo: 'Facilities Maintenance',
    submittedAt: '2026-01-02T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
    isEscalated: false,
    possibleDuplicateId: null,
  },
  {
    id: 'CMP-003',
    subject: 'Library seating request',
    description: 'Request for additional seating in the library.',
    category: 'facilities',
    status: 'resolved',
    priority: 'low',
    submittedBy: 'Student One',
    assignedTo: null,
    submittedAt: '2026-01-03T10:00:00.000Z',
    updatedAt: '2026-01-03T10:00:00.000Z',
    isEscalated: false,
    possibleDuplicateId: null,
  },
];

describe('complaint search', () => {
  it('finds complaints using the subject', () => {
    const result = searchComplaints('projector', complaints);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('CMP-002');
  });

  it('searches without case sensitivity', () => {
    const result = searchComplaints('WI-FI', complaints);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('CMP-001');
  });

  it('finds complaints using their description', () => {
    const result = searchComplaints('campus network', complaints);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('CMP-001');
  });

  it('finds complaints using their complaint ID', () => {
    const result = searchComplaints('CMP-003', complaints);

    expect(result).toHaveLength(1);
    expect(result[0].subject).toBe('Library seating request');
  });

  it('returns all complaints for an empty search', () => {
    const result = searchComplaints('', complaints);

    expect(result).toHaveLength(3);
  });

  it('returns no results for an unmatched search', () => {
    const result = searchComplaints('scholarship', complaints);

    expect(result).toHaveLength(0);
  });
});

describe('complaint filtering', () => {
  it('filters complaints by category', () => {
    const result = filterComplaints(
      { category: 'facilities' },
      complaints,
    );

    expect(result).toHaveLength(2);
    expect(result.every((item) => item.category === 'facilities')).toBe(true);
  });

  it('filters complaints by status', () => {
    const result = filterComplaints(
      { status: 'submitted' },
      complaints,
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('CMP-001');
  });

  it('filters complaints by priority', () => {
    const result = filterComplaints(
      { priority: 'high' },
      complaints,
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('CMP-001');
  });

  it('filters complaints by submitter', () => {
    const result = filterComplaints(
      { submittedBy: 'Student One' },
      complaints,
    );

    expect(result).toHaveLength(2);
  });

  it('filters unassigned complaints', () => {
    const result = filterComplaints(
      { assignedTo: 'unassigned' },
      complaints,
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('CMP-003');
  });

  it('combines multiple filters', () => {
    const result = filterComplaints(
      {
        category: 'facilities',
        priority: 'medium',
        status: 'in_progress',
      },
      complaints,
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('CMP-002');
  });

  it('returns all complaints when filters are set to all', () => {
    const result = filterComplaints(
      {
        category: 'all',
        priority: 'all',
        status: 'all',
      },
      complaints,
    );

    expect(result).toHaveLength(3);
  });
});
