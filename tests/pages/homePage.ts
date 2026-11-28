import type { Locator, Page } from '@playwright/test';

export class HomePage {
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly jobCards: Locator;

  constructor(private readonly page: Page) {
    this.searchInput = page.getByPlaceholder('Search jobs, companies, skills...');
    this.searchButton = page.getByRole('button', { name: 'Search', exact: true });
    this.jobCards = page.locator('#jobList .job-card');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.searchButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async scriptFlagSet(flag: string): Promise<boolean> {
    return this.page.evaluate((name) => (window as unknown as Record<string, unknown>)[name] === true, flag);
  }
}
