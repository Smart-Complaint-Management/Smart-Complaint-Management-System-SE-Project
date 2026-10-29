import type { UserRole } from '@/types';
import type { ComplaintStatus, ComplaintUpdate } from '@/types';

const base = import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? 'http://localhost:5000' : '/api');
let csrfToken = '';

export interface BackendUser { id: number; email: string; fullName: string; role: UserRole }
async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${base}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}), ...init.headers },
  });
  const data = await response.json().catch(() => ({})) as { error?: string; user?: BackendUser; csrfToken?: string };
  if (!response.ok) throw Object.assign(new Error(data.error ?? `Request failed (${response.status})`), { status: response.status });
  if (data.csrfToken) csrfToken = data.csrfToken;
  return data;
}
export async function fetchCurrentUser() { return (await request('/auth/me')).user ?? null; }
export async function loginRequest(email: string, password: string) { return (await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })).user!; }
export async function registerRequest(fullName: string, email: string, password: string) {
  await request('/auth/register', { method: 'POST', body: JSON.stringify({ fullName, email, password }) });
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
