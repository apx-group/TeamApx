-- Add soft-delete flag to the users table.
-- Deactivated accounts (is_active = 0) are excluded from login and session lookups.

ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1;
