import type { Complaint } from '@/types';

export interface DashboardMetrics {
  total: number;
  openCount: number;
  resolvedCount: number;
  escalatedCount: number;
  unassignedComplaints: Complaint[];
  recentComplaints: Complaint[];
  needsAttentionComplaints: Complaint[];
  escalatedList: Complaint[];
}

/**
 * Pure, high-performance function to compute core dashboard metrics in a single pass (SCMS-81).
 * Avoids repeated iterations, duplicate filtering, and unnecessary allocations.
 */
export function computeDashboardMetrics(complaints: Complaint[]): DashboardMetrics {
  let open = 0;
  let resolved = 0;
  let escalated = 0;
  const unassigned: Complaint[] = [];
  const attention: Complaint[] = [];
  const escalatedItems: Complaint[] = [];

  for (let i = 0; i < complaints.length; i++) {
    const c = complaints[i];
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

    const isUnassigned = !c.assignedTo || typeof c.assignedTo !== 'string' || c.assignedTo.trim() === '';
    if (isUnassigned) {
      unassigned.push(c);
    }

    if (c.priority === 'critical' || (c.priority === 'high' && isUnassigned)) {
      attention.push(c);
    }
  }

  const recent = [...complaints]
    .sort(
      (a, b) => {
        const timeB = new Date(b.submittedAt).getTime();
        const timeA = new Date(a.submittedAt).getTime();
        return (Number.isFinite(timeB) ? timeB : 0) - (Number.isFinite(timeA) ? timeA : 0);
      }
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

/**
 * Filter complaints by search query, status, and priority simultaneously (SCMS-41).
 */
export function filterDashboardComplaints(
  complaints: Complaint[],
  searchQuery: string,
  statusFilter: string,
  priorityFilter: string
): Complaint[] {
  const query = searchQuery.trim().toLowerCase();

  return complaints.filter((c) => {
    const id = (c.id || '').toLowerCase();
    const subject = (c.subject || '').toLowerCase();
    const description = (c.description || '').toLowerCase();

    const matchesSearch =
      query === '' ||
      id.includes(query) ||
      subject.includes(query) ||
      description.includes(query);

    const matchesStatus =
      statusFilter === 'all' || c.status === statusFilter;

    const matchesPriority =
      priorityFilter === 'all' || c.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });
}
