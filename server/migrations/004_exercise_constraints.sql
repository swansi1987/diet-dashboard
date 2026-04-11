-- Migration 004: Add UNIQUE constraint to exercise name
-- Required for ON CONFLICT (name) DO NOTHING in the auto-seeder

ALTER TABLE exercises ADD CONSTRAINT exercises_name_key UNIQUE (name);
