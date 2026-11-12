
import type {
  UserRole,
  Complaint,
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
  ComplaintUpdate,
  ComplaintEscalation,
  EscalationReview,
  AppNotification,
  DuplicateReviewStatus,
} from '@/types';

const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '');
const base =
  configuredBase ??
  (import.meta.env.DEV ? 'http://localhost:5000' : '');

let csrfToken = '';

export interface BackendUser {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
}

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
  possibleDuplicateId?: string | null;
  duplicateReviewStatus?: DuplicateReviewStatus;
  duplicateReviewedBy?: string | null;
  duplicateReviewedAt?: string | null;
}

export interface BackendEscalationItem {
  escalation: ComplaintEscalation;
  complaint: BackendComplaint;
}

async function request<T = any>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (!base) {
    throw new Error('The backend service is not configured for this deployment.');
  }

  let response: Response;

  try {
    response = await fetch(`${base}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
},
    });
  } catch {
    throw new Error(
      'Could not connect to the service. Check your connection and try again.',
    );
  }

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    field?: string;
    user?: BackendUser;
    csrfToken?: string;
  };

  if (!response.ok) {
    throw Object.assign(
      new Error(data.error ?? `Request failed (${response.status})`),
      {
        status: response.status,
        field: data.field,
      },
    );
  }

  if (data.csrfToken) {
    csrfToken = data.csrfToken;
  }

  return data as T;
}


export async function fetchCurrentUser() {
  const data = await request<{
    user?: BackendUser | null;
    csrfToken?: string;
  }>('/auth/me');

  if (data.csrfToken) {
    csrfToken = data.csrfToken;
  }

  return data.user ?? null;
}

export async function loginRequest(email: string, password: string) {
  const data = await request<{ user: BackendUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  return data.user;
}

export async function registerRequest(
  fullName: string,
  email: string,
  password: string,
) {
  await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ fullName, email, password }),
  });
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
    possibleDuplicateId: data.possibleDuplicateId ?? null,
    duplicateReviewStatus: data.duplicateReviewStatus ?? 'pending',
    duplicateReviewedBy: data.duplicateReviewedBy ?? undefined,
    duplicateReviewedAt: data.duplicateReviewedAt ?? undefined,
  };
}

export async function createComplaintRequest(input: {
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
}): Promise<Complaint> {
  const data = await request<BackendComplaint>('/complaints', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return toComplaint(data);
}

export async function listComplaintsRequest(): Promise<Complaint[]> {
  const data = await request<{ items: BackendComplaint[] }>('/complaints');
  return data.items.map(toComplaint);
}

export async function getComplaintRequest(id: string) {
  const data = await request<BackendComplaint>(
    `/complaints/${encodeURIComponent(id)}`,
  );

  return {
    complaint: toComplaint(data),
    updates: (data.updates ?? []).map((update) => ({
      ...update,
      complaintId: data.id,
    })),
    escalation: data.escalation ?? null,
  };
}

export async function submitEscalationRequest(
  publicId: string,
  reason: string,
) {
  const data = await request<{ escalation: ComplaintEscalation }>(
    `/complaints/${encodeURIComponent(publicId)}/escalations`,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    },
  );

  return data.escalation;
}

export async function listEscalationsRequest() {
  const data = await request<{ items: BackendEscalationItem[] }>(
    '/admin/escalations',
  );

  return data.items;
}

export async function reviewEscalationRequest(
  publicId: string,
  note: string,
) {
  const data = await request<{ review: EscalationReview }>(
    `/complaints/${encodeURIComponent(publicId)}/escalation-reviews`,
    {
      method: 'POST',
      body: JSON.stringify({ note }),
    },
  );

  return data.review;
}

export async function reviewDuplicateRequest(
  complaintId: string,
  decision: 'confirmed' | 'not_duplicate',
) {
  return request<{
    outcome: 'reviewed' | 'unchanged';
    complaintId: string;
    duplicateId: string;
    decision: string;
  }>(`/complaints/${encodeURIComponent(complaintId)}/duplicate-review`, {
    method: 'POST',
    body: JSON.stringify({ decision }),
  });
}

export async function logoutRequest() {
  await request('/auth/logout', { method: 'POST' });
  csrfToken = '';
}

export async function getComplaintStatus(id: string) {
  if (!/^\d+$/.test(id)) {
    throw new Error(
      'This complaint is not connected to a database record yet.',
    );
  }

  return request<{
    status: ComplaintStatus;
    updates: ComplaintUpdate[];
  }>(`/complaints/${encodeURIComponent(id)}/status`);
}

export async function patchComplaintStatus(
  id: string,
  status: string,
) {
  if (!/^\d+$/.test(id)) {
    throw new Error(
      'This complaint is not connected to a database record yet.',
    );
  }

  return request<{
    complaint_id: number;
    status: ComplaintStatus;
    changed: boolean;
    update?: ComplaintUpdate;
  }>(`/complaints/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function listNotificationsRequest(): Promise<AppNotification[]> {
  return request<AppNotification[]>('/notifications');
}
