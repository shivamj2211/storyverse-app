-- PostgreSQL schema for Storyverse
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enable UUID generator
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Genres table (static entries)
CREATE TABLE IF NOT EXISTS genres (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  icon TEXT NOT NULL
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  password_hash TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT email_or_phone_chk CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Phone OTPs for login
CREATE TABLE IF NOT EXISTS phone_otps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  consumed_at TIMESTAMP WITHOUT TIME ZONE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Stories
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  cover_image_url TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Story versions (drafts and published)
CREATE TABLE IF NOT EXISTS story_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  version_name TEXT NOT NULL,
  notes TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMP WITHOUT TIME ZONE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
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

-- Story nodes belong to a version
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

-- Node choices map from a node + genre to another node in the same version
CREATE TABLE IF NOT EXISTS node_choices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_version_id UUID NOT NULL REFERENCES story_versions(id) ON DELETE CASCADE,
  from_node_id UUID NOT NULL REFERENCES story_nodes(id) ON DELETE CASCADE,
  genre_key TEXT NOT NULL REFERENCES genres(key),
  to_node_id UUID NOT NULL REFERENCES story_nodes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (from_node_id, genre_key)
);

-- Runs track a user journey through a version
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

-- Run choices lock a user's choice for a given step
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

-- Saved stories (bookmarks)
CREATE TABLE IF NOT EXISTS saved_stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, story_id)
);

-- Ratings for individual genre nodes
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

-- Ratings for entire stories
CREATE TABLE IF NOT EXISTS story_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, story_id)
);

-- Index to speed up lookups of story versions by story
CREATE INDEX IF NOT EXISTS idx_story_versions_story_id ON story_versions (story_id);

-- Seed genres
INSERT INTO genres (key, label, icon) VALUES
  ('drama', 'Drama', 'DRAMA'),
  ('comedy', 'Comedy', 'COMEDY'),
  ('tragedy', 'Tragedy', 'TRAGEDY'),
  ('thriller', 'Thriller', 'THRILLER'),
  ('mystery', 'Mystery', 'MYSTERY'),
  ('psychological', 'Psychological', 'PSYCHO'),
  ('inspirational', 'Inspirational', 'INSPIRE'),
  ('slice_of_life', 'Slice of Life', 'SLICE'),
  ('dark', 'Dark', 'DARK'),
  ('philosophical', 'Philosophical', 'PHILO')
ON CONFLICT (key) DO NOTHING;

-- Demo story insertion
-- Create the story
INSERT INTO stories (slug, title, summary, cover_image_url) VALUES
  ('demo-story', 'Demo Story', 'A simple demonstration story for the Storyverse app.', '')
ON CONFLICT (slug) DO NOTHING;

-- Retrieve the story id
WITH s AS (
  SELECT id FROM stories WHERE slug = 'demo-story' LIMIT 1
), v AS (
  -- Create version if not exists
  INSERT INTO story_versions (story_id, version_name, notes, is_published, published_at)
  SELECT s.id, 'v1', 'Initial version', TRUE, NOW() FROM s
  ON CONFLICT DO NOTHING
  RETURNING id
)
SELECT 1;

-- Insert nodes for demo story v1 only if they don't exist
WITH sv AS (
  SELECT id FROM story_versions WHERE story_id = (SELECT id FROM stories WHERE slug='demo-story' LIMIT 1) AND version_name='v1' LIMIT 1
), ins_nodes AS (
  INSERT INTO story_nodes (story_version_id, step_no, node_code, title, content, is_start)
  VALUES
    ((SELECT id FROM sv), 1, 'S1', 'Demo - Chapter 1', 'This is the first chapter of the demo story. The family decides to go on a trip.', TRUE),
    ((SELECT id FROM sv), 2, 'S2DRAMA', 'Demo - Chapter 2 (Drama)', 'The trip begins but the car breaks down and they argue.', FALSE),
    ((SELECT id FROM sv), 2, 'S2COMEDY', 'Demo - Chapter 2 (Comedy)', 'They make jokes as the car engine sputters.', FALSE),
    ((SELECT id FROM sv), 3, 'S3END', 'Demo - Chapter 3', 'They reach their destination regardless of obstacles.', FALSE)
  ON CONFLICT DO NOTHING
  RETURNING id
)
SELECT 1;

-- Insert choices for demo story
WITH sv AS (
  SELECT id FROM story_versions WHERE story_id = (SELECT id FROM stories WHERE slug='demo-story') AND version_name='v1'
), n AS (
  SELECT node_code, id FROM story_nodes WHERE story_version_id = (SELECT id FROM sv)
), choices AS (
  INSERT INTO node_choices (story_version_id, from_node_id, genre_key, to_node_id)
  SELECT (SELECT id FROM sv), n1.id, 'drama', n2.id FROM n n1 JOIN n n2 ON n1.node_code='S1' AND n2.node_code='S2DRAMA'
  UNION ALL
  SELECT (SELECT id FROM sv), n1.id, 'comedy', n2.id FROM n n1 JOIN n n2 ON n1.node_code='S1' AND n2.node_code='S2COMEDY'
  UNION ALL
  SELECT (SELECT id FROM sv), n1.id, 'tragedy', n2.id FROM n n1 JOIN n n2 ON n1.node_code='S1' AND n2.node_code='S3END'
  UNION ALL
  SELECT (SELECT id FROM sv), n1.id, 'drama', n2.id FROM n n1 JOIN n n2 ON n1.node_code='S2DRAMA' AND n2.node_code='S3END'
  UNION ALL
  SELECT (SELECT id FROM sv), n1.id, 'comedy', n2.id FROM n n1 JOIN n n2 ON n1.node_code='S2COMEDY' AND n2.node_code='S3END'
  ON CONFLICT DO NOTHING
  RETURNING id
)
SELECT 1;