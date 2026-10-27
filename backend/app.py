from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text

from config import Config

app = Flask(__name__)

app.config.from_object(Config)

db = SQLAlchemy(app)


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


if __name__ == "__main__":
    app.run(debug=True)