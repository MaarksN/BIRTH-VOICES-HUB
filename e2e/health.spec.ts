import { test, expect } from '@playwright/test';

test('App health check', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.status()).toBe(200);
});

test('Frontend is serving the Landing Page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Birth Voices Hub/);
});
