"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_js_1 = __importDefault(require("./db.js"));
const fs_1 = __importDefault(require("fs"));
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
        await db_js_1.default.query(statement);
    }
    const schemaPath = '../schema.sql';
    const schema = fs_1.default.readFileSync(schemaPath, 'utf8');
    const statements = schema.split(';').filter(s => s.trim());
    for (const statement of statements) {
        if (statement.trim()) {
            await db_js_1.default.query(statement);
        }
    }
    console.log('Database schema created successfully');
    await db_js_1.default.end();
}
setup();
