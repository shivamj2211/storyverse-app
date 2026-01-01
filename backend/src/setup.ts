import pool from './db.js';
import fs from 'fs';

async function setup() {
  // Drop tables in reverse order to avoid foreign key constraints
  const dropStatements = [
    'DROP TABLE IF EXISTS story_ratings CASCADE;',
    'DROP TABLE IF EXISTS genre_ratings CASCADE;',
    'DROP TABLE IF EXISTS saved_stories CASCADE;',
    'DROP TABLE IF EXISTS run_choices CASCADE;',
    'DROP TABLE IF EXISTS story_runs CASCADE;',
    'DROP TABLE IF EXISTS node_choices CASCADE;',
    'DROP TABLE IF EXISTS story_nodes CASCADE;',
    'DROP TABLE IF EXISTS story_versions CASCADE;',
    'DROP TABLE IF EXISTS stories CASCADE;',
    'DROP TABLE IF EXISTS phone_otps CASCADE;',
    'DROP TABLE IF EXISTS users CASCADE;',
    'DROP TABLE IF EXISTS genres CASCADE;',
    'DROP EXTENSION IF EXISTS "uuid-ossp";'
  ];

  for (const statement of dropStatements) {
    await pool.query(statement);
  }

  const schemaPath = '../schema.sql';
  const schema = fs.readFileSync(schemaPath, 'utf8');
  const statements = schema.split(';').filter(s => s.trim());

  for (const statement of statements) {
    if (statement.trim()) {
      await pool.query(statement);
    }
  }

  console.log('Database schema created successfully');
  await pool.end();
}

setup();
