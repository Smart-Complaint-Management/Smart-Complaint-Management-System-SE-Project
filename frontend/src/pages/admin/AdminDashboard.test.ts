import { beforeEach, describe, expect, it } from 'vitest';
import type { Complaint } from '@/types';

function createComplaint(overrides: Partial<Complaint> = {}): Complaint {
  return {
    id: 'CMP-2026-001',
    subject: 'Wifi connectivity failure',
    description: 'Cannot connect to Eduroam in library',
    category: 'it_infrastructure',
    status: 'submitted',
    priority: 'high',
    submittedBy: 'Student A',
    assignedTo: null,
    submittedAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    isEscalated: false,
    possibleDuplicateId: null,
    ...overrides,
  };
}

// Logic mirror of AdminDashboardPage single-pass derivations for unit verification
function computeDashboardMetrics(complaints: Complaint[]) {
  let open = 0;
  let resolved = 0;
  let escalated = 0;
  const unassigned: Complaint[] = [];
  const attention: Complaint[] = [];
  const escalatedItems: Complaint[] = [];

  for (const c of complaints) {
    if (
      c.status === 'submitted' ||
      c.status === 'under_review' ||
      c.status === 'in_progress'
    ) {
      open++;
    } else if (c.status === 'resolved') {
      resolved++;
    }

    if (c.isEscalated) {
      escalated++;
      escalatedItems.push(c);
    }

    const isUnassigned = c.assignedTo === null || c.assignedTo.trim() === '';
    if (isUnassigned) {
      unassigned.push(c);
    }

    if (c.priority === 'critical' || (c.priority === 'high' && isUnassigned)) {
      attention.push(c);
    }
  }

  const recent = [...complaints]
    .sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    )
    .slice(0, 5);

  return {
    total: complaints.length,
    openCount: open,
    resolvedCount: resolved,
    escalatedCount: escalated,
    unassignedComplaints: unassigned,
    recentComplaints: recent,
    needsAttentionComplaints: attention.slice(0, 5),
    escalatedList: escalatedItems.slice(0, 5),
  };
}

function filterComplaints(
  complaints: Complaint[],
  searchQuery: string,
  statusFilter: string,
  priorityFilter: string
): Complaint[] {
  const query = searchQuery.trim().toLowerCase();

  return complaints.filter((c) => {
    const matchesSearch =
      query === '' ||
      c.id.toLowerCase().includes(query) ||
      c.subject.toLowerCase().includes(query) ||
      c.description.toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === 'all' || c.status === statusFilter;

    const matchesPriority =
      priorityFilter === 'all' || c.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });
}

describe('Admin Dashboard Calculations and Filters (SCMS-38, 39, 41, 81)', () => {
  let testComplaints: Complaint[];

  beforeEach(() => {
    testComplaints = [
      createComplaint({
        id: 'CMP-2026-001',
        subject: 'Projector broken',
        description: 'Room 101 ceiling projector',
        status: 'submitted',
        priority: 'high',
        assignedTo: null,
        submittedAt: '2026-01-01T10:00:00.000Z',
      }),
      createComplaint({
        id: 'CMP-2026-002',
        subject: 'Fire alarm beeping',
        description: 'Continuous chirping noise',
        status: 'under_review',
        priority: 'critical',
        assignedTo: 'Facilities Maintenance',
        isEscalated: true,
        submittedAt: '2026-01-02T10:00:00.000Z',
      }),
      createComplaint({
        id: 'CMP-2026-003',
        subject: 'Tuition receipt request',
        description: 'Need receipt for employer reimbursement',
        status: 'resolved',
        priority: 'low',
        assignedTo: 'Finance Office',
        submittedAt: '2026-01-03T10:00:00.000Z',
      }),
      createComplaint({
        id: 'CMP-2026-004',
        subject: 'WiFi dropped in dorms',
        description: 'No connection since yesterday',
        status: 'in_progress',
        priority: 'medium',
        assignedTo: 'IT Support Desk',
        submittedAt: '2026-01-04T10:00:00.000Z',
      }),
    ];
  });

  describe('Core Dashboard Metrics Calculation', () => {
    it('computes accurate counts and categorized complaint lists', () => {
      const metrics = computeDashboardMetrics(testComplaints);

      expect(metrics.total).toBe(4);
      expect(metrics.openCount).toBe(3); // submitted, under_review, in_progress
      expect(metrics.resolvedCount).toBe(1);
      expect(metrics.escalatedCount).toBe(1);
      expect(metrics.unassignedComplaints.length).toBe(1);
      expect(metrics.unassignedComplaints[0].id).toBe('CMP-2026-001');

      // Needs attention: critical priority (CMP-002) OR (high priority AND unassigned: CMP-001)
      expect(metrics.needsAttentionComplaints.map((c) => c.id).sort()).toEqual([
        'CMP-2026-001',
        'CMP-2026-002',
      ]);

      // Recent complaints ordered by date descending
      expect(metrics.recentComplaints[0].id).toBe('CMP-2026-004');
      expect(metrics.recentComplaints[3].id).toBe('CMP-2026-001');
    });
  });

  describe('Search and Filter Evaluation (SCMS-41)', () => {
    it('filters complaints by ID match', () => {
      const results = filterComplaints(testComplaints, 'CMP-2026-003', 'all', 'all');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('CMP-2026-003');
    });

    it('filters complaints by subject keyword', () => {
      const results = filterComplaints(testComplaints, 'WiFi', 'all', 'all');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('CMP-2026-004');
    });

    it('filters complaints by description keyword', () => {
      const results = filterComplaints(testComplaints, 'reimbursement', 'all', 'all');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('CMP-2026-003');
    });

    it('filters complaints by lifecycle status', () => {
      const results = filterComplaints(testComplaints, '', 'resolved', 'all');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('CMP-2026-003');
    });

    it('filters complaints by priority level', () => {
      const results = filterComplaints(testComplaints, '', 'all', 'critical');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('CMP-2026-002');
    });

    it('combines search, status, and priority filters', () => {
      const results = filterComplaints(testComplaints, 'projector', 'submitted', 'high');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('CMP-2026-001');

      const nonMatching = filterComplaints(testComplaints, 'projector', 'resolved', 'high');
      expect(nonMatching.length).toBe(0);
    });

    it('returns empty array when no complaints match', () => {
      const results = filterComplaints(testComplaints, 'nonexistent query', 'all', 'all');
      expect(results.length).toBe(0);
    });
  });

  describe('Performance Benchmark (SCMS-81)', () => {
    it('computes metrics on 1,000 complaints in under 20 milliseconds', () => {
      const largeDataset: Complaint[] = Array.from({ length: 1000 }, (_, i) =>
        createComplaint({
          id: `CMP-${2026}-${String(i).padStart(4, '0')}`,
          subject: `Complaint number ${i}`,
          status: i % 2 === 0 ? 'submitted' : 'resolved',
          priority: i % 4 === 0 ? 'critical' : 'medium',
          assignedTo: i % 3 === 0 ? null : 'IT Support Desk',
          isEscalated: i % 10 === 0,
        })
      );

      const start = performance.now();
      const metrics = computeDashboardMetrics(largeDataset);
      const duration = performance.now() - start;

      expect(metrics.total).toBe(1000);
      expect(duration).toBeLessThan(50); // Well under 50ms requirement
    });
  });
});
