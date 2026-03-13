-- Add avatar and banner URL columns to the users table.

ALTER TABLE users ADD COLUMN avatar_url TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN banner_url TEXT NOT NULL DEFAULT '';
