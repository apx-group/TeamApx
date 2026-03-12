-- Badge definitions and user-badge assignments.
-- max_level = 0 means the badge has no level system (binary: owned or not).

CREATE TABLE IF NOT EXISTS badges (
    id          INTEGER  PRIMARY KEY AUTOINCREMENT,
    name        TEXT     NOT NULL,
    description TEXT     NOT NULL DEFAULT '',
    info        TEXT     NOT NULL DEFAULT '',
    image_url   TEXT     NOT NULL DEFAULT '/assets/icons/APX.png',
    max_level   INTEGER  NOT NULL DEFAULT 3,
    available   INTEGER  NOT NULL DEFAULT 1,
    category    TEXT     NOT NULL DEFAULT '',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_badges (
    user_id  INTEGER NOT NULL,
    badge_id INTEGER NOT NULL,
    level    INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (user_id, badge_id),
    FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
    FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE
);
