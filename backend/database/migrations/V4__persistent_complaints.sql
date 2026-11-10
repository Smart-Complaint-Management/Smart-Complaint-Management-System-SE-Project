-- Persistent complaint API support.
-- Before running against an existing database, inspect any external/manual
-- tracking-ID records and resolve conflicts with the generated CMP values.
USE smart_complaint_db;

ALTER TABLE complaints
    ADD COLUMN public_id VARCHAR(32) NULL UNIQUE;

UPDATE complaints
SET public_id = CONCAT(
    'CMP-', YEAR(COALESCE(created_at, CURRENT_TIMESTAMP)), '-', LPAD(id, 6, '0')
)
WHERE public_id IS NULL;

ALTER TABLE complaints
    MODIFY public_id VARCHAR(32) NOT NULL;

ALTER TABLE complaints
    MODIFY priority ENUM('low', 'medium', 'high', 'critical')
    NOT NULL DEFAULT 'medium';

INSERT INTO complaint_categories (name, description) VALUES
    ('facilities', 'Facilities'),
    ('it_infrastructure', 'IT Infrastructure'),
    ('academic', 'Academic'),
    ('administrative', 'Administrative'),
    ('harassment', 'Harassment & Safety'),
    ('other', 'Other')
ON DUPLICATE KEY UPDATE name = VALUES(name);
