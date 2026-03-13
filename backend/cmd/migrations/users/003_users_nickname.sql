-- Add display-name (nickname) column to the users table.

ALTER TABLE users ADD COLUMN nickname TEXT NOT NULL DEFAULT '';
