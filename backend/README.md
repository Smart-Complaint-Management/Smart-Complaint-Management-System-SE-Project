# Smart Complaint Management System — Backend

## Overview

This backend provides the Flask and MySQL foundation for the Smart Complaint Management System.

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

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Backend welcome message |
| `/health` | GET | Flask application health |
| `/db-health` | GET | MySQL connection health |
| `/complaints/<id>/status` | PATCH | Administrator-only complaint status update |

### Status update authorization

The status update route fails closed unless an authenticated server-side
identity is available in Flask's request context. It requires the identity's
role to be `admin`; a missing identity receives HTTP 401 and an authenticated
non-administrator receives HTTP 403. The current repository does not yet
provide login/session or token middleware, so no request can establish that
identity in production until the authentication work is implemented. The
route must not be changed to trust a role supplied in the request body.

When authentication is connected, it must populate `g.current_user` with an
`AuthenticatedUser` from `backend/auth.py` before the protected route runs.

## Database Tables

1. users
2. complaint_categories
3. complaints
4. complaint_assignments
5. complaint_history

## Security Notes

- Database credentials are stored in `.env`.
- `.env` is excluded from Git.
- Passwords must be securely hashed before storing them.
- The Flask development server is intended for local development only.

## Current Scope

This task establishes the backend and database foundation.

Authentication, complaint APIs, and administrative functionality will be implemented in subsequent tasks.