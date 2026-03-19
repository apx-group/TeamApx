-- Migration 003: Add discord_username column to bot_users
ALTER TABLE bot_users ADD COLUMN IF NOT EXISTS discord_username TEXT NOT NULL DEFAULT '';
