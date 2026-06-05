import { expect, test } from '@playwright/test';

test('serves the production app and status endpoint', async ({ page, request }) => {
  const status = await request.get('/api/status');
  expect(status.ok()).toBe(true);
  expect(status.headers()['x-content-type-options']).toBe('nosniff');

  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Birth Voices Hub/i })).toBeVisible();
});
