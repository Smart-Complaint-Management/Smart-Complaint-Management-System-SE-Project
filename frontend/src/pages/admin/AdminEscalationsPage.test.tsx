import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AdminEscalationsPage } from './AdminEscalationsPage';
import { AuthContext, type AuthContextValue, type AuthSession } from '@/pages/auth/authContext';
import { getAdminAuditEvents } from '@/services/adminAuditService';
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
    description: 'Persistent water dripping onto electrical servers in Server Room B.',
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
    message: 'Escalation reason: High risk of electrical fire due to worsening leak.',
    author: 'Lab Technician',
    timestamp: '2026-01-15T09:00:00.000Z',
  };

  beforeEach(() => {
    (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    window.localStorage.clear();
    window.localStorage.setItem(
      COMPLAINTS_KEY,
      JSON.stringify([mockEscalatedComplaint])
    );
    window.localStorage.setItem(
      UPDATES_KEY,
      JSON.stringify([mockEscalationUpdate])
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
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;
    window.localStorage.clear();
  });

  function renderPage(customAuth: AuthContextValue = authValue) {
    act(() => {
      root!.render(
        <AuthContext.Provider value={customAuth}>
          <MemoryRouter>
            <AdminEscalationsPage />
          </MemoryRouter>
        </AuthContext.Provider>
      );
    });
  }

  it('renders escalated complaints with initial escalation details', () => {
    renderPage();

    expect(container?.textContent).toContain('Escalations');
    expect(container?.textContent).toContain('CMP-2026-042');
    expect(container?.textContent).toContain('Emergency Lab Water Leakage');
    expect(container?.textContent).toContain('High risk of electrical fire due to worsening leak.');
    expect(container?.textContent).toContain('Review Escalation');
  });

  it('opens escalation review form and validates non-empty review note', () => {
    renderPage();

    // Click "Review Escalation" button to reveal review form
    const reviewBtn = Array.from(container!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Review Escalation')
    );
    expect(reviewBtn).toBeDefined();

    act(() => {
      reviewBtn!.click();
    });

    expect(container?.textContent).toContain('Record Administrative Escalation Review');
    const textarea = container?.querySelector('textarea');
    expect(textarea).not.toBeNull();

    // The submit button is disabled when empty
    const submitBtn = Array.from(container!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Submit Escalation Review')
    );
    expect(submitBtn).toBeDefined();
    expect(submitBtn?.hasAttribute('disabled')).toBe(true);
  });

  it('submits escalation review, persists audit details, and updates UI without reload', () => {
    renderPage();

    // 1. Open the review form
    const reviewBtn = Array.from(container!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Review Escalation')
    );
    act(() => {
      reviewBtn!.click();
    });

    // 2. Type review notes into textarea
    const textarea = container!.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();

    act(() => {
      // Trigger onChange
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      )?.set;
      nativeInputValueSetter?.call(
        textarea,
        'Dispatched emergency plumbing crew and alerted IT operations.'
      );
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // 3. Click Submit Escalation Review
    const submitBtn = Array.from(container!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Submit Escalation Review')
    );
    expect(submitBtn?.hasAttribute('disabled')).toBe(false);

    act(() => {
      submitBtn!.click();
    });

    // 4. Verify UI updates: success message displayed, review note rendered, "Review Recorded" badge visible
    expect(container?.textContent).toContain(
      'Escalation review recorded successfully and added to case audit history.'
    );
    expect(container?.textContent).toContain('Review Recorded');
    expect(container?.textContent).toContain('Latest Admin Action');
    expect(container?.textContent).toContain(
      'Dispatched emergency plumbing crew and alerted IT operations.'
    );
    expect(container?.textContent).toContain(`Reviewed by ${adminSession.fullName}`);

    // 5. Verify persistence in localStorage & audit trail (SCMS-82)
    const auditEvents = getAdminAuditEvents('CMP-2026-042');
    expect(auditEvents.length).toBe(1);
    const event = auditEvents[0];
    expect(event.action).toBe('ESCALATION_REVIEWED');
    expect(event.actor.name).toBe(adminSession.fullName);
    expect(event.actor.email).toBe(adminSession.email);
    expect(event.actor.role).toBe('admin');
    expect(event.previousValue).toBe('Escalated');
    expect(event.newValue).toBe('Reviewed');
    expect(event.details).toBe(
      'Dispatched emergency plumbing crew and alerted IT operations.'
    );

    // 6. Verify timeline updates in storage
    const storedUpdates: ComplaintUpdate[] = JSON.parse(
      window.localStorage.getItem(UPDATES_KEY)!
    );
    const recordedUpdate = storedUpdates.find((u) =>
      u.message.includes('Dispatched emergency plumbing crew')
    );
    expect(recordedUpdate).toBeDefined();
    expect(recordedUpdate?.author).toBe(adminSession.fullName);
  });

  it('rejects review if actor is not an administrator', () => {
    const userAuth: AuthContextValue = {
      ...authValue,
      session: {
        email: 'student@university.edu',
        fullName: 'Student User',
        role: 'user',
      },
    };

    renderPage(userAuth);

    const reviewBtn = Array.from(container!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Review Escalation')
    );
    act(() => {
      reviewBtn!.click();
    });

    const textarea = container!.querySelector('textarea') as HTMLTextAreaElement;
    act(() => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      )?.set;
      nativeInputValueSetter?.call(textarea, 'Attempting review as normal user');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const submitBtn = Array.from(container!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Submit Escalation Review')
    );
    act(() => {
      submitBtn!.click();
    });

    expect(container?.textContent).toContain(
      'Unauthorized. Administrator credentials are required to review escalations.'
    );
    expect(getAdminAuditEvents('CMP-2026-042').length).toBe(0);
  });
});
