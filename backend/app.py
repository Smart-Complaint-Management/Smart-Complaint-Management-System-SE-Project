import os

from flask import Flask, g, jsonify, request, session
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from werkzeug.security import check_password_hash, generate_password_hash
import secrets
import re
from datetime import datetime, timezone
from uuid import uuid4

from auth import current_user, require_admin
from config import Config

app = Flask(__name__)

app.config.from_object(Config)

db = SQLAlchemy(app)

STATUS_VALUES = {"submitted", "under_review", "in_progress", "resolved", "rejected"}
PRIORITY_VALUES = {"low", "medium", "high", "critical"}
CATEGORY_LABELS = {
    "facilities": "facilities",
    "it_infrastructure": "it_infrastructure",
    "it infrastructure": "it_infrastructure",
    "academic": "academic",
    "administrative": "administrative",
    "harassment": "harassment",
    "harassment & safety": "harassment",
    "other": "other",
}


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


@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        return "", 204


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


def complaint_json(row):
    created_at = row["created_at"]
    updated_at = row["updated_at"]
    duplicate_reviewed_at = row.get("duplicate_reviewed_at")

    submitted_at = created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at)
    changed_at = updated_at.isoformat() if hasattr(updated_at, "isoformat") else str(updated_at)

    if not submitted_at.endswith("Z") and "+" not in submitted_at:
        submitted_at += "Z"

    if not changed_at.endswith("Z") and "+" not in changed_at:
        changed_at += "Z"

    reviewed_at = None
    if duplicate_reviewed_at:
        reviewed_at = (
            duplicate_reviewed_at.isoformat()
            if hasattr(duplicate_reviewed_at, "isoformat")
            else str(duplicate_reviewed_at)
        )
        if not reviewed_at.endswith("Z") and "+" not in reviewed_at:
            reviewed_at += "Z"

    return {
        "id": row["public_id"],
        "databaseId": row["id"],
        "title": row["title"],
        "description": row["description"],
        "category": CATEGORY_LABELS.get((row["category"] or "").strip().lower()),
        "priority": row["priority"],
        "status": row["status"],
        "submittedBy": row["full_name"],
        "submittedAt": submitted_at,
        "updatedAt": changed_at,
        "isEscalated": bool(row.get("is_escalated", False)),

        # Duplicate review information
        "possibleDuplicateId": row.get("possible_duplicate_id"),
        "duplicateReviewStatus": row.get("duplicate_review_status", "pending"),
        "duplicateReviewedBy": (
            str(row["duplicate_reviewed_by"])
            if row.get("duplicate_reviewed_by") is not None
            else None
        ),
        "duplicateReviewedAt": reviewed_at,
    }

def iso_timestamp(value):
    timestamp = value.isoformat() if hasattr(value, "isoformat") else str(value)
    if " " in timestamp and "T" not in timestamp:
        timestamp = timestamp.replace(" ", "T", 1)
    if not timestamp.endswith("Z") and "+" not in timestamp:
        timestamp += "Z"
    return timestamp


def get_escalation(complaint_id):
    escalation = db.session.execute(text(
        "SELECT e.id, c.public_id, e.reason, u.full_name AS submitted_by, e.submitted_at "
        "FROM complaint_escalations e JOIN complaints c ON c.id = e.complaint_id "
        "JOIN users u ON u.id = e.user_id WHERE e.complaint_id = :complaint_id"
    ), {"complaint_id": complaint_id}).mappings().first()
    if escalation is None:
        return None
    reviews = db.session.execute(text(
        "SELECT r.id, r.note, u.full_name AS reviewed_by, r.reviewed_at "
        "FROM complaint_escalation_reviews r JOIN users u ON u.id = r.admin_user_id "
        "WHERE r.escalation_id = :escalation_id ORDER BY r.reviewed_at, r.id"
    ), {"escalation_id": escalation["id"]}).mappings().all()
    return {
        "id": escalation["id"],
        "complaintId": escalation["public_id"],
        "reason": escalation["reason"],
        "submittedBy": escalation["submitted_by"],
        "submittedAt": iso_timestamp(escalation["submitted_at"]),
        "reviews": [{
            "id": review["id"],
            "note": review["note"],
            "reviewedBy": review["reviewed_by"],
            "reviewedAt": iso_timestamp(review["reviewed_at"]),
        } for review in reviews],
    }


