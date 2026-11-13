
# Smart Complaint Management System (SCMS)
### Software Engineering Final Project

## Team Members

| Name | SRN |
|------|-----|
| Shasank S K | PESU2G24CS460 |
| Shreya Shenoy | PES2UG24CS487 |
| Sanjan M | PES2UG24CS442 |
| Samartha M S | PES2UG24CS435 |

---

## 1. Project Overview

The **Smart Complaint Management System (SCMS)** is a web-based application designed to provide a centralized platform for registering, categorizing, tracking, managing, escalating, and resolving complaints.

The system enables registered users to submit complaints, monitor their progress, receive relevant updates, and escalate unresolved issues. Administrators can manage complaints, update their statuses, assign them to appropriate departments, review escalations, and access complaint-related reports and analytics.

The system incorporates smart capabilities such as automatic complaint priority classification and duplicate complaint detection to improve complaint management efficiency.

SCMS is developed as an academic Software Engineering prototype and is not intended to replace or directly integrate with existing government or municipal complaint management platforms.

## 2. Objectives

The primary objectives of SCMS are:

- Provide a centralized platform for complaint registration and management.
- Allow users to submit complaints with relevant descriptions and categories.
- Automatically suggest complaint priority based on complaint information.
- Identify potentially duplicate complaints for administrative review.
- Enable users to track complaint status and progress.
- Allow users to escalate complaints when appropriate action has not been received.
- Enable administrators to manage complaints and update their statuses.
- Support complaint assignment to appropriate departments.
- Implement role-based access control.
- Provide search and filtering functionality.
- Provide administrative dashboards, reports, and analytics.
- Maintain structured complaint records and support efficient complaint handling.

## 3. Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | React, TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| UI Icons | Lucide React |
| Routing | React Router |
| State Management | React Hooks |
| Backend | Python, Flask |
| Database | MySQL |
| Authentication | Flask authentication endpoints, session-based frontend context |
| Testing | Vitest, React Testing Library |
| Version Control | Git, GitHub |
| Frontend Hosting | Vercel |
| Backend Hosting Configuration | Gunicorn-compatible Flask application |
| CI/CD | GitHub Actions |

### Frontend

The frontend is developed using React and TypeScript with Vite as the build tool.

It provides separate interfaces for users and administrators.

Major frontend technologies and libraries include:

- **React:** Component-based user interface development.
- **TypeScript:** Static typing for improved code reliability.
- **Vite:** Frontend development server and production build generation.
- **Tailwind CSS:** Responsive styling and UI design.
- **React Router:** Client-side navigation and routing.
- **Lucide React:** Icons and interface elements.
- **React Hooks:** State management and component lifecycle handling.

The frontend is organized into reusable components, pages, services, authentication context, data models, and validation utilities.

### Backend

The backend is implemented using Python and Flask.

It handles:

- HTTP requests and responses.
- Authentication endpoints.
- User-related operations.
- Complaint-related API endpoints.
- Complaint status updates.
- Escalation-related operations.
- Database connectivity.
- CORS configuration.

The Flask application is configured to support production execution through Gunicorn.

### Database

MySQL is selected as the relational database management system.

The database design supports structured storage of:

- User information.
- Complaint information.
- Complaint categories.
- Complaint priorities.
- Complaint statuses.
- Complaint assignments.
- Escalation information.
- Notification-related information.
- Complaint history and related records.

Database connectivity is configured through environment variables rather than hardcoded credentials.

## 4. User Roles

SCMS currently defines two primary roles.

### User

Users can:

- Register and log in.
- Submit new complaints.
- Select complaint categories.
- View their submitted complaints.
- Track complaint status and progress.
- View complaint details and timelines.
- Request escalation for eligible complaints.
- Search and filter complaints they are authorized to access.

### Administrator

Administrators can:

- Log in to the administrative interface.
- View and manage complaints.
- Update complaint statuses.
- Assign complaints to appropriate departments where supported.
- Review escalated complaints.
- View automatically suggested complaint priorities.
- Override priorities for supported demo complaints.
- Review potentially duplicate complaints.
- Search and filter complaints.
- Access the administrative dashboard.
- View reports and analytics.

Only authorized administrators can access administrative management operations.

## 5. Functional Requirements

The system covers the following major functional requirements:

1. User Registration and Login
2. Complaint Registration
3. Complaint Categorization
4. Complaint Tracking and Notifications
5. Complaint Assignment
6. Complaint Escalation
7. Smart Complaint Classification
8. Duplicate Complaint Detection
9. Complaint Status Updates
10. Administrator Dashboard
11. Reports and Analytics
12. Role-Based Access Control
13. Search and Filtering

## 6. Smart Features

### 6.1 Smart Complaint Classification

SCMS implements a rule-based priority classification mechanism.

The classification considers the complaint subject, description, and category.

The system identifies keywords and predefined conditions to suggest one of four priority levels:

