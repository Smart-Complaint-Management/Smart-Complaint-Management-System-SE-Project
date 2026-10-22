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

export interface Complaint {
  id: string;
  subject: string;
  description: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  submittedBy: string;
  assignedTo: string | null;
  submittedAt: string; // ISO date
  updatedAt: string; // ISO date
  isEscalated: boolean;
  possibleDuplicateId: string | null;
}

export interface ComplaintUpdate {
  id: string;
  complaintId: string;
  status: ComplaintStatus;
  message: string;
  author: string;
  timestamp: string; // ISO date
}

export type NotificationType = 'status_update' | 'assignment' | 'escalation' | 'resolution';

export interface AppNotification {
  id: string;
  complaintId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  timestamp: string; // ISO date
}

export type UserRole = 'user' | 'admin';

export interface CurrentUser {
  name: string;
  role: UserRole;
  email: string;
}
