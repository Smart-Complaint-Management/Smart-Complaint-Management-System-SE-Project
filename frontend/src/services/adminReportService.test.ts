import { describe, expect, it } from 'vitest';
import {
  calculateReportMetrics,
  calculateCategoryDistribution,
  calculateStatusDistribution,
  calculateTeamDistribution,
  generateReportData,
} from './adminReportService';
import type { Complaint } from '@/types';

function createComplaint(overrides: Partial<Complaint> = {}): Complaint {
  return {
    id: 'CMP-2026-001',
    subject: 'Issue',
    description: 'Details',
    category: 'facilities',
    status: 'submitted',
    priority: 'medium',
    submittedBy: 'Student',
    assignedTo: null,
    submittedAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    isEscalated: false,
    possibleDuplicateId: null,
    ...overrides,
  };
}

describe('adminReportService', () => {
  describe('calculateReportMetrics', () => {
    it('returns zeroes and null average when complaints array is empty', () => {
      const metrics = calculateReportMetrics([]);
      expect(metrics.total).toBe(0);
      expect(metrics.open).toBe(0);
      expect(metrics.resolved).toBe(0);
      expect(metrics.rejected).toBe(0);
      expect(metrics.escalated).toBe(0);
      expect(metrics.assigned).toBe(0);
      expect(metrics.unassigned).toBe(0);
      expect(metrics.resolutionRate).toBe(0);
      expect(metrics.escalationRate).toBe(0);
      expect(metrics.assignmentRate).toBe(0);
      expect(metrics.averageResolutionDays).toBeNull();
    });

    it('accurately calculates counts and percentage rates for diverse complaints', () => {
      const complaints: Complaint[] = [
        createComplaint({
          id: '1',
          status: 'submitted',
          assignedTo: null,
          isEscalated: false,
        }),
        createComplaint({
          id: '2',
          status: 'under_review',
          assignedTo: 'IT Support Desk',
          isEscalated: true,
        }),
        createComplaint({
          id: '3',
          status: 'in_progress',
          assignedTo: 'Facilities Maintenance',
          isEscalated: false,
        }),
        createComplaint({
          id: '4',
          status: 'resolved',
          assignedTo: 'Finance Office',
          isEscalated: false,
          submittedAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-03T00:00:00.000Z', // 2 days
        }),
        createComplaint({
          id: '5',
          status: 'rejected',
          assignedTo: null,
          isEscalated: false,
        }),
      ];

      const metrics = calculateReportMetrics(complaints);

      expect(metrics.total).toBe(5);
      expect(metrics.open).toBe(3); // submitted, under_review, in_progress
      expect(metrics.resolved).toBe(1);
      expect(metrics.rejected).toBe(1);
      expect(metrics.escalated).toBe(1);
      expect(metrics.assigned).toBe(3);
      expect(metrics.unassigned).toBe(2);

      expect(metrics.resolutionRate).toBe(20); // 1 / 5 = 20%
      expect(metrics.escalationRate).toBe(20); // 1 / 5 = 20%
      expect(metrics.assignmentRate).toBe(60); // 3 / 5 = 60%

      expect(metrics.averageResolutionDays).toBe('2.0');
    });

    it('ignores invalid or negative resolution durations when computing average resolution time', () => {
      const complaints: Complaint[] = [
        createComplaint({
          id: '1',
          status: 'resolved',
          submittedAt: '2026-01-10T00:00:00.000Z',
          updatedAt: '2026-01-05T00:00:00.000Z', // invalid (updated before submitted)
        }),
        createComplaint({
          id: '2',
          status: 'resolved',
          submittedAt: 'invalid date',
          updatedAt: '2026-01-05T00:00:00.000Z', // invalid
        }),
        createComplaint({
          id: '3',
          status: 'resolved',
          submittedAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-05T00:00:00.000Z', // 4 days
        }),
      ];

      const metrics = calculateReportMetrics(complaints);
      expect(metrics.averageResolutionDays).toBe('4.0');
    });
  });

  describe('calculateCategoryDistribution', () => {
    it('safely handles missing, empty, or custom categories', () => {
      const complaints: Complaint[] = [
        createComplaint({ category: 'facilities' }),
        createComplaint({ category: 'facilities' }),
        createComplaint({ category: '' as unknown as Complaint['category'] }),
        createComplaint({ category: null as unknown as Complaint['category'] }),
        createComplaint({ category: 'custom_lab_issue' as unknown as Complaint['category'] }),
      ];

      const distribution = calculateCategoryDistribution(complaints);

      // Total 5
      expect(distribution.some((d) => d.category === 'facilities' && d.count === 2)).toBe(true);
      // Empty & null are bucketed in 'other'
      const other = distribution.find((d) => d.category === 'other');
      expect(other).toBeDefined();
      expect(other?.count).toBe(2);
      expect(other?.percentage).toBe(40);

      const custom = distribution.find((d) => d.category === 'custom_lab_issue');
      expect(custom).toBeDefined();
      expect(custom?.count).toBe(1);
    });
  });

  describe('calculateStatusDistribution', () => {
    it('accurately groups status counts and filters out zero-count statuses', () => {
      const complaints: Complaint[] = [
        createComplaint({ status: 'submitted' }),
        createComplaint({ status: 'submitted' }),
        createComplaint({ status: 'resolved' }),
      ];

      const distribution = calculateStatusDistribution(complaints);
      expect(distribution.length).toBe(2);

      const submitted = distribution.find((s) => s.status === 'submitted');
      expect(submitted?.count).toBe(2);
      expect(submitted?.percentage).toBe(67);

      const resolved = distribution.find((s) => s.status === 'resolved');
      expect(resolved?.count).toBe(1);
      expect(resolved?.percentage).toBe(33);
    });
  });

  describe('calculateTeamDistribution', () => {
    it('correctly attributes team counts and buckets unassigned', () => {
      const complaints: Complaint[] = [
        createComplaint({ assignedTo: 'IT Support Desk' }),
        createComplaint({ assignedTo: 'IT Support Desk' }),
        createComplaint({ assignedTo: null }),
        createComplaint({ assignedTo: '   ' }),
      ];

      const distribution = calculateTeamDistribution(complaints);
      const itTeam = distribution.find((t) => t.team === 'IT Support Desk');
      expect(itTeam?.count).toBe(2);
      expect(itTeam?.percentage).toBe(50);

      const unassigned = distribution.find((t) => t.team === 'Unassigned');
      expect(unassigned?.count).toBe(2);
      expect(unassigned?.percentage).toBe(50);
    });
  });

  describe('generateReportData', () => {
    it('returns full report bundle with timestamp and all sections', () => {
      const data = generateReportData([createComplaint()]);
      expect(data.metrics).toBeDefined();
      expect(data.byCategory).toBeDefined();
      expect(data.byStatus).toBeDefined();
      expect(data.byTeam).toBeDefined();
      expect(data.generatedAt).toBeDefined();
    });
  });
});
