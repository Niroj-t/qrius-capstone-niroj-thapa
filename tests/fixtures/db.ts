import pg from 'pg';
import { test as apiTest, expect } from './api';
import { DB_CONFIG } from './env';
import type { Role } from './types';

export { expect };

export interface UserRow {
  id: number;
  full_name: string;
  email: string;
  password: string;
  role: Role;
  company: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface JobRow {
  id: number;
  title: string;
  company: string;
  location: string;
  job_type: string;
  category: string;
  salary_min: number | null;
  salary_max: number | null;
  description: string;
  employer_id: number;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface ApplicationRow {
  id: number;
  job_id: number;
  applicant_id: number;
  cover_letter: string | null;
  status: string;
  applied_at: Date;
  updated_at: Date;
}

export class Db {
  constructor(private readonly pool: pg.Pool) {}

  async rows<T extends pg.QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
    return (await this.pool.query<T>(sql, params)).rows;
  }

  async one<T extends pg.QueryResultRow>(sql: string, params: unknown[] = []): Promise<T> {
    const rows = await this.rows<T>(sql, params);
    expect(rows, `rows returned by: ${sql}`).toHaveLength(1);
    return rows[0] as T;
  }

  async count(table: 'users' | 'jobs' | 'applications', where: string, params: unknown[]): Promise<number> {
    const row = await this.one<{ count: string }>(`SELECT COUNT(*) FROM ${table} WHERE ${where}`, params);
    return Number(row.count);
  }

  async errorCode(sql: string, params: unknown[] = []): Promise<string | undefined> {
    try {
      await this.pool.query(sql, params);
      return undefined;
    } catch (err) {
      return (err as pg.DatabaseError).code;
    }
  }
}

export const PG_UNIQUE_VIOLATION = '23505';
export const PG_CHECK_VIOLATION = '23514';
export const PG_NOT_NULL_VIOLATION = '23502';

export const test = apiTest.extend<{ db: Db }, { pool: pg.Pool }>({
  pool: [
    async ({}, use) => {
      const pool = new pg.Pool(DB_CONFIG);
      try {
        await use(pool);
      } finally {
        await pool.end();
      }
    },
    { scope: 'worker' },
  ],

  db: async ({ pool }, use) => {
    await use(new Db(pool));
  },
});
