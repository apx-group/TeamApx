-- OAuth-linked third-party accounts (Discord, Twitch, ChallengerMode).
-- One row per (user, service) pair.

CREATE TABLE IF NOT EXISTS linked_accounts (
    user_id    INTEGER  NOT NULL,
    service    TEXT     NOT NULL,
    service_id TEXT     NOT NULL DEFAULT '',
    username   TEXT     NOT NULL DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, service),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
