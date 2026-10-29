import os
import unittest

os.environ.setdefault("DB_PASSWORD", "test-only-placeholder")

from auth import AuthenticatedUser, authorization_error_status, require_admin
from app import app
from flask import g


class StatusAuthorizationTests(unittest.TestCase):
    def test_authenticated_administrator_is_authorized(self):
        self.assertIsNone(
            authorization_error_status(
                AuthenticatedUser(id=1, role="admin"),
            ),
        )

    def test_authenticated_user_is_forbidden(self):
        self.assertEqual(
            authorization_error_status(
                AuthenticatedUser(id=1, role="user"),
            ),
            403,
        )

    def test_unauthenticated_request_is_unauthorized(self):
        self.assertEqual(authorization_error_status(None), 401)

    def test_status_route_rejects_unauthenticated_request(self):
        with app.test_client() as client:
            response = client.patch(
                "/complaints/1/status",
                json={"status": "resolved"},
            )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.get_json(),
            {"error": "Authentication is required."},
        )

    def test_protected_operation_rejects_ordinary_user(self):
        @require_admin
        def protected_operation():
            return {"ok": True}, 200

        with app.test_request_context("/complaints/1/status"):
            g.current_user = AuthenticatedUser(id=1, role="user")
            response, status = protected_operation()

        self.assertEqual(status, 403)
        self.assertEqual(response.get_json(), {
            "error": "Administrator permission is required.",
        })

    def test_protected_operation_allows_administrator(self):
        @require_admin
        def protected_operation():
            return {"ok": True}, 200

        with app.test_request_context("/complaints/1/status"):
            g.current_user = AuthenticatedUser(id=1, role="admin")
            response, status = protected_operation()

        self.assertEqual(status, 200)
        self.assertEqual(response, {"ok": True})


if __name__ == "__main__":
    unittest.main()
