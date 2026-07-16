import { test, expect } from '@playwright/test';

test('App health check', async ({ page }) => {
  const response = await page.goto('http://localhost:3000/api/health');
  expect(response?.status()).toBe(200);
});

test('Frontend is serving the Landing Page', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page).toHaveTitle(/Birth Voices Hub/); 
});
