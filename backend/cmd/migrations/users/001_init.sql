-- Initial schema: core user, session and application tables.

CREATE TABLE IF NOT EXISTS users (
    id         INTEGER  PRIMARY KEY AUTOINCREMENT,
    username   TEXT     NOT NULL UNIQUE,
    email      TEXT     NOT NULL UNIQUE,
    password   TEXT     NOT NULL,
    is_admin   BOOLEAN  NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT     PRIMARY KEY,
    user_id    INTEGER  NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS applications (
    id            INTEGER  PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER  NOT NULL,
    name          TEXT     NOT NULL,
    age           INTEGER  NOT NULL,
    discord       TEXT     NOT NULL,
    game          TEXT     NOT NULL,
    rank          TEXT     DEFAULT '',
    attacker_role TEXT     DEFAULT '',
    defender_role TEXT     DEFAULT '',
    experience    TEXT     NOT NULL,
    motivation    TEXT     NOT NULL,
    availability  TEXT     DEFAULT '',
    status        TEXT     NOT NULL DEFAULT 'pending',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
