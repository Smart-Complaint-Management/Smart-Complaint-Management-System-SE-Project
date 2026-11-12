
import { beforeEach, describe, expect, it } from 'vitest';

import {
  assignComplaint,
  getAssignmentComplaints,
} from './adminAssignmentService';

import { getReportComplaints } from './adminReportService';
import { getAdminComplaints } from '@/data/adminComplaintData';

import {
  migrateComplaintData,
  PRIMARY_COMPLAINTS_KEY,
  LEGACY_ASSIGNMENTS_KEY,
} from './dataMigrationService';

import type { Complaint } from '@/types';
import type { AuthSession } from '@/pages/auth/authContext';

describe('Cross-Screen Complaint Data Consistency (SCMS-83)', () => {
  const adminSession: AuthSession = {
    email: 'admin@university.edu',
    fullName: 'Dr. Malik',
    role: 'admin',
  };

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('ensures an assignment made in the assignment screen appears across localStorage-backed screens', () => {
    const initialComplaint: Complaint = {
      id: 'CMP-2026-101',
      subject: 'Lab AC leaking water',
      description: 'Water dripping onto computer desks in Room 204',
      category: 'facilities',
      status: 'submitted',
      priority: 'high',
      submittedBy: 'Student John',
      assignedTo: null,
      submittedAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
      isEscalated: false,
      possibleDuplicateId: null,
    };

    window.localStorage.setItem(
      PRIMARY_COMPLAINTS_KEY,
      JSON.stringify([initialComplaint]),
    );

    const assignResult = assignComplaint({
      complaintId: 'CMP-2026-101',
      team: 'Facilities Maintenance',
      actor: {
        name: adminSession.fullName,
        email: adminSession.email,
        role: adminSession.role,
      },
    });

    expect(assignResult.outcome).toBe('assigned');

    const assignmentScreenComplaints = getAssignmentComplaints();

    expect(
      assignmentScreenComplaints.find(
        (complaint) => complaint.id === 'CMP-2026-101',
      )?.assignedTo,
    ).toBe('Facilities Maintenance');

    const reportComplaints = getReportComplaints();

    expect(
      reportComplaints.find(
        (complaint) => complaint.id === 'CMP-2026-101',
      )?.assignedTo,
    ).toBe('Facilities Maintenance');

    const dashboardComplaints = getAdminComplaints();

    expect(
      dashboardComplaints.find(
        (complaint) => complaint.id === 'CMP-2026-101',
      )?.assignedTo,
    ).toBe('Facilities Maintenance');
  });

  it('migrates legacy scms-complaint-assignments without dropping records', () => {
    const legacyComplaints: Complaint[] = [
      {
        id: 'CMP-2026-999',
        subject: 'Historical complaint from legacy key',
        description: 'Previously saved before migration',
        category: 'academic',
        status: 'under_review',
        priority: 'low',
        submittedBy: 'Student Legacy',
        assignedTo: 'Registrar Office',
        submittedAt: '2025-12-01T10:00:00.000Z',
        updatedAt: '2025-12-05T10:00:00.000Z',
        isEscalated: false,
        possibleDuplicateId: null,
      },
    ];

    window.localStorage.setItem(
      LEGACY_ASSIGNMENTS_KEY,
      JSON.stringify(legacyComplaints),
    );

    const migration = migrateComplaintData();

    expect(migration.applied).toBe(true);

    const unifiedComplaints = JSON.parse(
      window.localStorage.getItem(PRIMARY_COMPLAINTS_KEY) ?? '[]',
    ) as Complaint[];

    const migratedItem = unifiedComplaints.find(
      (complaint) => complaint.id === 'CMP-2026-999',
    );

    expect(migratedItem).toBeDefined();
    expect(migratedItem?.assignedTo).toBe('Registrar Office');
  });
});
