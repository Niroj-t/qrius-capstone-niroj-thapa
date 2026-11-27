import { test, expect, json, SEED_CREDENTIALS } from '../fixtures/api';
import { makeUser, DEFAULT_PASSWORD } from '../fixtures/data';
import type { AuthResponse, ErrorResponse, UserDto } from '../fixtures/types';

test.describe('API - authentication', () => {
  test('TC_API_02 register a new job seeker', async ({ api }) => {
    const user = makeUser('jobseeker');
    const res = await api.post('/auth/register', { data: user });
    expect(res.status()).toBe(201);
    const text = await res.text();
    const body = JSON.parse(text) as AuthResponse;
    expect(body.token).toBeTruthy();
    expect(body.user.email).toBe(user.email);
    expect(body.user.role).toBe('jobseeker');
    expect(body.user.full_name).toBe(user.full_name);
    expect(text.toLowerCase()).not.toContain('password');
  });

  test('TC_API_03 register with missing fields', async ({ api }) => {
    const res = await api.post('/auth/register', { data: { email: 'incomplete@example.com' } });
    expect(res.status()).toBe(400);
    expect((await json<ErrorResponse>(res)).error).toBeTruthy();
  });

  test('TC_API_04 nobody can self-register as admin', async ({ api }) => {
    const res = await api.post('/auth/register', { data: makeUser('admin') });
    expect(res.status()).toBe(400);
  });

  test('TC_API_05 register with an existing email', async ({ api }) => {
    const user = makeUser('jobseeker');
    const first = await api.post('/auth/register', { data: user });
    expect(first.status()).toBe(201);
    const second = await api.post('/auth/register', { data: user });
    expect(second.status()).toBe(409);
  });

  test('TC_API_06 register with a weak password', async ({ api }) => {
    const res = await api.post('/auth/register', { data: makeUser('jobseeker', { password: '123456' }) });
    expect(res.status()).toBe(400);
    expect((await json<ErrorResponse>(res)).error ?? '').toMatch(/password/i);
  });

  test('TC_API_07 login with valid credentials', async ({ api }) => {
    const user = await api.registerUser('jobseeker');
    const res = await api.post('/auth/login', { data: { email: user.email, password: user.password } });
    expect(res.status()).toBe(200);
    const body = await json<AuthResponse>(res);
    expect(body.token).toBeTruthy();
    expect(body.user.email).toBe(user.email);
  });

  test('TC_API_08 login with a wrong password', async ({ api }) => {
    const user = await api.registerUser('jobseeker');
    const res = await api.post('/auth/login', { data: { email: user.email, password: 'Wrong@999' } });
    expect(res.status()).toBe(401);
  });

  test('TC_API_09 login of a deactivated user', async ({ api }) => {
    const user = await api.registerUser('jobseeker');
    const off = await api.put(`/users/${user.id}/status`, { role: 'admin', data: { is_active: false } });
    expect(off.status()).toBe(200);
    const res = await api.post('/auth/login', { data: { email: user.email, password: DEFAULT_PASSWORD } });
    expect(res.status()).toBe(403);
  });

  test('TC_API_10 view the logged-in profile', async ({ api }) => {
    const login = await api.post('/auth/login', { data: SEED_CREDENTIALS.jobseeker });
    expect(login.status()).toBe(200);
    const { token, user } = await json<AuthResponse>(login);
    const res = await api.get('/auth/me', { token });
    expect(res.status()).toBe(200);
    const me = await json<UserDto>(res);
    expect(me.id).toBe(user.id);
    expect(me.role).toBe('jobseeker');
  });

  test('TC_API_11 profile without a valid token', async ({ api }) => {
    const none = await api.get('/auth/me');
    expect.soft(none.status(), 'no token').toBe(401);
    const bad = await api.get('/auth/me', { token: 'not.a.valid.token' });
    expect.soft(bad.status(), 'invalid token').toBe(403);
  });
});