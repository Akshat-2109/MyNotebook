require('dotenv').config();
const { Pool } = require('pg');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(40) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(80) NOT NULL,
        color VARCHAR(20) NOT NULL DEFAULT '#6366f1',
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS pages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        title TEXT DEFAULT '',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS blocks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL,
        text TEXT DEFAULT '',
        checked BOOLEAN DEFAULT FALSE,
        sort_order INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
      CREATE INDEX IF NOT EXISTS idx_pages_category ON pages(category_id);
      CREATE INDEX IF NOT EXISTS idx_blocks_page ON blocks(page_id);
    `);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;`);
    console.log('✅ Database ready');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
