
import type { Complaint } from '@/types';
import { mockComplaints } from '@/data/mockData';

const ASSIGNMENTS_STORAGE_KEY = 'scms-complaint-assignments';

/**
 * Returns the latest saved complaints from browser localStorage.
 * Falls back to the original mock complaints if no saved data exists.
 *
 * Note: This is demo persistence, not a shared backend database.
 */
export function getAdminComplaints(): Complaint[] {
  try {
    const saved = localStorage.getItem(ASSIGNMENTS_STORAGE_KEY);

    if (saved) {
      const parsed: unknown = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        return parsed as Complaint[];
      }
    }
  } catch (error) {
    console.error(
      'Could not load saved complaint assignments:',
      error,
    );
  }

  return mockComplaints.map((complaint) => ({ ...complaint }));
}
