# Smart Complaint Management System (Software Engineering Final Project)

A web-based complaint management platform that enables users to register, track and escalate complaints while providing administrators with tools to manage complaint lifecycles, review escalations, monitor potential duplicates and analyse complaint data.

---

## Team Members

| Name          | SRN           |
| ------------- | ------------- |
| Shasank S K   | PESU2G24CS460 |
| Shreya Shenoy | PES2UG24CS487 |
| Sanjan M      | PES2UG24CS442 |
| Samartha M S  | PES2UG24CS435 |

---

## 1. Project Overview

The **Smart Complaint Management System (SCMS)** is a web-based application developed to provide a centralized platform for registering, categorizing, tracking, managing, escalating and resolving complaints.

The system allows registered users to lodge complaints, select appropriate categories, monitor complaint progress and receive relevant notifications. Users can also escalate complaints when they feel that sufficient attention or appropriate action has not been received.

Administrators have access to complaint management functionality, including reviewing complaints, updating their statuses, managing escalations, reviewing potentially duplicate complaints and accessing administrative information.

The system incorporates two smart capabilities:

- **Smart Complaint Classification:** Automatically suggests a complaint priority based on predefined rules and keywords.
- **Duplicate Complaint Detection:** Identifies potentially related complaints and presents them for administrator review.

The project is developed as an academic software engineering prototype. It demonstrates software development practices involving frontend and backend integration, database design, authentication, authorization, automated testing, continuous integration and deployment workflows.

It is not intended to replace or integrate with an existing government or municipal complaint management system.

---

## 2. Objectives

The main objectives are to:

- Provide a centralized complaint registration platform.
- Organize complaints using predefined categories.
- Automatically suggest complaint priorities.
- Identify potentially duplicate or related complaints.
- Allow administrators to manage complaint statuses.
- Support complaint assignment to appropriate personnel or departments.
- Allow users to track complaint progress.
- Provide relevant notifications.
- Support complaint escalation and administrative review.
- Enforce role-based access control.
- Maintain complaint history and audit-related information.
- Provide administrative search, filtering and reporting capabilities.
- Apply software engineering practices through structured development, testing and CI/CD workflows.

---

## 3. Technology Stack

The application uses the following technologies:

| Layer                                        | Technology                            |
| -------------------------------------------- | ------------------------------------- |
| Frontend framework                           | React                                 |
| Programming language (Frontend)              | TypeScript                            |
| Frontend build tool                          | Vite                                  |
| Styling                                      | Tailwind CSS                          |
| UI icons                                     | Lucide React                          |
| Backend language                             | Python                                |
| Backend framework                            | Flask                                 |
| Database                                     | MySQL                                 |
| ORM / Database interaction                   | SQLAlchemy                            |
| Authentication                               | Session-based authentication          |
| Password hashing                             | Werkzeug / password hashing utilities |
| Frontend testing                             | Vitest                                |
| Component testing                            | React Testing Library                 |
| Backend testing                              | Python unittest                       |
| Version control                              | Git and GitHub                        |
| CI/CD                                        | GitHub Actions                        |
| Frontend hosting                             | Vercel                                |
| Backend hosting (deployment experimentation) | Railway                               |

### Frontend

The frontend is developed using React and TypeScript with Vite.

It provides separate interfaces for users and administrators, including:

- User registration and login.
- Complaint registration.
- Complaint listing and tracking.
- Individual complaint details.
- Complaint progress timelines.
- Escalation requests.
- Administrator complaint management.
- Duplicate complaint review.
- Administrative escalation review.
- Search and filtering interfaces.
- Dashboard and reporting interfaces.

Tailwind CSS is used for styling, while Lucide React provides interface icons.

### Backend

The backend is implemented using Python and Flask.

It handles:

- Authentication and session management.
- Authorization and role validation.
- Complaint-related API requests.
- Complaint status management.
- Complaint history.
- Escalation submission and review.
- Notification retrieval.
- Database interaction.
- Request validation and error handling.

SQLAlchemy is used for database operations and transaction management.

### Database

MySQL is the relational database management system used in the project design and backend implementation.

The database schema includes tables for:

- Users.
- Authentication sessions.
- Complaint categories.
- Complaints.
- Complaint assignments.
- Complaint history.
- Complaint escalations.
- Escalation reviews.
- Notifications.

The schema is designed to maintain structured complaint records and support complaint lifecycle operations.

**Deployment note:** Backend API functionality and database schema implementation do not automatically establish that every frontend operation is using persistent production storage. The current frontend retains mock-data functionality for complaint workflows unless real API mode is explicitly enabled and correctly configured.

---

## 4. User Roles

The system defines two primary roles.

### User

Users can:

- Register and log in.
- Submit new complaints.
- Select complaint categories.
- View submitted complaints.
- Track complaint status and progress.
- View complaint details and history.
- Receive relevant notifications.
- Request complaint escalation.
- Search and filter complaints they are authorized to access.

### Administrator

Administrators can:

- Log in to the administrator interface.
- View and manage complaints.
- Update complaint statuses.
- Review complaint priorities.
- Override priorities where supported.
- Review potential duplicate complaints.
- Confirm or reject duplicate suggestions.
- Review escalated complaints.
- Record escalation review notes.
- Search and filter complaints.
- Access administrative dashboard and reporting functionality.

