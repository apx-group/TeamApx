-- Add per-player round count and KOST-point tracking to the team table.

ALTER TABLE team ADD COLUMN rounds      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE team ADD COLUMN kost_points INTEGER NOT NULL DEFAULT 0;
