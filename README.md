# Smart Complaint Management System (Software Engineering Final Project)

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
- Review and take appropriate action on escalated complaints.
- Review smart complaint priority classification.
- Review potentially duplicate complaints.
- Search and filter complaints.
- Access the administrator dashboard.
- View reports and analytics.
- Perform other administrative functions permitted by the system.

> **Note:** The current project defines only two system roles: **User** and **Administrator**. Roles such as Department Staff, Super Admin, Department Head, or Moderator are not part of the current project scope.

---

## Team Responsibilities

The testing responsibilities for the project are organized as follows:

| Role | Team Member | Responsibility |
|------|-------------|----------------|
| QA Lead | Shasank S K | Coordinates the test plan, tracks overall testing progress, and oversees security and RBAC test validation. |
| Test Engineer — Auth & Access | Shasank S K | Designs and executes test cases for user registration/login, RBAC, complaint registration, and complaint categorization. |
| Test Engineer — Lifecycle & Notifications | Shreya Shenoy | Designs and executes test cases for complaint tracking, notifications, escalation, and status updates. |
| Test Engineer — Smart Features & Search | Sanjan M | Designs and executes test cases for priority classification, duplicate complaint detection, and search/filtering, including accuracy evaluation. |
| Test Engineer — Admin & Data | Samartha M S | Designs and executes test cases for complaint assignment, admin dashboard, and reports/analytics. |
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
```

---

## Deployment

### Current deployment architecture

- **Frontend:** Vercel static hosting. The Vite production output is `frontend/dist`; `frontend/vercel.json` defines the build commands and SPA route fallback.
- **Continuous deployment:** `.github/workflows/cd.yml` deploys the frontend to Vercel after the existing `CI` workflow succeeds for a push to `main`. Manual runs are limited to `main` and verify that the same commit has a successful CI run.
- **Backend:** The Flask app is prepared to run under Gunicorn with a platform-provided `PORT`, debug mode disabled, and an explicit CORS origin allowlist. It is not included in automated deployment yet.
- **Database:** No managed MySQL service is provisioned. The checked-in schema and `/db-health` endpoint do not constitute complaint persistence: the frontend still uses mock data, and complaint APIs/models are not implemented.

Vercel's Hobby plan is free for personal projects. Check its current terms and usage limits before using it for a public or organizational production service. A Vercel project must be configured before the workflow can deploy.

### Frontend environment

`VITE_API_BASE_URL` is optional. Local development defaults to `http://localhost:5000/api`; production defaults to the same-origin `/api` path. The frontend currently uses mock data (`USE_REAL_API = false`), so setting this value alone does not connect it to Flask. Set it to the deployed API base URL only after matching API endpoints exist and the real API implementation is enabled.

For local setup, copy `frontend/.env.example` to `frontend/.env.local` and change the value if needed. Do not put secrets in `VITE_*` variables: Vite embeds them in public browser assets.

### Backend environment

The Flask app requires a MySQL password at startup and reads these variables:

| Variable | Purpose |
|---|---|
| `DB_HOST` | MySQL hostname |
| `DB_PORT` | MySQL port; defaults to `3306` |
| `DB_NAME` | Database name; defaults to `smart_complaint_db` |
| `DB_USER` | Database user; defaults to `group8` |
| `DB_PASSWORD` | Required MySQL password |
| `CORS_ALLOWED_ORIGINS` | Comma-separated exact browser origins allowed by CORS |
| `PORT` | Hosting platform port; defaults to `5000` for local runs |

Do not commit real values. Use a hosting provider's environment settings for backend values. The CORS allowlist should contain the exact Vercel origin, with no wildcard. `backend/.env.example` contains local-only examples.

### Enable frontend deployment

1. Create a Vercel account and a Vite project for this repository's `frontend/` directory. No paid Vercel plan is required for an eligible personal project.
2. Use the Vercel CLI to link the local `frontend/` directory to that project. Read the `orgId` and `projectId` from the generated `.vercel/project.json`; do not commit that file.
3. Create a Vercel access token with access limited to the project/team where possible.
4. In GitHub, open **Settings → Secrets and variables → Actions** and add these repository secrets:

   | Secret | Value |
   |---|---|
   | `VERCEL_TOKEN` | Vercel access token |
   | `VERCEL_ORG_ID` | Vercel organization/team ID from `.vercel/project.json` |
   | `VERCEL_PROJECT_ID` | Vercel project ID from `.vercel/project.json` |

5. Disable Vercel's independent Git production auto-deployment, or create a project not connected for automatic Git deployments. The GitHub workflow must be the production deployment gate so Vercel cannot publish a `main` commit before CI succeeds.
6. After this branch is merged to `main`, a successful `CI` run starts CD. A manual run is available from **Actions → CD → Run workflow**, using `main`; it also checks for a successful CI run on that exact commit.

No deployment credentials are stored in the repository. The workflow has read-only repository and Actions permissions, plus the three Vercel secrets at deploy time.

### Backend deployment status and future setup

The backend currently exposes only `/`, `/health`, and `/db-health`; the complaint, authentication, assignment, and notification APIs are not implemented. The React app does not call those routes. For that reason, this workflow does not publish a backend or claim end-to-end frontend/backend deployment.

When a real MySQL host and API contract are available, create a Render Web Service for the `backend/` directory, set the `DB_*` variables above and `CORS_ALLOWED_ORIGINS` to the Vercel origin, and use:

```bash
pip install -r requirements.txt -r production-requirements.txt
gunicorn app:app --bind 0.0.0.0:$PORT
```

Render's free web services can sleep after inactivity and take time to wake. Render does not provide a free managed MySQL service in this architecture; do not replace MySQL with Render Postgres without an explicit migration decision. Until an external MySQL database is configured, `/db-health` will report unavailable. Until complaint APIs are implemented and wired into the frontend, browser complaint data remains mock/local demo data and is not persisted by MySQL.


### Deployed app the link below:
```bash
https://smart-complaint-management-system-s.vercel.app/
```

