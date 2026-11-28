import { test, expect, json } from '../fixtures/api';
import type { UserListResponse } from '../fixtures/types';

test.describe('API - users (admin)', () => {
  test('TC_API_22 admin lists users and a job seeker cannot', async ({ api }) => {
    const admin = await api.get('/users', { role: 'admin', params: { role: 'jobseeker', limit: 5 } });
    expect.soft(admin.status(), 'admin').toBe(200);
    const body = await json<UserListResponse>(admin);
    expect.soft(body.users.length, 'users returned').toBeGreaterThan(0);
    expect
      .soft(
        body.users.every((u) => u.role === 'jobseeker'),
        'every user is a job seeker',
      )
      .toBe(true);

    const seeker = await api.get('/users', { role: 'jobseeker' });
    expect.soft(seeker.status(), 'job seeker').toBe(403);
  });
});