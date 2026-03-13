-- Add human-readable device metadata to trusted_devices for the security dashboard.

ALTER TABLE trusted_devices ADD COLUMN device_name TEXT NOT NULL DEFAULT '';
ALTER TABLE trusted_devices ADD COLUMN ip          TEXT NOT NULL DEFAULT '';
ALTER TABLE trusted_devices ADD COLUMN location    TEXT NOT NULL DEFAULT '';
