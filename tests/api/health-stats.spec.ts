import { test, expect, json } from '../fixtures/api';
import type { HealthResponse, StatsResponse } from '../fixtures/types';

test.describe('API - health and stats', () => {
  test('TC_API_01 health check reports the system is up', async ({ api }) => {
    const res = await api.get('/health');
    expect.soft(res.status(), 'status').toBe(200);
    const body = await json<HealthResponse>(res);
    expect.soft(body.status, 'status field').toBe('healthy');
    expect.soft(body.database, 'database field').toBe('connected');
  });

  test('TC_API_23 platform statistics return numeric counts', async ({ api }) => {
    const res = await api.get('/stats');
    expect.soft(res.status(), 'status').toBe(200);
    const body = await json<StatsResponse>(res);
    for (const key of ['open_jobs', 'companies', 'total_applications', 'registered_jobseekers'] as const) {
      expect.soft(typeof body[key], key).toBe('number');
    }
  });
});