// API service layer for the Smart Complaint Management System.
//
// The frontend is designed to communicate with a Flask REST API backed by
// MySQL. The exact endpoint URLs and response shapes are not yet finalized
// — they depend on the API contract our team agrees on. This module provides
// a thin abstraction with two implementations:
//
//   1. A mock implementation (default) that reads from local mock data so the
//      UI is fully functional during frontend development.
//   2. A real HTTP implementation stub that will be activated once the backend
//      is available. The base URL is configurable through the API_BASE_URL
//      environment variable or a sensible default.
//
// Components should never import mock data directly. They should call the
// functions exported from this module so the swap to the real backend is
// transparent.

import type { AppNotification, Complaint } from '@/types';
import { getMyNotifications } from '@/services/complaintService';
import { getComplaint as getLocalComplaint, getComplaintUpdates, getComplaints as getLocalComplaints, getMyComplaints, createComplaint as createLocalComplaint } from '@/services/complaintService';
import { createComplaintRequest, getComplaintRequest, listComplaintsRequest } from '@/services/authApi';
import type { NewComplaintInput } from '@/services/complaintService';
import type { AuthSession } from '@/pages/auth/authContext';

// Keep demo mode as the default until all workflows are integrated.
const USE_REAL_API = import.meta.env.VITE_USE_REAL_API === 'true';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? 'http://localhost:5000' : '/api');

// --- Shared helpers ----------------------------------------------------------

/** Format an ISO date string into a human-readable date. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Format an ISO date string into a human-readable date with time. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Return a relative-time label like "2 days ago" for an ISO date. */
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

// --- Mock implementations ----------------------------------------------------

function mockGetNotifications(session: AuthSession | null): Promise<AppNotification[]> {
  return Promise.resolve(getMyNotifications(session));
}

export async function loadComplaints(session: AuthSession | null): Promise<Complaint[]> {
  if (USE_REAL_API) return listComplaintsRequest();
  return session?.role === 'admin' ? getLocalComplaints() : getMyComplaints(session);
}

export async function loadComplaint(id: string, session: AuthSession | null) {
  if (USE_REAL_API) return getComplaintRequest(id);
  const complaint = getLocalComplaint(id);
  if (!complaint || (session?.role !== 'admin' && complaint.submittedBy !== session?.fullName)) return null;
  return {
    complaint,
    updates: getComplaintUpdates().filter((update) => update.complaintId === id),
  };
}

export function submitComplaint(input: NewComplaintInput): Promise<Complaint> {
  if (!USE_REAL_API) return createLocalComplaint(input);
  return createComplaintRequest({
    title: input.subject,
    description: input.description,
    category: input.category,
    priority: input.priority,
  });
}

async function realGetNotifications(): Promise<AppNotification[]> {
  const res = await fetch(`${API_BASE_URL}/notifications`, { credentials: 'include' }).catch(() => { throw new Error('Could not connect to the service. Check your connection and try again.'); });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw Object.assign(
      new Error(data.error ?? `Failed to fetch notifications: ${res.status}`),
      { status: res.status },
    );
  }
  return (await res.json()) as AppNotification[];
}

// --- Public API surface ------------------------------------------------------

export const api = {
  getComplaints: loadComplaints,
  getComplaintById: async (id: string, session: AuthSession | null) =>
    (await loadComplaint(id, session))?.complaint ?? null,
  getUpdatesForComplaint: async (id: string, session: AuthSession | null) =>
    (await loadComplaint(id, session))?.updates ?? [],
  getNotifications: (session: AuthSession | null) =>
    USE_REAL_API ? realGetNotifications() : mockGetNotifications(session),
};

export { API_BASE_URL, USE_REAL_API };
