import pg from 'pg';
import { DB_CONFIG, TEST_PREFIX } from './env';

const LAST_SEED_ID = 10;
const MIN_PREFIX_LENGTH = 5;

export default async function globalTeardown(): Promise<void> {
  if (process.env.KEEP_TEST_DATA === 'true') return;

  if (TEST_PREFIX.length < MIN_PREFIX_LENGTH) {
    console.warn(`Test data cleanup skipped: TEST_PREFIX "${TEST_PREFIX}" is too short to be safe.`);
    return;
  }

  const pool = new pg.Pool(DB_CONFIG);
  const client = await pool.connect().catch((err: unknown) => {
    console.warn('Test data cleanup skipped:', err instanceof Error ? err.message : err);
    return null;
  });

  try {
    if (!client) return;
    await client.query('BEGIN');
    await client.query(
      'DELETE FROM jobs WHERE id > $2 AND (starts_with(title, $1) OR starts_with(company, $1))',
      [TEST_PREFIX, LAST_SEED_ID],
    );
    await client.query('DELETE FROM users WHERE id > $2 AND starts_with(email, $1)', [TEST_PREFIX, LAST_SEED_ID]);
    await client.query('COMMIT');
  } catch (err) {
    await client?.query('ROLLBACK').catch(() => undefined);
    console.warn('Test data cleanup failed:', err instanceof Error ? err.message : err);
  } finally {
    client?.release();
    await pool.end();
  }
}
