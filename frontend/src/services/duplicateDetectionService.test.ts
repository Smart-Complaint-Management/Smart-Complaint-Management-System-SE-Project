import { describe, it, expect } from 'vitest';
import type { Complaint } from '@/types';
import {
  findPotentialDuplicates,
  hasPotentialDuplicates,
} from './duplicateDetectionService';

function createComplaint(
  overrides: Partial<Complaint> = {},
): Complaint {
  return {
    id: 'complaint-1',
    subject: 'WiFi not working in library',
    description:
      'The WiFi connection in the library is not working. Students cannot access the internet.',
    category: 'technical',
    priority: 'medium',
    status: 'submitted',
    submittedBy: 'student@example.com',
    assignedTo: null,
    possibleDuplicateId: null,
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    ...overrides,
  } as Complaint;
}

describe('Duplicate Detection Service', () => {
  it('identifies complaints with identical subjects', () => {
    const existing = [
      createComplaint(),
    ];

    const matches = findPotentialDuplicates(
      {
        subject: 'WiFi not working in library',
        description: 'Students cannot connect to the internet.',
        category: 'technical',
      },
      existing,
    );

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].complaint.id).toBe('complaint-1');
  });

  it('identifies complaints with similar descriptions', () => {
    const existing = [
      createComplaint({
        subject: 'Internet connection issue',
        description:
          'Students are unable to connect to the WiFi network in the college library.',
      }),
    ];

    const matches = findPotentialDuplicates(
      {
        subject: 'WiFi connectivity problem',
        description:
          'Students are unable to connect to the WiFi network in the college library.',
        category: 'technical',
      },
      existing,
    );

    expect(matches.length).toBeGreaterThan(0);
  });

  it('does not identify unrelated complaints as duplicates', () => {
    const existing = [
      createComplaint({
        subject: 'Broken classroom projector',
        description:
          'The projector in classroom 201 is not displaying anything.',
      }),
    ];

    const matches = findPotentialDuplicates(
      {
        subject: 'Hostel food quality',
        description:
          'The food served in the hostel is cold and tasteless.',
        category: 'facilities',
      },
      existing,
    );

    expect(matches).toHaveLength(0);
  });

  it('returns matching complaints in descending similarity order', () => {
    const existing = [
      createComplaint({
        id: 'complaint-1',
        subject: 'Internet problem',
        description: 'Internet is not working.',
      }),
      createComplaint({
        id: 'complaint-2',
        subject: 'WiFi not working in library',
        description:
          'The WiFi connection in the library is not working. Students cannot access the internet.',
      }),
    ];

    const matches = findPotentialDuplicates(
      {
        subject: 'WiFi not working in library',
        description:
          'The WiFi connection in the library is not working. Students cannot access the internet.',
        category: 'technical',
      },
      existing,
    );

    expect(matches.length).toBeGreaterThan(0);

    for (let index = 0; index < matches.length - 1; index++) {
      expect(matches[index].similarity).toBeGreaterThanOrEqual(
        matches[index + 1].similarity,
      );
    }
  });

  it('excludes the complaint ID provided for exclusion', () => {
    const existing = [
      createComplaint({
        id: 'complaint-1',
      }),
    ];

    const matches = findPotentialDuplicates(
      {
        subject: 'WiFi not working in library',
        description:
          'The WiFi connection in the library is not working.',
        category: 'technical',
      },
      existing,
      'complaint-1',
    );

    expect(matches).toHaveLength(0);
  });

  it('returns true when potential duplicates exist', () => {
    const existing = [
      createComplaint(),
    ];

    const result = hasPotentialDuplicates(
      {
        subject: 'WiFi not working in library',
        description:
          'The WiFi connection in the library is not working.',
        category: 'technical',
      },
      existing,
    );

    expect(result).toBe(true);
  });

  it('returns false when no potential duplicates exist', () => {
    const existing = [
      createComplaint({
        subject: 'Broken classroom projector',
        description: 'The classroom projector is not working.',
      }),
    ];

    const result = hasPotentialDuplicates(
      {
        subject: 'Hostel food quality',
        description: 'The hostel food is cold.',
        category: 'facilities',
      },
      existing,
    );

    expect(result).toBe(false);
  });

  it('does not modify existing complaint records', () => {
    const existing = [
      createComplaint(),
    ];

    const originalComplaint = {
      ...existing[0],
    };

    findPotentialDuplicates(
      {
        subject: 'WiFi not working in library',
        description:
          'The WiFi connection in the library is not working.',
        category: 'technical',
      },
      existing,
    );

    expect(existing[0]).toEqual(originalComplaint);
  });
});
