import { test, expect, json } from '../fixtures/api';
import { makeJob, uniqueCategory, NON_EXISTENT_ID } from '../fixtures/data';
import type { JobDto, JobListResponse } from '../fixtures/types';

test.describe('API - jobs', () => {
  test('TC_API_12 list jobs with paging', async ({ api }) => {
    const res = await api.get('/jobs', { params: { page: 1, limit: 3 } });
    expect(res.status(), 'status').toBe(200);
    const body = await json<JobListResponse>(res);
    expect.soft(Array.isArray(body.jobs), 'jobs is a list').toBe(true);
    expect.soft(body.jobs.length, 'jobs returned').toBeLessThanOrEqual(3);
    expect.soft(body.page, 'page').toBe(1);
    expect.soft(body.limit, 'limit').toBe(3);
    expect.soft(body.total, 'total').toBeGreaterThanOrEqual(body.jobs.length);
  });

  test('TC_API_13 filter and sort jobs', async ({ api }) => {
    const category = uniqueCategory();
    await api.createJob({ category, job_type: 'contract', salary_min: 50000, salary_max: 100000 });
    await api.createJob({ category, job_type: 'full-time', salary_min: 150000, salary_max: 200000 });

    const filtered = await json<JobListResponse>(
      await api.get('/jobs', { params: { category, job_type: 'contract' } }),
    );
    expect.soft(filtered.total, 'contract filter total').toBe(1);
    expect.soft(filtered.jobs[0]?.job_type, 'filtered job type').toBe('contract');

    const sorted = await json<JobListResponse>(await api.get('/jobs', { params: { category, sort: 'salary_high' } }));
    expect
      .soft(
        sorted.jobs.map((j) => j.salary_max),
        'salary_high order',
      )
      .toEqual([200000, 100000]);
  });

  test('TC_API_14 view one job and an unknown id', async ({ api }) => {
    const job = await api.createJob();
    const found = await api.get(`/jobs/${job.id}`);
    expect.soft(found.status(), 'existing job').toBe(200);
    expect.soft((await json<JobDto>(found)).title, 'title').toBe(job.title);
    const missing = await api.get(`/jobs/${NON_EXISTENT_ID}`);
    expect.soft(missing.status(), 'unknown id').toBe(404);
  });

  test('TC_API_15 employer creates a job and owns it', async ({ api }) => {
    const payload = makeJob();
    const res = await api.post('/jobs', { role: 'employer', data: payload });
    expect(res.status(), 'status').toBe(201);
    const { job } = await json<{ job: JobDto }>(res);
    expect.soft(job.title, 'title').toBe(payload.title);
    expect.soft(job.employer_id, 'owner').toBe(api.seedId('employer'));
  });

  test('TC_API_16 create a job with missing fields or wrong role', async ({ api }) => {
    const missing = await api.post('/jobs', { role: 'employer', data: { title: 'Only a title' } });
    expect.soft(missing.status(), 'missing fields').toBe(400);
    const seeker = await api.post('/jobs', { role: 'jobseeker', data: makeJob() });
    expect.soft(seeker.status(), 'job seeker').toBe(403);
    const anon = await api.post('/jobs', { data: makeJob() });
    expect.soft(anon.status(), 'no token').toBe(401);
  });

  test('TC_API_17 update a job as owner and as another employer', async ({ api }) => {
    const job = await api.createJob();
    const newTitle = `${job.title} updated`;
    const owner = await api.put(`/jobs/${job.id}`, { role: 'employer', data: { title: newTitle } });
    expect.soft(owner.status(), 'owner').toBe(200);
    expect.soft((await json<{ job: JobDto }>(owner)).job.title, 'new title').toBe(newTitle);
    const other = await api.put(`/jobs/${job.id}`, { role: 'employer2', data: { title: 'hijacked' } });
    expect.soft(other.status(), 'other employer').toBe(403);
  });

  test('TC_API_18 delete a job', async ({ api }) => {
    const job = await api.createJob();
    const del = await api.del(`/jobs/${job.id}`, { role: 'employer' });
    expect(del.status(), 'delete').toBe(200);
    const after = await api.get(`/jobs/${job.id}`);
    expect(after.status(), 'get after delete').toBe(404);
  });

  test(
    'TC_API_19 create a job with an invalid job type',
    { annotation: { type: 'bug', description: 'BUG-02: Invalid job_type returns 500 instead of 400' } },
    async ({ api }) => {
      const res = await api.post('/jobs', { role: 'employer', data: makeJob({ job_type: 'not-a-real-type' }) });
      expect(res.status()).toBe(400);
    },
  );

  test(
    'TC_API_25 employer cannot create a job as another employer',
    {
      annotation: {
        type: 'bug',
        description: 'BUG-04: employer_id in the body lets an employer post a job as another employer',
      },
    },
    async ({ api }) => {
      const victimId = api.seedId('employer2');
      const res = await api.post('/jobs', { role: 'employer', data: makeJob({ employer_id: victimId }) });

      expect.soft([201, 403], 'status').toContain(res.status());
      if (res.status() === 201) {
        const { job } = await json<{ job: JobDto }>(res);
        expect.soft(job.employer_id, 'job owner').toBe(api.seedId('employer'));
      }
    },
  );
});