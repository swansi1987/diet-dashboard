-- Add is_global flag to food_database
-- is_global = TRUE  → food is visible to ALL users (shared database)
-- is_global = FALSE → food is visible only to the owner (default, private)
ALTER TABLE food_database ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT FALSE;
