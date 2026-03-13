-- Short-lived tokens that bridge the first login step and the 2FA code entry.
-- Expire after 10 minutes.

CREATE TABLE IF NOT EXISTS login_2fa_pending (
    token      TEXT     PRIMARY KEY,
    user_id    INTEGER  NOT NULL,
    code       TEXT     NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
