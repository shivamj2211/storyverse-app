-- Seed 5 stories, each 5-step with 76 nodes (total 380 nodes)
-- Includes required genres.

-- 0) Ensure genres exist
INSERT INTO genres (key, label, icon) VALUES
('drama', 'Drama', 'drama'),
('thriller', 'Thriller', 'thriller'),
('mystery', 'Mystery', 'mystery'),
('comedy', 'Comedy', 'comedy'),
('inspirational', 'Inspirational', 'inspirational')
ON CONFLICT (key) DO NOTHING;

-- 1) Helper: seed one story
DO $$
DECLARE
  -- how many stories to generate
  story_count INT := 5;

  -- step2 genres (your selection)
  step2_genres TEXT[] := ARRAY['drama','thriller','mystery','comedy','inspirational'];

  -- the TWO genres used for all splits in steps 3–5
  split_genre_a TEXT := 'mystery';
  split_genre_b TEXT := 'thriller';

  s INT; -- story index

  v_story_id UUID;
  v_version_id UUID;

  -- Node IDs by step
  step1_id UUID;
  step2_ids UUID[] := ARRAY[]::UUID[];
  step3_ids UUID[] := ARRAY[]::UUID[];
  step4_ids UUID[] := ARRAY[]::UUID[];
  step5_ids UUID[] := ARRAY[]::UUID[];

  i INT;
  parent UUID;
  child_a UUID;
  child_b UUID;
  node_code TEXT;

  story_slug TEXT;
  story_title TEXT;
  story_summary TEXT;
