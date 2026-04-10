-- Diet Dashboard Database Schema

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  dob DATE,
  weight NUMERIC,
  height NUMERIC,
  waist NUMERIC
);

CREATE TABLE IF NOT EXISTS food_database (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand_name TEXT,
  base_quantity NUMERIC DEFAULT 100,
  unit TEXT DEFAULT 'g',
  calories NUMERIC DEFAULT 0,
  protein NUMERIC DEFAULT 0,
  carbs NUMERIC DEFAULT 0,
  fats NUMERIC DEFAULT 0,
  calcium NUMERIC DEFAULT 0,
  iron NUMERIC DEFAULT 0,
  magnesium NUMERIC DEFAULT 0,
  potassium NUMERIC DEFAULT 0,
  zinc NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL,
  food_name TEXT NOT NULL,
  brand_name TEXT,
  quantity NUMERIC DEFAULT 0,
  calories NUMERIC DEFAULT 0,
  protein NUMERIC DEFAULT 0,
  carbs NUMERIC DEFAULT 0,
  fats NUMERIC DEFAULT 0,
  calcium NUMERIC DEFAULT 0,
  iron NUMERIC DEFAULT 0,
  magnesium NUMERIC DEFAULT 0,
  potassium NUMERIC DEFAULT 0,
  zinc NUMERIC DEFAULT 0,
  food_id INT REFERENCES food_database(id) ON DELETE SET NULL,
  consumed BOOLEAN DEFAULT TRUE,
  is_junk_meal BOOLEAN DEFAULT FALSE,
  image_url TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs(user_id, date);

CREATE TABLE IF NOT EXISTS weight_log (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight NUMERIC NOT NULL,
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS cheat_days (
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  flagged BOOLEAN DEFAULT TRUE,
  PRIMARY KEY(user_id, date)
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  PRIMARY KEY(user_id, key)
);
-- AI provider keys stored as:
--   key='preferred_ai_provider'  value='gemini'|'openai'|'claude'
--   key='gemini_api_key'         value='...'
--   key='openai_api_key'         value='...'
--   key='claude_api_key'         value='...'
