import { test, expect, json } from '../fixtures/api';
import type { StatsResponse } from '../fixtures/types';

test.describe('API - health and stats', () => {
  test('TC_API_01 health check reports the system is up', async ({ api }) => {
    const res = await api.get('/health');
    expect(res.status()).toBe(200);
    const body = await json<{ status: string; database: string }>(res);
    expect(body.status).toBe('healthy');
    expect(body.database).toBe('connected');
  });

  test('TC_API_23 platform statistics return numeric counts', async ({ api }) => {
    const res = await api.get('/stats');
    expect(res.status()).toBe(200);
    const body = await json<StatsResponse>(res);
    for (const key of ['open_jobs', 'companies', 'total_applications', 'registered_jobseekers'] as const) {
      expect.soft(typeof body[key], key).toBe('number');
    }
  });
});