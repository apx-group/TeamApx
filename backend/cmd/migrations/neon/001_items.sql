-- Items catalog and user ownership tables

CREATE SEQUENCE IF NOT EXISTS items_seq START 1;

CREATE TABLE IF NOT EXISTS items (
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
    BEFORE INSERT ON items
    FOR EACH ROW EXECUTE FUNCTION trg_fn_set_item_id();

CREATE TABLE IF NOT EXISTS user_items (
    id          BIGSERIAL   PRIMARY KEY,
    username    TEXT        NOT NULL,
    item_id     TEXT        NOT NULL REFERENCES items(item_id) ON DELETE CASCADE,
    quantity    INTEGER     NOT NULL DEFAULT 1 CHECK (quantity > 0),
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (username, item_id)
);

CREATE INDEX IF NOT EXISTS idx_user_items_username ON user_items (username);
