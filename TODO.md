# Fix Signup Issue

## Problem
After filling the signup form, an "unexpected error" occurs, preventing data from being added to the database.

## Root Cause
The backend server is not running or the database is not set up properly.

## Steps to Fix

1. **Set up the database:**
   - Ensure PostgreSQL is installed and running on your system.
   - Update `backend/.env` with your actual DATABASE_URL (e.g., `postgresql://username:password@localhost:5432/storyverse`).
   - Create the database if it doesn't exist.
   - Run `cd backend && npm run setup` to execute the schema.sql and create tables.

2. **Start the backend:**
   - Run `cd backend && npm run dev` to start the server on port 4000.

3. **Test the signup:**
   - Open the frontend (run `cd frontend && npm run dev` if not already running).
   - Try signing up with valid email and password (min 6 chars).
   - The user should be created in the database and redirected to /stories.

## Additional Notes
- If you encounter connection errors, verify DATABASE_URL and that Postgres is running.
- The signup validates email format and password length (>=6).
- On success, a JWT token is stored in localStorage and user is redirected.
