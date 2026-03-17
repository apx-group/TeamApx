package main

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

// InitNeonDB opens a PostgreSQL connection to NeonDB via pgx/stdlib.
func InitNeonDB(url string) (*sql.DB, error) {
	db, err := sql.Open("pgx", url)
	if err != nil {
		return nil, fmt.Errorf("open neondb: %w", err)
	}
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(2)
	db.SetConnMaxLifetime(5 * time.Minute)
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("ping neondb: %w", err)
	}
	log.Println("NeonDB connected")
	return db, nil
}

// RunNeonMigrations creates the items and user_items tables if they do not exist.
// All statements use CREATE IF NOT EXISTS / CREATE OR REPLACE — safe to run on every startup.
func RunNeonMigrations(db *sql.DB) error {
	stmts := []string{
		`CREATE SEQUENCE IF NOT EXISTS items_seq START 1`,

		`CREATE TABLE IF NOT EXISTS items (
			item_id    TEXT         PRIMARY KEY,
			seq_id     INTEGER      NOT NULL UNIQUE,
			name       TEXT         NOT NULL,
			rarity     TEXT         CHECK (rarity IS NULL OR rarity IN
			               ('E-Rank','D-Rank','C-Rank','B-Rank','A-Rank','S-Rank')),
			image_url  TEXT,
			is_weapon  BOOLEAN      NOT NULL DEFAULT FALSE,
			is_armor   BOOLEAN      NOT NULL DEFAULT FALSE,
			is_item    BOOLEAN      NOT NULL DEFAULT FALSE,
			is_animal  BOOLEAN      NOT NULL DEFAULT FALSE,
			perks      JSONB        NOT NULL DEFAULT '[]',
			created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
		)`,

		`CREATE OR REPLACE FUNCTION trg_fn_set_item_id()
		 RETURNS TRIGGER LANGUAGE plpgsql AS $$
		 BEGIN
		     NEW.seq_id  := nextval('items_seq');
		     NEW.item_id := NEW.seq_id::TEXT || '-' || substr(md5(random()::TEXT), 1, 8);
		     RETURN NEW;
		 END; $$`,

		`CREATE OR REPLACE TRIGGER trg_items_set_id
		 BEFORE INSERT ON items
		 FOR EACH ROW EXECUTE FUNCTION trg_fn_set_item_id()`,

		`CREATE TABLE IF NOT EXISTS user_items (
			id          BIGSERIAL    PRIMARY KEY,
			username    TEXT         NOT NULL,
			item_id     TEXT         NOT NULL REFERENCES items(item_id) ON DELETE CASCADE,
			quantity    INTEGER      NOT NULL DEFAULT 1 CHECK (quantity > 0),
			acquired_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
			UNIQUE (username, item_id)
		)`,

		`CREATE INDEX IF NOT EXISTS idx_user_items_username ON user_items (username)`,
	}

	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			preview := s
			if len(preview) > 80 {
				preview = preview[:80]
			}
			return fmt.Errorf("neon migration failed: %w\nSQL: %s", err, preview)
		}
	}
	log.Println("NeonDB migrations applied")
	return nil
}
