import pool from './db.js';

async function seed() {
  try {
    // Insert comedy story
    await pool.query(`
      INSERT INTO stories (slug, title, summary, cover_image_url) VALUES
      ('funny-adventures', 'Funny Adventures', 'A hilarious journey through unexpected twists and turns.', '')
      ON CONFLICT (slug) DO NOTHING;
    `);

    // Insert comedy version
    await pool.query(`
      INSERT INTO story_versions (story_id, version_name, notes, is_published, published_at)
      SELECT id, 'v1', 'Initial version', TRUE, NOW() FROM stories WHERE slug = 'funny-adventures'
      ON CONFLICT DO NOTHING;
    `);

    // Insert comedy nodes
    await pool.query(`
      INSERT INTO story_nodes (story_version_id, step_no, node_code, title, content, is_start)
      SELECT sv.id, 1, 'C1', 'Comedy Start', 'You wake up to find your alarm clock has turned into a comedian. What do you do?', TRUE FROM story_versions sv
      JOIN stories s ON s.id = sv.story_id WHERE s.slug = 'funny-adventures' AND sv.version_name = 'v1'
      UNION ALL
      SELECT sv.id, 2, 'C2', 'Comedy Middle', 'The clock starts telling jokes. You laugh so hard you spill coffee everywhere.', FALSE FROM story_versions sv
      JOIN stories s ON s.id = sv.story_id WHERE s.slug = 'funny-adventures' AND sv.version_name = 'v1'
      UNION ALL
      SELECT sv.id, 3, 'C3', 'Comedy End', 'You join the clock in a stand-up routine. The day ends with laughter.', FALSE FROM story_versions sv
      JOIN stories s ON s.id = sv.story_id WHERE s.slug = 'funny-adventures' AND sv.version_name = 'v1'
      ON CONFLICT DO NOTHING;
    `);

    // Insert comedy choices
    await pool.query(`
      INSERT INTO node_choices (story_version_id, from_node_id, genre_key, to_node_id)
      SELECT sv.id, n1.id, 'comedy', n2.id FROM story_versions sv
      JOIN stories s ON s.id = sv.story_id
      JOIN story_nodes n1 ON n1.story_version_id = sv.id AND n1.node_code = 'C1'
      JOIN story_nodes n2 ON n2.story_version_id = sv.id AND n2.node_code = 'C2'
      WHERE s.slug = 'funny-adventures' AND sv.version_name = 'v1'
      UNION ALL
      SELECT sv.id, n1.id, 'comedy', n2.id FROM story_versions sv
      JOIN stories s ON s.id = sv.story_id
      JOIN story_nodes n1 ON n1.story_version_id = sv.id AND n1.node_code = 'C2'
      JOIN story_nodes n2 ON n2.story_version_id = sv.id AND n2.node_code = 'C3'
      WHERE s.slug = 'funny-adventures' AND sv.version_name = 'v1'
      ON CONFLICT DO NOTHING;
    `);

    // Insert thriller story
    await pool.query(`
      INSERT INTO stories (slug, title, summary, cover_image_url) VALUES
      ('suspense-night', 'Suspense Night', 'A night filled with mystery and unexpected dangers.', '')
      ON CONFLICT (slug) DO NOTHING;
    `);

    // Insert thriller version
    await pool.query(`
      INSERT INTO story_versions (story_id, version_name, notes, is_published, published_at)
      SELECT id, 'v1', 'Initial version', TRUE, NOW() FROM stories WHERE slug = 'suspense-night'
      ON CONFLICT DO NOTHING;
    `);

    // Insert thriller nodes
    await pool.query(`
      INSERT INTO story_nodes (story_version_id, step_no, node_code, title, content, is_start)
      SELECT sv.id, 1, 'T1', 'Thriller Start', 'You hear a strange noise in the dark house. Do you investigate?', TRUE FROM story_versions sv
      JOIN stories s ON s.id = sv.story_id WHERE s.slug = 'suspense-night' AND sv.version_name = 'v1'
      UNION ALL
      SELECT sv.id, 2, 'T2', 'Thriller Middle', 'You find a mysterious letter. The shadows seem to move.', FALSE FROM story_versions sv
      JOIN stories s ON s.id = sv.story_id WHERE s.slug = 'suspense-night' AND sv.version_name = 'v1'
      UNION ALL
      SELECT sv.id, 3, 'T3', 'Thriller End', 'You uncover the secret. The night ends with a shocking revelation.', FALSE FROM story_versions sv
      JOIN stories s ON s.id = sv.story_id WHERE s.slug = 'suspense-night' AND sv.version_name = 'v1'
      ON CONFLICT DO NOTHING;
    `);

    // Insert thriller choices
    await pool.query(`
      INSERT INTO node_choices (story_version_id, from_node_id, genre_key, to_node_id)
      SELECT sv.id, n1.id, 'thriller', n2.id FROM story_versions sv
      JOIN stories s ON s.id = sv.story_id
      JOIN story_nodes n1 ON n1.story_version_id = sv.id AND n1.node_code = 'T1'
      JOIN story_nodes n2 ON n2.story_version_id = sv.id AND n2.node_code = 'T2'
      WHERE s.slug = 'suspense-night' AND sv.version_name = 'v1'
      UNION ALL
      SELECT sv.id, n1.id, 'thriller', n2.id FROM story_versions sv
      JOIN stories s ON s.id = sv.story_id
      JOIN story_nodes n1 ON n1.story_version_id = sv.id AND n1.node_code = 'T2'
      JOIN story_nodes n2 ON n2.story_version_id = sv.id AND n2.node_code = 'T3'
      WHERE s.slug = 'suspense-night' AND sv.version_name = 'v1'
      ON CONFLICT DO NOTHING;
    `);

    // Insert drama story
    await pool.query(`
      INSERT INTO stories (slug, title, summary, cover_image_url) VALUES
      ('family-drama', 'Family Drama', 'A heartfelt story about family bonds and reconciliation.', '')
      ON CONFLICT (slug) DO NOTHING;
    `);

    // Insert drama version
    await pool.query(`
      INSERT INTO story_versions (story_id, version_name, notes, is_published, published_at)
      SELECT id, 'v1', 'Initial version', TRUE, NOW() FROM stories WHERE slug = 'family-drama'
      ON CONFLICT DO NOTHING;
    `);

    // Insert drama nodes
    await pool.query(`
      INSERT INTO story_nodes (story_version_id, step_no, node_code, title, content, is_start)
      SELECT sv.id, 1, 'D1', 'Drama Start', 'You return home after years away. Your family welcomes you with mixed emotions.', TRUE FROM story_versions sv
      JOIN stories s ON s.id = sv.story_id WHERE s.slug = 'family-drama' AND sv.version_name = 'v1'
      UNION ALL
      SELECT sv.id, 2, 'D2', 'Drama Middle', 'Old wounds resurface as you talk about the past. Tears are shed.', FALSE FROM story_versions sv
      JOIN stories s ON s.id = sv.story_id WHERE s.slug = 'family-drama' AND sv.version_name = 'v1'
      UNION ALL
      SELECT sv.id, 3, 'D3', 'Drama End', 'Through understanding and forgiveness, your family grows stronger.', FALSE FROM story_versions sv
      JOIN stories s ON s.id = sv.story_id WHERE s.slug = 'family-drama' AND sv.version_name = 'v1'
      ON CONFLICT DO NOTHING;
    `);

    // Insert drama choices
    await pool.query(`
      INSERT INTO node_choices (story_version_id, from_node_id, genre_key, to_node_id)
      SELECT sv.id, n1.id, 'drama', n2.id FROM story_versions sv
      JOIN stories s ON s.id = sv.story_id
      JOIN story_nodes n1 ON n1.story_version_id = sv.id AND n1.node_code = 'D1'
      JOIN story_nodes n2 ON n2.story_version_id = sv.id AND n2.node_code = 'D2'
      WHERE s.slug = 'family-drama' AND sv.version_name = 'v1'
      UNION ALL
      SELECT sv.id, n1.id, 'drama', n2.id FROM story_versions sv
      JOIN stories s ON s.id = sv.story_id
      JOIN story_nodes n1 ON n1.story_version_id = sv.id AND n1.node_code = 'D2'
      JOIN story_nodes n2 ON n2.story_version_id = sv.id AND n2.node_code = 'D3'
      WHERE s.slug = 'family-drama' AND sv.version_name = 'v1'
      ON CONFLICT DO NOTHING;
    `);

    // Insert mystery story
    await pool.query(`
      INSERT INTO stories (slug, title, summary, cover_image_url) VALUES
      ('lost-treasure', 'Lost Treasure', 'An adventure to uncover a long-lost family treasure.', '')
      ON CONFLICT (slug) DO NOTHING;
    `);

    // Insert mystery version
    await pool.query(`
      INSERT INTO story_versions (story_id, version_name, notes, is_published, published_at)
      SELECT id, 'v1', 'Initial version', TRUE, NOW() FROM stories WHERE slug = 'lost-treasure'
      ON CONFLICT DO NOTHING;
    `);

    // Insert mystery nodes
    await pool.query(`
      INSERT INTO story_nodes (story_version_id, step_no, node_code, title, content, is_start)
      SELECT sv.id, 1, 'M1', 'Mystery Start', 'You find an old map in your grandmother\'s attic. It leads to a treasure.', TRUE FROM story_versions sv
      JOIN stories s ON s.id = sv.story_id WHERE s.slug = 'lost-treasure' AND sv.version_name = 'v1'
      UNION ALL
      SELECT sv.id, 2, 'M2', 'Mystery Middle', 'Following clues, you arrive at an abandoned mine. Strange symbols mark the way.', FALSE FROM story_versions sv
      JOIN stories s ON s.id = sv.story_id WHERE s.slug = 'lost-treasure' AND sv.version_name = 'v1'
      UNION ALL
      SELECT sv.id, 3, 'M3', 'Mystery End', 'You discover the treasure holds more than gold - it\'s a family secret.', FALSE FROM story_versions sv
      JOIN stories s ON s.id = sv.story_id WHERE s.slug = 'lost-treasure' AND sv.version_name = 'v1'
      ON CONFLICT DO NOTHING;
    `);

    // Insert mystery choices
    await pool.query(`
      INSERT INTO node_choices (story_version_id, from_node_id, genre_key, to_node_id)
      SELECT sv.id, n1.id, 'mystery', n2.id FROM story_versions sv
      JOIN stories s ON s.id = sv.story_id
      JOIN story_nodes n1 ON n1.story_version_id = sv.id AND n1.node_code = 'M1'
      JOIN story_nodes n2 ON n2.story_version_id = sv.id AND n2.node_code = 'M2'
      WHERE s.slug = 'lost-treasure' AND sv.version_name = 'v1'
      UNION ALL
      SELECT sv.id, n1.id, 'mystery', n2.id FROM story_versions sv
      JOIN stories s ON s.id = sv.story_id
      JOIN story_nodes n1 ON n1.story_version_id = sv.id AND n1.node_code = 'M2'
      JOIN story_nodes n2 ON n2.story_version_id = sv.id AND n2.node_code = 'M3'
      WHERE s.slug = 'lost-treasure' AND sv.version_name = 'v1'
      ON CONFLICT DO NOTHING;
    `);

    // Insert inspirational story
    await pool.query(`
      INSERT INTO stories (slug, title, summary, cover_image_url) VALUES
      ('rise-above', 'Rise Above', 'A story of overcoming challenges and achieving dreams.', '')
      ON CONFLICT (slug) DO NOTHING;
    `);

    // Insert inspirational version
    await pool.query(`
      INSERT INTO story_versions (story_id, version_name, notes, is_published, published_at)
      SELECT id, 'v1', 'Initial version', TRUE, NOW() FROM stories WHERE slug = 'rise-above'
      ON CONFLICT DO NOTHING;
    `);

    // Insert inspirational nodes
    await pool.query(`
      INSERT INTO story_nodes (story_version_id, step_no, node_code, title, content, is_start)
      SELECT sv.id, 1, 'I1', 'Inspirational Start', 'You face a major setback in your career. Everything seems lost.', TRUE FROM story_versions sv
      JOIN stories s ON s.id = sv.story_id WHERE s.slug = 'rise-above' AND sv.version_name = 'v1'
      UNION ALL
      SELECT sv.id, 2, 'I2', 'Inspirational Middle', 'With determination, you learn new skills and find new opportunities.', FALSE FROM story_versions sv
      JOIN stories s ON s.id = sv.story_id WHERE s.slug = 'rise-above' AND sv.version_name = 'v1'
      UNION ALL
      SELECT sv.id, 3, 'I3', 'Inspirational End', 'Your perseverance pays off. You inspire others with your journey.', FALSE FROM story_versions sv
      JOIN stories s ON s.id = sv.story_id WHERE s.slug = 'rise-above' AND sv.version_name = 'v1'
      ON CONFLICT DO NOTHING;
    `);

    // Insert inspirational choices
    await pool.query(`
      INSERT INTO node_choices (story_version_id, from_node_id, genre_key, to_node_id)
      SELECT sv.id, n1.id, 'inspirational', n2.id FROM story_versions sv
      JOIN stories s ON s.id = sv.story_id
      JOIN story_nodes n1 ON n1.story_version_id = sv.id AND n1.node_code = 'I1'
      JOIN story_nodes n2 ON n2.story_version_id = sv.id AND n2.node_code = 'I2'
      WHERE s.slug = 'rise-above' AND sv.version_name = 'v1'
      UNION ALL
      SELECT sv.id, n1.id, 'inspirational', n2.id FROM story_versions sv
      JOIN stories s ON s.id = sv.story_id
      JOIN story_nodes n1 ON n1.story_version_id = sv.id AND n1.node_code = 'I2'
      JOIN story_nodes n2 ON n2.story_version_id = sv.id AND n2.node_code = 'I3'
      WHERE s.slug = 'rise-above' AND sv.version_name = 'v1'
      ON CONFLICT DO NOTHING;
    `);

    console.log('Seeded additional stories');
  } catch (error) {
    console.error('Error seeding:', error);
  } finally {
    await pool.end();
  }
}

seed();
