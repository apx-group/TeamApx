-- ============================================================
-- APX Schema — PostgreSQL (NeonDB)
-- Paste this into the NeonDB SQL editor for a fresh database.
-- Tables that belong to the Discord bot start with bot_ and
-- are managed by the bot's own schema (discord-bot-schema.sql).
-- ============================================================

-- Migration tracking (shared with bot / neon runner)
CREATE TABLE IF NOT EXISTS schema_migrations (
    version    TEXT        PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Users & Auth ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS apx_users (
    id              BIGSERIAL   PRIMARY KEY,
    username        TEXT        NOT NULL UNIQUE,
    email           TEXT        NOT NULL UNIQUE,
    password        TEXT        NOT NULL,
    nickname        TEXT        NOT NULL DEFAULT '',
    avatar_url      TEXT        NOT NULL DEFAULT '',
    banner_url      TEXT        NOT NULL DEFAULT '',
    is_admin        BOOLEAN     NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    two_fa_enabled  BOOLEAN     NOT NULL DEFAULT TRUE,
    trust_devices   BOOLEAN     NOT NULL DEFAULT TRUE,
    timezone        TEXT        NOT NULL DEFAULT '',
    show_local_time BOOLEAN     NOT NULL DEFAULT FALSE,
    social_links    TEXT        NOT NULL DEFAULT '[]',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apx_sessions (
    token      TEXT        PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES apx_users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apx_sessions_user ON apx_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_apx_sessions_expires ON apx_sessions (expires_at);

CREATE TABLE IF NOT EXISTS apx_applications (
    id            BIGSERIAL   PRIMARY KEY,
    user_id       BIGINT      NOT NULL REFERENCES apx_users(id) ON DELETE CASCADE,
    name          TEXT        NOT NULL,
    age           INTEGER     NOT NULL,
    discord       TEXT        NOT NULL,
    game          TEXT        NOT NULL,
    rank          TEXT        NOT NULL DEFAULT '',
    attacker_role TEXT        NOT NULL DEFAULT '',
    defender_role TEXT        NOT NULL DEFAULT '',
    experience    TEXT        NOT NULL,
    motivation    TEXT        NOT NULL,
    availability  TEXT        NOT NULL DEFAULT '',
    status        TEXT        NOT NULL DEFAULT 'pending',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apx_email_verifications (
    email      TEXT        PRIMARY KEY,
    username   TEXT        NOT NULL,
    nickname   TEXT        NOT NULL DEFAULT '',
    password   TEXT        NOT NULL,
    code       TEXT        NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS apx_email_change_requests (
    user_id    BIGINT      PRIMARY KEY REFERENCES apx_users(id) ON DELETE CASCADE,
    new_email  TEXT        NOT NULL,
    code       TEXT        NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS apx_linked_accounts (
    user_id      BIGINT      NOT NULL REFERENCES apx_users(id) ON DELETE CASCADE,
    service      TEXT        NOT NULL,
    service_id   TEXT        NOT NULL DEFAULT '',
    username     TEXT        NOT NULL DEFAULT '',
    avatar_url   TEXT        NOT NULL DEFAULT '',
    profile_url  TEXT        NOT NULL DEFAULT '',
    discord_data TEXT        NOT NULL DEFAULT '',
    cm_data      TEXT        NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, service)
);

CREATE TABLE IF NOT EXISTS apx_oauth_states (
    state         TEXT        PRIMARY KEY,
    user_id       BIGINT      NOT NULL REFERENCES apx_users(id) ON DELETE CASCADE,
    code_verifier TEXT        NOT NULL DEFAULT '',
    expires_at    TIMESTAMPTZ NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apx_trusted_devices (
    token       TEXT        PRIMARY KEY,
    user_id     BIGINT      NOT NULL REFERENCES apx_users(id) ON DELETE CASCADE,
    device_name TEXT        NOT NULL DEFAULT '',
    ip          TEXT        NOT NULL DEFAULT '',
    location    TEXT        NOT NULL DEFAULT '',
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apx_trusted_devices_user ON apx_trusted_devices (user_id);

CREATE TABLE IF NOT EXISTS apx_login_2fa_pending (
    token      TEXT        PRIMARY KEY,
    user_id    BIGINT      NOT NULL,
    code       TEXT        NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Badges ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS apx_badges (
    id          BIGSERIAL   PRIMARY KEY,
    name        TEXT        NOT NULL,
    description TEXT        NOT NULL DEFAULT '',
    info        TEXT        NOT NULL DEFAULT '',
    image_url   TEXT        NOT NULL DEFAULT '/assets/icons/APX.png',
    max_level   INTEGER     NOT NULL DEFAULT 3,
    available   BOOLEAN     NOT NULL DEFAULT TRUE,
    category    TEXT        NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apx_user_badges (
    user_id  BIGINT  NOT NULL REFERENCES apx_users(id)  ON DELETE CASCADE,
    badge_id BIGINT  NOT NULL REFERENCES apx_badges(id) ON DELETE CASCADE,
    level    INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (user_id, badge_id)
);

-- ── Progression (sync from Discord bot) ─────────────────────

CREATE TABLE IF NOT EXISTS apx_progression_users (
    user_id          BIGINT      PRIMARY KEY REFERENCES apx_users(id) ON DELETE CASCADE,
    discord_id       TEXT        NOT NULL,
    level            INTEGER     NOT NULL DEFAULT 0,
    xp               INTEGER     NOT NULL DEFAULT 0,
    currency_balance INTEGER     NOT NULL DEFAULT 0,
    discord_rank     TEXT        DEFAULT NULL,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apx_prog_users_discord ON apx_progression_users (discord_id);

CREATE TABLE IF NOT EXISTS apx_progression_inventory (
    id           BIGSERIAL   PRIMARY KEY,
    user_id      BIGINT      NOT NULL REFERENCES apx_users(id) ON DELETE CASCADE,
    inventory_id INTEGER     NOT NULL,
    item_id      INTEGER     NOT NULL,
    name         TEXT        NOT NULL DEFAULT '',
    rarity       TEXT        NOT NULL DEFAULT 'common',
    item_type    TEXT        NOT NULL DEFAULT 'cosmetic',
    asset_key    TEXT        NOT NULL DEFAULT '',
    sell_price   INTEGER     NOT NULL DEFAULT 0,
    equipped     BOOLEAN     NOT NULL DEFAULT FALSE,
    obtained_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, inventory_id)
);

CREATE INDEX IF NOT EXISTS idx_apx_prog_inv_user ON apx_progression_inventory (user_id);

-- ── Team & Staff ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS apx_team (
    id            BIGSERIAL PRIMARY KEY,
    name          TEXT      NOT NULL,
    username      TEXT      NOT NULL DEFAULT '',
    kills         INTEGER   NOT NULL DEFAULT 0,
    deaths        INTEGER   NOT NULL DEFAULT 0,
    rounds        INTEGER   NOT NULL DEFAULT 0,
    kost_points   INTEGER   NOT NULL DEFAULT 0,
    atk_role      TEXT      NOT NULL DEFAULT '',
    def_role      TEXT      NOT NULL DEFAULT '',
    is_main_roster BOOLEAN  NOT NULL DEFAULT FALSE,
    paired_with   BIGINT    REFERENCES apx_team(id),
    kill_entry    INTEGER   NOT NULL DEFAULT 0,
    kill_trade    INTEGER   NOT NULL DEFAULT 0,
    kill_impact   INTEGER   NOT NULL DEFAULT 0,
    kill_late     INTEGER   NOT NULL DEFAULT 0,
    death_entry   INTEGER   NOT NULL DEFAULT 0,
    death_trade   INTEGER   NOT NULL DEFAULT 0,
    death_late    INTEGER   NOT NULL DEFAULT 0,
    clutch_1v1    INTEGER   NOT NULL DEFAULT 0,
    clutch_1v2    INTEGER   NOT NULL DEFAULT 0,
    clutch_1v3    INTEGER   NOT NULL DEFAULT 0,
    clutch_1v4    INTEGER   NOT NULL DEFAULT 0,
    clutch_1v5    INTEGER   NOT NULL DEFAULT 0,
    obj_plant     INTEGER   NOT NULL DEFAULT 0,
    obj_defuse    INTEGER   NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS apx_staff (
    id       BIGSERIAL PRIMARY KEY,
    name     TEXT      NOT NULL,
    role     TEXT      NOT NULL DEFAULT '',
    username TEXT      NOT NULL DEFAULT ''
);

-- ── Items (APX item catalog — managed via admin panel) ──────

CREATE SEQUENCE IF NOT EXISTS items_seq START 1;

CREATE TABLE IF NOT EXISTS apx_items (
    item_id    TEXT        PRIMARY KEY,
    seq_id     INTEGER     NOT NULL UNIQUE,
    name       TEXT        NOT NULL,
    rarity     TEXT        CHECK (rarity IS NULL OR rarity IN
                   ('E-Rank','D-Rank','C-Rank','B-Rank','A-Rank','S-Rank')),
    image_url  TEXT,
    is_weapon  BOOLEAN     NOT NULL DEFAULT FALSE,
    is_armor   BOOLEAN     NOT NULL DEFAULT FALSE,
    is_item    BOOLEAN     NOT NULL DEFAULT FALSE,
    is_animal  BOOLEAN     NOT NULL DEFAULT FALSE,
    perks      JSONB       NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION trg_fn_set_item_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.seq_id  := nextval('items_seq');
    NEW.item_id := NEW.seq_id::TEXT || '-' || substr(md5(random()::TEXT), 1, 8);
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_items_set_id
    BEFORE INSERT ON apx_items
    FOR EACH ROW EXECUTE FUNCTION trg_fn_set_item_id();

CREATE TABLE IF NOT EXISTS apx_user_items (
    id          BIGSERIAL   PRIMARY KEY,
    username    TEXT        NOT NULL,
    item_id     TEXT        NOT NULL REFERENCES apx_items(item_id) ON DELETE CASCADE,
    quantity    INTEGER     NOT NULL DEFAULT 1 CHECK (quantity > 0),
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (username, item_id)
);

CREATE INDEX IF NOT EXISTS idx_apx_user_items_username ON apx_user_items (username);
