import os

from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text

from auth import current_user, require_admin
from config import Config

app = Flask(__name__)

app.config.from_object(Config)

db = SQLAlchemy(app)


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
        response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization"
        )
        response.headers.add("Vary", "Origin")

    return response


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
    allowed_statuses = {"pending", "in_progress", "resolved", "rejected"}
    if new_status not in allowed_statuses:
        return jsonify({"error": "The requested status is not valid."}), 400

    user = current_user()
    if user is None:
        return jsonify({"error": "Authentication is required."}), 401

    try:
        with db.session.begin():
            complaint = db.session.execute(
                text(
                    "SELECT status FROM complaints "
                    "WHERE id = :complaint_id FOR UPDATE"
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
