-- Add main-roster flag to the team table and seed the known starting roster.
-- The UPDATE only affects rows that already exist by name; new installs will
-- have this set correctly via EnsureTeamPlayers().

ALTER TABLE team ADD COLUMN is_main_roster BOOLEAN NOT NULL DEFAULT 0;

UPDATE team SET is_main_roster = 1 WHERE name IN ('LIXH', 'AQUA', 'KLE', 'DEVIN', 'SLASH');
