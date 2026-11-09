import { describe, expect, it } from 'vitest';
import {
  findPotentialDuplicates,
  hasPotentialDuplicates,
} from './duplicateDetectionService';

describe('duplicate detection accuracy', () => {
  const existingComplaints = [
    {
      id: 'CMP-001',
      subject: 'Wi-Fi not working in the library',
      description:
        'Students are unable to connect to the campus Wi-Fi network in the library.',
      category: 'it_infrastructure',
    },
    {
      id: 'CMP-002',
      subject: 'Broken classroom projector',
      description:
        'The projector in classroom 204 is not displaying anything.',
      category: 'facilities',
    },
    {
      id: 'CMP-003',
      subject: 'Water leakage in hostel',
      description:
        'Water is leaking from the ceiling in the hostel corridor.',
      category: 'facilities',
    },
    {
      id: 'CMP-004',
      subject: 'Library opening hours',
      description:
        'Request to extend the library opening hours during examinations.',
      category: 'academic',
    },
  ];

  const testCases = [
    {
      name: 'detects an identical Wi-Fi complaint',
      input: {
        subject: 'Wi-Fi not working in the library',
        description:
          'Students are unable to connect to the campus Wi-Fi network in the library.',
        category: 'it_infrastructure',
      },
      expected: true,
    },
    {
      name: 'detects a complaint with similar Wi-Fi wording',
      input: {
        subject: 'Library Wi-Fi connection problem',
        description:
          'Students cannot connect to the wireless network inside the library.',
        category: 'it_infrastructure',
      },
      expected: true,
    },
    {
      name: 'detects an identical projector complaint',
      input: {
        subject: 'Broken classroom projector',
        description:
          'The projector in classroom 204 is not displaying anything.',
        category: 'facilities',
      },
      expected: true,
    },
    {
      name: 'detects a similar water leakage complaint',
      input: {
        subject: 'Water leakage in hostel',
        description:
          'There is water leaking from the hostel corridor ceiling.',
        category: 'facilities',
      },
      expected: true,
    },
    {
      name: 'does not flag an unrelated complaint',
      input: {
        subject: 'Student scholarship enquiry',
        description:
          'Request for information about scholarship application deadlines.',
        category: 'academic',
      },
      expected: false,
    },
    {
      name: 'does not flag an unrelated transport complaint',
      input: {
        subject: 'College bus timing',
        description:
          'Request to change the departure time of the college bus.',
        category: 'transport',
      },
      expected: false,
    },
  ] as const;

  it.each(testCases)(
    '$name',
    ({ input, expected }) => {
      const result = hasPotentialDuplicates(
        input,
        existingComplaints,
      );

      expect(result).toBe(expected);
    },
  );

  it('calculates accuracy across the test dataset', () => {
    const correctPredictions = testCases.filter(
      ({ input, expected }) =>
        hasPotentialDuplicates(input, existingComplaints) === expected,
    ).length;

    const accuracy =
      (correctPredictions / testCases.length) * 100;

    expect(accuracy).toBeGreaterThanOrEqual(80);
  });

  it('returns matching complaints when duplicates exist', () => {
    const result = findPotentialDuplicates(
      {
        subject: 'Wi-Fi not working in the library',
        description:
          'Students are unable to connect to the campus Wi-Fi network in the library.',
        category: 'it_infrastructure',
      },
      existingComplaints,
    );

    expect(result.length).toBeGreaterThan(0);
  });
});
