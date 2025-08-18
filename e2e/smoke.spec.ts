import { test, expect } from '@playwright/test';

test.skip(process.env.E2E_ENABLED !== 'true', 'E2E disabled in this environment');

test('smoke placeholder', async () => {
  expect(true).toBe(true);
});
