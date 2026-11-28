import { test as base, expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import { BASE_URL } from './env';
import { DEFAULT_PASSWORD, makeJob, makeUser, type NewJob, type NewUser } from './data';
import type { ApplicationDto, AuthResponse, JobDto } from './types';

export { expect };

export type SeedRole = 'admin' | 'employer' | 'employer2' | 'jobseeker';

export const SEED_CREDENTIALS: Record<SeedRole, { email: string; password: string }> = {
  admin: { email: 'admin@daihireme.com', password: DEFAULT_PASSWORD },
  employer: { email: 'sita@techcorp.com', password: DEFAULT_PASSWORD },
  employer2: { email: 'ramesh@leapfrog.com', password: DEFAULT_PASSWORD },
  jobseeker: { email: 'ram@gmail.com', password: DEFAULT_PASSWORD },
};

export interface SeedSession {
  id: number;
  token: string;
}

export interface CallOptions {
  role?: SeedRole;
  token?: string;
  data?: unknown;
  params?: Record<string, string | number | boolean>;
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
    private readonly seeds: Record<SeedRole, SeedSession>,
  ) {}

  call(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, opts: CallOptions = {}): Promise<APIResponse> {
    const token = opts.token ?? (opts.role ? this.seeds[opts.role].token : undefined);
    return this.request.fetch(`/api${path}`, {
      method,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      data: opts.data,
      params: opts.params,
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

  seedId(role: SeedRole): number {
    return this.seeds[role].id;
  }

  seedToken(role: SeedRole): string {
  return this.seeds[role].token;
}

  async registerUser(
    role: 'jobseeker' | 'employer' = 'jobseeker',
    overrides: Partial<NewUser> = {},
  ): Promise<RegisteredUser> {
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
  seeds: Record<SeedRole, SeedSession>;
}
interface TestFixtures {
  api: ApiClient;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  seeds: [
    async ({ playwright }, use) => {
      const ctx = await playwright.request.newContext({ baseURL: BASE_URL });
      try {
        const roles = Object.keys(SEED_CREDENTIALS) as SeedRole[];
        const entries = await Promise.all(
          roles.map(async (role) => {
            const res = await ctx.post('/api/auth/login', { data: SEED_CREDENTIALS[role] });
            expect(res.status(), `seed login as ${role}`).toBe(200);
            const { token, user } = await json<AuthResponse>(res);
            return [role, { id: user.id, token }] as const;
          }),
        );
        await use(Object.fromEntries(entries) as Record<SeedRole, SeedSession>);
      } finally {
        await ctx.dispose();
      }
    },
    { scope: 'worker' },
  ],

  api: async ({ request, seeds }, use) => {
    await use(new ApiClient(request, seeds));
  },
});
