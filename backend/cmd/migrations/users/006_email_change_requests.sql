-- Temporary storage for pending email-address change requests.
-- One row per user; replaced on every new request.

CREATE TABLE IF NOT EXISTS email_change_requests (
    user_id    INTEGER  PRIMARY KEY,
    new_email  TEXT     NOT NULL,
    code       TEXT     NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
