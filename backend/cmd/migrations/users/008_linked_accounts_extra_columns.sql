-- Add avatar caching and Discord-specific metadata to linked_accounts.

ALTER TABLE linked_accounts ADD COLUMN avatar_url   TEXT NOT NULL DEFAULT '';
ALTER TABLE linked_accounts ADD COLUMN discord_data TEXT NOT NULL DEFAULT '';
