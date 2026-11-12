
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/services/complaintService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/services/complaintService')>();

  return {
    ...actual,

    getComplaints: vi.fn(async () => {
      return JSON.parse(
        window.localStorage.getItem('scms_complaints') ?? '[]',
      );
    }),

    getComplaintUpdates: vi.fn(async () => {
      return JSON.parse(
        window.localStorage.getItem('scms_complaint_updates') ?? '[]',
      );
    }),
  };
});

vi.mock('@/services/authApi', () => ({
  listComplaintsRequest: vi.fn(),
  reviewEscalationRequest: vi.fn(),
}));

import { AdminEscalationsPage } from './AdminEscalationsPage';
import {
  AuthContext,
  type AuthContextValue,
  type AuthSession,
} from '@/pages/auth/authContext';
import { getAdminAuditEvents } from '@/services/adminAuditService';
import {
  listComplaintsRequest,
  reviewEscalationRequest,
} from '@/services/authApi';
import type { Complaint, ComplaintUpdate } from '@/types';

const COMPLAINTS_KEY = 'scms_complaints';
const UPDATES_KEY = 'scms_complaint_updates';

describe('AdminEscalationsPage UI-to-Service Integration (SCMS-82)', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  const adminSession: AuthSession = {
    email: 'hassan.malik@university.edu',
    fullName: 'Dr. Hassan Malik',
    role: 'admin',
  };

  const authValue: AuthContextValue = {
    session: adminSession,
    loading: false,
    initializationError: '',
    retryInitialization: () => {},
    login: () => {},
    logout: () => {},
  };

  const mockEscalatedComplaint: Complaint = {
    id: 'CMP-2026-042',
    subject: 'Emergency Lab Water Leakage',
    description:
      'Persistent water dripping onto electrical servers in Server Room B.',
    category: 'facilities',
    status: 'in_progress',
    priority: 'critical',
    submittedBy: 'Lab Technician',
    assignedTo: 'Facilities Maintenance',
    submittedAt: '2026-01-15T08:00:00.000Z',
    updatedAt: '2026-01-15T09:00:00.000Z',
    isEscalated: true,
    possibleDuplicateId: null,
  };

  const mockEscalationUpdate: ComplaintUpdate = {
    id: 'UPD-042-ESC',
    complaintId: 'CMP-2026-042',
    status: 'in_progress',
    message:
      'Escalation reason: High risk of electrical fire due to worsening leak.',
    author: 'Lab Technician',
    timestamp: '2026-01-15T09:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (
      globalThis as unknown as {
        IS_REACT_ACT_ENVIRONMENT: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;

    window.localStorage.clear();

    window.localStorage.setItem(
      COMPLAINTS_KEY,
      JSON.stringify([mockEscalatedComplaint]),
    );

    window.localStorage.setItem(
      UPDATES_KEY,
      JSON.stringify([mockEscalationUpdate]),
    );

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }

    if (container?.parentNode) {
      container.parentNode.removeChild(container);
    }

    container = null;
    root = null;
    window.localStorage.clear();
  });

  async function renderPage(
    customAuth: AuthContextValue = authValue,
  ) {
    await act(async () => {
      root!.render(
        <AuthContext.Provider value={customAuth}>
          <MemoryRouter>
            <AdminEscalationsPage />
          </MemoryRouter>
        </AuthContext.Provider>,
      );
    });
  }

  function findButton(text: string): HTMLButtonElement | undefined {
    return Array.from(
      container!.querySelectorAll('button'),
    ).find((button) =>
      button.textContent?.includes(text),
    );
  }

  function enterReviewNote(
    textarea: HTMLTextAreaElement,
    value: string,
  ) {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value',
    )?.set;

    act(() => {
      setter?.call(textarea, value);

      textarea.dispatchEvent(
        new Event('input', { bubbles: true }),
      );

      textarea.dispatchEvent(
        new Event('change', { bubbles: true }),
      );
    });
  }

  it('renders escalated complaints with initial escalation details', async () => {
    await renderPage();

    expect(container?.textContent).toContain('Escalations');
    expect(container?.textContent).toContain('CMP-2026-042');
    expect(container?.textContent).toContain(
      'Emergency Lab Water Leakage',
    );
    expect(container?.textContent).toContain(
      'High risk of electrical fire due to worsening leak.',
    );
    expect(container?.textContent).toContain('Review Escalation');
  });

  it('opens escalation review form and validates non-empty review note', async () => {
    await renderPage();

    const reviewBtn = findButton('Review Escalation');

    expect(reviewBtn).toBeDefined();

    act(() => {
      reviewBtn!.click();
    });

    expect(container?.textContent).toContain(
      'Record Administrative Escalation Review',
    );

    const textarea = container?.querySelector('textarea');

    expect(textarea).not.toBeNull();

    const submitBtn = findButton('Submit Escalation Review');

    expect(submitBtn).toBeDefined();
    expect(submitBtn?.disabled).toBe(true);
  });

  it('submits escalation review, persists audit details, and updates UI without reload', async () => {
    vi.mocked(listComplaintsRequest).mockResolvedValue([
      mockEscalatedComplaint,
    ]);

    vi.mocked(reviewEscalationRequest).mockResolvedValue({
      id: 42,
      note: 'Dispatched emergency plumbing crew and alerted IT operations.',
      reviewedBy: adminSession.fullName,
      reviewedAt: '2026-01-15T10:00:00.000Z',
    } as Awaited<ReturnType<typeof reviewEscalationRequest>>);

    await renderPage();

    const reviewBtn = findButton('Review Escalation');

    expect(reviewBtn).toBeDefined();

    act(() => {
      reviewBtn!.click();
    });

    const textarea = container!.querySelector(
      'textarea',
    ) as HTMLTextAreaElement;

    expect(textarea).not.toBeNull();

    const reviewNote =
      'Dispatched emergency plumbing crew and alerted IT operations.';

    enterReviewNote(textarea, reviewNote);

    const submitBtn = findButton('Submit Escalation Review');

    expect(submitBtn).toBeDefined();
    expect(submitBtn?.disabled).toBe(false);

    await act(async () => {
      submitBtn!.click();
    });

    expect(container?.textContent).toContain(
  'Escalation review recorded successfully and added to case audit history.',
);

    const auditEvents = getAdminAuditEvents('CMP-2026-042');

    expect(auditEvents.length).toBe(1);

    const event = auditEvents[0];

    expect(event.action).toBe('ESCALATION_REVIEWED');
    expect(event.actor.name).toBe(adminSession.fullName);
    expect(event.actor.email).toBe(adminSession.email);
    expect(event.actor.role).toBe('admin');
    expect(event.previousValue).toBe('Escalated');
    expect(event.newValue).toBe('Reviewed');
    expect(event.details).toBe(reviewNote);

    expect(listComplaintsRequest).toHaveBeenCalled();
    expect(reviewEscalationRequest).toHaveBeenCalledWith(
      'CMP-2026-042',
      reviewNote,
    );
  });

  it('rejects review if actor is not an administrator', async () => {
    const userAuth: AuthContextValue = {
      ...authValue,
      session: {
        email: 'student@university.edu',
        fullName: 'Student User',
        role: 'user',
      },
    };

    await renderPage(userAuth);

    const reviewBtn = findButton('Review Escalation');

    expect(reviewBtn).toBeDefined();

    act(() => {
      reviewBtn!.click();
    });

    const textarea = container!.querySelector(
      'textarea',
    ) as HTMLTextAreaElement;

    expect(textarea).not.toBeNull();

    enterReviewNote(
      textarea,
      'Attempting review as normal user',
    );

    const submitBtn = findButton('Submit Escalation Review');

    expect(submitBtn).toBeDefined();
    expect(submitBtn?.disabled).toBe(false);

    await act(async () => {
      submitBtn!.click();
    });

    expect(container?.textContent).toContain(
      'Unauthorized. Administrator credentials are required to review escalations.',
    );

    expect(
      getAdminAuditEvents('CMP-2026-042').length,
    ).toBe(0);

    expect(reviewEscalationRequest).not.toHaveBeenCalled();
  });
});
