# Smart Complaint Management System — Backend

## Overview

This backend provides Flask authentication, MySQL-backed complaint creation/retrieval, administrator-only status updates, and user-scoped notifications.

## Technologies Used

- Python
- Flask
- Flask-SQLAlchemy
- PyMySQL
- MySQL
- python-dotenv

## Project Structure

```text
backend/
├── app.py
├── config.py
├── requirements.txt
├── .env.example
├── .gitignore
├── database/
│   └── schema.sql
└── README.md
```

## Installation

### 1. Navigate to the backend

```bash
cd backend
```

### 2. Create a virtual environment

```bash
python -m venv venv
```

### 3. Activate the virtual environment

Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

### 4. Install dependencies

```bash
python -m pip install -r requirements.txt
```

### 5. Configure MySQL

Create a `.env` file inside the backend folder.

Use `.env.example` as a reference.

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=smart_complaint_db
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
SECRET_KEY=generate-a-long-random-secret
CORS_ALLOWED_ORIGINS=http://localhost:5173
SESSION_COOKIE_SAMESITE=Lax
SESSION_COOKIE_SECURE=false
```

Replace the placeholders with your own MySQL credentials.

### 6. Create database tables

Open MySQL Command Line Client and execute:

```sql
SOURCE path/to/backend/database/schema.sql;
```

Replace the path with the actual location of `schema.sql`.

### 7. Run the Flask application

```bash
python app.py
```

## Existing database migration

For an existing database, take a normal database backup and apply the migrations in order from the repository root. V4 assigns stable public IDs to existing complaint rows; inspect the live database and any separately issued tracking IDs for conflicts before applying it. The migration is not run by the application.

```bash
mysql -u YOUR_DB_USER -p smart_complaint_db < backend/database/migrations/V2__authentication_and_statuses.sql
mysql -u YOUR_DB_USER -p smart_complaint_db < backend/database/migrations/V3__notifications.sql
mysql -u YOUR_DB_USER -p smart_complaint_db < backend/database/migrations/V4__persistent_complaints.sql
```

The migration retains all complaint and history rows. Existing `pending` complaint records become `submitted`; old history strings remain intact. Existing `staff` accounts are mapped to the SRS `user` role before the role column is narrowed to `user` and `admin`. For a new database, use `backend/database/schema.sql` instead.

Use a unique random `SECRET_KEY` for each deployment (for example, generate one with Python's `secrets.token_urlsafe(48)`). Secure cookies default to on; for local HTTP development, set `SESSION_COOKIE_SECURE=false` in `.env`. For a frontend on a different site, configure `SESSION_COOKIE_SAMESITE=None` and `SESSION_COOKIE_SECURE=true`; list the exact frontend origin in `CORS_ALLOWED_ORIGINS`. Keep the frontend and API same-site where possible. Browser requests use credentials and a session-bound CSRF token for mutations.

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Backend welcome message |
| `/health` | GET | Flask application health |
| `/db-health` | GET | MySQL connection health |
| `/auth/register` | POST | Create a user account (role is always `user`) |
| `/auth/login` | POST | Verify credentials and issue an HttpOnly Flask session cookie |
| `/auth/me` | GET | Return the server-verified session identity and CSRF token |
| `/auth/logout` | POST | Clear the server session |
| `/complaints` | POST | Create a complaint for the authenticated account; records the initial submitted history event transactionally |
| `/complaints` | GET | List complaints owned by the user, or all complaints for an administrator |
| `/complaints/<public-id>` | GET | Retrieve complaint details and status history; owner or administrator access |
| `/complaints/<id>/status` | PATCH | Administrator-only complaint status update |
| `/notifications` | GET | Return notifications for the authenticated account |

### Status update authorization

The signed HttpOnly cookie contains an opaque session ID. Each request validates it against `auth_sessions`, then loads the current role from `users` into `g.current_user`; logout deletes the server-side session row. Passwords are Werkzeug password hashes. Public registration ignores role input. Status updates require the DB role `admin`, a valid CSRF token, one of the five canonical statuses, and transactionally append status history. The database stores numeric complaint IDs.

Each successful database status transition writes a notification for the complaint owner in the same transaction as the status and history update. A transition to `resolved` creates a `resolution` notification; other transitions create `status_update` notifications. Unchanged or failed status requests do not create notifications. `GET /notifications` requires the existing authenticated session and selects by its server-verified user ID; it accepts no recipient ID from the client.

## Database Tables

1. users
2. auth_sessions
3. complaint_categories
4. complaints
5. complaint_assignments
6. complaint_history
7. notifications

## Security Notes

- Database credentials are stored in `.env`.
- `.env` is excluded from Git.
- Passwords must be securely hashed before storing them.
- The Flask development server is intended for local development only.

## Current Scope

Complaint creation, listing, and detail retrieval are available through authenticated MySQL endpoints. Public tracking IDs use `CMP-YYYY-NNNNNN`; integer database IDs remain in place for the existing status endpoints. Local demo data remains available when `VITE_USE_REAL_API` is not enabled. Escalation and assignment persistence are not implemented; their existing frontend demo workflows continue to use browser storage. Status updates and status notifications persist only for database-backed complaints.
