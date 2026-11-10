-- Persist the existing one-submission escalation workflow and append-only reviews.
-- Apply only after reviewing against a backed-up, non-production database.
USE smart_complaint_db;

CREATE TABLE IF NOT EXISTS complaint_escalations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    complaint_id INT NOT NULL UNIQUE,
    user_id INT NOT NULL,
    reason TEXT NOT NULL,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_escalations_complaint
        FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
    CONSTRAINT fk_escalations_user
        FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS complaint_escalation_reviews (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    escalation_id BIGINT NOT NULL,
    admin_user_id INT NOT NULL,
    note TEXT NOT NULL,
    reviewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_escalation_reviews_history (escalation_id, reviewed_at, id),
    CONSTRAINT fk_escalation_reviews_escalation
        FOREIGN KEY (escalation_id) REFERENCES complaint_escalations(id) ON DELETE CASCADE,
    CONSTRAINT fk_escalation_reviews_admin
        FOREIGN KEY (admin_user_id) REFERENCES users(id)
);
