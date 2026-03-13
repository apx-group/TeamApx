-- Initial schema: team roster and staff tables.
-- Uses atk_role / def_role (the split-role schema); the legacy single "role"
-- column was never part of this migration-tracked schema.

CREATE TABLE IF NOT EXISTS team (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    name     TEXT    NOT NULL,
    kills    INTEGER NOT NULL DEFAULT 0,
    deaths   INTEGER NOT NULL DEFAULT 0,
    atk_role TEXT    NOT NULL DEFAULT '',
    def_role TEXT    NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS staff (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT    NOT NULL,
    role TEXT    NOT NULL DEFAULT ''
);
