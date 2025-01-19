import { test, expect } from '@playwright/test';

test.describe('Embed Page', () => {
  const BASE_URL = 'http://localhost:30000';

  test.beforeEach(async ({ page }) => {
    // Navigate to the embed page before each test
    await page.goto(`${BASE_URL}/embed`);
    // Wait for the editor to be fully loaded
    await page.waitForSelector('.monaco-editor', { state: 'visible' });
  });

  test('should load the embed page with default code', async ({ page }) => {
    // Check if the module type is displayed
    await expect(page.getByText('Module Type: ES Modules')).toBeVisible();

    // Check if Run button is present and enabled
    const runButton = page.getByRole('button', { name: /Run/i });
    await expect(runButton).toBeVisible();
    await expect(runButton).toBeEnabled();
  });

  test('should be able to run code and see output', async ({ page }) => {
    // Wait for any initial auto-run to complete
    await page.waitForTimeout(1000);

    // Click the Run button
    const runButton = page.getByRole('button', { name: /Run/i });
    await runButton.click();

    // Wait for the output to appear and not be empty
    const outputElement = page.locator('.bg-gray-800.font-mono');
    await expect(outputElement).toBeVisible();

    // Wait for actual content to appear
    await expect(async () => {
      const content = await outputElement.textContent();
      expect(content?.trim()).not.toBe('Output will appear here...');
    }).toPass();
  });

  test('should show embed code when clicking embed button', async ({ page }) => {
    // Click the Embed button
    await page.getByRole('button', { name: 'Embed' }).click();

    // Check if embed code dialog appears with proper content
    await expect(page.getByText('Copy this code to embed the editor:')).toBeVisible();

    // Check if iframe code is present and contains the correct URL
    const preElement = page.locator('pre');
    await expect(preElement).toBeVisible();
    const embedCode = await preElement.textContent();
    expect(embedCode).toContain('<iframe');
    expect(embedCode).toContain('/embed');
  });
});
