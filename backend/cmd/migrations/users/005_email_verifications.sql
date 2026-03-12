-- Temporary storage for pending email-address verifications during registration.
-- A row is deleted once the code is consumed or expires.

CREATE TABLE IF NOT EXISTS email_verifications (
    email      TEXT     PRIMARY KEY,
    username   TEXT     NOT NULL,
    nickname   TEXT     NOT NULL DEFAULT '',
    password   TEXT     NOT NULL,
    code       TEXT     NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
