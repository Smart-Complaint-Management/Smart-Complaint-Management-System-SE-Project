import type { AdminActionType, AdminAuditEvent, AuditActor } from '@/types/admin';

export const ADMIN_AUDIT_STORAGE_KEY = 'scms_admin_audit';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function generateAuditId(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `AUD-${timestamp}-${random}`;
}

/**
 * Load all recorded administrative audit events, ordered newest first.
 * Optionally filter by complaint ID.
 */
export function getAdminAuditEvents(complaintId?: string): AdminAuditEvent[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(ADMIN_AUDIT_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const events = parsed as AdminAuditEvent[];
    const filtered = complaintId
      ? events.filter((e) => e.complaintId === complaintId)
      : events;

    return filtered.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (error) {
    console.error('Failed to load admin audit events:', error);
    return [];
  }
}

export interface RecordAdminActionParams {
  complaintId: string;
  action: AdminActionType;
  actor: AuditActor;
  previousValue: string | null;
  newValue: string;
  details?: string;
  timestamp?: string;
}

/**
 * Record an administrative audit event with rollback protection.
 * Throws if persistence fails to prevent silent loss of audit records.
 */
export function recordAdminAction(params: RecordAdminActionParams): AdminAuditEvent {
  if (!isBrowser()) {
    throw new Error('Cannot record admin audit event outside of browser context.');
  }

  const existingEvents = getAdminAuditEvents();
  const previousRaw = window.localStorage.getItem(ADMIN_AUDIT_STORAGE_KEY);

  const event: AdminAuditEvent = {
    id: generateAuditId(),
    complaintId: params.complaintId,
    action: params.action,
    actor: {
      name: params.actor.name.trim() || 'Administrator',
      email: params.actor.email.trim() || 'admin@university.edu',
      role: params.actor.role || 'admin',
    },
    previousValue: params.previousValue,
    newValue: params.newValue,
    timestamp: params.timestamp || new Date().toISOString(),
    details: params.details,
  };

  const updatedEvents = [event, ...existingEvents];

  try {
    window.localStorage.setItem(ADMIN_AUDIT_STORAGE_KEY, JSON.stringify(updatedEvents));
    return event;
  } catch (error) {
    // Attempt rollback
    try {
      if (previousRaw === null) {
        window.localStorage.removeItem(ADMIN_AUDIT_STORAGE_KEY);
      } else {
        window.localStorage.setItem(ADMIN_AUDIT_STORAGE_KEY, previousRaw);
      }
    } catch {
      // Best-effort rollback
    }
    console.error('Failed to persist admin audit event:', error);
    throw new Error('Audit record could not be persisted. Action aborted to maintain audit integrity.');
  }
}
