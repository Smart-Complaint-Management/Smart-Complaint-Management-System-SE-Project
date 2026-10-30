import os

from flask import Flask, g, jsonify, request, session
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from werkzeug.security import check_password_hash, generate_password_hash
import secrets
import re

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
    try:
        row = db.session.execute(
            text("SELECT users.id, users.role FROM users "
                 "JOIN auth_sessions ON auth_sessions.user_id = users.id "
                 "WHERE auth_sessions.session_id = :session_id"),
            {"session_id": session_id}
        ).mappings().first()
        db.session.commit()
    except Exception:
        db.session.rollback()
        app.logger.exception("Authenticated user lookup failed")
        return jsonify({"error": "Could not verify your session."}), 503
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
    if not isinstance(full_name, str) or not full_name.strip():
        return jsonify({"error": "Full name is required.", "field": "fullName"}), 400
    if len(full_name.strip()) > 100:
        return jsonify({"error": "Full name must be 100 characters or fewer.", "field": "fullName"}), 400
    if not isinstance(email, str) or not email.strip():
        return jsonify({"error": "Email is required.", "field": "email"}), 400
    full_name, email = full_name.strip(), email.strip().lower()
    if len(email) > 255 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        return jsonify({"error": "Enter a valid email address.", "field": "email"}), 400
    if not isinstance(password, str) or not password:
        return jsonify({"error": "Password is required.", "field": "password"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must contain at least 8 characters.", "field": "password"}), 400
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        return jsonify({"error": "Password must contain a letter and a number.", "field": "password"}), 400
    try:
        with db.session.begin():
            db.session.execute(text(
                "INSERT INTO users (full_name, email, password_hash, role) "
                "VALUES (:name, :email, :password_hash, 'user')"
            ), {"name": full_name, "email": email, "password_hash": generate_password_hash(password)})
    except Exception as error:
        db.session.rollback()
        if "unique" in str(error).lower() or "duplicate" in str(error).lower():
            return jsonify({"error": "An account with this email already exists.", "field": "email"}), 409
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
    try:
        row = db.session.execute(text(
            "SELECT id, full_name, email, password_hash, role FROM users WHERE email = :email"
        ), {"email": email.strip().lower()}).mappings().first()
    except Exception:
        db.session.rollback()
        app.logger.exception("Login lookup failed")
        return jsonify({"error": "Could not sign in right now. Please try again."}), 503
    if row is None or not check_password_hash(row["password_hash"], password):
        return jsonify({"error": "Invalid email or password."}), 401
    if row["role"] not in {"user", "admin"}:
        return jsonify({"error": "This account has an unsupported role."}), 403
    session_id = secrets.token_urlsafe(48)
    try:
        db.session.execute(text(
            "INSERT INTO auth_sessions (session_id, user_id) VALUES (:session_id, :user_id)"
        ), {"session_id": session_id, "user_id": row["id"]})
        db.session.commit()
    except Exception:
        db.session.rollback()
        app.logger.exception("Login session creation failed")
        return jsonify({"error": "Could not sign in right now. Please try again."}), 503
    session.clear()
    session.permanent = True
    session["session_id"] = session_id
    session["csrf_token"] = secrets.token_urlsafe(32)
    return jsonify({"user": public_user(row), "csrfToken": session["csrf_token"]}), 200


@app.route("/auth/me", methods=["GET"])
def who_am_i():
    user = current_user()
    if user is None:
        return jsonify({"error": "Authentication is required."}), 401
    try:
        row = db.session.execute(text(
            "SELECT id, full_name, email, role FROM users WHERE id = :id"
        ), {"id": user.id}).mappings().first()
    except Exception:
        db.session.rollback()
        app.logger.exception("Authenticated user retrieval failed")
        return jsonify({"error": "Could not retrieve your account right now."}), 503
    return jsonify({"user": public_user(row), "csrfToken": session.get("csrf_token")}), 200


@app.route("/auth/logout", methods=["POST"])
def logout():
    session_id = session.get("session_id")
    if isinstance(session_id, str):
        try:
            db.session.execute(text(
                "DELETE FROM auth_sessions WHERE session_id = :session_id"
            ), {"session_id": session_id})
            db.session.commit()
        except Exception:
            db.session.rollback()
            app.logger.exception("Logout session removal failed")
            return jsonify({"error": "Could not sign out right now. Please try again."}), 503
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


@app.route("/notifications", methods=["GET"])
def get_notifications():
    user = current_user()
    if user is None:
        return jsonify({"error": "Authentication is required."}), 401

    try:
        rows = db.session.execute(
            text(
                "SELECT id, complaint_id, event_type, title, message, "
                "is_read, created_at FROM notifications "
                "WHERE user_id = :user_id "
                "ORDER BY created_at DESC, id DESC"
            ),
            {"user_id": user.id},
        ).mappings().all()
    except Exception:
        db.session.rollback()
        app.logger.exception("Notification retrieval failed")
        return jsonify({"error": "Could not retrieve notifications."}), 500

    notifications = []
    for row in rows:
        created_at = row["created_at"]
        timestamp = created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at)
        if " " in timestamp and "T" not in timestamp:
            timestamp = timestamp.replace(" ", "T", 1)
        if not timestamp.endswith("Z") and "+" not in timestamp:
            timestamp += "Z"
        notifications.append({
            "id": str(row["id"]),
            "complaintId": str(row["complaint_id"]),
            "type": row["event_type"],
            "title": row["title"],
            "message": row["message"],
            "read": bool(row["is_read"]),
            "timestamp": timestamp,
        })

    return jsonify(notifications), 200


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
                    "SELECT status, user_id FROM complaints "
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
            if old_status == "resolved":
                return jsonify({
                    "error": "A resolved complaint is closed and cannot be changed.",
                }), 409

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

            history = db.session.execute(
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
            history_id = history.lastrowid
            if db.engine.dialect.name == "sqlite":
                history_id = db.session.execute(
                    text("SELECT last_insert_rowid()")
                ).scalar_one()
            if history_id is None:
                raise RuntimeError("Could not determine the complaint history event ID.")

            history_row = db.session.execute(
                text(
                    "SELECT changed_at FROM complaint_history WHERE id = :history_id"
                ),
                {"history_id": history_id},
            ).mappings().one()

            is_resolution = new_status == "resolved"
            event_type = "resolution" if is_resolution else "status_update"
            title = "Complaint resolved" if is_resolution else f"Status update on {complaint_id}"
            message = (
                f"Your complaint {complaint_id} has been marked as resolved."
                if is_resolution
                else f"Your complaint {complaint_id} status changed to {new_status.replace('_', ' ').title()}."
            )
            db.session.execute(
                text(
                    "INSERT INTO notifications "
                    "(user_id, complaint_id, event_key, event_type, title, message) "
                    "VALUES (:user_id, :complaint_id, :event_key, :event_type, :title, :message)"
                ),
                {
                    "user_id": complaint["user_id"],
                    "complaint_id": complaint_id,
                    "event_key": f"status-history-{history_id}",
                    "event_type": event_type,
                    "title": title,
                    "message": message,
                },
            )
    except Exception:
        app.logger.exception("Complaint status update failed")
        return jsonify({"error": "Could not update complaint status."}), 500

    return jsonify({
        "complaint_id": complaint_id,
        "status": new_status,
        "changed": True,
        "update": {
            "id": str(history_id),
            "complaintId": str(complaint_id),
            "status": new_status,
            "message": (
                "Complaint resolved and case closed."
                if new_status == "resolved"
                else f"Status changed to {new_status.replace('_', ' ').title()}."
            ),
            "author": "Administrator",
            "timestamp": (
                history_row["changed_at"].isoformat()
                if hasattr(history_row["changed_at"], "isoformat")
                else str(history_row["changed_at"])
            ),
        },
    }), 200


@app.route("/complaints/<int:complaint_id>/status", methods=["GET"])
def get_complaint_status(complaint_id: int):
    user = current_user()
    if user is None:
        return jsonify({"error": "Authentication is required."}), 401

    try:
        complaint = db.session.execute(
            text("SELECT status, user_id FROM complaints WHERE id = :complaint_id"),
            {"complaint_id": complaint_id},
        ).mappings().first()
        if complaint is None:
            return jsonify({"error": "Complaint not found."}), 404
        if user.role != "admin" and complaint["user_id"] != user.id:
            return jsonify({"error": "You cannot view this complaint."}), 403

        rows = db.session.execute(
            text(
                "SELECT complaint_history.id, complaint_history.new_status, "
                "complaint_history.changed_at, users.full_name "
                "FROM complaint_history JOIN users "
                "ON users.id = complaint_history.changed_by "
                "WHERE complaint_history.complaint_id = :complaint_id "
                "ORDER BY complaint_history.changed_at, complaint_history.id"
            ),
            {"complaint_id": complaint_id},
        ).mappings().all()
    except Exception:
        db.session.rollback()
        app.logger.exception("Complaint status retrieval failed")
        return jsonify({"error": "Could not retrieve complaint status."}), 500

    updates = []
    for row in rows:
        changed_at = row["changed_at"]
        timestamp = changed_at.isoformat() if hasattr(changed_at, "isoformat") else str(changed_at)
        if " " in timestamp and "T" not in timestamp:
            timestamp = timestamp.replace(" ", "T", 1)
        if not timestamp.endswith("Z") and "+" not in timestamp:
            timestamp += "Z"
        status = row["new_status"]
        updates.append({
            "id": str(row["id"]),
            "complaintId": str(complaint_id),
            "status": status,
            "message": (
                "Complaint resolved and case closed."
                if status == "resolved"
                else f"Status changed to {status.replace('_', ' ').title()}."
            ),
            "author": row["full_name"],
            "timestamp": timestamp,
        })

    return jsonify({"status": complaint["status"], "updates": updates}), 200


if __name__ == "__main__":
    app.run(
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "5000")),
        debug=False,
    )