def complaint_updates(complaint_id):
    rows = db.session.execute(text(
        "SELECT id, old_status, new_status, changed_at "
        "FROM complaint_history WHERE complaint_id = :complaint_id "
        "ORDER BY changed_at, id"
    ), {"complaint_id": complaint_id}).mappings().all()
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
            "status": status,
            "message": (
                "Complaint registered. Awaiting triage and assignment."
                if row["old_status"] is None
                else "Complaint resolved and case closed."
                if status == "resolved"
                else f"Status changed to {status.replace('_', ' ').title()}."
            ),
            "author": "System" if row["old_status"] is None else "Administrator",
            "timestamp": timestamp,
        })
    escalation = db.session.execute(text(
        "SELECT e.id, e.reason, e.submitted_at, u.full_name AS author "
        "FROM complaint_escalations e JOIN users u ON u.id = e.user_id "
        "WHERE e.complaint_id = :complaint_id"
    ), {"complaint_id": complaint_id}).mappings().first()
    if escalation is not None:
        updates.append({
            "id": f"escalation-{escalation['id']}",
            "status": "submitted",
            "message": f"Escalation reason: {escalation['reason']}",
            "author": escalation["author"],
            "timestamp": iso_timestamp(escalation["submitted_at"]),
        })
        reviews = db.session.execute(text(
            "SELECT r.id, r.note, r.reviewed_at, u.full_name AS author "
            "FROM complaint_escalation_reviews r JOIN users u ON u.id = r.admin_user_id "
            "WHERE r.escalation_id = :escalation_id"
        ), {"escalation_id": escalation["id"]}).mappings().all()
        updates.extend({
            "id": f"escalation-review-{review['id']}",
            "status": "submitted",
            "message": f"Admin escalation review: {review['note']}",
            "author": review["author"],
            "timestamp": iso_timestamp(review["reviewed_at"]),
        } for review in reviews)
    updates.sort(key=lambda item: (item["timestamp"], item["id"]))
    return updates


