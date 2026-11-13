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

`''text                  USER / ADMIN
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


## 8. Backend API Functionality

The Flask application provides backend functionality for authentication and complaint-related operations.

The implemented endpoint groups include:

| Endpoint                                     | Method | Purpose                                   |
| -------------------------------------------- | ------ | ----------------------------------------- |
| `/auth/register`                             | POST   | Register a user                           |
| `/auth/login`                                | POST   | Authenticate a user                       |
| `/auth/me`                                   | GET    | Retrieve the current authenticated user   |
| `/complaints`                                | POST   | Create a complaint                        |
| `/complaints`                                | GET    | Retrieve authorized complaints            |
| `/complaints/<id>`                           | GET    | Retrieve complaint details                |
| `/complaints/<id>/status`                    | GET    | Retrieve complaint status history         |
| `/complaints/<id>/status`                    | PATCH  | Update complaint status                   |
| `/complaints/<public_id>/escalations`        | POST   | Submit an escalation                      |
| `/admin/escalations`                         | GET    | Retrieve escalated complaints             |
| `/complaints/<public_id>/escalation-reviews` | POST   | Record an administrator escalation review |
| `/notifications`                             | GET    | Retrieve notifications                    |

Additional duplicate-review functionality is implemented in the backend.

> Endpoint availability in the backend does not imply that every frontend workflow currently uses the corresponding production API. Some complaint workflows continue to use mock data depending on the frontend configuration.

---

## 9. Security and Authorization

Security-related implementation includes:

- Password hashing.
- Session-based authentication.
- Protected API endpoints.
- Role-based authorization.
- Administrator-only operations.
- Complaint ownership validation.
- Request validation.
- Restricted access to complaint management operations.
- Transaction rollback on failed database operations.
- Credential and environment-variable separation.

The backend checks authentication and authorization before allowing restricted operations.

For cross-origin frontend-backend communication, the application uses explicit CORS origin configuration and credential-aware requests.

Production session cookies are configured with HTTP-only, Secure and SameSite settings appropriate for cross-origin authentication.

---

## 10. Testing and Quality Assurance

Testing is an important part of the project development process.

The project uses:

| Testing Area                  | Tool                  |
| ----------------------------- | --------------------- |
| Frontend unit tests           | Vitest                |
| React component tests         | React Testing Library |
| Backend unit tests            | Python unittest       |
| Type checking                 | TypeScript compiler   |
| Code quality                  | ESLint                |
| Production build verification | Vite                  |

### Frontend Testing

Frontend tests cover application components and service-level functionality.

Testing areas include:

- Authentication and access.
- Complaint registration.
- Complaint management.
- Complaint status updates.
- Escalation workflows.
- Administrator functionality.
- Duplicate review.
- Data migration and service behaviour.

### Backend Testing

Backend unit tests cover:

- Authentication.
- Authorization.
- Complaint ownership.
- Complaint status operations.
- Escalation functionality.
- Escalation review.
- Invalid requests.
- Unauthorized access.
- Error handling.

The backend tests use a test database environment to validate application behaviour without relying on production complaint data.

### Latest Reported Verification

| Verification                         | Result               |
| ------------------------------------ | -------------------- |
| Frontend test files                  | 18 passed            |
| Frontend test cases                  | 155 passed           |
| Targeted backend authorization tests | 33 passed            |
| Full backend unittest suite          | Passed               |
| TypeScript type-check                | Passed               |
| Production build                     | Passed               |
| ESLint                               | 0 errors, 3 warnings |

These results reflect the latest reported local verification run and may change as additional modifications are made.

---

## 11. Software Engineering Practices

The project follows a structured software engineering development process.

### Version Control

Git and GitHub are used for:

- Source code management.
- Tracking changes.
- Maintaining project history.
- Collaborative development.
- Committing and pushing implementation changes.

### Sprint Management

GitHub Projects is used to organize and track sprint work.

The team uses project issues and task status to monitor:

- Pending tasks.
- In-progress tasks.
- Completed tasks.
- Sprint progress.
- Individual task allocation.

GitHub Projects Insights is also used to visualize sprint progress and team workload.

### Continuous Integration

GitHub Actions is used to automate the project's CI workflow.

The CI process validates changes before they proceed through the deployment workflow.

### Continuous Deployment

The project includes a GitHub Actions CD workflow at:

`.github/workflows/cd.yml`

The frontend deployment workflow:

1. Runs after a successful CI workflow for a push to `main`.
2. Uses the configured Vercel deployment credentials.
3. Deploys the frontend to Vercel.
4. Supports manual workflow execution from the `main` branch.
5. Checks for a successful CI run on the same commit before deployment.

The workflow uses repository secrets rather than storing deployment credentials in source code.

The backend is not part of this automated Vercel deployment workflow.

---

## 12. Deployment Architecture

### Frontend Deployment

The frontend is designed for deployment through Vercel.

- Framework: Vite.
- Production build output: `frontend/dist`.
- Hosting: Vercel.
- SPA routing: Configured using `frontend/vercel.json`.
- Deployment automation: GitHub Actions.

**Deployed frontend:**

[https://smart-complaint-management-system-s.vercel.app/](https://smart-complaint-management-system-s.vercel.app/)

### Backend Deployment

The backend is implemented using Flask and prepared for production execution using Gunicorn.

The application supports a hosting-platform-provided `PORT` and is intended to run with debug mode disabled.

A Railway deployment was also used for backend deployment and connectivity troubleshooting.

However, the backend's successful availability and the persistence of every complaint operation must be verified independently.

### Database Deployment

MySQL is the relational database used by the application.

The backend reads its database configuration from environment variables.

The project includes a database schema and database health-check functionality.

A successful database health check only establishes database connectivity; it does not prove that every complaint operation is being persisted correctly.

Production complaint persistence must be verified by submitting a new complaint through the real API and checking the corresponding MySQL records.

### Environment Configuration

#### Frontend Environment Variables

| Variable            | Purpose                                         |
| ------------------- | ----------------------------------------------- |
| `VITE_API_BASE_URL` | Backend API origin                              |
| `VITE_USE_REAL_API` | Enables real complaint API mode where supported |

For local development, the frontend defaults to:

``
VITE_API_BASE_URL=http://localhost:5000
## 9. Security and Authorization

The Smart Complaint Management System implements authentication and role-based authorization to protect user data and restrict access to sensitive operations.

### Security Features

- **Password Hashing:** User passwords are securely hashed before being stored in the database.
- **Session-Based Authentication:** Authenticated sessions are used to maintain user login state.
- **Role-Based Access Control (RBAC):** Access permissions are determined by the user's assigned role.
- **Protected API Routes:** Sensitive backend endpoints require authentication.
- **Input Validation:** User inputs are validated before processing to reduce invalid or malicious requests.
- **Administrative Authorization:** Administrative operations are restricted to authorized administrators.

### User Roles

| Role | Permissions |
|------|-------------|
| Student | Submit complaints, view complaint status, receive notifications, and access personal complaint records. |
| Administrator | View and manage complaints, review escalations, update complaint statuses, and access administrative features. |

---

## 10. Testing and Quality Assurance

Testing was performed to verify the correctness, reliability, and expected behavior of the application.

### Frontend Testing

The frontend uses **Vitest** and **React Testing Library** for component-level and service-level testing.

Testing covers:

- Authentication and login workflows.
- Complaint submission and validation.
- Complaint status management.
- Duplicate complaint review.
- Escalation workflows.
- Notification functionality.
- Administrative operations.
- API service behavior and error handling.

### Backend Testing

The backend uses Python's `unittest` framework to verify API and business logic.

Testing covers:

- Authentication and authorization.
- Complaint creation and retrieval.
- Complaint status updates.
- Role-based access restrictions.
- Escalation management.
- Invalid request handling.
- API response validation.

### Quality Checks

The following checks are used during development:

- Frontend unit and component tests.
- Backend unit and API tests.
- TypeScript type checking.
- ESLint code-quality checks.
- Production build verification.
- GitHub Actions automated testing.

---

## 11. Software Engineering Practices

The project follows standard software engineering practices throughout its development lifecycle.

### Development Methodology

The team followed an iterative development approach in which features were implemented, tested, reviewed, and integrated incrementally.

### Version Control

- Git was used for source-code version control.
- GitHub was used for repository hosting and team collaboration.
- Changes were tracked through commits.
- The project was maintained in a shared repository.

### Code Organization

The application follows a modular structure:

- Frontend components are separated from application pages and services.
- Backend routes and business logic are organized independently.
- Database operations are separated from presentation logic.
- Reusable components and utilities reduce code duplication.

### Continuous Integration

GitHub Actions is used to automate development checks and improve code reliability.

The CI workflow includes:

- Dependency installation.
- Frontend testing.
- Backend testing.
- Type checking.
- Build verification.

### Documentation

Project documentation includes:

- System architecture.
- API functionality.
- Installation instructions.
- Testing information.
- Team responsibilities.
- Current limitations and future enhancements.

---

## 12. Deployment Architecture

The application follows a frontend-backend deployment architecture.

### Deployment Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | React, TypeScript, Vite | User interface and client-side functionality |
| Backend | Python, Flask | REST API and business logic |
| Database | MySQL | Persistent relational data storage |
| Frontend Hosting | Vercel | Frontend deployment |
| Backend Hosting | Railway | Backend deployment |
| Version Control | GitHub | Source-code management |
| CI/CD | GitHub Actions | Automated testing and build checks |

### Application Workflow

1. Users access the application through the deployed frontend.
2. The frontend communicates with the backend through REST API requests.
3. The backend performs authentication, validation, and business logic processing.
4. Database operations are performed through the backend.
5. The backend returns responses to the frontend.
6. The frontend updates the interface based on the received responses.

### Deployment Links

- **Frontend:** https://smart-complaint-management-system-s.vercel.app/
- **GitHub Repository:** https://github.com/Smart-Complaint-Management/Smart-Complaint-Management-System-SE-Project

---

## 13. Local Installation and Setup

Follow the instructions below to run the project locally.

### Prerequisites

Ensure that the following software is installed:

- Node.js and npm
- Python 3.10 or later
- MySQL Server
- Git
- Visual Studio Code (recommended)

### Step 1: Clone the Repository

```bash
git clone https://github.com/Smart-Complaint-Management/Smart-Complaint-Management-System-SE-Project.git
```

Navigate to the project directory:

```bash
cd Smart-Complaint-Management-System-SE-Project
```

### Step 2: Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate the virtual environment.

**Windows:**

```bash
venv\Scripts\activate
```

**Linux/macOS:**

```bash
source venv/bin/activate
```

Install the required Python dependencies:

```bash
pip install -r requirements.txt
```

Configure the required environment variables in the backend environment file.

Example configuration:

```env
DATABASE_URL=mysql+pymysql://username:password@localhost/database_name
SECRET_KEY=your_secret_key
```

Ensure that the MySQL database is created and configured before starting the backend.

Start the Flask backend using the project's configured entry point.

### Step 3: Frontend Setup

Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install the Node.js dependencies:

```bash
npm install
```

Configure the frontend environment variables as required.

Start the development server:

```bash
npm run dev
```

### Step 4: Access the Application

Open the frontend development URL displayed in the terminal, usually:

```text
http://localhost:5173
```

The backend API should also be running at its configured local address.

**Note:** Ensure that the frontend API configuration points to the correct backend URL and that the database connection details are valid.

---

## 14. Individual Team Responsibilities

The project was developed collaboratively by four team members, with responsibilities divided across different modules.

| Team Member | SRN | Responsibility |
|-------------|-----|----------------|
| Shasank S K | PESU2G24CS460 | QA Lead, Authentication and Access Control |
| Shreya Shenoy | PES2UG24CS487 | Complaint Lifecycle and Notifications |
| Sanjan M | PES2UG24CS442 | Smart Features, Search and Duplicate Detection |
| Samartha M S | PES2UG24CS435 | Administration and Data Management |

### Responsibility Overview

**Shasank S K – QA Lead, Authentication and Access Control**
- Authentication and user access management.
- Role-based authorization.
- Quality assurance and testing coordination.
- Integration and verification of application functionality.

**Shreya Shenoy – Complaint Lifecycle and Notifications**
- Complaint lifecycle management.
- Complaint status tracking.
- Notification functionality.
- Related frontend and backend integration.

**Sanjan M – Smart Features, Search and Duplicate Detection**
- Smart complaint-related functionality.
- Complaint search and filtering.
- Duplicate complaint detection and review.
- Related application workflows.

**Samartha M S – Administration and Data Management**
- Administrative functionality.
- Complaint and user data management.
- Database-related operations.
- Administrative dashboard features.

---

## 15. Current Implementation Status and Limitations

The Smart Complaint Management System implements the major workflows required for complaint submission, tracking, management, and administrative review.

### Implemented Features

- User authentication and role-based access.
- Complaint submission and validation.
- Complaint listing and status tracking.
- Complaint lifecycle management.
- Priority classification using rule-based logic.
- Complaint search and filtering.
- Duplicate complaint review workflow.
- Escalation management interface.
- Notification functionality.
- Administrative dashboard.
- Frontend and backend testing.
- Automated CI checks.

### Current Limitations

- The priority classification mechanism is rule-based and does not currently use a trained machine learning model.
- Some workflows support mock-data mode when real backend API functionality is unavailable.
- End-to-end persistence and integration of every frontend workflow with the deployed database require further verification.
- Certain administrative operations, including complete complaint assignment workflows, require additional backend integration.
- Duplicate review and escalation workflows may have differences between their demonstration and fully integrated backend implementations.
- The system currently focuses on institutional complaint management and does not include integrations with external university platforms.

---

## 16. Future Enhancements

The system can be extended with additional functionality to improve automation, scalability, and user experience.

### Artificial Intelligence Integration

- Implement machine learning-based complaint classification.
- Introduce NLP-based complaint categorization.
- Develop sentiment analysis to identify urgent or dissatisfied users.
- Improve duplicate detection using semantic similarity.

### Advanced Complaint Management

- Implement automated complaint assignment based on department and workload.
- Introduce SLA-based resolution deadlines.
- Add automated escalation when complaints remain unresolved.
- Provide complaint resolution performance analytics.

### Notifications and Communication

- Integrate email and SMS notifications.
- Introduce real-time status updates.
- Enable communication between students and administrators.
- Provide automated reminders for pending complaints.

### Analytics and Reporting

- Develop interactive administrative analytics dashboards.
- Identify frequently reported issues.
- Analyze department-wise complaint trends.
- Generate periodic complaint resolution reports.

### Scalability and Integration

- Integrate with existing university management systems.
- Improve database optimization and API performance.
- Introduce cloud-based file storage for complaint attachments.
- Support deployment across multiple institutions.

---

## 17. Conclusion

The **Smart Complaint Management System** provides a centralized platform for managing institutional complaints through structured submission, tracking, prioritization, and administrative review.

By combining a modern frontend, REST-based backend architecture, relational database management, authentication, and role-based access control, the system aims to improve transparency and efficiency in complaint handling.

The project also incorporates software engineering practices such as modular development, version control, automated testing, continuous integration, and collaborative development.

Although certain workflows require further integration and advanced automation, the system establishes a foundation for a scalable and intelligent complaint management platform that can be enhanced with machine learning, advanced analytics, and real-time communication.

---

## Repository

**GitHub:** https://github.com/Smart-Complaint-Management/Smart-Complaint-Management-System-SE-Project

**Deployed Application:** https://smart-complaint-management-system-s.vercel.app/

