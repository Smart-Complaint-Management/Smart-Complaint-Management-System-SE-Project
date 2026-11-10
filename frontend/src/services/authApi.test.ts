import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createComplaintRequest, fetchCurrentUser, getComplaintRequest, listComplaintsRequest, submitEscalationRequest, listEscalationsRequest, reviewEscalationRequest } from './authApi';

const complaint = {
  id: 'CMP-2026-000042',
  databaseId: 42,
  title: 'Broken classroom lights',
  description: 'The lights have stopped working.',
  category: 'facilities',
  priority: 'critical',
  status: 'submitted',
  submittedBy: 'Test User',
  submittedAt: '2026-11-10T12:30:00Z',
  updatedAt: '2026-11-10T12:30:00Z',
};

function jsonResponse(data: unknown) {
  return { ok: true, status: 200, json: async () => data } as Response;
}

describe('persistent complaint API client', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('maps the authenticated complaint list response to the UI model', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ items: [complaint] }));

    const items = await listComplaintsRequest();

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:5000/complaints', expect.objectContaining({
      credentials: 'include',
    }));
    expect(items).toEqual([expect.objectContaining({
      id: 'CMP-2026-000042',
      databaseId: 42,
      subject: 'Broken classroom lights',
      category: 'facilities',
      priority: 'critical',
    })]);
    expect(items[0]).not.toHaveProperty('assignedTo');
    expect(items[0].isEscalated).toBe(false);
  });

  it('loads public tracking IDs and maps activity history for the timeline', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      ...complaint,
      updates: [{
        id: '9', status: 'submitted', message: 'Complaint registered.',
        author: 'System', timestamp: '2026-11-10T12:30:00Z',
      }],
    }));

    const detail = await getComplaintRequest('CMP-2026-000042');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5000/complaints/CMP-2026-000042',
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(detail.complaint.databaseId).toBe(42);
    expect(detail.updates[0]).toMatchObject({
      id: '9', complaintId: 'CMP-2026-000042', status: 'submitted', author: 'System',
    });
  });

  it('posts complaint fields with the authenticated session and CSRF token', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ user: { id: 1 }, csrfToken: 'csrf-test-token' }))
      .mockResolvedValueOnce(jsonResponse(complaint));
    await fetchCurrentUser();

    const created = await createComplaintRequest({
      title: complaint.title,
      description: complaint.description,
      category: 'facilities',
      priority: 'critical',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://localhost:5000/complaints', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      headers: expect.objectContaining({ 'X-CSRF-Token': 'csrf-test-token' }),
      body: JSON.stringify({
        title: complaint.title,
        description: complaint.description,
        category: 'facilities',
        priority: 'critical',
      }),
    }));
    expect(created).toMatchObject({ id: complaint.id, databaseId: 42, subject: complaint.title });
  });

  it('submits an escalation with its reason and CSRF token', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ user: { id: 1 }, csrfToken: 'csrf-escalate' }))
      .mockResolvedValueOnce(jsonResponse({ escalation: {
        id: 8, complaintId: complaint.id, reason: 'No response', submittedBy: 'Test User',
        submittedAt: complaint.submittedAt, reviews: [],
      } }));
    await fetchCurrentUser();
    const result = await submitEscalationRequest(complaint.id, 'No response');
    expect(result.reason).toBe('No response');
    expect(fetchMock).toHaveBeenLastCalledWith(
      `http://localhost:5000/complaints/${complaint.id}/escalations`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-CSRF-Token': 'csrf-escalate' }),
        body: JSON.stringify({ reason: 'No response' }),
      }),
    );
  });

  it('loads administrator escalations and posts an append-only review note', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ items: [{ escalation: {
        id: 8, complaintId: complaint.id, reason: 'No response', submittedBy: 'Test User',
        submittedAt: complaint.submittedAt, reviews: [],
      }, complaint }] }))
      .mockResolvedValueOnce(jsonResponse({ review: {
        id: 11, note: 'Triage started', reviewedBy: 'Admin', reviewedAt: complaint.updatedAt,
      } }));
    expect((await listEscalationsRequest())[0].escalation.reason).toBe('No response');
    expect((await reviewEscalationRequest(complaint.id, 'Triage started')).id).toBe(11);
    expect(fetchMock).toHaveBeenLastCalledWith(
      `http://localhost:5000/complaints/${complaint.id}/escalation-reviews`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ note: 'Triage started' }) }),
    );
  });

  it('surfaces API errors instead of treating a failed escalation as successful', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: 'This complaint has already been escalated.' }),
    } as Response);
    await expect(submitEscalationRequest(complaint.id, 'Again')).rejects.toMatchObject({
      message: 'This complaint has already been escalated.',
      status: 409,
    });
  });
});
