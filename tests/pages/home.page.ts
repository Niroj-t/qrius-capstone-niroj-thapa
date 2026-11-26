import { Page, Locator } from '@playwright/test';

// SAMPLE Page Object (throwaway).
// This demonstrates the Page Object Model pattern against the public
// playwright.dev site. DELETE this file and write your own page objects
// against the Dai Hire Me app (http://localhost:3000).

export class SampleHomePage {
  readonly page: Page;
  readonly getStartedLink: Locator;
  readonly searchButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.getStartedLink = page.getByRole('link', { name: 'Get started' });
    this.searchButton = page.getByRole('button', { name: 'Search' });
  }

  async goto() {
    await this.page.goto('https://playwright.dev/');
  }

  async clickGetStarted() {
    await this.getStartedLink.click();
  }
}
