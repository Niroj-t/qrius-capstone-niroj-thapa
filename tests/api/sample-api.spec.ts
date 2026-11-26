import { test, expect } from '@playwright/test';

// SAMPLE API test (throwaway) - demonstrates Playwright's request context.
// It calls a public site. DELETE this and write real API tests against
// the Dai Hire Me API (http://localhost:3000/api).

test.describe('SAMPLE - API pattern', () => {
  test('GET returns a 200 response', async ({ request }) => {
    const res = await request.get('https://playwright.dev/');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('Playwright');
  });

  // In your real tests you will:
  //  - POST /api/auth/login to get a token
  //  - send the token as Authorization: Bearer <token>
  //  - assert status codes, response shape, and error cases
});
