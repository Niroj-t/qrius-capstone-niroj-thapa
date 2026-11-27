import { request } from '@playwright/test';
import { BASE_URL } from './env';

export default async function globalSetup(): Promise<void> {
  const ctx = await request.newContext({ baseURL: BASE_URL });
  const res = await ctx.get('/api/health').catch(() => null);
  await ctx.dispose();
  if (!res || res.status() !== 200) {
    throw new Error(
      `Dai Hire Me is not healthy at ${BASE_URL}. Start PostgreSQL and run "npm start" in the app folder first.`,
    );
  }
}
