-- Migration 003: OAuth / Social Login support

-- Social login users have no password, make it optional
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Display name from OAuth profile (Google full name)
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;

-- Stores social provider links — supports multiple providers per user
CREATE TABLE IF NOT EXISTS user_oauth (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider     TEXT NOT NULL,       -- 'google'
  provider_id  TEXT NOT NULL,       -- Google sub (unique user ID)
  provider_email TEXT,              -- email from the OAuth profile
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_user_oauth_user_id ON user_oauth(user_id);
