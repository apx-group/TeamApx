-- Synced progression state per user (pushed by Discord bot)
CREATE TABLE IF NOT EXISTS progression_users (
    user_id          INTEGER PRIMARY KEY,
    discord_id       TEXT    NOT NULL,
    level            INTEGER NOT NULL DEFAULT 0,
    xp               INTEGER NOT NULL DEFAULT 0,
    currency_balance INTEGER NOT NULL DEFAULT 0,
    updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bot-managed inventory (bot is source of truth, Go is read-replica for website)
CREATE TABLE IF NOT EXISTS progression_inventory (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL,
    inventory_id INTEGER NOT NULL,
    item_id      INTEGER NOT NULL,
    name         TEXT    NOT NULL DEFAULT '',
    rarity       TEXT    NOT NULL DEFAULT 'common',
    item_type    TEXT    NOT NULL DEFAULT 'cosmetic',
    asset_key    TEXT    NOT NULL DEFAULT '',
    sell_price   INTEGER NOT NULL DEFAULT 0,
    equipped     INTEGER NOT NULL DEFAULT 0,
    obtained_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, inventory_id)
);

CREATE INDEX IF NOT EXISTS idx_progression_inventory_user ON progression_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_progression_users_discord  ON progression_users(discord_id);
