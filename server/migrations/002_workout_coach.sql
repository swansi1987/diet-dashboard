-- 002_workout_coach.sql
-- FitCoach Platform: workout tracking and coach feature tables

-- Extend users with role
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member','coach','admin'));

-- Exercises library
CREATE TABLE IF NOT EXISTS exercises (
  id                SERIAL PRIMARY KEY,
  name              TEXT NOT NULL,
  muscle_group      TEXT NOT NULL CHECK (muscle_group IN ('chest','back','legs','shoulders','arms','core','cardio','full_body')),
  secondary_muscles TEXT[],
  equipment         TEXT NOT NULL DEFAULT 'bodyweight' CHECK (equipment IN ('barbell','dumbbell','machine','cable','bodyweight','resistance_band','kettlebell','other')),
  category          TEXT NOT NULL DEFAULT 'strength' CHECK (category IN ('strength','cardio','flexibility','plyometric')),
  instructions      TEXT,
  tips              TEXT,
  gif_url           TEXT,
  thumbnail_url     TEXT,
  is_global         BOOLEAN NOT NULL DEFAULT TRUE,
  created_by        INT REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON exercises(muscle_group);
CREATE INDEX IF NOT EXISTS idx_exercises_is_global ON exercises(is_global);

-- Workout templates
CREATE TABLE IF NOT EXISTS workout_templates (
  id                          SERIAL PRIMARY KEY,
  name                        TEXT NOT NULL,
  description                 TEXT,
  created_by                  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_public                   BOOLEAN NOT NULL DEFAULT FALSE,
  estimated_duration_minutes  INT,
  difficulty                  TEXT CHECK (difficulty IN ('beginner','intermediate','advanced')),
  tags                        TEXT[],
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workout_templates_created_by ON workout_templates(created_by);

-- Template exercises (ordered list of exercises in a template)
CREATE TABLE IF NOT EXISTS template_exercises (
  id            SERIAL PRIMARY KEY,
  template_id   INT NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  exercise_id   INT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  set_count     INT NOT NULL DEFAULT 3,
  rep_range_min INT,
  rep_range_max INT,
  rest_seconds  INT DEFAULT 90,
  tempo         TEXT,
  notes         TEXT,
  sort_order    INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_template_exercises_template_id ON template_exercises(template_id);

-- Workout sessions (logged workouts)
CREATE TABLE IF NOT EXISTS workout_sessions (
  id                SERIAL PRIMARY KEY,
  user_id           INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id       INT REFERENCES workout_templates(id) ON DELETE SET NULL,
  title             TEXT,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at       TIMESTAMPTZ,
  duration_seconds  INT,
  notes             TEXT,
  perceived_effort  INT CHECK (perceived_effort BETWEEN 1 AND 10),
  bodyweight_kg     NUMERIC,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_started ON workout_sessions(user_id, started_at);

-- Session sets (individual sets logged in a session)
CREATE TABLE IF NOT EXISTS session_sets (
  id               SERIAL PRIMARY KEY,
  session_id       INT NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id      INT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  set_number       INT NOT NULL,
  weight_kg        NUMERIC,
  reps             INT,
  duration_seconds INT,
  distance_meters  NUMERIC,
  rpe              NUMERIC(3,1) CHECK (rpe BETWEEN 1 AND 10),
  is_warmup        BOOLEAN NOT NULL DEFAULT FALSE,
  is_dropset       BOOLEAN NOT NULL DEFAULT FALSE,
  is_failure       BOOLEAN NOT NULL DEFAULT FALSE,
  notes            TEXT,
  completed_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_session_sets_session_id ON session_sets(session_id);
CREATE INDEX IF NOT EXISTS idx_session_sets_exercise_id ON session_sets(exercise_id);

-- Personal records
CREATE TABLE IF NOT EXISTS personal_records (
  id           SERIAL PRIMARY KEY,
  user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id  INT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  pr_type      TEXT NOT NULL CHECK (pr_type IN ('1rm','max_weight','max_reps','max_volume','max_distance','max_duration')),
  weight_kg    NUMERIC,
  reps         INT,
  volume_kg    NUMERIC,
  distance_m   NUMERIC,
  duration_s   INT,
  achieved_at  TIMESTAMPTZ NOT NULL,
  session_id   INT REFERENCES workout_sessions(id) ON DELETE SET NULL,
  UNIQUE(user_id, exercise_id, pr_type)
);
CREATE INDEX IF NOT EXISTS idx_personal_records_user_id ON personal_records(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_records_user_exercise ON personal_records(user_id, exercise_id);

-- Coach-client relationships
CREATE TABLE IF NOT EXISTS coach_clients (
  id              SERIAL PRIMARY KEY,
  coach_user_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_user_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','inactive','declined')),
  invited_at      TIMESTAMPTZ DEFAULT NOW(),
  activated_at    TIMESTAMPTZ,
  notes           TEXT,
  UNIQUE(coach_user_id, client_user_id)
);
CREATE INDEX IF NOT EXISTS idx_coach_clients_coach_status ON coach_clients(coach_user_id, status);
CREATE INDEX IF NOT EXISTS idx_coach_clients_client_status ON coach_clients(client_user_id, status);

-- Programs assigned by coach to client
CREATE TABLE IF NOT EXISTS assigned_programs (
  id           SERIAL PRIMARY KEY,
  coach_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id  INT NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  assigned_at  TIMESTAMPTZ DEFAULT NOW(),
  start_date   DATE,
  end_date     DATE,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed','cancelled')),
  notes        TEXT,
  week_days    INT[],
  UNIQUE(client_id, template_id, start_date)
);
CREATE INDEX IF NOT EXISTS idx_assigned_programs_client_status ON assigned_programs(client_id, status);
CREATE INDEX IF NOT EXISTS idx_assigned_programs_coach_id ON assigned_programs(coach_id);

-- Body measurements
CREATE TABLE IF NOT EXISTS body_measurements (
  id               SERIAL PRIMARY KEY,
  user_id          INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  measured_at      DATE NOT NULL,
  chest_cm         NUMERIC,
  waist_cm         NUMERIC,
  hips_cm          NUMERIC,
  bicep_cm         NUMERIC,
  forearm_cm       NUMERIC,
  thigh_cm         NUMERIC,
  calf_cm          NUMERIC,
  neck_cm          NUMERIC,
  shoulder_cm      NUMERIC,
  bodyfat_percent  NUMERIC,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, measured_at)
);
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date ON body_measurements(user_id, measured_at);

-- Direct messages between coach and client
CREATE TABLE IF NOT EXISTS messages (
  id           SERIAL PRIMARY KEY,
  sender_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body         TEXT NOT NULL,
  media_url    TEXT,
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id), sent_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(receiver_id, is_read) WHERE is_read = FALSE;

-- Push notification tokens
CREATE TABLE IF NOT EXISTS push_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL,
  platform   TEXT NOT NULL CHECK (platform IN ('android','ios')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
