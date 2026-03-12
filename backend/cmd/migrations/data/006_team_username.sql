-- Link team members to their site user accounts via username.

ALTER TABLE team ADD COLUMN username TEXT NOT NULL DEFAULT '';
