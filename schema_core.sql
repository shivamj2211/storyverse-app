-- Storyverse schema (CORE ONLY - no seed data)

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS genres (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  icon TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- login identifiers (either can be null, but at least one must exist)
  email TEXT UNIQUE,
  phone TEXT UNIQUE,

  -- auth
  password_hash TEXT,

  -- profile
  full_name TEXT NOT NULL DEFAULT '',
  age INT,
  coins INT NOT NULL DEFAULT 0,

  -- plan system
  plan TEXT NOT NULL DEFAULT 'free', -- free | premium | creator

  -- legacy flags (keep for backward-compat)
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT email_or_phone_chk CHECK (email IS NOT NULL OR phone IS NOT NULL),
  CONSTRAINT users_plan_chk CHECK (plan IN ('free', 'premium', 'creator'))
);

CREATE TABLE IF NOT EXISTS phone_otps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  consumed_at TIMESTAMP WITHOUT TIME ZONE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  cover_image_url TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS story_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  version_name TEXT NOT NULL,
  notes TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMP WITHOUT TIME ZONE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),

  -- enforce 5 steps on version too
  max_steps INT NOT NULL DEFAULT 5,
  CONSTRAINT story_versions_max_steps_chk CHECK (max_steps = 5)
);

-- Prevent duplicate versions per story
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'story_versions_unique'
  ) THEN
    ALTER TABLE story_versions
    ADD CONSTRAINT story_versions_unique UNIQUE (story_id, version_name);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS story_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_version_id UUID NOT NULL REFERENCES story_versions(id) ON DELETE CASCADE,
  step_no INT NOT NULL CHECK (step_no BETWEEN 1 AND 5),
  node_code TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_start BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (story_version_id, node_code)
);

CREATE TABLE IF NOT EXISTS node_choices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_version_id UUID NOT NULL REFERENCES story_versions(id) ON DELETE CASCADE,
  from_node_id UUID NOT NULL REFERENCES story_nodes(id) ON DELETE CASCADE,
  genre_key TEXT NOT NULL REFERENCES genres(key),
  to_node_id UUID NOT NULL REFERENCES story_nodes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (from_node_id, genre_key)
);

CREATE TABLE IF NOT EXISTS story_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  story_version_id UUID NOT NULL REFERENCES story_versions(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  current_node_id UUID REFERENCES story_nodes(id) ON DELETE SET NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  started_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS run_choices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES story_runs(id) ON DELETE CASCADE,
  step_no INT NOT NULL CHECK (step_no BETWEEN 1 AND 5),
  from_node_id UUID NOT NULL REFERENCES story_nodes(id) ON DELETE CASCADE,
  genre_key TEXT NOT NULL REFERENCES genres(key),
  to_node_id UUID NOT NULL REFERENCES story_nodes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (run_id, step_no)
);

CREATE TABLE IF NOT EXISTS saved_stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, story_id)
);

CREATE TABLE IF NOT EXISTS genre_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  run_id UUID NOT NULL REFERENCES story_runs(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES story_nodes(id) ON DELETE CASCADE,
  genre_key TEXT NOT NULL REFERENCES genres(key),
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (run_id, node_id)
);

CREATE TABLE IF NOT EXISTS story_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, story_id)
);

CREATE INDEX IF NOT EXISTS idx_story_versions_story_id ON story_versions (story_id);
