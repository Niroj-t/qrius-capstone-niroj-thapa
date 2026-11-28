import type { APIResponse } from '@playwright/test';
import { test, expect } from '../fixtures/api';
import { signToken, unsignedToken, withRole } from '../fixtures/tokens';
import { makeUser, DEFAULT_PASSWORD } from '../fixtures/data';

test.describe('Security - authentication', () => {
  test('TC_SEC_01 protected endpoints reject anonymous requests', async ({ api }) => {
    const protectedCalls: Array<['GET' | 'POST' | 'PUT' | 'DELETE', string]> = [
      ['GET', '/auth/me'],
      ['GET', '/users'],
      ['GET', '/applications'],
      ['POST', '/jobs'],
      ['PUT', '/jobs/1'],
      ['DELETE', '/jobs/1'],
      ['POST', '/applications'],
      ['PUT', '/applications/1'],
      ['PUT', '/users/1/status'],
      ['POST', '/test/reset'],
    ];
    for (const [method, path] of protectedCalls) {
      const res = await api.call(method, path);
      expect.soft(res.status(), `${method} ${path}`).toBe(401);
    }
  });

  test('TC_SEC_02 invalid, tampered and expired tokens are rejected', async ({ api }) => {
    const seeker = { id: api.seedId('jobseeker'), email: 'ram@gmail.com', role: 'jobseeker' as const };
    const admin = { id: api.seedId('admin'), email: 'admin@daihireme.com', role: 'admin' as const };
    const badTokens: Record<string, string> = {
      'malformed text': 'not-a-token',
      'three random parts': 'aaa.bbb.ccc',
      'signed with a wrong secret': signToken(admin, { secret: 'not-the-real-secret' }),
      'expired a minute ago': signToken(seeker, { expiresInSeconds: -60 }),
      'role changed to admin, old signature': withRole(api.seedToken('jobseeker'), 'admin'),
      'algorithm none': unsignedToken(admin),
    };
    for (const [label, token] of Object.entries(badTokens)) {
      const res = await api.get('/users', { token });
      expect.soft(res.status(), label).toBe(403);
    }
  });

  test('TC_SEC_03 passwords are never exposed and login does not reveal which emails exist', async ({ api }) => {
    const leak = /password|hash|\$2[aby]\$/i;
    const user = await api.registerUser('jobseeker');
    const job = await api.createJob();

    const responses: Array<[string, () => Promise<APIResponse>]> = [
      ['login', () => api.post('/auth/login', { data: { email: user.email, password: user.password } })],
      ['GET /auth/me', () => api.get('/auth/me', { token: user.token })],
      ['GET /users', () => api.get('/users', { role: 'admin' })],
      ['GET /jobs/:id', () => api.get(`/jobs/${job.id}`)],
    ];
    for (const [label, call] of responses) {
      const res = await call();
      expect.soft(res.status(), `${label} status`).toBe(200);
      expect.soft(await res.text(), `${label} body must not contain password data`).not.toMatch(leak);
    }

    const unknown = await api.post('/auth/login', {
      data: { email: `${user.email}.unknown`, password: user.password },
    });
    const wrong = await api.post('/auth/login', { data: { email: user.email, password: 'Wrong@999' } });
    expect.soft(unknown.status(), 'unknown email status').toBe(wrong.status());
    expect.soft(await unknown.text(), 'unknown email message').toBe(await wrong.text());
  });

  test(
    'TC_SEC_04 a deactivated user token stops working',
    { annotation: { type: 'bug', description: 'BUG-05: Deactivated user keeps access with an existing token' } },
    async ({ api }) => {
      const user = await api.registerUser('jobseeker');
      const before = await api.get('/auth/me', { token: user.token });
      expect(before.status(), 'token before deactivation').toBe(200);

      const off = await api.put(`/users/${user.id}/status`, { role: 'admin', data: { is_active: false } });
      expect(off.status(), 'deactivation').toBe(200);

      const me = await api.get('/auth/me', { token: user.token });
      expect.soft([401, 403], 'GET /auth/me with the old token').toContain(me.status());
      const job = await api.createJob();
      const apply = await api.post('/applications', { token: user.token, data: { job_id: job.id } });
      expect.soft([401, 403], 'POST /applications with the old token').toContain(apply.status());
    },
  );

  test(
    'TC_SEC_05 repeated wrong passwords are rate limited or locked out',
    { annotation: { type: 'bug', description: 'BUG-06: No rate limiting or lockout on repeated failed logins' } },
    async ({ api }) => {
      const user = await api.registerUser('jobseeker');
      const statuses: number[] = [];
      for (let attempt = 0; attempt < 15; attempt += 1) {
        const res = await api.post('/auth/login', { data: { email: user.email, password: `Wrong@${attempt}` } });
        statuses.push(res.status());
      }
      const correct = await api.post('/auth/login', { data: { email: user.email, password: DEFAULT_PASSWORD } });

      const throttled = statuses.some((s) => s === 429 || s === 423) || correct.status() !== 200;
      expect(throttled, `statuses ${statuses.join(',')}, then correct password gave ${correct.status()}`).toBe(true);
    },
  );
});
