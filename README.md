# Smart Complaint Management System

## Team Members

| Name | SRN |
|------|-----|
| Shasank S K | PESU2G24CS460 |
| Shreya Shenoy | PES2UG24CS487 |
| Sanjan M | PES2UG24CS442 |
| Samartha M S | PES2UG24CS435 |

---

## Project Overview

The **Smart Complaint Management System** is a web-based software system designed to provide a centralized platform for registering, categorizing, tracking, managing, escalating, and resolving complaints.

The system allows registered users to lodge complaints, select appropriate complaint categories, track the progress of their submitted complaints, and receive relevant notifications. Users can also escalate their complaints when they feel that sufficient attention or appropriate action has not been received.

Authorized administrators can manage complaints, assign complaints to appropriate personnel or departments, update complaint statuses, review escalated complaints, and access reports and analytics. The system also provides search and filtering functionality to support efficient complaint management.

The system incorporates two smart capabilities:

- **Smart Complaint Classification (Priority Categorization)** – automatically determines the priority of a complaint based on the available complaint information.
- **Duplicate Complaint Detection** – identifies complaints that may refer to the same underlying issue and provides this information for administrator review.

The project is developed as an **academic prototype** and is not intended to replace or integrate with an existing government or municipal complaint management system.

---

## Objectives

The main objectives of the system are to:

- Provide users with a centralized platform for registering complaints.
- Organize complaints using predefined categories.
- Automatically determine complaint priority using smart complaint classification.
- Identify potentially duplicate or related complaints.
- Allow authorized administrators to assign complaints to appropriate personnel or departments.
- Allow users to track the progress and current status of their complaints.
- Provide relevant notifications regarding complaint-related events.
- Allow users to escalate complaints when they feel sufficient attention or appropriate action has not been received.
- Allow administrators to manage and resolve complaints efficiently.
- Provide administrators with a centralized dashboard for complaint management.
- Provide reports and analytics based on available complaint data.
- Provide search and filtering functionality for locating relevant complaints.
- Enforce role-based access to system functionality and information.
- Maintain accurate, reliable, and consistent complaint records.

---

## Technology Stack

The system uses the following technology stack:

| Component | Technology |
|-----------|------------|
| Programming Language | Python |
| Web Framework | Flask |
| Database Management System | MySQL |
| Client Platform | Web Browser |

### Backend

The backend of the system is implemented using **Python and Flask**. Flask handles application logic, browser requests and responses, authentication and authorization-related processing, complaint management, and communication with the database.

### Database

**MySQL** is used as the database management system for persistent storage of:

- User information
- Complaint information
- Complaint categories
- Complaint status
- Complaint assignments
- Escalation information
- Priority/classification information
- Duplicate complaint-related information
- Notification-related information
- Other data required for system operation

### Client

The system is accessed through a **web browser**.

Supported modern browsers include:

- Google Chrome
- Mozilla Firefox
- Microsoft Edge

---

## User Roles

The system currently defines **two primary actors/roles**:

### User

Users can:

- Register and log in.
- Lodge new complaints.
- Enter required complaint details.
- Select an appropriate complaint category.
- View their submitted complaints.
- Track complaint status and progress.
- Receive relevant notifications.
- Escalate their submitted complaints when they feel sufficient attention or appropriate action has not been received.
- Search and filter complaints they are authorized to access.

### Administrator

Authorized administrators can:

- Log in to the administrator interface.
- View and manage complaints.
- Assign complaints to appropriate personnel or departments.
- Update complaint statuses.
- Manage escalated complaints.
- Review smart complaint priority classification.
- Review potentially duplicate complaints.
- Search and filter complaints.
- Access the administrator dashboard.
- View reports and analytics.
- Perform other administrative functions permitted by the system.

> **Note:** The current project does not define separate roles such as Department Staff, Super Admin, Department Head, or Moderator.

---

## Functional Requirements

The system provides the following **13 major functional features**:

1. **User Registration and Login**
2. **Complaint Registration**
3. **Complaint Categorization**
4. **Complaint Tracking and Notifications**
5. **Complaint Assignment**
6. **Complaint Escalation**
7. **Smart Complaint Classification (Priority Categorization)**
8. **Duplicate Complaint Detection**
9. **Complaint Status Updates**
10. **Admin Dashboard**
11. **Reports and Analytics**
12. **Role-Based Access Control**
13. **Search and Filtering**

---

## Smart Features

### Smart Complaint Classification

The system automatically determines the priority of a complaint using the available complaint information.

The assigned priority helps administrators identify complaints that may require greater attention.

Authorized administrators can view the assigned priority and may update it where required.

### Duplicate Complaint Detection

The system compares relevant complaint information to identify complaints that may refer to the same underlying issue.

Potentially duplicate or related complaints are presented for administrator review.

The system does **not automatically merge or delete complaints solely because they are identified as possible duplicates**. Each complaint remains an individual submission unless explicitly handled otherwise by the authorized administrator.

---

## Complaint Management Workflow

The general complaint workflow is:

```text
User
  ↓
Registration / Login
  ↓
Complaint Registration
  ↓
Complaint Categorization
  ↓
Smart Complaint Classification
(Priority Categorization + Duplicate Detection)
  ↓
Complaint Assignment
  ↓
Complaint Processing
  ↓
Status Updates
  ↓
User Tracking & Notifications
  ↓
User Escalation (if required)
  ↓
Administrator Review / Further Action
  ↓
Resolution
