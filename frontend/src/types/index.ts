// Shared application types for the Smart Complaint Management System.
// These types describe the data shapes the frontend expects from the future
// Flask REST API. They are used by the mock data layer and UI components alike.

export type ComplaintStatus =
  | 'submitted'
  | 'under_review'
  | 'in_progress'
  | 'resolved'
  | 'rejected';

export type ComplaintPriority = 'low' | 'medium' | 'high' | 'critical';

export type ComplaintCategory =
  | 'facilities'
  | 'it_infrastructure'
  | 'academic'
  | 'administrative'
  | 'harassment'
  | 'other';

export type DuplicateReviewStatus =
  | 'pending'
  | 'confirmed'
  | 'not_duplicate';

export interface Complaint {
  /** Stable public CMP tracking ID. */
  id: string;
  /** Integer MySQL primary key used by the existing status endpoints. */
  databaseId?: number;
  subject: string;
  description: string;
  category: ComplaintCategory | null;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  submittedBy: string;
  assignedTo?: string | null;
  submittedAt: string;
  updatedAt: string;
  isEscalated?: boolean;

  // ID of the most likely matching complaint, if one was detected.
  possibleDuplicateId?: string | null;

  // Admin review information for a suspected duplicate.
  duplicateReviewStatus?: DuplicateReviewStatus;
  duplicateReviewedBy?: string;
  duplicateReviewedAt?: string;
}

export interface ComplaintUpdate {
  id: string;
  complaintId: string;
  status: ComplaintStatus;
  message: string;
  author: string;
  timestamp: string;
}

export interface EscalationReview {
  id: number;
  note: string;
  reviewedBy: string;
  reviewedAt: string;
}

export interface ComplaintEscalation {
  id: number;
  complaintId: string;
  reason: string;
  submittedBy: string;
  submittedAt: string;
  reviews: EscalationReview[];
}

export type NotificationType =
  | 'status_update'
  | 'assignment'
  | 'escalation'
  | 'resolution';

export interface AppNotification {
  id: string;
  complaintId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
}

export type UserRole = 'user' | 'admin';

export interface CurrentUser {
  name: string;
  role: UserRole;
  email: string;
}
