"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = query;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
});
/**
 * Execute a SQL query on the configured PostgreSQL pool.
 * @param text SQL text
 * @param params Optional parameter array
 */
function query(text, params) {
    return pool.query(text, params);
}
exports.default = pool;
