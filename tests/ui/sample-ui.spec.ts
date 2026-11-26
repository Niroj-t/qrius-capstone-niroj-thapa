import { test, expect } from '@playwright/test';
import { SampleHomePage } from '../pages/home.page';

// SAMPLE UI test (throwaway) - demonstrates structure + Page Object Model only.
// It runs against the public playwright.dev site so you can see a passing test
// immediately. DELETE this and write real UI tests for Dai Hire Me.

test.describe('SAMPLE - UI pattern', () => {
  test('has the expected page title', async ({ page }) => {
    await page.goto('https://playwright.dev/');
    await expect(page).toHaveTitle(/Playwright/);
  });

  test('navigates using a page object', async ({ page }) => {
    const home = new SampleHomePage(page);
    await home.goto();
    await home.clickGetStarted();
    await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
  });
});
