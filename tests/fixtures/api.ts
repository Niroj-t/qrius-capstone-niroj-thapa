import { test as base, expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import { BASE_URL } from './env';
import { makeJob, makeUser, type NewJob, type NewUser } from './data';
import type { ApplicationDto, AuthResponse, JobDto, UserDto } from './types';

export { expect };

export type SeedRole = 'admin' | 'employer' | 'employer2' | 'jobseeker';

export const SEED_CREDENTIALS: Record<SeedRole, { email: string; password: string }> = {
  admin: { email: 'admin@daihireme.com', password: 'Test@123' },
  employer: { email: 'sita@techcorp.com', password: 'Test@123' },
  employer2: { email: 'ramesh@leapfrog.com', password: 'Test@123' },
  jobseeker: { email: 'ram@gmail.com', password: 'Test@123' },
};

export interface CallOptions {
  role?: SeedRole;
  token?: string;
  data?: unknown;
}

export interface RegisteredUser extends NewUser {
  id: number;
  token: string;
}

export async function json<T>(res: APIResponse): Promise<T> {
  return (await res.json()) as T;
}

export class ApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly tokens: Record<SeedRole, string>,
  ) {}

  call(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, opts: CallOptions = {}): Promise<APIResponse> {
    const token = opts.token ?? (opts.role ? this.tokens[opts.role] : undefined);
    return this.request.fetch(`/api${path}`, {
      method,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      data: opts.data,
    });
  }

  get(path: string, opts?: CallOptions): Promise<APIResponse> {
    return this.call('GET', path, opts);
  }
  post(path: string, opts?: CallOptions): Promise<APIResponse> {
    return this.call('POST', path, opts);
  }
  put(path: string, opts?: CallOptions): Promise<APIResponse> {
    return this.call('PUT', path, opts);
  }
  del(path: string, opts?: CallOptions): Promise<APIResponse> {
    return this.call('DELETE', path, opts);
  }

  async seedUserId(role: SeedRole): Promise<number> {
    const res = await this.get('/auth/me', { role });
    expect(res.status(), `GET /auth/me as ${role}`).toBe(200);
    return (await json<UserDto>(res)).id;
  }

  async registerUser(role: string = 'jobseeker', overrides: Partial<NewUser> = {}): Promise<RegisteredUser> {
    const payload = makeUser(role, overrides);
    const res = await this.post('/auth/register', { data: payload });
    expect(res.status(), 'register helper').toBe(201);
    const body = await json<AuthResponse>(res);
    return { ...payload, id: body.user.id, token: body.token };
  }

  async createJob(overrides: Partial<NewJob> = {}, role: SeedRole = 'employer'): Promise<JobDto> {
    const res = await this.post('/jobs', { role, data: makeJob(overrides) });
    expect(res.status(), 'create job helper').toBe(201);
    return (await json<{ job: JobDto }>(res)).job;
  }

  async apply(jobId: number, token: string, coverLetter = 'Hello'): Promise<ApplicationDto> {
    const res = await this.post('/applications', { token, data: { job_id: jobId, cover_letter: coverLetter } });
    expect(res.status(), 'apply helper').toBe(201);
    return (await json<{ application: ApplicationDto }>(res)).application;
  }
}

interface WorkerFixtures {
  tokens: Record<SeedRole, string>;
}
interface TestFixtures {
  api: ApiClient;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  tokens: [
    async ({ playwright }, use) => {
      const ctx = await playwright.request.newContext({ baseURL: BASE_URL });
      const tokens = {} as Record<SeedRole, string>;
      for (const role of Object.keys(SEED_CREDENTIALS) as SeedRole[]) {
        const res = await ctx.post('/api/auth/login', { data: SEED_CREDENTIALS[role] });
        expect(res.status(), `seed login as ${role}`).toBe(200);
        tokens[role] = (await json<AuthResponse>(res)).token;
      }
      await ctx.dispose();
      await use(tokens);
    },
    { scope: 'worker' },
  ],

  api: async ({ request, tokens }, use) => {
    await use(new ApiClient(request, tokens));
  },
});
