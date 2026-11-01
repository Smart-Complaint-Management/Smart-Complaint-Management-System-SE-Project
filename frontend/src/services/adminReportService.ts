import type { Complaint, ComplaintStatus } from '@/types';
import type {
  CategoryDistribution,
  ReportData,
  ReportMetrics,
  StatusDistribution,
  TeamDistribution,
} from '@/types/admin';
import { categoryLabels, mockComplaints, statusLabels } from '@/data/mockData';
import { migrateComplaintData, PRIMARY_COMPLAINTS_KEY } from './dataMigrationService';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Load latest complaints from unified storage for reporting.
 */
export function getReportComplaints(): Complaint[] {
  if (!isBrowser()) return mockComplaints.map((c) => ({ ...c }));

  migrateComplaintData();

  try {
    const raw = window.localStorage.getItem(PRIMARY_COMPLAINTS_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as Complaint[];
    }
  } catch (error) {
    console.error('Failed to load complaints for reports:', error);
  }

  return mockComplaints.map((c) => ({ ...c }));
}

/**
 * Calculate core summary metrics from a complaints array.
 */
export function calculateReportMetrics(complaints: Complaint[]): ReportMetrics {
  const total = complaints.length;

  const resolved = complaints.filter((c) => c.status === 'resolved');
  const rejected = complaints.filter((c) => c.status === 'rejected');
  const open = complaints.filter(
    (c) =>
      c.status === 'submitted' ||
      c.status === 'under_review' ||
      c.status === 'in_progress'
  );
  const escalated = complaints.filter((c) => Boolean(c.isEscalated));

  const assigned = complaints.filter(
    (c) => c.assignedTo !== null && c.assignedTo.trim() !== ''
  );
  const unassigned = complaints.filter(
    (c) => c.assignedTo === null || c.assignedTo.trim() === ''
  );

  const resolutionRate = total > 0 ? Math.round((resolved.length / total) * 100) : 0;
  const escalationRate = total > 0 ? Math.round((escalated.length / total) * 100) : 0;
  const assignmentRate = total > 0 ? Math.round((assigned.length / total) * 100) : 0;

  // Average resolution duration in days (using submittedAt and updatedAt)
  const resolutionDurations = resolved
    .map((c) => {
      const submitted = new Date(c.submittedAt).getTime();
      const updated = new Date(c.updatedAt).getTime();
      if (!Number.isFinite(submitted) || !Number.isFinite(updated) || updated < submitted) {
        return null;
      }
      return updated - submitted;
    })
    .filter((d): d is number => d !== null);

  const averageResolutionDays =
    resolutionDurations.length > 0
      ? (
          resolutionDurations.reduce((sum, d) => sum + d, 0) /
          resolutionDurations.length /
          (1000 * 60 * 60 * 24)
        ).toFixed(1)
      : null;

  return {
    total,
    open: open.length,
    resolved: resolved.length,
    rejected: rejected.length,
    escalated: escalated.length,
    assigned: assigned.length,
    unassigned: unassigned.length,
    resolutionRate,
    escalationRate,
    assignmentRate,
    averageResolutionDays,
  };
}

/**
 * Calculate category distribution, safely handling missing or empty categories (SCMS-78).
 */
export function calculateCategoryDistribution(
  complaints: Complaint[]
): CategoryDistribution[] {
  const total = complaints.length;
  const counts = new Map<string, number>();

  for (const complaint of complaints) {
    const rawCategory = complaint.category ? String(complaint.category).trim() : '';
    const categoryKey = rawCategory || 'other';
    counts.set(categoryKey, (counts.get(categoryKey) ?? 0) + 1);
  }

  const results: CategoryDistribution[] = [];

  for (const [key, count] of counts.entries()) {
    const label =
      categoryLabels[key as keyof typeof categoryLabels] ||
      (key === 'other' ? 'Other / Uncategorized' : key.replace(/_/g, ' '));

    results.push({
      category: key,
      label,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    });
  }

  // Sort descending by count, then alphabetically
  return results.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/**
 * Calculate status breakdown across all complaints.
 */
export function calculateStatusDistribution(
  complaints: Complaint[]
): StatusDistribution[] {
  const total = complaints.length;
  const counts = new Map<ComplaintStatus, number>();

  // Initialize with all known statuses
  const knownStatuses: ComplaintStatus[] = [
    'submitted',
    'under_review',
    'in_progress',
    'resolved',
    'rejected',
  ];

  for (const status of knownStatuses) {
    counts.set(status, 0);
  }

  for (const c of complaints) {
    const status = c.status as ComplaintStatus;
    if (counts.has(status)) {
      counts.set(status, (counts.get(status) ?? 0) + 1);
    } else {
      counts.set(status, 1);
    }
  }

  return Array.from(counts.entries())
    .map(([status, count]) => ({
      status,
      label: statusLabels[status] || status.replace(/_/g, ' '),
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .filter((s) => s.count > 0);
}

/**
 * Calculate team assignment distribution.
 */
export function calculateTeamDistribution(
  complaints: Complaint[]
): TeamDistribution[] {
  const total = complaints.length;
  const counts = new Map<string, number>();

  for (const c of complaints) {
    const team = c.assignedTo && c.assignedTo.trim() !== '' ? c.assignedTo.trim() : 'Unassigned';
    counts.set(team, (counts.get(team) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([team, count]) => ({
      team,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count || a.team.localeCompare(b.team));
}

/**
 * Generate complete structured administrative report data.
 */
export function generateReportData(providedComplaints?: Complaint[]): ReportData {
  const complaints = providedComplaints ?? getReportComplaints();
  return {
    metrics: calculateReportMetrics(complaints),
    byCategory: calculateCategoryDistribution(complaints),
    byStatus: calculateStatusDistribution(complaints),
    byTeam: calculateTeamDistribution(complaints),
    generatedAt: new Date().toISOString(),
  };
}