BEGIN
  FOR s IN 1..story_count LOOP
    v_story_id := uuid_generate_v4();
    v_version_id := uuid_generate_v4();

    story_slug := 'family-76-demo-' || s::text;
    story_title := 'Storyverse Demo #' || s::text || ' (5 Steps, 76 Branches)';
    story_summary := 'Testing story #' || s::text || ': Step 1 build-up, Step 2 has 5 genres, Steps 3–5 split into 2 each time.';

    -- reset arrays
    step2_ids := ARRAY[]::UUID[];
    step3_ids := ARRAY[]::UUID[];
    step4_ids := ARRAY[]::UUID[];
    step5_ids := ARRAY[]::UUID[];

    -- 1) Create story
    INSERT INTO stories (id, slug, title, summary, cover_image_url, created_at)
    VALUES (v_story_id, story_slug, story_title, story_summary, NULL, NOW());

    -- 2) Create published version
    INSERT INTO story_versions (id, story_id, version_name, notes, is_published, published_at, created_at, max_steps)
    VALUES (
      v_version_id,
      v_story_id,
      'v1',
      'Seeded 76-node branching structure (5-step)',
      TRUE,
      NOW(),
      NOW(),
      5
    );

    -- 3) Step 1 (start node)
    step1_id := uuid_generate_v4();
    INSERT INTO story_nodes (id, story_version_id, step_no, node_code, title, content, is_start, created_at)
    VALUES (
      step1_id,
      v_version_id,
      1,
      'S1',
      'Chapter 1: The Build-up',
      'This is demo story #' || s::text || '. You reach the end of Chapter 1 and must choose a genre for Chapter 2.',
      TRUE,
      NOW()
    );

    -- 4) Step 2 (5 nodes)
    FOR i IN 1..array_length(step2_genres, 1) LOOP
      node_code := 'S2_' || upper(step2_genres[i]);
      parent := uuid_generate_v4();

      INSERT INTO story_nodes (id, story_version_id, step_no, node_code, title, content, is_start, created_at)
      VALUES (
        parent,
        v_version_id,
        2,
        node_code,
        'Chapter 2 (' || step2_genres[i] || ')',
        'Demo story #' || s::text || ': Chapter 2 for genre: ' || step2_genres[i] || '.',
        FALSE,
        NOW()
      );

      INSERT INTO node_choices (id, story_version_id, from_node_id, genre_key, to_node_id, created_at)
      VALUES (uuid_generate_v4(), v_version_id, step1_id, step2_genres[i], parent, NOW())
      ON CONFLICT DO NOTHING;

      step2_ids := array_append(step2_ids, parent);
    END LOOP;

    -- 5) Step 3: each Step2 node splits into 2 => 10 nodes
    FOR i IN 1..array_length(step2_ids, 1) LOOP
      parent := step2_ids[i];

      child_a := uuid_generate_v4();
      child_b := uuid_generate_v4();

      INSERT INTO story_nodes (id, story_version_id, step_no, node_code, title, content, is_start, created_at)
      VALUES
        (child_a, v_version_id, 3, 'S3_' || lpad((2*i-1)::text, 3, '0'), 'Chapter 3 (A)', 'Demo story #' || s::text || ': Step3-A content for parent ' || i, FALSE, NOW()),
        (child_b, v_version_id, 3, 'S3_' || lpad((2*i)::text,   3, '0'), 'Chapter 3 (B)', 'Demo story #' || s::text || ': Step3-B content for parent ' || i, FALSE, NOW());

      INSERT INTO node_choices (id, story_version_id, from_node_id, genre_key, to_node_id, created_at)
      VALUES
        (uuid_generate_v4(), v_version_id, parent, split_genre_a, child_a, NOW()),
        (uuid_generate_v4(), v_version_id, parent, split_genre_b, child_b, NOW())
      ON CONFLICT DO NOTHING;

      step3_ids := array_append(step3_ids, child_a);
      step3_ids := array_append(step3_ids, child_b);
    END LOOP;

    -- 6) Step 4: each Step3 node splits into 2 => 20 nodes
    FOR i IN 1..array_length(step3_ids, 1) LOOP
      parent := step3_ids[i];

      child_a := uuid_generate_v4();
      child_b := uuid_generate_v4();

      INSERT INTO story_nodes (id, story_version_id, step_no, node_code, title, content, is_start, created_at)
      VALUES
        (child_a, v_version_id, 4, 'S4_' || lpad((2*i-1)::text, 3, '0'), 'Chapter 4 (A)', 'Demo story #' || s::text || ': Step4-A content for parent ' || i, FALSE, NOW()),
        (child_b, v_version_id, 4, 'S4_' || lpad((2*i)::text,   3, '0'), 'Chapter 4 (B)', 'Demo story #' || s::text || ': Step4-B content for parent ' || i, FALSE, NOW());

      INSERT INTO node_choices (id, story_version_id, from_node_id, genre_key, to_node_id, created_at)
      VALUES
        (uuid_generate_v4(), v_version_id, parent, split_genre_a, child_a, NOW()),
        (uuid_generate_v4(), v_version_id, parent, split_genre_b, child_b, NOW())
      ON CONFLICT DO NOTHING;

      step4_ids := array_append(step4_ids, child_a);
      step4_ids := array_append(step4_ids, child_b);
    END LOOP;

    -- 7) Step 5: each Step4 node splits into 2 => 40 nodes
    FOR i IN 1..array_length(step4_ids, 1) LOOP
      parent := step4_ids[i];

      child_a := uuid_generate_v4();
      child_b := uuid_generate_v4();

      INSERT INTO story_nodes (id, story_version_id, step_no, node_code, title, content, is_start, created_at)
      VALUES
        (child_a, v_version_id, 5, 'S5_' || lpad((2*i-1)::text, 3, '0'), 'Chapter 5 (A)', 'Demo story #' || s::text || ': Step5-A ending content for parent ' || i, FALSE, NOW()),
        (child_b, v_version_id, 5, 'S5_' || lpad((2*i)::text,   3, '0'), 'Chapter 5 (B)', 'Demo story #' || s::text || ': Step5-B ending content for parent ' || i, FALSE, NOW());

      INSERT INTO node_choices (id, story_version_id, from_node_id, genre_key, to_node_id, created_at)
      VALUES
        (uuid_generate_v4(), v_version_id, parent, split_genre_a, child_a, NOW()),
        (uuid_generate_v4(), v_version_id, parent, split_genre_b, child_b, NOW())
      ON CONFLICT DO NOTHING;

      step5_ids := array_append(step5_ids, child_a);
      step5_ids := array_append(step5_ids, child_b);
    END LOOP;

    RAISE NOTICE '✅ Seeded story #% slug=% story_id=% version_id=%', s, story_slug, v_story_id, v_version_id;
  END LOOP;
END $$;
