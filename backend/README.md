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