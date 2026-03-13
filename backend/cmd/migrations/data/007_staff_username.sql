-- Link staff members to their site user accounts via username.

ALTER TABLE staff ADD COLUMN username TEXT NOT NULL DEFAULT '';
