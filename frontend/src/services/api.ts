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

import type { AppNotification, Complaint, ComplaintUpdate } from '@/types';
import { mockComplaints, mockUpdates } from '@/data/mockData';
import { getMyNotifications } from '@/services/complaintService';
import type { AuthSession } from '@/pages/auth/authContext';

// --- Configuration -----------------------------------------------------------

// Replace this default with the agreed Flask base URL when the backend is live.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? 'http://localhost:5000' : '/api');

// Set this to true once the Flask backend is available and the endpoint shapes
// below match the agreed contract. Until then the mock implementation is used.
const USE_REAL_API = import.meta.env.VITE_USE_REAL_API === 'true';

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

async function mockDelay<T>(value: T, ms = 150): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function mockGetComplaints(): Promise<Complaint[]> {
  return mockDelay(structuredClone(mockComplaints));
}

function mockGetComplaintById(id: string): Promise<Complaint | null> {
  const found = mockComplaints.find((c) => c.id === id) ?? null;
  return mockDelay(found ? structuredClone(found) : null);
}

function mockGetUpdatesForComplaint(id: string): Promise<ComplaintUpdate[]> {
  const updates = mockUpdates.filter((u) => u.complaintId === id);
  return mockDelay(structuredClone(updates));
}

function mockGetNotifications(session: AuthSession | null): Promise<AppNotification[]> {
  return mockDelay(structuredClone(getMyNotifications(session)));
}

// --- Real API stubs (activated when USE_REAL_API is true) --------------------
//
// These functions use the Fetch API to call the Flask backend. The endpoint
// paths are illustrative and MUST be confirmed against the final API contract.

async function realGetComplaints(): Promise<Complaint[]> {
  const res = await fetch(`${API_BASE_URL}/complaints`, { credentials: 'include' }).catch(() => { throw new Error('Could not connect to the service. Check your connection and try again.'); });
  if (!res.ok) throw await responseError(res, 'Could not load complaints.');
  return (await res.json()) as Complaint[];
}

async function realGetComplaintById(id: string): Promise<Complaint | null> {
  const res = await fetch(`${API_BASE_URL}/complaints/${encodeURIComponent(id)}`, { credentials: 'include' }).catch(() => { throw new Error('Could not connect to the service. Check your connection and try again.'); });
  if (res.status === 404) return null;
  if (!res.ok) throw await responseError(res, 'Could not load this complaint.');
  return (await res.json()) as Complaint;
}

async function realGetUpdatesForComplaint(id: string): Promise<ComplaintUpdate[]> {
  const res = await fetch(`${API_BASE_URL}/complaints/${encodeURIComponent(id)}/updates`, { credentials: 'include' }).catch(() => { throw new Error('Could not connect to the service. Check your connection and try again.'); });
  if (!res.ok) throw await responseError(res, 'Could not load complaint updates.');
  return (await res.json()) as ComplaintUpdate[];
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

async function responseError(response: Response, fallback: string): Promise<Error> {
  const data = await response.json().catch(() => ({})) as { error?: string };
  return Object.assign(new Error(data.error ?? `${fallback} (request failed: ${response.status})`), { status: response.status });
}

// --- Public API surface ------------------------------------------------------

export const api = {
  getComplaints: USE_REAL_API ? realGetComplaints : mockGetComplaints,
  getComplaintById: USE_REAL_API ? realGetComplaintById : mockGetComplaintById,
  getUpdatesForComplaint: USE_REAL_API ? realGetUpdatesForComplaint : mockGetUpdatesForComplaint,
  getNotifications: (session: AuthSession | null) =>
    USE_REAL_API ? realGetNotifications() : mockGetNotifications(session),
};

export { API_BASE_URL, USE_REAL_API };
