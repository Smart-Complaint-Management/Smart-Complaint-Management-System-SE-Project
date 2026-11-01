import { beforeEach, describe, expect, it } from 'vitest';
import {
  assignComplaint,
  getAssignmentComplaints,
  getUnassignedComplaints,
} from './adminAssignmentService';
import {
  createComplaint,
  getComplaints,
  getComplaint,
  updateComplaintStatus,
} from './complaintService';
import {
  getReportComplaints,
  calculateReportMetrics,
} from './adminReportService';
import { getAdminComplaints } from '@/data/adminComplaintData';
import { getAdminAuditEvents } from './adminAuditService';
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

  it('ensures an assignment made in the assignment screen immediately appears across all screens', () => {
    // 1. Initial complaint in storage
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
      JSON.stringify([initialComplaint])
    );

    // 2. Perform assignment
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

    // 3. Verify on Assignments Screen
    const assignmentScreenComplaints = getAssignmentComplaints();
    expect(
      assignmentScreenComplaints.find((c) => c.id === 'CMP-2026-101')?.assignedTo
    ).toBe('Facilities Maintenance');

    // 4. Verify on All Complaints Screen (complaintService.getComplaints)
    const allComplaints = getComplaints();
    expect(
      allComplaints.find((c) => c.id === 'CMP-2026-101')?.assignedTo
    ).toBe('Facilities Maintenance');

    // 5. Verify on Complaint Detail Screen (complaintService.getComplaint)
    const detailComplaint = getComplaint('CMP-2026-101');
    expect(detailComplaint?.assignedTo).toBe('Facilities Maintenance');

    // 6. Verify on Reports Screen (adminReportService.getReportComplaints)
    const reportComplaints = getReportComplaints();
    expect(
      reportComplaints.find((c) => c.id === 'CMP-2026-101')?.assignedTo
    ).toBe('Facilities Maintenance');

    // 7. Verify on Dashboard Data Helper (adminComplaintData.getAdminComplaints)
    const dashboardComplaints = getAdminComplaints();
    expect(
      dashboardComplaints.find((c) => c.id === 'CMP-2026-101')?.assignedTo
    ).toBe('Facilities Maintenance');
  });

  it('ensures a newly submitted user complaint immediately appears on assignments and reporting', async () => {
    // Submit new complaint as student
    const created = await createComplaint({
      subject: 'Library WiFi broken',
      description: 'Eduroam down on 2nd floor',
      category: 'it_infrastructure',
      priority: 'high',
      submittedBy: 'Student Alice',
    });

    // Verify it is visible in Unassigned Complaints
    const unassigned = getUnassignedComplaints();
    expect(unassigned.some((c) => c.id === created.id)).toBe(true);

    // Verify it is counted in Reports Metrics
    const reportMetrics = calculateReportMetrics(getReportComplaints());
    expect(reportMetrics.total).toBeGreaterThanOrEqual(1);

    // Verify it is accessible in admin dashboard
    const adminComplaints = getAdminComplaints();
    expect(adminComplaints.some((c) => c.id === created.id)).toBe(true);
  });

  it('records audit events consistently when admin status updates are executed', () => {
    const complaint: Complaint = {
      id: 'CMP-2026-102',
      subject: 'Classroom projector broken',
      description: 'Bulb burned out',
      category: 'facilities',
      status: 'submitted',
      priority: 'medium',
      submittedBy: 'Prof Smith',
      assignedTo: 'Facilities Maintenance',
      submittedAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
      isEscalated: false,
      possibleDuplicateId: null,
    };
    window.localStorage.setItem(
      PRIMARY_COMPLAINTS_KEY,
      JSON.stringify([complaint])
    );

    const updateResult = updateComplaintStatus(
      'CMP-2026-102',
      'in_progress',
      adminSession.fullName,
      adminSession
    );

    expect(updateResult.outcome).toBe('updated');

    // Verify audit record was created and accessible to audit history
    const auditEvents = getAdminAuditEvents('CMP-2026-102');
    expect(auditEvents.length).toBe(1);
    expect(auditEvents[0].action).toBe('STATUS_CHANGED');
    expect(auditEvents[0].previousValue).toBe('submitted');
    expect(auditEvents[0].newValue).toBe('in_progress');
    expect(auditEvents[0].actor.name).toBe('Dr. Malik');
  });

  it('migrates legacy scms-complaint-assignments without dropping any records', () => {
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
      JSON.stringify(legacyComplaints)
    );

    // Run migration
    const migration = migrateComplaintData();
    expect(migration.applied).toBe(true);

    // Verify complaint is present in unified store
    const unifiedComplaints = getComplaints();
    const migratedItem = unifiedComplaints.find((c) => c.id === 'CMP-2026-999');
    expect(migratedItem).toBeDefined();
    expect(migratedItem?.assignedTo).toBe('Registrar Office');
  });
});
