-- Add two-factor-authentication preference columns to users.
-- Both default to enabled so new accounts start with 2FA active.

ALTER TABLE users ADD COLUMN two_fa_enabled BOOLEAN NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN trust_devices   BOOLEAN NOT NULL DEFAULT 1;
