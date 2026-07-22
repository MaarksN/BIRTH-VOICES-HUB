# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: health.spec.ts >> Frontend is serving the Landing Page
- Location: e2e\health.spec.ts:8:1

# Error details

```
Error: page.goto: net::ERR_EMPTY_RESPONSE at http://localhost:3000/
Call log:
  - navigating to "http://localhost:3000/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('App health check', async ({ page }) => {
  4  |   const response = await page.goto('http://localhost:3000/api/health');
  5  |   expect(response?.status()).toBe(200);
  6  | });
  7  | 
  8  | test('Frontend is serving the Landing Page', async ({ page }) => {
> 9  |   await page.goto('http://localhost:3000');
     |              ^ Error: page.goto: net::ERR_EMPTY_RESPONSE at http://localhost:3000/
  10 |   await expect(page).toHaveTitle(/Birth Voices Hub/); 
  11 | });
  12 | 
```