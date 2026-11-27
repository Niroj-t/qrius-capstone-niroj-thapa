import pg from 'pg';
import { DB_CONFIG, TEST_PREFIX } from './env';

export default async function globalTeardown(): Promise<void> {
  if (process.env.KEEP_TEST_DATA === 'true') return;

  const pool = new pg.Pool(DB_CONFIG);
  try {
    await pool.query('DELETE FROM jobs WHERE starts_with(title, $1) OR starts_with(company, $1)', [TEST_PREFIX]);
    await pool.query('DELETE FROM users WHERE starts_with(email, $1)', [TEST_PREFIX]);
  } catch (err) {
    console.warn('Test data cleanup skipped:', err instanceof Error ? err.message : err);
  } finally {
    await pool.end();
  }
}
