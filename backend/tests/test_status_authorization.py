import os
import unittest

os.environ.setdefault("DB_PASSWORD", "test-only-placeholder")
os.environ.setdefault("DB_USER", "test-only-user")
os.environ.setdefault("SECRET_KEY", "test-only-secret-key")
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app import app, db
from sqlalchemy import text
from werkzeug.security import generate_password_hash


class AuthenticationAndStatusIntegrationTests(unittest.TestCase):
    def setUp(self):
        app.config.update(TESTING=True, SECRET_KEY="test-only-secret-key", SESSION_COOKIE_SECURE=False)
        with app.app_context():
            db.engine.dispose()
            db.session.execute(text("""CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT, full_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user')"""))
            db.session.execute(text("""CREATE TABLE complaints (
                id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, status TEXT NOT NULL)"""))
            db.session.execute(text("""CREATE TABLE auth_sessions (
                session_id TEXT PRIMARY KEY, user_id INTEGER NOT NULL)"""))
            db.session.execute(text("""CREATE TABLE complaint_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT, complaint_id INTEGER NOT NULL,
                old_status TEXT, new_status TEXT NOT NULL, changed_by INTEGER NOT NULL)"""))
            db.session.execute(text(
                "INSERT INTO users (id, full_name, email, password_hash, role) VALUES "
                "(1, 'Test User', 'user@example.test', :hash, 'user'), "
                "(2, 'Test Admin', 'admin@example.test', :hash2, 'admin')"),
                {"hash": generate_password_hash("UserPass123"),
                 "hash2": generate_password_hash("AdminPass123")})
            db.session.execute(text("INSERT INTO complaints (id, user_id, status) VALUES (1, 1, 'submitted')"))
            db.session.commit()
        self.client = app.test_client()

    def tearDown(self):
        with app.app_context():
            db.session.remove()
            db.engine.dispose()

    def login(self, email, password):
        return self.client.post('/auth/login', json={'email': email, 'password': password})

    def status(self):
        with app.app_context():
            return db.session.execute(text('SELECT status FROM complaints WHERE id=1')).scalar()

    def test_user_login_and_invalid_password(self):
        response = self.login('user@example.test', 'UserPass123')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['user']['role'], 'user')
        self.assertNotIn('password', response.json)
        self.assertEqual(self.login('user@example.test', 'wrongpass').status_code, 401)

    def test_admin_login_and_verified_identity(self):
        self.assertEqual(self.login('admin@example.test', 'AdminPass123').status_code, 200)
        self.assertEqual(self.client.get('/auth/me').json['user']['role'], 'admin')

    def test_registration_ignores_admin_role_input(self):
        response = self.client.post('/auth/register', json={
            'fullName': 'New Person', 'email': 'new@example.test',
            'password': 'NewPass123', 'role': 'admin'})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.login('new@example.test', 'NewPass123').json['user']['role'], 'user')

    def test_logout_invalidates_session(self):
        self.login('user@example.test', 'UserPass123')
        token = self.client.get('/auth/me').json['csrfToken']
        self.assertEqual(self.client.post('/auth/logout', headers={'X-CSRF-Token': token}).status_code, 200)
        self.assertEqual(self.client.get('/auth/me').status_code, 401)

    def test_anonymous_status_update_is_401_and_unchanged(self):
        self.assertEqual(self.client.patch('/complaints/1/status', json={'status': 'resolved'}).status_code, 401)
        self.assertEqual(self.status(), 'submitted')

    def test_user_cannot_update_status_even_if_body_claims_admin(self):
        self.login('user@example.test', 'UserPass123')
        token = self.client.get('/auth/me').json['csrfToken']
        response = self.client.patch('/complaints/1/status', json={'status': 'resolved', 'role': 'admin'},
                                     headers={'X-CSRF-Token': token})
        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.status(), 'submitted')

    def test_admin_status_updates_all_canonical_values_and_history(self):
        self.login('admin@example.test', 'AdminPass123')
        token = self.client.get('/auth/me').json['csrfToken']
        for value in ('under_review', 'in_progress', 'resolved', 'rejected', 'submitted'):
            response = self.client.patch('/complaints/1/status', json={'status': value},
                                         headers={'X-CSRF-Token': token})
            self.assertEqual(response.status_code, 200, response.get_json())
            self.assertEqual(response.json['status'], value)
        self.assertEqual(self.client.patch('/complaints/1/status', json={'status': 'pending'},
                                           headers={'X-CSRF-Token': token}).status_code, 400)
        with app.app_context():
            rows = db.session.execute(text('SELECT old_status, new_status FROM complaint_history ORDER BY id')).all()
            self.assertEqual(len(rows), 5)
            self.assertEqual(rows[0], ('submitted', 'under_review'))
            self.assertEqual(rows[-1], ('rejected', 'submitted'))

    def test_missing_csrf_token_does_not_update(self):
        self.login('admin@example.test', 'AdminPass123')
        self.assertEqual(self.client.patch('/complaints/1/status', json={'status': 'resolved'}).status_code, 403)
        self.assertEqual(self.status(), 'submitted')


if __name__ == '__main__':
    unittest.main()
