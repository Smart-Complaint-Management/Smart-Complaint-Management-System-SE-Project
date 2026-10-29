import os

from flask import Flask, g, jsonify, request, session
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from werkzeug.security import check_password_hash, generate_password_hash
import secrets

from auth import current_user, require_admin
from config import Config

app = Flask(__name__)

app.config.from_object(Config)

db = SQLAlchemy(app)

STATUS_VALUES = {"submitted", "under_review", "in_progress", "resolved", "rejected"}


@app.before_request
def load_authenticated_user():
    """Resolve identity and role from the database on every request."""
    session_id = session.get("session_id")
    if not isinstance(session_id, str):
        return
    row = db.session.execute(
        text("SELECT users.id, users.role FROM users "
             "JOIN auth_sessions ON auth_sessions.user_id = users.id "
             "WHERE auth_sessions.session_id = :session_id"),
        {"session_id": session_id}
    ).mappings().first()
    db.session.commit()
    if row is None or row["role"] not in {"user", "admin"}:
        session.clear()
        return
    from auth import AuthenticatedUser
    g.current_user = AuthenticatedUser(id=row["id"], role=row["role"])


@app.before_request
def protect_cookie_mutations():
    if request.method in {"POST", "PUT", "PATCH", "DELETE"} and request.path not in {
        "/auth/login", "/auth/register"
    } and session.get("session_id") is not None:
        supplied = request.headers.get("X-CSRF-Token", "")
        expected = session.get("csrf_token", "")
        if not expected or not secrets.compare_digest(supplied, expected):
            return jsonify({"error": "CSRF validation failed."}), 403


@app.after_request
def add_cors_headers(response):
    allowed_origins = {
        origin.strip().rstrip("/")
        for origin in app.config["CORS_ALLOWED_ORIGINS"].split(",")
        if origin.strip()
    }
    origin = request.headers.get("Origin")

    if origin and origin.rstrip("/") in allowed_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization, X-CSRF-Token"
        )
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers.add("Vary", "Origin")

    return response


def public_user(row):
    return {"id": row["id"], "email": row["email"], "fullName": row["full_name"], "role": row["role"]}


