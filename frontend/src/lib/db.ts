import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:2003@Jasim@127.0.0.1:5432/realtime_taskboard';

let pool: Pool;

if (process.env.NODE_ENV === 'production') {
  pool = new Pool({
    connectionString,
    ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('127.0.0.1') && !process.env.DATABASE_URL.includes('localhost')
      ? { rejectUnauthorized: false }
      : false,
  });
} else {
  // Prevent multiple pools from being created during fast refresh / hot reloading in development
  if (!(global as any).pgPool) {
    (global as any).pgPool = new Pool({
      connectionString,
    });
  }
  pool = (global as any).pgPool;
}

export default pool;
export async function query(text: string, params?: any[]) {
  return pool.query(text, params);
}
