-- Trusted-device tokens that bypass the 2FA challenge on subsequent logins.
-- Expire after 30 days.

CREATE TABLE IF NOT EXISTS trusted_devices (
    token      TEXT     PRIMARY KEY,
    user_id    INTEGER  NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
