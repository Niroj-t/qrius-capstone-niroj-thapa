import { test, expect, json, type SeedRole } from '../fixtures/api';
import type { ApplicationDto, ApplicationListResponse } from '../fixtures/types';

test.describe('API - applications', () => {
  test('TC_API_20 apply once and apply again', async ({ api }) => {
    const job = await api.createJob();
    const seeker = await api.registerUser('jobseeker');
    const body = { job_id: job.id, cover_letter: 'Hello' };

    const first = await api.post('/applications', { token: seeker.token, data: body });
    expect.soft(first.status(), 'first application').toBe(201);
    expect
      .soft((await json<{ application: ApplicationDto }>(first)).application.status, 'initial status')
      .toBe('pending');

    const second = await api.post('/applications', { token: seeker.token, data: body });
    expect.soft(second.status(), 'second application').toBe(409);
  });

  test('TC_API_21 update an application status', async ({ api }) => {
    const job = await api.createJob();
    const seeker = await api.registerUser('jobseeker');
    const application = await api.apply(job.id, seeker.token);

    const ok = await api.put(`/applications/${application.id}`, { role: 'employer', data: { status: 'shortlisted' } });
    expect.soft(ok.status(), 'valid status').toBe(200);
    expect.soft((await json<{ application: ApplicationDto }>(ok)).application.status, 'new status').toBe('shortlisted');

    const bad = await api.put(`/applications/${application.id}`, { role: 'employer', data: { status: 'maybe' } });
    expect.soft(bad.status(), 'invalid status').toBe(400);
  });

  test(
    'TC_API_24 applications list returns a numeric total for every role',
    { annotation: { type: 'bug', description: 'BUG-03: GET /applications returns total: null' } },
    async ({ api }) => {
      for (const role of ['jobseeker', 'employer', 'admin'] as SeedRole[]) {
        const res = await api.get('/applications', { role });
        expect.soft(res.status(), `${role} status`).toBe(200);
        const body = await json<ApplicationListResponse>(res);
        expect.soft(typeof body.total, `${role} total type`).toBe('number');
        if (typeof body.total === 'number') {
          expect.soft(body.total, `${role} total`).toBeGreaterThanOrEqual(body.applications?.length ?? 0);
        }
      }
    },
  );
});