-- CSRF-protection state tokens used during OAuth flows.
-- Each state is single-use and short-lived.

CREATE TABLE IF NOT EXISTS oauth_states (
    state      TEXT     PRIMARY KEY,
    user_id    INTEGER  NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
