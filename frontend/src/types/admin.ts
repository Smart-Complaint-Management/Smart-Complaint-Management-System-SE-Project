import type { Complaint, ComplaintPriority, ComplaintStatus } from './index';

export const ALLOWED_ASSIGNMENT_TEAMS = [
  'IT Support Desk',
  'Facilities Maintenance',
  'Registrar Office',
  'Finance Office',
] as const;

export type AssignmentTeam = (typeof ALLOWED_ASSIGNMENT_TEAMS)[number];

export type AdminActionType =
  | 'ASSIGNED'
  | 'REASSIGNED'
  | 'STATUS_CHANGED'
  | 'ESCALATION_REVIEWED';

export interface AuditActor {
  name: string;
  email: string;
  role: string;
}

export interface AdminAuditEvent {
  id: string;
  complaintId: string;
  action: AdminActionType;
  actor: AuditActor;
  previousValue: string | null;
  newValue: string;
  timestamp: string; // ISO date
  details?: string;
}

export interface ReportMetrics {
  total: number;
  open: number;
  resolved: number;
  rejected: number;
  escalated: number;
  assigned: number;
  unassigned: number;
  resolutionRate: number;
  escalationRate: number;
  assignmentRate: number;
  averageResolutionDays: string | null;
}

export interface CategoryDistribution {
  category: string;
  label: string;
  count: number;
  percentage: number;
}

export interface StatusDistribution {
  status: ComplaintStatus;
  label: string;
  count: number;
  percentage: number;
}

export interface TeamDistribution {
  team: string;
  count: number;
  percentage: number;
}

export interface ReportData {
  metrics: ReportMetrics;
  byCategory: CategoryDistribution[];
  byStatus: StatusDistribution[];
  byTeam: TeamDistribution[];
  generatedAt: string;
}

export interface DashboardMetrics {
  total: number;
  openCount: number;
  resolvedCount: number;
  escalatedCount: number;
  unassignedCount: number;
  recentComplaints: Complaint[];
  needsAttention: Complaint[];
  escalatedComplaints: Complaint[];
}

export type AssignmentOutcome =
  | 'assigned'
  | 'reassigned'
  | 'invalid_team'
  | 'not_found'
  | 'unchanged'
  | 'storage_error';

export interface AssignmentResult {
  outcome: AssignmentOutcome;
  complaint?: Complaint;
  auditEvent?: AdminAuditEvent;
  error?: string;
}