> **Note:** The project defines only two primary system roles: User and Administrator. Department Staff, Super Admin, Department Head and Moderator are not separate roles in the current project scope.

---

## 5. Functional Requirements

The application covers the following 13 major functional areas:

1. User Registration and Login
2. Complaint Registration
3. Complaint Categorization
4. Complaint Tracking and Notifications
5. Complaint Assignment
6. Complaint Escalation
7. Smart Complaint Classification
8. Duplicate Complaint Detection
9. Complaint Status Updates
10. Admin Dashboard
11. Reports and Analytics
12. Role-Based Access Control
13. Search and Filtering

---

## 6. Major System Features

### 6.1 User Registration and Authentication

- User registration and login interfaces.
- Password-based authentication.
- Password hashing on the backend.
- Session-based authentication.
- Protected API access.
- Authentication checks for restricted operations.

### 6.2 Complaint Registration

Users can submit complaints by providing:

- Complaint subject.
- Complaint category.
- Complaint description.

The frontend validates the entered information before submission.

The complaint submission flow passes the complaint details to the application service layer, which supports mock-data operation and backend API integration.

### 6.3 Complaint Categorization

Complaints are organized into predefined categories, including:

- Facilities.
- IT Infrastructure.
- Academic.
- Administrative.
- Harassment.
- Other.

This classification helps administrators organize and locate complaints efficiently.

### 6.4 Smart Complaint Classification (Priority Categorization)

The application includes a rule-based priority classification mechanism.

The classification function analyses the complaint subject and description using predefined keywords.

Four priority levels are supported:

| Priority | Description                                   |
| -------- | --------------------------------------------- |
| Critical | Immediate safety risks or serious threats     |
| High     | Urgent issues requiring prompt attention      |
| Medium   | Issues affecting normal activities            |
| Low      | Minor issues, suggestions or general requests |

Examples of keyword-based classification:

- Critical: Fire, explosion, life-threatening, emergency.
- High: Urgent, unsafe, harassment, security breach, power outage.
- Low: Suggestion, minor, cosmetic, feedback.

The suggested priority is updated dynamically as the user enters complaint details.

This is a transparent rule-based heuristic rather than a trained machine learning model. Administrators can review the suggested priority and use the available priority override functionality where supported.

### 6.5 Duplicate Complaint Detection

The system includes functionality for identifying potentially related complaints.

- Potential duplicate relationships can be associated with complaints.
- The interface displays a possible duplicate warning.
- Related complaint records can be accessed for review.
- Administrators can confirm a suspected duplicate or mark it as not a duplicate.
- Duplicate review status and reviewer information can be displayed.

The system does not automatically merge or delete complaints solely because they are identified as possible duplicates.

Each complaint remains an individual submission unless explicitly handled otherwise by an authorized administrator.

### 6.6 Complaint Tracking and Status Management

Users can view the current status of their complaints.

The supported statuses are:

- Submitted.
- Under Review.
- In Progress.
- Resolved.
- Rejected.

Administrators can update complaint statuses through the management interface.

The application also supports displaying complaint progress through a timeline containing status updates and relevant timestamps.

### 6.7 Complaint Escalation

Users can request escalation when they are dissatisfied with the progress of a complaint.

The escalation workflow includes:

1. User opens an eligible complaint.
2. User selects the escalation option.
3. User enters a reason for escalation.
4. The application validates the request.
5. The escalation request is submitted.
6. The administrator can review the escalated complaint.

The application includes checks for:

- Empty escalation reasons.
- Unauthorized requests.
- Missing complaints.
- Repeated escalation requests.
- Complaints that are no longer eligible for escalation.

### 6.8 Administrator Escalation Review

Administrators can review escalated complaints and record review notes.

The backend escalation-review functionality includes:

- Authentication verification.
- Administrator role verification.
- Review-note validation.
- Escalation existence checks.
- Database transaction handling.
- Recording the administrator review.
- Returning the updated escalation information.

### 6.9 Complaint Assignment

The system includes an administrative assignment interface intended to associate complaints with appropriate departments or personnel.

Example department options include:

- IT Support Desk.
- Facilities Maintenance.
- Registrar Office.
- Finance Office.

**Implementation limitation:** The assignment interface is present, but complete persistent assignment functionality is not yet implemented. The current frontend department-based assignment interface and the database's user-ID-based assignment schema require a consistent backend API contract.

### 6.10 Notifications and Complaint History

The system includes notification-related functionality for complaint events.

The database design supports notification records for events such as:

- Status updates.
- Escalations.
- Resolutions.

Complaint history is designed to record:

- Previous status.
- New status.
- User responsible for the change.
- Timestamp of the update.

This helps maintain traceability throughout the complaint lifecycle.

---

## 7. System Architecture

The application follows a frontend-backend architecture.

```text
                  USER / ADMIN
                       |
                       v
                WEB APPLICATION
                       |
                       v
             REACT + TYPESCRIPT
                       |
                       v
                API SERVICE LAYER
                       |
                       v
                 FLASK BACKEND
                       |
          +------------+------------+
          |            |            |
          v            v            v
     Authentication  Complaint   Escalation
      & RBAC          Management   Management
          |            |            |
          +------------+------------+
                       |
                       v
                 SQLALCHEMY
                       |
                       v
                    MYSQL
