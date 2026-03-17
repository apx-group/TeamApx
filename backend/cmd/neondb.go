package main

import (
	"database/sql"
	"fmt"
	"io/fs"
	"log"
	"sort"
	"strings"
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

// RunNeonMigrations applies pending migrations from migrations/neon/ in
// alphabetical order. Each migration is executed in a transaction and
// recorded in the schema_migrations table — idempotent on every startup.
func RunNeonMigrations(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version    TEXT        PRIMARY KEY,
			applied_at TIMESTAMPTZ DEFAULT NOW()
		)
	`)
	if err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	applied, err := neonAppliedVersions(db)
	if err != nil {
		return err
	}

	entries, err := neonMigrationEntries()
	if err != nil {
		return err
	}

	for _, name := range entries {
		version := strings.TrimSuffix(name, ".sql")
		if applied[version] {
			continue
		}
		if err := applyNeonMigration(db, name, version); err != nil {
			return err
		}
	}

	log.Println("NeonDB migrations applied")
	return nil
}

func neonAppliedVersions(db *sql.DB) (map[string]bool, error) {
	rows, err := db.Query("SELECT version FROM schema_migrations ORDER BY version")
	if err != nil {
		return nil, fmt.Errorf("query schema_migrations: %w", err)
	}
	defer rows.Close()
	applied := make(map[string]bool)
	for rows.Next() {
		var v string
		if err := rows.Scan(&v); err != nil {
			return nil, err
		}
		applied[v] = true
	}
	return applied, rows.Err()
}

func neonMigrationEntries() ([]string, error) {
	entries, err := fs.ReadDir(migrationsFS, "migrations/neon")
	if err != nil {
		return nil, fmt.Errorf("read neon migrations dir: %w", err)
	}
	var files []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
			files = append(files, e.Name())
		}
	}
	sort.Strings(files)
	return files, nil
}

func applyNeonMigration(db *sql.DB, filename, version string) error {
	content, err := migrationsFS.ReadFile("migrations/neon/" + filename)
	if err != nil {
		return fmt.Errorf("read migration %s: %w", filename, err)
	}

	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("begin transaction for %s: %w", filename, err)
	}
	defer tx.Rollback()

	for _, stmt := range splitPgStatements(string(content)) {
		if _, err := tx.Exec(stmt); err != nil {
			preview := stmt
			if len(preview) > 120 {
				preview = preview[:120]
			}
			return fmt.Errorf("execute migration %s: %w\nSQL: %s", filename, err, preview)
		}
	}

	if _, err := tx.Exec(
		"INSERT INTO schema_migrations (version) VALUES ($1)", version,
	); err != nil {
		return fmt.Errorf("record migration %s: %w", filename, err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit migration %s: %w", filename, err)
	}

	log.Printf("[migrate:neon] applied %s", filename)
	return nil
}

// splitPgStatements splits a PostgreSQL SQL script into individual statements.
// Correctly handles dollar-quoted blocks ($$...$$, $tag$...$tag$) so that
// semicolons inside function bodies are not treated as statement separators.
func splitPgStatements(script string) []string {
	var stmts []string
	var buf strings.Builder
	i, n := 0, len(script)

	for i < n {
		ch := script[i]

		// Dollar-quoted block: $$...$$  or  $tag$...$tag$
		if ch == '$' {
			j := i + 1
			for j < n && script[j] != '$' {
				j++
			}
			if j < n {
				tag := script[i : j+1] // e.g. "$$" or "$body$"
				rest := script[j+1:]
				if closeIdx := strings.Index(rest, tag); closeIdx >= 0 {
					// Capture the entire dollar-quoted block as one unit.
					block := script[i : j+1+closeIdx+len(tag)]
					buf.WriteString(block)
					i = j + 1 + closeIdx + len(tag)
					continue
				}
			}
			buf.WriteByte(ch)
			i++
			continue
		}

		// Single-line comment: pass through without splitting on ;
		if ch == '-' && i+1 < n && script[i+1] == '-' {
			for i < n && script[i] != '\n' {
				buf.WriteByte(script[i])
				i++
			}
			continue
		}

		// Semicolon = end of statement
		if ch == ';' {
			if stmt := strings.TrimSpace(buf.String()); stmt != "" {
				stmts = append(stmts, stmt)
			}
			buf.Reset()
			i++
			continue
		}

		buf.WriteByte(ch)
		i++
	}

	if stmt := strings.TrimSpace(buf.String()); stmt != "" {
		stmts = append(stmts, stmt)
	}
	return stmts
}
