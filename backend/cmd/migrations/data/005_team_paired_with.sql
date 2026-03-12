-- Add optional pairing between team members (e.g. entry + support pairs).
-- Nullable self-referencing FK to team.id.

ALTER TABLE team ADD COLUMN paired_with INTEGER DEFAULT NULL REFERENCES team(id);
