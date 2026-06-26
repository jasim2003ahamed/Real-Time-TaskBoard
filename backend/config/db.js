const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:2003@Jasim@127.0.0.1:5432/realtime_taskboard';

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('127.0.0.1') && !process.env.DATABASE_URL.includes('localhost')
    ? { rejectUnauthorized: false }
    : false,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