@app.route("/auth/register", methods=["POST"])
def register():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "A JSON request is required."}), 400
    full_name = payload.get("fullName")
    email = payload.get("email")
    password = payload.get("password")
    if not all(isinstance(value, str) for value in (full_name, email, password)):
        return jsonify({"error": "Full name, email and password are required."}), 400
    full_name, email = full_name.strip(), email.strip().lower()
    if not full_name or len(full_name) > 100 or "@" not in email or len(email) > 255:
        return jsonify({"error": "Please provide valid registration details."}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must contain at least 8 characters."}), 400
    try:
        with db.session.begin():
            db.session.execute(text(
                "INSERT INTO users (full_name, email, password_hash, role) "
                "VALUES (:name, :email, :password_hash, 'user')"
            ), {"name": full_name, "email": email, "password_hash": generate_password_hash(password)})
    except Exception as error:
        db.session.rollback()
        if "unique" in str(error).lower() or "duplicate" in str(error).lower():
            return jsonify({"error": "An account with this email already exists."}), 409
        app.logger.exception("Registration failed")
        return jsonify({"error": "Could not create account."}), 500
    return jsonify({"created": True}), 201


@app.route("/auth/login", methods=["POST"])
def login():
    payload = request.get_json(silent=True)
    email = payload.get("email") if isinstance(payload, dict) else None
    password = payload.get("password") if isinstance(payload, dict) else None
    if not isinstance(email, str) or not isinstance(password, str):
        return jsonify({"error": "Email and password are required."}), 400
    row = db.session.execute(text(
        "SELECT id, full_name, email, password_hash, role FROM users WHERE email = :email"
    ), {"email": email.strip().lower()}).mappings().first()
    if row is None or not check_password_hash(row["password_hash"], password):
        return jsonify({"error": "Invalid email or password."}), 401
    if row["role"] not in {"user", "admin"}:
        return jsonify({"error": "This account has an unsupported role."}), 403
    session.clear()
    session.permanent = True
    session_id = secrets.token_urlsafe(48)
    db.session.commit()
    db.session.execute(text(
        "INSERT INTO auth_sessions (session_id, user_id) VALUES (:session_id, :user_id)"
    ), {"session_id": session_id, "user_id": row["id"]})
    db.session.commit()
    session["session_id"] = session_id
    session["csrf_token"] = secrets.token_urlsafe(32)
    return jsonify({"user": public_user(row), "csrfToken": session["csrf_token"]}), 200


@app.route("/auth/me", methods=["GET"])
def who_am_i():
    user = current_user()
    if user is None:
        return jsonify({"error": "Authentication is required."}), 401
    row = db.session.execute(text(
        "SELECT id, full_name, email, role FROM users WHERE id = :id"
    ), {"id": user.id}).mappings().first()
    return jsonify({"user": public_user(row), "csrfToken": session.get("csrf_token")}), 200


@app.route("/auth/logout", methods=["POST"])
def logout():
    session_id = session.get("session_id")
    if isinstance(session_id, str):
        db.session.execute(text(
            "DELETE FROM auth_sessions WHERE session_id = :session_id"
        ), {"session_id": session_id})
        db.session.commit()
    session.clear()
    return jsonify({"loggedOut": True}), 200


@app.route("/")
def home():
    return jsonify({
        "message": "Smart Complaint Management System API",
        "status": "running"
    })


@app.route("/health")
def health():
    return jsonify({
        "status": "healthy",
        "service": "SCMS Backend"
    })


@app.route("/db-health")
def database_health():
    try:
        db.session.execute(text("SELECT 1"))

        return jsonify({
            "database": "connected",
            "status": "healthy"
        }), 200

    except Exception:
        app.logger.exception("Database connection failed")

        return jsonify({
            "database": "unavailable",
            "status": "unhealthy"
        }), 503


@app.route("/complaints/<int:complaint_id>/status", methods=["PATCH"])
@require_admin
def update_complaint_status(complaint_id: int):
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or not isinstance(payload.get("status"), str):
        return jsonify({"error": "A status value is required."}), 400

    new_status = payload["status"]
    if new_status not in STATUS_VALUES:
        return jsonify({"error": "The requested status is not valid."}), 400

    user = current_user()
    if user is None:
        return jsonify({"error": "Authentication is required."}), 401

    try:
        with db.session.begin():
            lock_clause = " FOR UPDATE" if db.engine.dialect.name == "mysql" else ""
            complaint = db.session.execute(
                text(
                    "SELECT status FROM complaints "
                    "WHERE id = :complaint_id" + lock_clause
                ),
                {"complaint_id": complaint_id},
            ).mappings().first()

            if complaint is None:
                return jsonify({"error": "Complaint not found."}), 404

            old_status = complaint["status"]
            if old_status == new_status:
                return jsonify({
                    "complaint_id": complaint_id,
                    "status": new_status,
                    "changed": False,
                }), 200

            db.session.execute(
                text(
                    "UPDATE complaints SET status = :new_status "
                    "WHERE id = :complaint_id"
                ),
                {
                    "new_status": new_status,
                    "complaint_id": complaint_id,
                },
            )
            db.session.execute(
                text(
                    "INSERT INTO complaint_history "
                    "(complaint_id, old_status, new_status, changed_by) "
                    "VALUES (:complaint_id, :old_status, :new_status, :changed_by)"
                ),
                {
                    "complaint_id": complaint_id,
                    "old_status": old_status,
                    "new_status": new_status,
                    "changed_by": user.id,
                },
            )
    except Exception:
        app.logger.exception("Complaint status update failed")
        return jsonify({"error": "Could not update complaint status."}), 500

    return jsonify({
        "complaint_id": complaint_id,
        "status": new_status,
        "changed": True,
    }), 200


if __name__ == "__main__":
    app.run(
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "5000")),
        debug=False,
    )
