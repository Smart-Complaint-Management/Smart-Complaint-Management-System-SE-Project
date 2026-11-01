import os
import unittest

os.environ.setdefault("DB_PASSWORD", "test-only-placeholder")
os.environ.setdefault("DB_USER", "test-only-user")
os.environ.setdefault("SECRET_KEY", "test-only-secret-key")
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app import app, db
from sqlalchemy import text
from werkzeug.security import generate_password_hash, check_password_hash


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
                old_status TEXT, new_status TEXT NOT NULL, changed_by INTEGER NOT NULL,
                changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)"""))
            db.session.execute(text("""CREATE TABLE notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
                complaint_id INTEGER NOT NULL, event_key TEXT UNIQUE NOT NULL,
                event_type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL,
                is_read BOOLEAN NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)"""))
            db.session.execute(text(
                "INSERT INTO users (id, full_name, email, password_hash, role) VALUES "
                "(1, 'Test User', 'user@example.test', :hash, 'user'), "
                "(2, 'Test Admin', 'admin@example.test', :hash2, 'admin')"),
                {"hash": generate_password_hash("UserPass123"),
                 "hash2": generate_password_hash("AdminPass123")})
            db.session.execute(text("INSERT INTO complaints (id, user_id, status) VALUES (1, 1, 'submitted')"))
            db.session.execute(text("INSERT INTO complaints (id, user_id, status) VALUES (2, 2, 'submitted')"))
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

    def notifications(self, user_id=None):
        with app.app_context():
            if user_id is None:
                return db.session.execute(text(
                    'SELECT user_id, complaint_id, event_type, title, message '
                    'FROM notifications ORDER BY id'
                )).all()
            return db.session.execute(text(
                'SELECT complaint_id, event_type FROM notifications '
                'WHERE user_id=:user_id ORDER BY id'
            ), {'user_id': user_id}).all()

    def test_user_login_and_invalid_password(self):
        response = self.login('user@example.test', 'UserPass123')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['user']['role'], 'user')
        self.assertNotIn('password', response.json)
        self.assertEqual(self.login('user@example.test', 'wrongpass').status_code, 401)

    def test_admin_login_and_verified_identity(self):
        self.assertEqual(self.login('admin@example.test', 'AdminPass123').status_code, 200)
        self.assertEqual(self.client.get('/auth/me').json['user']['role'], 'admin')

    def test_registration_stores_hashed_password(self):
        password = "NewPass123"

        response = self.client.post('/auth/register', json={
            'fullName': 'Hash Test User',
            'email': 'hash@example.test',
            'password': password
        })

        self.assertEqual(response.status_code, 201)

        with app.app_context():
            stored_hash = db.session.execute(
                text("SELECT password_hash FROM users WHERE email = :email"),
                {"email": "hash@example.test"}
            ).scalar_one()

        self.assertNotEqual(stored_hash, password)
        self.assertTrue(check_password_hash(stored_hash, password))
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
        self.assertEqual(self.notifications(), [])

    def test_admin_status_updates_all_canonical_values_and_history(self):
        self.login('admin@example.test', 'AdminPass123')
        token = self.client.get('/auth/me').json['csrfToken']
        for value in ('under_review', 'in_progress', 'rejected', 'submitted', 'resolved'):
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
            self.assertEqual(rows[-1], ('submitted', 'resolved'))
        notifications = self.notifications()
        self.assertEqual(len(notifications), 5)
        self.assertEqual([row[2] for row in notifications], [
            'status_update', 'status_update', 'status_update', 'status_update', 'resolution'
        ])
        self.assertTrue(all(row[0] == 1 for row in notifications))

    def test_resolution_closes_case_once_and_returns_history_update(self):
        self.login('admin@example.test', 'AdminPass123')
        token = self.client.get('/auth/me').json['csrfToken']
        response = self.client.patch('/complaints/1/status', json={'status': 'resolved'},
                                     headers={'X-CSRF-Token': token})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json['changed'])
        self.assertEqual(response.json['update']['status'], 'resolved')
        self.assertEqual(response.json['update']['complaintId'], '1')
        self.assertEqual(response.json['update']['message'], 'Complaint resolved and case closed.')

        duplicate = self.client.patch('/complaints/1/status', json={'status': 'resolved'},
                                      headers={'X-CSRF-Token': token})
        self.assertEqual(duplicate.status_code, 200)
        self.assertFalse(duplicate.json['changed'])
        self.assertNotIn('update', duplicate.json)

        reopen = self.client.patch('/complaints/1/status', json={'status': 'in_progress'},
                                   headers={'X-CSRF-Token': token})
        self.assertEqual(reopen.status_code, 409)
        self.assertEqual(self.status(), 'resolved')
        self.assertEqual(len(self.notifications()), 1)
        self.assertEqual(self.notifications()[0][2], 'resolution')
        with app.app_context():
            rows = db.session.execute(text('SELECT old_status, new_status FROM complaint_history')).all()
            self.assertEqual(rows, [('submitted', 'resolved')])

    def test_status_history_read_is_authenticated_and_owner_scoped(self):
        self.login('admin@example.test', 'AdminPass123')
        token = self.client.get('/auth/me').json['csrfToken']
        self.client.patch('/complaints/1/status', json={'status': 'resolved'},
                          headers={'X-CSRF-Token': token})

        self.client.post('/auth/logout', headers={'X-CSRF-Token': token})
        self.login('user@example.test', 'UserPass123')
        own = self.client.get('/complaints/1/status')
        self.assertEqual(own.status_code, 200)
        self.assertEqual(own.json['status'], 'resolved')
        self.assertEqual(len(own.json['updates']), 1)
        self.assertEqual(own.json['updates'][0]['status'], 'resolved')
        self.assertEqual(own.json['updates'][0]['author'], 'Test Admin')
        self.assertEqual(self.client.get('/complaints/2/status').status_code, 403)

    def test_status_history_read_requires_authentication(self):
        response = self.client.get('/complaints/1/status')
        self.assertEqual(response.status_code, 401)

    def test_status_history_for_unknown_complaint_is_404(self):
        self.login('user@example.test', 'UserPass123')
        response = self.client.get('/complaints/999/status')
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json['error'], 'Complaint not found.')

    def test_status_history_without_updates_returns_empty_list(self):
        self.login('user@example.test', 'UserPass123')
        response = self.client.get('/complaints/1/status')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, {'status': 'submitted', 'updates': []})

    def test_notifications_are_ordered_newest_first(self):
        self.login('admin@example.test', 'AdminPass123')
        with app.app_context():
            db.session.execute(text(
                "INSERT INTO notifications "
                "(id, user_id, complaint_id, event_key, event_type, title, message, created_at) "
                "VALUES (1, 2, 2, 'older', 'status_update', 'Older', 'Older event', '2025-01-01 10:00:00'), "
                "(2, 2, 2, 'newer', 'status_update', 'Newer', 'Newer event', '2025-01-02 10:00:00')"
            ))
            db.session.commit()
        response = self.client.get('/notifications')
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item['title'] for item in response.json], ['Newer', 'Older'])

    def test_malformed_status_requests_are_rejected(self):
        self.login('admin@example.test', 'AdminPass123')
        token = self.client.get('/auth/me').json['csrfToken']
        headers = {'X-CSRF-Token': token}
        malformed = [({}, 'A status value is required.'),
                     ({'status': 3}, 'A status value is required.'),
                     (None, 'A status value is required.')]
        for payload, message in malformed:
            with self.subTest(payload=payload):
                response = self.client.patch('/complaints/1/status', json=payload, headers=headers)
                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.json['error'], message)
        self.assertEqual(self.status(), 'submitted')
        self.assertEqual(self.notifications(), [])

    def test_status_update_for_nonexistent_complaint_is_404(self):
        self.login('admin@example.test', 'AdminPass123')
        token = self.client.get('/auth/me').json['csrfToken']
        response = self.client.patch('/complaints/999/status', json={'status': 'in_progress'},
                                     headers={'X-CSRF-Token': token})
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json['error'], 'Complaint not found.')
        with app.app_context():
            self.assertEqual(db.session.execute(text('SELECT COUNT(*) FROM complaint_history')).scalar(), 0)
        self.assertEqual(self.notifications(), [])

    def test_unchanged_status_does_not_create_notification_or_duplicate(self):
        self.login('admin@example.test', 'AdminPass123')
        token = self.client.get('/auth/me').json['csrfToken']
        for _ in range(2):
            response = self.client.patch('/complaints/1/status', json={'status': 'submitted'},
                                         headers={'X-CSRF-Token': token})
            self.assertEqual(response.status_code, 200)
            self.assertFalse(response.json['changed'])
        self.assertEqual(self.notifications(), [])

    def test_failed_notification_insert_rolls_back_status_and_history(self):
        self.login('admin@example.test', 'AdminPass123')
        token = self.client.get('/auth/me').json['csrfToken']
        with app.app_context():
            db.session.execute(text("""CREATE TRIGGER fail_notification_insert
                BEFORE INSERT ON notifications BEGIN
                SELECT RAISE(ABORT, 'notification insert failed'); END"""))
            db.session.commit()

        response = self.client.patch('/complaints/1/status', json={'status': 'in_progress'},
                                     headers={'X-CSRF-Token': token})
        self.assertEqual(response.status_code, 500)
        self.assertEqual(self.status(), 'submitted')
        with app.app_context():
            self.assertEqual(db.session.execute(text('SELECT COUNT(*) FROM complaint_history')).scalar(), 0)
        self.assertEqual(self.notifications(), [])

    def test_notifications_are_authenticated_and_scoped_to_current_user(self):
        self.login('admin@example.test', 'AdminPass123')
        token = self.client.get('/auth/me').json['csrfToken']
        for complaint_id, status in ((1, 'under_review'), (2, 'in_progress')):
            response = self.client.patch(f'/complaints/{complaint_id}/status',
                                         json={'status': status},
                                         headers={'X-CSRF-Token': token})
            self.assertEqual(response.status_code, 200)

        self.client.post('/auth/logout', headers={'X-CSRF-Token': token})
        self.login('user@example.test', 'UserPass123')
        own = self.client.get('/notifications?user_id=2')
        self.assertEqual(own.status_code, 200)
        self.assertEqual([item['complaintId'] for item in own.json], ['1'])
        self.assertEqual([item['type'] for item in own.json], ['status_update'])

        self.client.post('/auth/logout', headers={'X-CSRF-Token': self.client.get('/auth/me').json['csrfToken']})
        self.login('admin@example.test', 'AdminPass123')
        admin_own = self.client.get('/notifications')
        self.assertEqual(admin_own.status_code, 200)
        self.assertEqual([item['complaintId'] for item in admin_own.json], ['2'])

    def test_unauthenticated_notification_retrieval_is_rejected(self):
        response = self.client.get('/notifications')
        self.assertEqual(response.status_code, 401)
        self.assertIn('error', response.json)

    def test_missing_csrf_token_does_not_update(self):
        self.login('admin@example.test', 'AdminPass123')
        self.assertEqual(self.client.patch('/complaints/1/status', json={'status': 'resolved'}).status_code, 403)
        self.assertEqual(self.status(), 'submitted')


if __name__ == '__main__':
    unittest.main()
