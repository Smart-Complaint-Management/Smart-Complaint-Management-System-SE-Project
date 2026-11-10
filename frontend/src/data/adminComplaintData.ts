import type { Complaint } from '@/types';
import { getReportComplaints } from '@/services/adminReportService';

/**
 * Returns the latest saved complaints from the unified browser storage.
 * Synchronizes with primary `scms_complaints` and performs safe legacy migration (SCMS-83).
 */
export function getAdminComplaints(): Complaint[] {
  return getReportComplaints();
}