@app.route("/complaints", methods=["POST"])
def create_complaint():
    user = current_user()
    if user is None:
        return jsonify({"error": "Authentication is required."}), 401
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "A JSON request is required."}), 400

    title = payload.get("title")
    description = payload.get("description")
    category = payload.get("category")
    priority = payload.get("priority")
    if not isinstance(title, str) or not title.strip():
        return jsonify({"error": "A complaint title is required.", "field": "title"}), 400
    if len(title.strip()) > 200:
        return jsonify({"error": "Title must be 200 characters or fewer.", "field": "title"}), 400
    if not isinstance(description, str) or not description.strip():
        return jsonify({"error": "A complaint description is required.", "field": "description"}), 400
    if not isinstance(category, str) or not category.strip():
        return jsonify({"error": "A complaint category is required.", "field": "category"}), 400
    if not isinstance(priority, str) or priority not in PRIORITY_VALUES:
        return jsonify({"error": "A valid complaint priority is required.", "field": "priority"}), 400

    try:
        with db.session.begin():
            category_id = db.session.execute(text(
                "SELECT id FROM complaint_categories WHERE name = :name"
            ), {"name": category}).scalar_one_or_none()
            if category_id is None:
                return jsonify({"error": "The selected category is not valid.", "field": "category"}), 400

            pending_public_id = f"TMP-{uuid4().hex}"
            result = db.session.execute(text(
                "INSERT INTO complaints "
                "(public_id, user_id, category_id, title, description, status, priority) "
                "VALUES (:public_id, :user_id, :category_id, :title, :description, 'submitted', :priority)"
            ), {
                "public_id": pending_public_id,
                "user_id": user.id,
                "category_id": category_id,
                "title": title.strip(),
                "description": description.strip(),
                "priority": priority,
            })
            complaint_id = result.lastrowid
            if db.engine.dialect.name == "sqlite":
                complaint_id = db.session.execute(text("SELECT last_insert_rowid()")).scalar_one()
            year = datetime.now(timezone.utc).year
            public_id = f"CMP-{year}-{complaint_id:06d}"
            db.session.execute(text(
                "UPDATE complaints SET public_id = :public_id WHERE id = :id"
            ), {"public_id": public_id, "id": complaint_id})
            db.session.execute(text(
                "INSERT INTO complaint_history "
                "(complaint_id, old_status, new_status, changed_by) "
                "VALUES (:complaint_id, NULL, 'submitted', :changed_by)"
            ), {"complaint_id": complaint_id, "changed_by": user.id})

            row = db.session.execute(text(
                "SELECT c.id, c.public_id, c.title, c.description, c.status, c.priority, "
                "c.created_at, c.updated_at, u.full_name, cc.name AS category, "
                "EXISTS(SELECT 1 FROM complaint_escalations e WHERE e.complaint_id = c.id) AS is_escalated "
                "FROM complaints c JOIN users u ON u.id = c.user_id "
                "LEFT JOIN complaint_categories cc ON cc.id = c.category_id WHERE c.id = :id"
            ), {"id": complaint_id}).mappings().one()
            response_body = complaint_json(row)
    except Exception:
        app.logger.exception("Complaint creation failed")
        return jsonify({"error": "Could not create complaint."}), 500

    return jsonify(response_body), 201


@app.route("/complaints", methods=["GET"])
def list_complaints():
    user = current_user()
    if user is None:
        return jsonify({"error": "Authentication is required."}), 401

    ownership_filter = "" if user.role == "admin" else "WHERE c.user_id = :user_id"
    parameters = {} if user.role == "admin" else {"user_id": user.id}

    try:
        rows = db.session.execute(text(
            "SELECT c.id, c.public_id, c.title, c.description, c.status, c.priority, "
            "c.created_at, c.updated_at, u.full_name, cc.name AS category, "
            "c.possible_duplicate_id, c.duplicate_review_status, "
            "c.duplicate_reviewed_by, c.duplicate_reviewed_at, "
            "EXISTS(SELECT 1 FROM complaint_escalations e WHERE e.complaint_id = c.id) AS is_escalated "
            "FROM complaints c JOIN users u ON u.id = c.user_id "
            "LEFT JOIN complaint_categories cc ON cc.id = c.category_id "
            f"{ownership_filter} ORDER BY c.created_at DESC, c.id DESC"
        ), parameters).mappings().all()

    except Exception:
        db.session.rollback()
        app.logger.exception("Complaint listing failed")
        return jsonify({"error": "Could not retrieve complaints."}), 500

    return jsonify({"items": [complaint_json(row) for row in rows]}), 200

@app.route("/complaints/<string:public_id>", methods=["GET"])
def get_complaint(public_id):
    user = current_user()
    if user is None:
        return jsonify({"error": "Authentication is required."}), 401
    try:
        row = db.session.execute(text(
            "SELECT c.id, c.public_id, c.user_id, c.title, c.description, c.status, c.priority, "
            "c.created_at, c.updated_at, u.full_name, cc.name AS category, "
            "EXISTS(SELECT 1 FROM complaint_escalations e WHERE e.complaint_id = c.id) AS is_escalated "
            "FROM complaints c JOIN users u ON u.id = c.user_id "
            "LEFT JOIN complaint_categories cc ON cc.id = c.category_id "
            "WHERE c.public_id = :public_id"
        ), {"public_id": public_id}).mappings().first()
        if row is None:
            return jsonify({"error": "Complaint not found."}), 404
        if user.role != "admin" and row["user_id"] != user.id:
            return jsonify({"error": "You cannot view this complaint."}), 403
        result = complaint_json(row)
        result["updates"] = complaint_updates(row["id"])
        result["escalation"] = get_escalation(row["id"])
    except Exception:
        db.session.rollback()
        app.logger.exception("Complaint retrieval failed")
        return jsonify({"error": "Could not retrieve complaint."}), 500
    return jsonify(result), 200


