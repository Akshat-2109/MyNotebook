# MyNotebook

MyNotebook is a multi-user personal notebook web application built with Node.js, Express, and PostgreSQL. It lets users create categories, write note pages, store content in a cloud database, and search through saved notes.

## Features

- User registration, login, logout, and session-based authentication
- Password change for logged-in users
- Categories with custom colors
- Pages linked to categories for organizing notes
- Block-based note content with text and checklist-style entries
- Search across page titles and note content
- Persistent storage using PostgreSQL
- Basic stats for categories, blocks, and word count

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- pg (Postgres client)
- express-session
- bcryptjs
- dotenv

## Project Structure

- server.js — main Express server entry point
- routes/auth.js — authentication routes
- routes/api.js — note, category, search, and account routes
- db/init.js — database initialization and table creation
- public/ — frontend HTML files
- utils/ — helper modules

## Prerequisites

- Node.js 18 or newer
- A PostgreSQL database

## Environment Variables

Create a .env file in the project root:

```env
DATABASE_URL=postgresql://username:password@host:5432/database?sslmode=require
SESSION_SECRET=your-random-session-secret
NODE_ENV=development
PORT=3000
```

### Notes

- The application automatically creates the required database tables on startup.
- If your PostgreSQL provider requires SSL, keep the sslmode=require part in the connection string.

## Installation

```bash
npm install
```

## Running the App

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

## API Highlights

- GET /health — health check
- POST /auth/register — create an account
- POST /auth/login — sign in
- POST /auth/logout — sign out
- POST /auth/change-password — update password
- GET /api/stats — get note statistics
- GET /api/categories — list categories
- POST /api/categories — create a category
- GET /api/search?q=term — search notes

## Deployment

### Render

1. Push the project to GitHub.
2. Create a new Web Service on Render.
3. Connect the repository.
4. Set the build command to:

```bash
npm install
```

5. Set the start command to:

```bash
npm start
```

6. Add the same environment variables in Render's dashboard:
   - DATABASE_URL
   - SESSION_SECRET
   - NODE_ENV=production
   - PORT=10000 (Render will provide its own port automatically, so this is optional)

## License

This project is for personal or educational use.