| Priority | Description |
|----------|-------------|
| Critical | Immediate safety risks or serious threats |
| High | Urgent incidents requiring prompt attention |
| Medium | Issues affecting normal activities |
| Low | Minor issues, suggestions, and general requests |

Examples of classification conditions include:

- Critical: Fire, explosion, immediate danger, severe injury.
- High: Urgent issues, harassment, security breaches, power outages.
- Medium: General complaints affecting normal activities.
- Low: Suggestions, minor improvements, and feedback.

The suggested priority is displayed dynamically while the user enters complaint information.

Administrators can review the suggested priority and override it for supported demo complaints.

**Note:** This is a transparent rule-based heuristic and not a trained machine learning model.

### 6.2 Duplicate Complaint Detection

The system incorporates duplicate complaint detection to identify complaints that may refer to the same underlying issue.

Potentially related complaints are identified and presented to administrators for review.

Administrators can:

- Confirm a suspected duplicate.
- Mark a suspected duplicate as not a duplicate.
- Review the linked complaint.

The system does not automatically delete or merge complaints simply because they are identified as potential duplicates.

Each complaint remains an individual submission.

## 7. Complaint Management Workflow

The general complaint management workflow is:

```text
User Registration / Login
          |
          v
  Complaint Registration
          |
          v
   Complaint Categorization
          |
          v
 Smart Priority Classification
          |
          v
 Duplicate Complaint Detection
          |
          v
  Complaint Management
          |
          v
   Administrative Review
          |
          v
  Complaint Status Updates
          |
          v
 User Tracking and Notifications
          |
          v
   Complaint Escalation
          |
          v
 Further Administrative Action
          |
          v
       Resolution
```

## 8. Frontend Architecture

The frontend follows a modular structure to separate application pages, reusable components, authentication, API communication, and business logic.

Important frontend modules include:

### Pages

- Authentication pages.
- User complaint registration page.
- Complaint listing page.
- Complaint details page.
- Administrator complaint management pages.
- Administrative dashboard pages.

### Components

Reusable interface components include:

- PageHeader
- StatusBadge
- PriorityBadge
- ComplaintTimeline
- EmptyState

These components help maintain a consistent interface across different application pages.

### Services

The service layer separates API communication and complaint-related business logic from the UI.

Important service modules include:

- `api.ts` – API configuration, complaint service integration, and data mode selection.
- `authApi.ts` – Authentication and complaint-related API requests.
- `complaintService.ts` – Complaint management operations, status handling, priority management, and duplicate review.
- `dataMigrationService.ts` – Data migration-related functionality.
- `validateComplaint.ts` – Complaint form validation.

### Authentication Context

The authentication context manages the current user session and makes authentication information available across application components.

It supports role-based interface rendering and access-related checks.

## 9. Backend API and Configuration

The Flask backend provides the application server and database connectivity.

The application includes endpoints for:

- User authentication.
- Current user/session verification.
- Complaint creation.
- Complaint listing and retrieval.
- Complaint status updates.
- Escalation submission and review.
- Notification retrieval.
- Database health checking.

The frontend uses a configurable API base URL.

The application also supports CORS configuration to allow communication between the deployed frontend and backend origins.

### Environment Variables

#### Frontend

The frontend uses:

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Backend API origin |
| `VITE_USE_REAL_API` | Controls real API mode where configured |

Example local configuration:

```env
VITE_API_BASE_URL=http://localhost:5000
```

Vite environment variables are embedded into the client-side production build. Sensitive credentials must never be stored in `VITE_*` variables.

#### Backend

The Flask backend reads the following environment variables:

| Variable | Purpose |
|----------|---------|
| `DB_HOST` | MySQL hostname |
| `DB_PORT` | MySQL port |
| `DB_NAME` | Database name |
| `DB_USER` | Database username |
| `DB_PASSWORD` | Database password |
| `CORS_ALLOWED_ORIGINS` | Permitted frontend origins |
| `PORT` | Backend application port |

Actual credentials must be configured through the hosting provider's environment settings.

## 10. Data Management and Current Integration Status

SCMS contains both frontend demo workflows and backend API/database integration code.

The frontend supports mock/demo complaint workflows through its service layer. These workflows allow the application interface and complaint management features to be demonstrated without requiring every feature to be connected to a live database.

The application also contains real API integration paths for authentication and supported complaint operations.

The following limitations apply to the current academic prototype:

- `USE_REAL_API` is disabled in the current frontend complaint service configuration.
- Complaint submission through the mock mode uses browser-side demo storage.
- Demo complaint status and priority changes are stored in browser storage.
- Duplicate review and certain administrative operations are supported only for demo complaints.
- Complaint assignment persistence is not fully implemented.
- A managed production MySQL service and complete end-to-end production integration have not been verified.

Therefore, a successful demo complaint submission must not be interpreted as confirmation that the complaint has been inserted into the production MySQL database.

## 11. Testing

Testing is performed to verify the reliability and expected behaviour of the application's individual modules.

### Testing Technologies

