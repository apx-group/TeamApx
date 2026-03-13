package main

import (
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"log"
	"sort"
	"strings"
)

//go:embed migrations
var migrationsFS embed.FS

// RunMigrations applies all pending migrations for the given database.
//
//   - dbGroup       matches a subdirectory under migrations/ ("users" or "data")
//   - bootstrapTable is a table name that signals an existing, pre-migration
//     database. When schema_migrations is empty but that table already exists,
//     all migrations are stamped as applied without being re-executed.
func RunMigrations(db *sql.DB, dbGroup string, bootstrapTable string) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version    TEXT     PRIMARY KEY,
			applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	// Detect existing database that pre-dates the migration system.
	if bootstrapTable != "" {
		var migrationCount int
		db.QueryRow("SELECT COUNT(*) FROM schema_migrations").Scan(&migrationCount)

		if migrationCount == 0 {
			var tableExists int
			db.QueryRow(
				"SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?",
				bootstrapTable,
			).Scan(&tableExists)

			if tableExists > 0 {
				return bootstrapMigrations(db, dbGroup)
			}
		}
	}

	return applyPendingMigrations(db, dbGroup)
}

// bootstrapMigrations stamps all available migrations as applied without
// executing them. Used for databases that already contain the full schema
// from the old inline-migration approach.
func bootstrapMigrations(db *sql.DB, dbGroup string) error {
	entries, err := readMigrationEntries(dbGroup)
	if err != nil {
		return err
	}

	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("begin bootstrap transaction: %w", err)
	}
	defer tx.Rollback()

	for _, name := range entries {
		version := strings.TrimSuffix(name, ".sql")
		if _, err := tx.Exec(
			"INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)", version,
		); err != nil {
			return fmt.Errorf("stamp migration %s: %w", name, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit bootstrap: %w", err)
	}

	log.Printf("[migrate:%s] existing database detected – all migrations stamped as applied", dbGroup)
	return nil
}

// applyPendingMigrations reads the migrations directory, skips already-applied
// versions, and executes the rest in order inside individual transactions.
func applyPendingMigrations(db *sql.DB, dbGroup string) error {
	applied, err := loadAppliedVersions(db)
	if err != nil {
		return err
	}

	entries, err := readMigrationEntries(dbGroup)
	if err != nil {
		return err
	}

	for _, name := range entries {
		version := strings.TrimSuffix(name, ".sql")
		if applied[version] {
			continue
		}

		if err := applyMigration(db, dbGroup, name, version); err != nil {
			return err
		}
	}

	return nil
}

func applyMigration(db *sql.DB, dbGroup, filename, version string) error {
	path := "migrations/" + dbGroup + "/" + filename
	content, err := migrationsFS.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read migration %s: %w", filename, err)
	}

	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("begin transaction for %s: %w", filename, err)
	}
	defer tx.Rollback()

	if _, err := tx.Exec(string(content)); err != nil {
		return fmt.Errorf("execute migration %s: %w", filename, err)
	}

	if _, err := tx.Exec(
		"INSERT INTO schema_migrations (version) VALUES (?)", version,
	); err != nil {
		return fmt.Errorf("record migration %s: %w", filename, err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit migration %s: %w", filename, err)
	}

	log.Printf("[migrate:%s] applied %s", dbGroup, filename)
	return nil
}

func loadAppliedVersions(db *sql.DB) (map[string]bool, error) {
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

func readMigrationEntries(dbGroup string) ([]string, error) {
	dir := "migrations/" + dbGroup
	entries, err := fs.ReadDir(migrationsFS, dir)
	if err != nil {
		return nil, fmt.Errorf("read migrations dir %s: %w", dir, err)
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
