import { test, expect, json, SEED_CREDENTIALS } from '../fixtures/api';
import { makeUser } from '../fixtures/data';
import type { AuthResponse, ErrorResponse, UserDto } from '../fixtures/types';

test.describe('API - authentication', () => {
  test('TC_API_02 register a new job seeker', async ({ api }) => {
    const user = makeUser('jobseeker');
    const res = await api.post('/auth/register', { data: user });
    expect(res.status(), 'status').toBe(201);
    const text = await res.text();
    const body = JSON.parse(text) as AuthResponse;
    expect.soft(body.token, 'token').toBeTruthy();
    expect.soft(body.user.email, 'email').toBe(user.email);
    expect.soft(body.user.role, 'role').toBe('jobseeker');
    expect.soft(body.user.full_name, 'full name').toBe(user.full_name);
    expect.soft(text.toLowerCase(), 'password must not be returned').not.toContain('password');
  });

  test('TC_API_03 register with missing fields', async ({ api }) => {
    const res = await api.post('/auth/register', { data: { email: 'incomplete@example.com' } });
    expect.soft(res.status(), 'status').toBe(400);
    expect.soft((await json<ErrorResponse>(res)).error, 'error message').toBeTruthy();
  });

  test('TC_API_04 nobody can self-register as admin', async ({ api }) => {
    const res = await api.post('/auth/register', { data: makeUser('admin') });
    expect(res.status()).toBe(400);
  });

  test('TC_API_05 register with an existing email', async ({ api }) => {
    const user = makeUser('jobseeker');
    const first = await api.post('/auth/register', { data: user });
    expect(first.status(), 'first registration').toBe(201);
    const second = await api.post('/auth/register', { data: user });
    expect(second.status(), 'second registration').toBe(409);
  });

  test(
    'TC_API_06 register with a weak password',
    { annotation: { type: 'bug', description: 'BUG-01: Weak password such as 123456 is accepted at registration' } },
    async ({ api }) => {
      const res = await api.post('/auth/register', { data: makeUser('jobseeker', { password: '123456' }) });
      expect.soft(res.status(), 'status').toBe(400);
      expect.soft((await json<ErrorResponse>(res)).error ?? '', 'error message').toMatch(/password/i);
    },
  );

  test('TC_API_07 login with valid credentials', async ({ api }) => {
    const user = await api.registerUser('jobseeker');
    const res = await api.post('/auth/login', { data: { email: user.email, password: user.password } });
    expect(res.status(), 'status').toBe(200);
    const body = await json<AuthResponse>(res);
    expect.soft(body.token, 'token').toBeTruthy();
    expect.soft(body.user.email, 'email').toBe(user.email);
  });

  test('TC_API_08 login with a wrong password', async ({ api }) => {
    const user = await api.registerUser('jobseeker');
    const res = await api.post('/auth/login', { data: { email: user.email, password: 'Wrong@999' } });
    expect(res.status()).toBe(401);
  });

  test('TC_API_09 login of a deactivated user', async ({ api }) => {
    const user = await api.registerUser('jobseeker');
    const off = await api.put(`/users/${user.id}/status`, { role: 'admin', data: { is_active: false } });
    expect(off.status(), 'deactivation').toBe(200);
    const res = await api.post('/auth/login', { data: { email: user.email, password: user.password } });
    expect(res.status(), 'login after deactivation').toBe(403);
  });

  test('TC_API_10 view the logged-in profile', async ({ api }) => {
    const login = await api.post('/auth/login', { data: SEED_CREDENTIALS.jobseeker });
    expect(login.status(), 'login').toBe(200);
    const { token, user } = await json<AuthResponse>(login);
    const res = await api.get('/auth/me', { token });
    expect(res.status(), 'GET /auth/me').toBe(200);
    const me = await json<UserDto>(res);
    expect.soft(me.id, 'id').toBe(user.id);
    expect.soft(me.role, 'role').toBe('jobseeker');
  });

  test('TC_API_11 profile without a valid token', async ({ api }) => {
    const none = await api.get('/auth/me');
    expect.soft(none.status(), 'no token').toBe(401);
    const bad = await api.get('/auth/me', { token: 'not.a.valid.token' });
    expect.soft(bad.status(), 'invalid token').toBe(403);
  });
});