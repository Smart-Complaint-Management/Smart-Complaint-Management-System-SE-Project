import type { Complaint } from '@/types';
import type { AdminAuditEvent } from '@/types/admin';
import { mockComplaints } from '@/data/mockData';

export const PRIMARY_COMPLAINTS_KEY = 'scms_complaints';
export const LEGACY_ASSIGNMENTS_KEY = 'scms-complaint-assignments';
export const PRIMARY_AUDIT_KEY = 'scms_admin_audit';
export const LEGACY_AUDIT_KEY = 'scms-assignment-audit';
export const MIGRATION_FLAG_KEY = 'scms_migration_applied_v1';

export interface MigrationSummary {
  applied: boolean;
  migratedAssignmentsCount: number;
  migratedAuditCount: number;
  totalComplaints: number;
}

interface LegacyAuditEntry {
  complaintId: string;
  action: 'ASSIGNED' | 'REASSIGNED';
  previousTeam: string | null;
  newTeam: string;
  timestamp: string;
  id?: string;
  performedBy?: string;
}

/**
 * Safely parse JSON from localStorage, returning null if invalid or missing.
 */
function safeGetJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`[dataMigration] Failed to read or parse localStorage key "${key}":`, error);
    return null;
  }
}

/**
 * Safely set JSON in localStorage.
 */
function safeSetJson<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`[dataMigration] Failed to write localStorage key "${key}":`, error);
    return false;
  }
}

/**
 * Safe, idempotent migration of legacy assignment and audit data.
 * Merges legacy `scms-complaint-assignments` into primary `scms_complaints`
 * without silently overwriting or discarding existing complaint records.
 */
export function migrateComplaintData(): MigrationSummary {
  if (typeof window === 'undefined') {
    return {
      applied: false,
      migratedAssignmentsCount: 0,
      migratedAuditCount: 0,
      totalComplaints: 0,
    };
  }

  const legacyComplaints = safeGetJson<Complaint[]>(LEGACY_ASSIGNMENTS_KEY);
  const legacyAudit = safeGetJson<LegacyAuditEntry[]>(LEGACY_AUDIT_KEY);

  let migratedAssignmentsCount = 0;
  let migratedAuditCount = 0;

  // 1. Merge complaints if legacy data exists
  const rawPrimary = safeGetJson<Complaint[]>(PRIMARY_COMPLAINTS_KEY);
  const primaryComplaints: Complaint[] = Array.isArray(rawPrimary)
    ? [...rawPrimary]
    : mockComplaints.map((c) => ({ ...c }));

  if (Array.isArray(legacyComplaints) && legacyComplaints.length > 0) {
    const primaryMap = new Map<string, Complaint>();
    for (const c of primaryComplaints) {
      primaryMap.set(c.id, { ...c });
    }

    for (const legacy of legacyComplaints) {
      if (!legacy || !legacy.id) continue;

      const existing = primaryMap.get(legacy.id);
      if (existing) {
        // If legacy has an assignment but primary doesn't, migrate the assignment
        if (legacy.assignedTo && !existing.assignedTo) {
          existing.assignedTo = legacy.assignedTo;
          existing.updatedAt = legacy.updatedAt || existing.updatedAt;
          migratedAssignmentsCount++;
        }
      } else {
        // If legacy contains a complaint that doesn't exist in primary, retain it
        primaryMap.set(legacy.id, { ...legacy });
        migratedAssignmentsCount++;
      }
    }

    const mergedComplaints = Array.from(primaryMap.values());
    safeSetJson(PRIMARY_COMPLAINTS_KEY, mergedComplaints);
  }

  // 2. Merge audit history if legacy audit exists
  if (Array.isArray(legacyAudit) && legacyAudit.length > 0) {
    const rawAudit = safeGetJson<AdminAuditEvent[]>(PRIMARY_AUDIT_KEY);
    const primaryAudit: AdminAuditEvent[] = Array.isArray(rawAudit) ? [...rawAudit] : [];

    const existingKeys = new Set(
      primaryAudit.map((e) => `${e.complaintId}-${e.timestamp}-${e.action}`)
    );

    for (let i = 0; i < legacyAudit.length; i++) {
      const entry = legacyAudit[i];
      if (!entry || !entry.complaintId) continue;

      const dedupeKey = `${entry.complaintId}-${entry.timestamp}-${entry.action}`;
      if (!existingKeys.has(dedupeKey)) {
        const migratedEvent: AdminAuditEvent = {
          id: entry.id || `AUD-LEGACY-${Date.now()}-${i + 1}`,
          complaintId: entry.complaintId,
          action: entry.action,
          actor: {
            name: entry.performedBy || 'System Administrator',
            email: 'admin@university.edu',
            role: 'admin',
          },
          previousValue: entry.previousTeam,
          newValue: entry.newTeam,
          timestamp: entry.timestamp || new Date().toISOString(),
          details: 'Migrated from legacy assignment record',
        };
        primaryAudit.push(migratedEvent);
        existingKeys.add(dedupeKey);
        migratedAuditCount++;
      }
    }

    if (migratedAuditCount > 0 || !rawAudit) {
      safeSetJson(PRIMARY_AUDIT_KEY, primaryAudit);
    }
  }

  // Mark migration as completed
  safeSetJson(MIGRATION_FLAG_KEY, {
    version: 1,
    migratedAt: new Date().toISOString(),
    migratedAssignmentsCount,
    migratedAuditCount,
  });

  return {
    applied: migratedAssignmentsCount > 0 || migratedAuditCount > 0,
    migratedAssignmentsCount,
    migratedAuditCount,
    totalComplaints: primaryComplaints.length,
  };
}
