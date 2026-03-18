-- ============================================================
-- Bot-Betzh Database Schema
-- Alle Tabellen mit "bot_" Prefix (getrennt von Website-Tabellen)
-- ============================================================

-- ------------------------------------------------------------
-- User-Daten (XP, Level, Gold, Coins, Rang-Rolle)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bot_users (
    user_id      TEXT    NOT NULL,
    guild_id     TEXT    NOT NULL,
    apx_id       TEXT,
    xp           INTEGER NOT NULL DEFAULT 0,
    level        INTEGER NOT NULL DEFAULT 1,
    gold         INTEGER NOT NULL DEFAULT 0,
    total_earned INTEGER NOT NULL DEFAULT 0,
    rank_role_id BIGINT,
    PRIMARY KEY (user_id, guild_id)
);

-- ------------------------------------------------------------
-- Voice-Streak
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bot_voice_streak (
    user_id             TEXT NOT NULL,
    guild_id            TEXT NOT NULL,
    streak              INTEGER DEFAULT 0,
    last_qualified_date TEXT,
    PRIMARY KEY (user_id, guild_id)
);

-- ------------------------------------------------------------
-- Coin-Transaktionslog
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bot_currency_log (
    log_id     SERIAL PRIMARY KEY,
    user_id    TEXT    NOT NULL,
    guild_id   TEXT    NOT NULL,
    amount     INTEGER NOT NULL,
    reason     TEXT    NOT NULL CHECK (reason IN (
    'crate_purchase', 'crate_refund',
    'item_sell',
    'admin_grant', 'admin_remove',
    'trade',
    'quest_reward', 'daily_reward', 'voice_reward', 'level_up'
                                            )),
    related_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Item-System
-- ------------------------------------------------------------

-- Vorlage (einmalig pro Itemtyp)
CREATE TABLE IF NOT EXISTS bot_item_templates (
    template_id        SERIAL  PRIMARY KEY,
    name               TEXT    NOT NULL UNIQUE,
    description        TEXT    NOT NULL DEFAULT ''
    item_type          TEXT    NOT NULL CHECK (item_type IN ('cosmetic', 'boost_xp', 'boost_level', 'weapon', 'armor', 'book')),
    base_rarity        TEXT    NOT NULL CHECK (base_rarity IN ('E', 'D', 'C', 'B', 'A', 'S')),
    sell_price         INTEGER NOT NULL DEFAULT 0,
    asset_key          TEXT,
    image_url          TEXT,
    boost_value        REAL    DEFAULT 1.0,
    boost_duration_min INTEGER
);

-- Konkretes Item eines Spielers
CREATE TABLE IF NOT EXISTS bot_item_instances (
    instance_id SERIAL  PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES bot_item_templates (template_id),
    user_id     TEXT    NOT NULL,
    guild_id    TEXT    NOT NULL,
    rarity      TEXT    NOT NULL CHECK (rarity IN ('E', 'D', 'C', 'B', 'A', 'S')),
    level       INTEGER NOT NULL DEFAULT 1,
    roll_seed   BIGINT,
    power_score REAL,
    grid_x      INTEGER CHECK (grid_x >= 0),
    grid_y      INTEGER CHECK (grid_y >= 0),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Erlaubte Perk-Typen mit Wertebereichen
CREATE TABLE IF NOT EXISTS bot_perk_types (
    perk_type   TEXT PRIMARY KEY,
    min_value   REAL NOT NULL,
    max_value   REAL NOT NULL,
    description TEXT
);

-- Perks eines konkreten Items
-- Hinweis: Wertebereich (min_value/max_value aus bot_perk_types) wird in der App-Logik geprüft,
-- da CHECK-Constraints keine Joins auf andere Tabellen unterstützen.
CREATE TABLE IF NOT EXISTS bot_item_perks (
    perk_id     SERIAL  PRIMARY KEY,
    instance_id INTEGER NOT NULL REFERENCES bot_item_instances (instance_id) ON DELETE CASCADE,
    perk_type   TEXT    NOT NULL REFERENCES bot_perk_types (perk_type),
    value       REAL    NOT NULL
    );

-- Ausrüstung eines Spielers (slot-basiert, wie bot_animal_equipment)
CREATE TABLE IF NOT EXISTS bot_user_equipment (
    user_id     TEXT    NOT NULL,
    guild_id    TEXT    NOT NULL,
    instance_id INTEGER NOT NULL REFERENCES bot_item_instances (instance_id) ON DELETE CASCADE,
    slot        TEXT    NOT NULL CHECK (slot IN ('weapon1', 'armor1', 'armor2', 'armor3', 'armor4')),
    PRIMARY KEY (user_id, guild_id, slot)
    );

-- ------------------------------------------------------------
-- Daily Claim Tracking
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bot_daily_claims (
    user_id         TEXT NOT NULL,
    guild_id        TEXT NOT NULL,
    last_claim_date DATE NOT NULL,
    PRIMARY KEY (user_id, guild_id)
);

-- ------------------------------------------------------------
-- User Crate Inventory (rank-based)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bot_user_crates (
    user_id    TEXT         NOT NULL,
    guild_id   TEXT         NOT NULL,
    crate_rank VARCHAR(1)   NOT NULL,   -- 'E','D','C','B','A','S'
    quantity   INTEGER      NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, guild_id, crate_rank)
);

-- ------------------------------------------------------------
-- Crates
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bot_crates (
    crate_id    SERIAL  PRIMARY KEY,
    name        TEXT    NOT NULL UNIQUE,
    description TEXT,
    cost        INTEGER NOT NULL
);

-- Drop-Definitionen pro Crate (ersetzt item_pool JSON)
CREATE TABLE IF NOT EXISTS bot_crate_drops (
    drop_id     SERIAL  PRIMARY KEY,
    crate_id    INTEGER NOT NULL REFERENCES bot_crates (crate_id) ON DELETE CASCADE,
    template_id INTEGER NOT NULL REFERENCES bot_item_templates (template_id) ON DELETE CASCADE,
    weight      INTEGER NOT NULL CHECK (weight > 0),
    min_rarity  TEXT    CHECK (min_rarity  IN ('E', 'D', 'C', 'B', 'A', 'S')),
    max_rarity  TEXT    CHECK (max_rarity  IN ('E', 'D', 'C', 'B', 'A', 'S')),
    min_rank    INTEGER NOT NULL DEFAULT 0
);

-- ------------------------------------------------------------
-- Tiere
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bot_animals (
    animal_id  SERIAL  PRIMARY KEY,
    user_id    TEXT    NOT NULL,
    guild_id   TEXT    NOT NULL,
    name       TEXT,
    rarity     TEXT    NOT NULL CHECK (rarity IN ('E', 'D', 'C', 'B', 'A', 'S')),
    level      INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bot_animal_skills (
    skill_id   SERIAL  PRIMARY KEY,
    animal_id  INTEGER NOT NULL REFERENCES bot_animals (animal_id) ON DELETE CASCADE,
    skill_type TEXT    NOT NULL,
    level      INTEGER NOT NULL
);

-- Tiere: max 4 Rüstungsteile (armor via helmet/chest/legs/boots), standardmäßig weapon1;
-- weapon2 nur für S-Rang-Tiere (Kontrolle in App-Logik)
CREATE TABLE IF NOT EXISTS bot_animal_equipment (
    animal_id   INTEGER NOT NULL REFERENCES bot_animals (animal_id) ON DELETE CASCADE,
    instance_id INTEGER NOT NULL REFERENCES bot_item_instances (instance_id) ON DELETE CASCADE,
    slot        TEXT    NOT NULL CHECK (slot IN ('helmet', 'chest', 'legs', 'boots', 'weapon1', 'weapon2')),
    PRIMARY KEY (animal_id, slot)
);

-- ------------------------------------------------------------
-- Kosmetische Unlocks (nicht handelbar)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bot_user_cosmetics (
    id           SERIAL PRIMARY KEY,
    user_id      TEXT   NOT NULL,
    guild_id     TEXT   NOT NULL,
    cosmetic_key TEXT   NOT NULL,
    rarity       TEXT   NOT NULL CHECK (rarity IN ('E', 'D', 'C', 'B', 'A', 'S')),
    unlocked_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, guild_id, cosmetic_key)
);

-- ------------------------------------------------------------
-- Trading
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bot_trades (
    trade_id    SERIAL PRIMARY KEY,
    sender_id   TEXT   NOT NULL,
    receiver_id TEXT   NOT NULL,
    guild_id    TEXT   NOT NULL,
    status      TEXT   NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'cancelled')),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bot_trade_items (
    trade_id    INTEGER NOT NULL REFERENCES bot_trades (trade_id) ON DELETE CASCADE,
    instance_id INTEGER NOT NULL REFERENCES bot_item_instances (instance_id) ON DELETE CASCADE,
    owner_id    TEXT    NOT NULL,
    PRIMARY KEY (trade_id, instance_id)
);

-- ------------------------------------------------------------
-- Temp Voice Channels
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bot_temp_channels (
    user_id    TEXT   NOT NULL,
    channel_id BIGINT NOT NULL,
    PRIMARY KEY (user_id)
);