@app.route("/notifications", methods=["GET"])
def get_notifications():
    user = current_user()
    if user is None:
        return jsonify({"error": "Authentication is required."}), 401

    try:
        rows = db.session.execute(
            text(
                "SELECT n.id, c.public_id AS complaint_id, n.event_type, n.title, n.message, "
                "n.is_read, n.created_at FROM notifications n "
                "JOIN complaints c ON c.id = n.complaint_id WHERE n.user_id = :user_id "
                "ORDER BY n.created_at DESC, n.id DESC"
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


@app.route("/complaints/<string:public_id>/escalations", methods=["POST"])
def submit_escalation(public_id):
    user = current_user()
    if user is None:
        return jsonify({"error": "Authentication is required."}), 401
    if user.role != "user":
        return jsonify({"error": "Only complaint owners can submit escalations."}), 403
    payload = request.get_json(silent=True)
    reason = payload.get("reason") if isinstance(payload, dict) else None
    if not isinstance(reason, str) or not reason.strip():
        return jsonify({"error": "An escalation reason is required.", "field": "reason"}), 400

    try:
        with db.session.begin():
            lock_clause = " FOR UPDATE" if db.engine.dialect.name == "mysql" else ""
            complaint = db.session.execute(text(
                "SELECT id, user_id, status FROM complaints WHERE public_id = :public_id" + lock_clause
            ), {"public_id": public_id}).mappings().first()
            if complaint is None:
                return jsonify({"error": "Complaint not found."}), 404
            if complaint["user_id"] != user.id:
                return jsonify({"error": "You cannot escalate this complaint."}), 403
            if complaint["status"] in {"resolved", "rejected"}:
                return jsonify({"error": "This complaint is no longer eligible for escalation."}), 409
            exists = db.session.execute(text(
                "SELECT id FROM complaint_escalations WHERE complaint_id = :complaint_id"
            ), {"complaint_id": complaint["id"]}).scalar_one_or_none()
            if exists is not None:
                return jsonify({"error": "This complaint has already been escalated."}), 409
            result = db.session.execute(text(
                "INSERT INTO complaint_escalations (complaint_id, user_id, reason) "
                "VALUES (:complaint_id, :user_id, :reason)"
            ), {"complaint_id": complaint["id"], "user_id": user.id, "reason": reason.strip()})
            escalation_id = result.lastrowid
            if db.engine.dialect.name == "sqlite":
                escalation_id = db.session.execute(text("SELECT last_insert_rowid()")).scalar_one()
            db.session.execute(text(
                "INSERT INTO notifications (user_id, complaint_id, event_key, event_type, title, message) "
                "VALUES (:user_id, :complaint_id, :event_key, 'escalation', :title, :message)"
            ), {
                "user_id": user.id,
                "complaint_id": complaint["id"],
                "event_key": f"escalation-{escalation_id}",
                "title": "Complaint escalated",
                "message": f"Your escalation for {public_id} was submitted: {reason.strip()}",
            })
            value = get_escalation(complaint["id"])
    except Exception:
        db.session.rollback()
        app.logger.exception("Complaint escalation submission failed")
        return jsonify({"error": "Could not submit escalation."}), 500
    return jsonify({"escalation": value}), 201


@app.route("/admin/escalations", methods=["GET"])
def list_escalations():
    user = current_user()
    if user is None:
        return jsonify({"error": "Authentication is required."}), 401
    if user.role != "admin":
        return jsonify({"error": "Administrator access is required."}), 403
    try:
        complaint_ids = db.session.execute(text(
            "SELECT e.complaint_id FROM complaint_escalations e "
            "ORDER BY e.submitted_at DESC, e.id DESC"
        )).scalars().all()
        items = []
        for complaint_id in complaint_ids:
            escalation = get_escalation(complaint_id)
            complaint = db.session.execute(text(
                "SELECT c.id, c.public_id, c.title, c.description, c.status, c.priority, "
                "c.created_at, c.updated_at, u.full_name, cc.name AS category, TRUE AS is_escalated "
                "FROM complaints c JOIN users u ON u.id = c.user_id "
                "LEFT JOIN complaint_categories cc ON cc.id = c.category_id WHERE c.id = :id"
            ), {"id": complaint_id}).mappings().one()
            items.append({"escalation": escalation, "complaint": complaint_json(complaint)})
    except Exception:
        db.session.rollback()
        app.logger.exception("Escalation listing failed")
        return jsonify({"error": "Could not retrieve escalations."}), 500
    return jsonify({"items": items}), 200



@app.route("/complaints/<string:public_id>/duplicate-review", methods=["POST"])
def review_duplicate(public_id):
    user = current_user()

    if user is None:
        return jsonify({"error": "Authentication is required."}), 401

    if user.role != "admin":
        return jsonify({"error": "Administrator access is required."}), 403

    payload = request.get_json(silent=True)
    decision = payload.get("decision") if isinstance(payload, dict) else None

    if decision not in ("confirmed", "not_duplicate"):
        return jsonify({"error": "Invalid duplicate review decision."}), 400

    try:
        with db.session.begin():
            complaint = db.session.execute(
                text("""
                    SELECT id, public_id, possible_duplicate_id,
                           duplicate_review_status
                    FROM complaints
                    WHERE public_id = :public_id
                    FOR UPDATE
                """),
                {"public_id": public_id},
            ).mappings().first()

            if complaint is None:
                return jsonify({"error": "Complaint not found."}), 404

            duplicate_id = complaint["possible_duplicate_id"]

            if not duplicate_id:
                return jsonify({"error": "No possible duplicate is linked."}), 400

            duplicate = db.session.execute(
                text("""
                    SELECT id, public_id, duplicate_review_status
                    FROM complaints
                    WHERE public_id = :duplicate_id
                    FOR UPDATE
                """),
                {"duplicate_id": duplicate_id},
            ).mappings().first()

            if duplicate is None:
                return jsonify({"error": "Duplicate complaint not found."}), 404

            if (
                complaint["duplicate_review_status"] == decision
                and duplicate["duplicate_review_status"] == decision
            ):
                return jsonify({"outcome": "unchanged"}), 200

            db.session.execute(
                text("""
                    UPDATE complaints
                    SET duplicate_review_status = :decision,
                        duplicate_reviewed_by = :admin_id,
                        duplicate_reviewed_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE public_id IN (:complaint_id, :duplicate_id)
                """),
                {
                    "decision": decision,
                    "admin_id": user.id,
                    "complaint_id": public_id,
                    "duplicate_id": duplicate_id,
                },
            )

    except Exception:
        db.session.rollback()
        app.logger.exception("Duplicate review failed")
        return jsonify({"error": "Could not record duplicate review."}), 500

    return jsonify({
        "outcome": "reviewed",
        "complaintId": public_id,
        "duplicateId": duplicate_id,
        "decision": decision,
    }), 200

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

        updates = complaint_updates(complaint_id)
    except Exception:
        db.session.rollback()
        app.logger.exception("Complaint status retrieval failed")
        return jsonify({"error": "Could not retrieve complaint status."}), 500

    for update in updates:
        update["complaintId"] = str(complaint_id)

    return jsonify({"status": complaint["status"], "updates": updates}), 200


if __name__ == "__main__":
    app.run(
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "5000")),
        debug=False,
    )
