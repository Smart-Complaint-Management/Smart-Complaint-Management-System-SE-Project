
// API service layer for the Smart Complaint Management System.

import type { AppNotification, Complaint, EscalationReview } from '@/types';

import {
  getMyNotifications,
  getComplaint as getLocalComplaint,
  getComplaintUpdates,
  getComplaints as getLocalComplaints,
  getMyComplaints,
  createComplaint as createLocalComplaint,
  submitComplaintEscalation,
  reviewComplaintEscalation,
} from '@/services/complaintService';

import {
  createComplaintRequest,
  getComplaintRequest,
  listComplaintsRequest,
  submitEscalationRequest,
  listEscalationsRequest,
  reviewEscalationRequest,
} from '@/services/authApi';

import type { NewComplaintInput } from '@/services/complaintService';
import type { AuthSession } from '@/pages/auth/authContext';

// Production always uses the real Flask + MySQL backend.
// Local development can enable it using VITE_USE_REAL_API=true.
const USE_REAL_API =
  import.meta.env.PROD || import.meta.env.VITE_USE_REAL_API === 'true';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? 'http://localhost:5000' : '/api');

// --- Shared helpers ----------------------------------------------------------

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

// --- Complaint loading -------------------------------------------------------

function mockGetNotifications(
  session: AuthSession | null,
): Promise<AppNotification[]> {
  return Promise.resolve(getMyNotifications(session));
}

export async function loadComplaints(
  session: AuthSession | null,
): Promise<Complaint[]> {
  if (USE_REAL_API) {
    return listComplaintsRequest();
  }

  return session?.role === 'admin'
    ? getLocalComplaints()
    : getMyComplaints(session);
}

export async function loadComplaint(
  id: string,
  session: AuthSession | null,
) {
  if (USE_REAL_API) {
    return getComplaintRequest(id);
  }

  const complaint = getLocalComplaint(id);

  if (
    !complaint ||
    (session?.role !== 'admin' &&
      complaint.submittedBy !== session?.fullName)
  ) {
    return null;
  }

  return {
    complaint,
    updates: getComplaintUpdates().filter(
      (update) => update.complaintId === id,
    ),
  };
}

// --- Escalations -------------------------------------------------------------

export interface EscalationView {
  complaint: Complaint;
  reason: string;
  submittedBy: string;
  submittedAt: string;
  reviews: EscalationReview[];
}

export async function loadEscalations(
  session: AuthSession | null,
): Promise<EscalationView[]> {
  if (session?.role !== 'admin') return [];

  if (USE_REAL_API) {
    const items = await listEscalationsRequest();

    return items.map(({ complaint: backendComplaint, escalation }) => ({
      complaint: {
        id: backendComplaint.id,
        databaseId: backendComplaint.databaseId,
        subject: backendComplaint.title,
        description: backendComplaint.description,
        category: backendComplaint.category,
        priority: backendComplaint.priority,
        status: backendComplaint.status,
        submittedBy: backendComplaint.submittedBy,
        submittedAt: backendComplaint.submittedAt,
        updatedAt: backendComplaint.updatedAt,
        isEscalated: true,
      },
      reason: escalation.reason,
      submittedBy: escalation.submittedBy,
      submittedAt: escalation.submittedAt,
      reviews: escalation.reviews,
    }));
  }

  const complaints = getLocalComplaints().filter(
    (complaint) => complaint.isEscalated,
  );

  const updates = getComplaintUpdates();

  return complaints.map((complaint) => {
    const related = updates.filter(
      (update) => update.complaintId === complaint.id,
    );

    const submission = related.find((update) =>
      update.message.startsWith('Escalation reason:'),
    );

    const reviews = related.filter((update) =>
      update.message.startsWith('Admin escalation review:'),
    );

    return {
      complaint,
      reason:
        submission?.message.replace(/^Escalation reason:\s*/, '') ?? '',
      submittedBy: submission?.author ?? complaint.submittedBy,
      submittedAt: submission?.timestamp ?? complaint.updatedAt,
      reviews: reviews.map((review, index) => ({
        id: index + 1,
        note: review.message.replace(
          /^Admin escalation review:\s*/,
          '',
        ),
        reviewedBy: review.author,
        reviewedAt: review.timestamp,
      })),
    };
  });
}

export async function submitEscalation(
  id: string,
  reason: string,
  session: AuthSession | null,
  complaint: Complaint,
) {
  if (USE_REAL_API && complaint.databaseId) {
    const escalation = await submitEscalationRequest(id, reason);
    return { outcome: 'submitted' as const, escalation };
  }

  return submitComplaintEscalation(id, reason, session);
}

export async function submitEscalationReview(
  id: string,
  note: string,
  session: AuthSession | null,
) {
  if (USE_REAL_API) {
    const review = await reviewEscalationRequest(id, note);
    return { outcome: 'reviewed' as const, review };
  }

  return reviewComplaintEscalation(id, note, session);
}

// --- Complaint submission ----------------------------------------------------

export function submitComplaint(
  input: NewComplaintInput,
): Promise<Complaint> {
  if (!USE_REAL_API) {
    return createLocalComplaint(input);
  }

  return createComplaintRequest({
    title: input.subject,
    description: input.description,
    category: input.category,
    priority: input.priority,
  });
}

// --- Notifications -----------------------------------------------------------

async function realGetNotifications(): Promise<AppNotification[]> {
  const res = await fetch(`${API_BASE_URL}/notifications`, {
    credentials: 'include',
  }).catch(() => {
    throw new Error(
      'Could not connect to the service. Check your connection and try again.',
    );
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
    };

    throw Object.assign(
      new Error(
        data.error ?? `Failed to fetch notifications: ${res.status}`,
      ),
      { status: res.status },
    );
  }

  return (await res.json()) as AppNotification[];
}

// --- Public API surface ------------------------------------------------------

export const api = {
  getComplaints: loadComplaints,

  getComplaintById: async (
    id: string,
    session: AuthSession | null,
  ) => (await loadComplaint(id, session))?.complaint ?? null,

  getUpdatesForComplaint: async (
    id: string,
    session: AuthSession | null,
  ) => (await loadComplaint(id, session))?.updates ?? [],

  getNotifications: (session: AuthSession | null) =>
    USE_REAL_API
      ? realGetNotifications()
      : mockGetNotifications(session),
};

export { API_BASE_URL, USE_REAL_API };
