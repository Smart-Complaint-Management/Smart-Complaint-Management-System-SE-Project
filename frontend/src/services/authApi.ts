import type { UserRole } from '@/types';
import type { Complaint, ComplaintCategory, ComplaintPriority, ComplaintStatus, ComplaintUpdate, ComplaintEscalation, EscalationReview } from '@/types';

const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '');
const base = configuredBase ?? (import.meta.env.DEV ? 'http://localhost:5000' : '');
let csrfToken = '';

export interface BackendUser { id: number; email: string; fullName: string; role: UserRole }
export interface BackendComplaint {
  id: string;
  databaseId: number;
  title: string;
  description: string;
  category: ComplaintCategory | null;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  submittedBy: string;
  submittedAt: string;
  updatedAt: string;
  isEscalated?: boolean;
  updates?: Omit<ComplaintUpdate, 'complaintId'>[];
  escalation?: ComplaintEscalation | null;
}
export interface BackendEscalationItem {
  escalation: ComplaintEscalation;
  complaint: BackendComplaint;
}
async function request(path: string, init: RequestInit = {}) {
  if (!base) {
    throw new Error('The backend service is not configured for this deployment.');
  }
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...init,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}), ...init.headers },
    });
  } catch {
    throw new Error('Could not connect to the service. Check your connection and try again.');
  }
  const data = await response.json().catch(() => ({})) as { error?: string; field?: string; user?: BackendUser; csrfToken?: string };
  if (!response.ok) throw Object.assign(new Error(data.error ?? `Request failed (${response.status})`), { status: response.status, field: data.field });
  if (data.csrfToken) csrfToken = data.csrfToken;
  return data;
}
export async function fetchCurrentUser() { return (await request('/auth/me')).user ?? null; }
export async function loginRequest(email: string, password: string) { return (await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })).user!; }
export async function registerRequest(fullName: string, email: string, password: string) {
  await request('/auth/register', { method: 'POST', body: JSON.stringify({ fullName, email, password }) });
}
function toComplaint(data: BackendComplaint): Complaint {
  return {
    id: data.id,
    databaseId: data.databaseId,
    subject: data.title,
    description: data.description,
    category: data.category,
    priority: data.priority,
    status: data.status,
    submittedBy: data.submittedBy,
    submittedAt: data.submittedAt,
    updatedAt: data.updatedAt,
    isEscalated: data.isEscalated ?? false,
  };
}
export async function createComplaintRequest(input: {
  title: string; description: string; category: ComplaintCategory; priority: ComplaintPriority;
}) {
  const data = await request('/complaints', { method: 'POST', body: JSON.stringify(input) });
  return toComplaint(data as unknown as BackendComplaint);
}
export async function listComplaintsRequest() {
  const data = await request('/complaints') as unknown as { items: BackendComplaint[] };
  return data.items.map(toComplaint);
}
export async function getComplaintRequest(id: string) {
  const data = await request(`/complaints/${encodeURIComponent(id)}`) as unknown as BackendComplaint;
  return {
    complaint: toComplaint(data),
    updates: (data.updates ?? []).map((update) => ({ ...update, complaintId: data.id })),
    escalation: data.escalation ?? null,
  };
}
export async function submitEscalationRequest(publicId: string, reason: string) {
  const data = await request(`/complaints/${encodeURIComponent(publicId)}/escalations`, {
    method: 'POST', body: JSON.stringify({ reason }),
  }) as unknown as { escalation: ComplaintEscalation };
  return data.escalation;
}
export async function listEscalationsRequest() {
  const data = await request('/admin/escalations') as unknown as { items: BackendEscalationItem[] };
  return data.items;
}
export async function reviewEscalationRequest(publicId: string, note: string) {
  const data = await request(`/complaints/${encodeURIComponent(publicId)}/escalation-reviews`, {
    method: 'POST', body: JSON.stringify({ note }),
  }) as unknown as { review: EscalationReview };
  return data.review;
}
export async function logoutRequest() { await request('/auth/logout', { method: 'POST' }); csrfToken = ''; }
export async function getComplaintStatus(id: string) {
  if (!/^\d+$/.test(id)) throw new Error('This complaint is not connected to a database record yet.');
  return request(`/complaints/${encodeURIComponent(id)}/status`) as Promise<{
    status: ComplaintStatus;
    updates: ComplaintUpdate[];
  }>;
}
export async function patchComplaintStatus(id: string, status: string) {
  if (!/^\d+$/.test(id)) throw new Error('This complaint is not connected to a database record yet.');
  return request(`/complaints/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }) as Promise<{
    complaint_id: number;
    status: ComplaintStatus;
    changed: boolean;
    update?: ComplaintUpdate;
  }>;
}
