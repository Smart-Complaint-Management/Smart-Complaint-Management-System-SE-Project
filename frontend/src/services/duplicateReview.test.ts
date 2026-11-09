import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthSession } from '@/pages/auth/authContext';
import type { Complaint, ComplaintUpdate } from '@/types';
import {
  getComplaints,
  getComplaintUpdates,
  reviewDuplicate,
} from './complaintService';

const COMPLAINTS_KEY = 'scms_complaints';
const UPDATES_KEY = 'scms_complaint_updates';

const adminSession: AuthSession = {
  email: 'admin@example.test',
  fullName: 'Test Admin',
  role: 'admin',
};

const userSession: AuthSession = {
  email: 'user@example.test',
  fullName: 'Test User',
  role: 'user',
};

function makeComplaint(
  id: string,
  possibleDuplicateId: string | null,
): Complaint {
  return {
    id,
    subject: 'Campus network issue',
    description: 'Unable to connect to the campus Wi-Fi.',
    category: 'it_infrastructure',
    status: 'submitted',
    priority: 'medium',
    submittedBy: 'Test User',
    assignedTo: null,
    submittedAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    isEscalated: false,
    possibleDuplicateId,
  };
}

function seedStorage() {
  const first = makeComplaint('CMP-001', 'CMP-002');
  const second = makeComplaint('CMP-002', 'CMP-001');

  localStorage.setItem(
    COMPLAINTS_KEY,
    JSON.stringify([first, second]),
  );

  localStorage.setItem(UPDATES_KEY, JSON.stringify([]));
}

function stored<T>(key: string): T {
  return JSON.parse(
    localStorage.getItem(key) ?? 'null',
  ) as T;
}

describe('duplicate complaint review', () => {
  beforeEach(() => {
    localStorage.clear();
    seedStorage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('rejects users who are not administrators', () => {
    const result = reviewDuplicate(
      'CMP-001',
      'confirmed',
      userSession,
    );

    expect(result).toEqual({ outcome: 'unauthorized' });
    expect(getComplaints()[0].duplicateReviewStatus).toBeUndefined();
  });

  it('rejects unauthenticated review attempts', () => {
    const result = reviewDuplicate(
      'CMP-001',
      'confirmed',
      null,
    );

    expect(result).toEqual({ outcome: 'unauthorized' });
  });

  it('returns not_found for an unknown complaint', () => {
    const result = reviewDuplicate(
      'CMP-999',
      'confirmed',
      adminSession,
    );

    expect(result).toEqual({ outcome: 'not_found' });
  });

  it('allows an administrator to confirm a duplicate', () => {
    const result = reviewDuplicate(
      'CMP-001',
      'confirmed',
      adminSession,
    );

    expect(result.outcome).toBe('reviewed');

    const complaints = getComplaints();

    expect(
      complaints.find((item) => item.id === 'CMP-001')
        ?.duplicateReviewStatus,
    ).toBe('confirmed');

    expect(
      complaints.find((item) => item.id === 'CMP-002')
        ?.duplicateReviewStatus,
    ).toBe('confirmed');
  });

  it('allows an administrator to mark complaints as not duplicates', () => {
    const result = reviewDuplicate(
      'CMP-001',
      'not_duplicate',
      adminSession,
    );

    expect(result.outcome).toBe('reviewed');

    const complaints = getComplaints();

    expect(
      complaints.find((item) => item.id === 'CMP-001')
        ?.duplicateReviewStatus,
    ).toBe('not_duplicate');

    expect(
      complaints.find((item) => item.id === 'CMP-002')
        ?.duplicateReviewStatus,
    ).toBe('not_duplicate');
  });

  it('keeps both complaints as separate records after review', () => {
    reviewDuplicate('CMP-001', 'confirmed', adminSession);

    const complaints = getComplaints();

    expect(complaints).toHaveLength(2);
    expect(complaints.some((item) => item.id === 'CMP-001')).toBe(true);
    expect(complaints.some((item) => item.id === 'CMP-002')).toBe(true);
  });

  it('records the administrator and review timestamp', () => {
    reviewDuplicate('CMP-001', 'confirmed', adminSession);

    const complaints = getComplaints();

    for (const complaint of complaints) {
      expect(complaint.duplicateReviewedBy).toBe(
        adminSession.fullName,
      );

      expect(complaint.duplicateReviewedAt).toBeTruthy();

      expect(
        Number.isNaN(
          Date.parse(complaint.duplicateReviewedAt as string),
        ),
      ).toBe(false);
    }
  });

  it('adds a review entry to the complaint timeline', () => {
    reviewDuplicate('CMP-001', 'confirmed', adminSession);

    const updates = getComplaintUpdates();

    expect(updates.length).toBeGreaterThan(0);
    expect(updates).toContainEqual(
      expect.objectContaining({
        complaintId: 'CMP-001',
        author: adminSession.fullName,
      }),
    );
  });

  it('persists the reviewed complaints in browser storage', () => {
    reviewDuplicate('CMP-001', 'confirmed', adminSession);

    const savedComplaints = stored<Complaint[]>(COMPLAINTS_KEY);

    expect(savedComplaints).toHaveLength(2);

    expect(
      savedComplaints.find((item) => item.id === 'CMP-001')
        ?.duplicateReviewStatus,
    ).toBe('confirmed');
  });

  it('persists timeline updates in browser storage', () => {
    reviewDuplicate('CMP-001', 'confirmed', adminSession);

    const savedUpdates = stored<ComplaintUpdate[]>(UPDATES_KEY);

    expect(savedUpdates.length).toBeGreaterThan(0);
  });
});
