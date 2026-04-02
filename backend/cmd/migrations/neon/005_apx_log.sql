-- Migration 005: Create apx_log table for team news/announcements

CREATE TABLE IF NOT EXISTS apx_log (
    id         BIGSERIAL   PRIMARY KEY,
    title      TEXT        NOT NULL,
    body       TEXT        NOT NULL DEFAULT '',
    log_date   DATE        NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);