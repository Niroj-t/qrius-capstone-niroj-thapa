import { test, expect, json } from '../fixtures/api';
import { HomePage } from '../pages/homePage';
import { makeJob, makeUser, uniqueId } from '../fixtures/data';
import { TEST_PREFIX } from '../fixtures/env';
import type { JobDto, JobListResponse } from '../fixtures/types';

const SQL_PAYLOADS = ["' OR '1'='1", "'; DROP TABLE jobs; --", "' UNION SELECT NULL, NULL --"];

test.describe('Security - input handling', () => {
  test('TC_SEC_08 SQL injection payloads are treated as plain text', async ({ api }) => {
    for (const payload of SQL_PAYLOADS) {
      const login = await api.post('/auth/login', { data: { email: payload, password: payload } });
      expect.soft(login.status(), `login with ${payload}`).toBe(401);

      const search = await api.get('/jobs', { params: { search: payload } });
      expect.soft(search.status(), `search with ${payload}`).toBe(200);
      expect.soft((await json<JobListResponse>(search)).jobs, `search results for ${payload}`).toHaveLength(0);

      const unsafe = await api.get('/jobs/search/unsafe', { params: { q: payload } });
      expect.soft(unsafe.status(), `unsafe search with ${payload}`).toBe(200);
      expect.soft(await json<JobDto[]>(unsafe), `unsafe search results for ${payload}`).toHaveLength(0);
    }
    const stillThere = await json<JobListResponse>(await api.get('/jobs'));
    expect(stillThere.total, 'jobs table still has data').toBeGreaterThan(0);
  });

  test(
    'TC_SEC_09 a script in a job title is not executed on the home page',
    { annotation: { type: 'bug', description: 'BUG-07: Stored XSS: script in a job title runs on the home page' } },
    async ({ api, page }) => {
      const marker = `${TEST_PREFIX}xss_${uniqueId()}`;
      await api.createJob({ title: `${marker}<img src=x onerror="window.__xss=true">` });

      const home = new HomePage(page);
      await home.goto();
      await home.search(marker);

      await expect(home.jobCards, 'the job is listed').toHaveCount(1);
      expect(await home.scriptFlagSet('__xss'), 'script from the job title ran').toBe(false);
    },
  );

  test(
    'TC_SEC_10 wrong data types and oversized values are rejected with 400',
    {
      annotation: {
        type: 'bug',
        description: 'BUG-08: Wrong data types and oversized input cause 500 or are accepted',
      },
    },
    async ({ api }) => {
      const user = makeUser('jobseeker');
      const registerCases: Record<string, unknown> = {
        'password as a number': { ...user, password: 1234567 },
        'email as an object': { ...user, email: { address: user.email } },
        'full name of 300 characters': { ...user, full_name: 'x'.repeat(300) },
      };
      for (const [label, data] of Object.entries(registerCases)) {
        const res = await api.post('/auth/register', { data });
        expect.soft(res.status(), `register with ${label}`).toBe(400);
      }

      const job = await api.post('/jobs', {
        role: 'employer',
        data: makeJob({ salary_min: 'abc' as unknown as number }),
      });
      expect.soft(job.status(), 'job with a text salary').toBe(400);
    },
  );
});
