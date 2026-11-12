
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthSession } from '@/pages/auth/authContext';
import type { Complaint } from '@/types';
import { reviewDuplicate } from './complaintService';
import {
  listComplaintsRequest,
  reviewDuplicateRequest,
} from './authApi';

vi.mock('./authApi', () => ({
  createComplaintRequest: vi.fn(),
  listComplaintsRequest: vi.fn(),
  getComplaintRequest: vi.fn(),
  patchComplaintStatus: vi.fn(),
  submitEscalationRequest: vi.fn(),
  reviewEscalationRequest: vi.fn(),
  reviewDuplicateRequest: vi.fn(),
}));

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

const complaint = {
  id: 'CMP-001',
  subject: 'Campus network issue',
  duplicateReviewStatus: 'confirmed',
} as Complaint;

const duplicate = {
  id: 'CMP-002',
  subject: 'Wi-Fi connectivity issue',
  duplicateReviewStatus: 'confirmed',
} as Complaint;

describe('duplicate complaint review', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects users who are not administrators', async () => {
    const result = await reviewDuplicate(
      'CMP-001',
      'confirmed',
      userSession,
    );

    expect(result).toEqual({ outcome: 'unauthorized' });
    expect(reviewDuplicateRequest).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated review attempts', async () => {
    const result = await reviewDuplicate(
      'CMP-001',
      'confirmed',
      null,
    );

    expect(result).toEqual({ outcome: 'unauthorized' });
    expect(reviewDuplicateRequest).not.toHaveBeenCalled();
  });

  it('returns not_found when the complaint is missing', async () => {
    vi.mocked(reviewDuplicateRequest).mockResolvedValue({
      outcome: 'reviewed',
      complaintId: 'CMP-001',
      duplicateId: 'CMP-002',
      decision: 'confirmed',
    });

    vi.mocked(listComplaintsRequest).mockResolvedValue([duplicate]);

    const result = await reviewDuplicate(
      'CMP-001',
      'confirmed',
      adminSession,
    );

    expect(result).toEqual({ outcome: 'not_found' });
  });

  it('returns duplicate_not_found when the duplicate is missing', async () => {
    vi.mocked(reviewDuplicateRequest).mockResolvedValue({
      outcome: 'reviewed',
      complaintId: 'CMP-001',
      duplicateId: 'CMP-002',
      decision: 'confirmed',
    });

    vi.mocked(listComplaintsRequest).mockResolvedValue([complaint]);

    const result = await reviewDuplicate(
      'CMP-001',
      'confirmed',
      adminSession,
    );

    expect(result).toEqual({ outcome: 'duplicate_not_found' });
  });

  it('allows an admin to confirm a duplicate', async () => {
    vi.mocked(reviewDuplicateRequest).mockResolvedValue({
      outcome: 'reviewed',
      complaintId: 'CMP-001',
      duplicateId: 'CMP-002',
      decision: 'confirmed',
    });

    vi.mocked(listComplaintsRequest).mockResolvedValue([
      complaint,
      duplicate,
    ]);

    const result = await reviewDuplicate(
      'CMP-001',
      'confirmed',
      adminSession,
    );

    expect(reviewDuplicateRequest).toHaveBeenCalledWith(
      'CMP-001',
      'confirmed',
    );

    expect(result).toEqual({
      outcome: 'reviewed',
      complaint,
      duplicate,
    });
  });

  it('allows an admin to mark complaints as not duplicates', async () => {
    vi.mocked(reviewDuplicateRequest).mockResolvedValue({
      outcome: 'reviewed',
      complaintId: 'CMP-001',
      duplicateId: 'CMP-002',
      decision: 'not_duplicate',
    });

    vi.mocked(listComplaintsRequest).mockResolvedValue([
      complaint,
      duplicate,
    ]);

    const result = await reviewDuplicate(
      'CMP-001',
      'not_duplicate',
      adminSession,
    );

    expect(reviewDuplicateRequest).toHaveBeenCalledWith(
      'CMP-001',
      'not_duplicate',
    );

    expect(result.outcome).toBe('reviewed');
  });

  it('returns unchanged when the backend reports no change', async () => {
    vi.mocked(reviewDuplicateRequest).mockResolvedValue({
      outcome: 'unchanged',
      complaintId: 'CMP-001',
      duplicateId: 'CMP-002',
      decision: 'confirmed',
    });

    const result = await reviewDuplicate(
      'CMP-001',
      'confirmed',
      adminSession,
    );

    expect(result).toEqual({ outcome: 'unchanged' });
    expect(listComplaintsRequest).not.toHaveBeenCalled();
  });

  it('returns no_duplicate when the complaint has no possible duplicate', async () => {
    vi.mocked(reviewDuplicateRequest).mockRejectedValue(
      new Error('No possible duplicate'),
    );

    const result = await reviewDuplicate(
      'CMP-001',
      'confirmed',
      adminSession,
    );

    expect(result).toEqual({ outcome: 'no_duplicate' });
  });

  it('returns duplicate_not_found when the backend cannot find the duplicate', async () => {
    vi.mocked(reviewDuplicateRequest).mockRejectedValue(
      new Error('Duplicate complaint not found'),
    );

    const result = await reviewDuplicate(
      'CMP-001',
      'confirmed',
      adminSession,
    );

    expect(result).toEqual({ outcome: 'duplicate_not_found' });
  });

  it('returns not_found when the backend cannot find the complaint', async () => {
    vi.mocked(reviewDuplicateRequest).mockRejectedValue(
      new Error('Complaint not found'),
    );

    const result = await reviewDuplicate(
      'CMP-001',
      'confirmed',
      adminSession,
    );

    expect(result).toEqual({ outcome: 'not_found' });
  });
});