- Vitest
- React Testing Library
- JavaScript/TypeScript test environment
- jsdom

### Testing Areas

The project includes tests covering:

- Authentication and access control.
- Complaint registration and validation.
- Complaint categorization.
- Complaint priority classification.
- Complaint status management.
- Duplicate complaint review.
- Complaint data migration.
- Administrative functionality.
- User interface behaviour.
- Service-layer operations.

### Test Execution

From the frontend directory:

```bash
npm install
npm test
```

To run tests in watch mode:

```bash
npm run test:watch
```

To generate a test coverage report, if the coverage script and provider are configured:

```bash
npm run test:coverage
```

Testing is an ongoing process, and the results depend on the current implementation and test configuration.

## 12. Version Control and CI/CD

Git and GitHub are used for source code management and collaborative development.

The project uses GitHub Actions for continuous integration and frontend deployment automation.

### Continuous Integration (CI)

The CI workflow validates the project before deployment.

It is responsible for running the configured checks and ensuring that the frontend build is successful.

### Continuous Deployment (CD)

The CD workflow is configured to deploy the frontend to Vercel after the existing CI workflow succeeds for a push to the `main` branch.

Manual deployment runs are restricted to `main` and verify that the corresponding commit has a successful CI run.

The deployment workflow uses GitHub repository secrets for Vercel authentication.

Required secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Deployment credentials are not stored directly in the repository.

## 13. Deployment Architecture

The current deployment architecture is designed around a separately hosted frontend and backend.

| Layer | Platform / Technology |
|-------|------------------------|
| Frontend Hosting | Vercel |
| Frontend Build | Vite |
| Backend Framework | Python Flask |
| Production Server Configuration | Gunicorn |
| Database | MySQL |
| Source Code Management | GitHub |
| Automated Deployment | GitHub Actions |

### Frontend Deployment

The frontend is configured for Vercel hosting.

The production build generates static files in:

```text
frontend/dist
```

The frontend includes SPA route fallback configuration through:

```text
frontend/vercel.json
```

### Backend Deployment

The Flask backend is configured for production execution using Gunicorn.

Example production command:

```bash
gunicorn app:app --bind 0.0.0.0:$PORT
```

A separate backend hosting service and managed MySQL instance must be provisioned and configured before claiming a fully operational production deployment.

### Current Deployment Link

**SCMS Frontend:**

https://smart-complaint-management-system-s.vercel.app/

The repository also contains deployment configuration for the frontend's Vercel deployment through GitHub Actions.

## 14. Local Installation and Setup

### Prerequisites

Install the following:

- Node.js
- npm
- Python 3
- pip
- MySQL Server
- Git

### Step 1: Clone the Repository

```bash
git clone https://github.com/SSK1703/Smart-Complaint-Management-System.git
```

```bash
cd Smart-Complaint-Management-System
```

### Step 2: Configure the Frontend

```bash
cd frontend
npm install
```

Create a `.env.local` file using the provided example:

```bash
cp .env.example .env.local
```

Configure the backend URL if necessary:

```env
VITE_API_BASE_URL=http://localhost:5000
```

Start the frontend development server:

```bash
npm run dev
```

### Step 3: Configure the Backend

Open a separate terminal:

```bash
cd backend
```

Create a Python virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```bash
venv\Scripts\activate
```

Install the required dependencies:

```bash
pip install -r requirements.txt
```

Install production dependencies when required:

```bash
pip install -r production-requirements.txt
```

Create a `.env` file using the provided backend environment example and configure the required database credentials.

### Step 4: Start the Backend

```bash
python app.py
```

The backend defaults to:

```text
http://localhost:5000
```

### Step 5: Database Configuration

Ensure that MySQL is running and that the required database and schema have been created.

Configure the following environment variables:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=smart_complaint_db
DB_USER=group8
DB_PASSWORD=your_password
```

Do not commit actual database credentials to GitHub.

## 15. Future Enhancements

Potential future improvements include:

- Complete production deployment of the Flask backend.
- Integration with a managed MySQL database.
- Full end-to-end complaint persistence.
- Persistent complaint assignment to departments and personnel.
- Complete notification delivery and tracking.
- Improved duplicate detection using text similarity and NLP.
- Machine learning-based complaint classification.
- Advanced complaint analytics and reporting.
- Improved administrative audit logging.
- Automated integration and end-to-end testing.
- Enhanced security and deployment monitoring.

## 16. Conclusion

The Smart Complaint Management System demonstrates the application of Software Engineering principles in developing a centralized complaint management platform.

The project incorporates modular frontend development, backend API architecture, relational database integration, authentication, role-based access control, complaint lifecycle management, priority classification, duplicate detection, automated testing, version control, and deployment automation.

The academic prototype provides a foundation for further development into a fully integrated and production-ready complaint management system.

---

**Project:** Smart Complaint Management System (SCMS)  
**Course:** Software Engineering  
**Repository:** GitHub  
**Frontend Deployment:** Vercel
