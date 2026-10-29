-- SCMS-55 migration. Run once against the existing smart_complaint_db.
-- Keeps existing complaint rows and history rows; only the live legacy status
-- value pending is represented as submitted after expanding the enum.
USE smart_complaint_db;

CREATE TABLE IF NOT EXISTS auth_sessions (
    session_id VARCHAR(128) PRIMARY KEY,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE users
    MODIFY role ENUM('user', 'staff', 'admin') NOT NULL DEFAULT 'user';
UPDATE users SET role = 'user' WHERE role = 'staff';
ALTER TABLE users
    MODIFY role ENUM('user', 'admin') NOT NULL DEFAULT 'user';

ALTER TABLE complaints
    MODIFY status ENUM(
        'pending', 'submitted', 'under_review', 'in_progress', 'resolved', 'rejected'
    ) NOT NULL DEFAULT 'submitted';
UPDATE complaints SET status = 'submitted' WHERE status = 'pending';
ALTER TABLE complaints
    MODIFY status ENUM(
        'submitted', 'under_review', 'in_progress', 'resolved', 'rejected'
    ) NOT NULL DEFAULT 'submitted';

-- complaint_history is intentionally unchanged: historical entries remain intact.
