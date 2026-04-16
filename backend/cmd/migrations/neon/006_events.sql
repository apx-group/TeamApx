-- Migration 006: Add event_access to users, create events tables

ALTER TABLE apx_users ADD COLUMN IF NOT EXISTS event_access BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS apx_events (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name             TEXT        NOT NULL,
    status           TEXT        NOT NULL DEFAULT 'upcoming' CHECK (status IN ('live','upcoming','past')),
    date             DATE        NOT NULL,
    duration_de      TEXT        NOT NULL DEFAULT '',
    duration_en      TEXT        NOT NULL DEFAULT '',
    description_de   TEXT        NOT NULL DEFAULT '',
    description_en   TEXT        NOT NULL DEFAULT '',
    max_participants INTEGER     NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apx_event_participants (
    user_id   BIGINT NOT NULL REFERENCES apx_users(id) ON DELETE CASCADE,
    event_id  UUID   NOT NULL REFERENCES apx_events(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_apx_event_participants_event ON apx_event_participants (event_id);
