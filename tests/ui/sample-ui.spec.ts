import { test, expect } from '@playwright/test';

test('Verify login page title', async ({ page }) => {
  await page.goto('');

  await expect(page).toHaveTitle('Dai Hire Me');
});