import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:9323';

test.describe('Embed Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/embed`);
    // Wait for the editor to be fully loaded with increased timeout
    await page.waitForSelector('.monaco-editor', { state: 'visible', timeout: 30000 });
    await page.waitForTimeout(1000); // Additional wait for editor initialization
  });

  test('should load the embed page with default code', async ({ page }) => {
    // Verify editor is visible and contains code
    const editor = page.locator('.monaco-editor');
    await expect(editor).toBeVisible();

    // Get editor content
    const editorContent = await page.evaluate(() => {
      // @ts-ignore
      return window.monaco?.editor?.getModels()[0]?.getValue() || '';
    });

    // Verify it contains some default code
    expect(editorContent).toContain('console.log');
  });

  test('should be able to run code and see output', async ({ page }) => {
    // Clear existing code
    await page.keyboard.press('Meta+A');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(500);

    // Type test code
    const testCode = 'console.log("Embed test");';
    await page.keyboard.type(testCode);
    await page.waitForTimeout(500);

    // Run the code
    await page.getByRole('button', { name: /Run/i }).click();

    // Check output
    const output = page.locator('.bg-gray-800.font-mono');
    await expect(output).toBeVisible({ timeout: 5000 });
    await expect(output).toContainText('Embed test', { timeout: 5000 });
  });

  test('should show embed code when clicking embed button', async ({ page }) => {
    // Click embed button
    await page.getByRole('button', { name: 'Embed' }).click();
    await page.waitForTimeout(500); // Wait for modal animation

    // Verify embed modal appears
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Copy this code to embed the editor:')).toBeVisible({ timeout: 5000 });

    // Verify iframe code is present
    const embedCode = page.locator('pre');
    await expect(embedCode).toBeVisible({ timeout: 5000 });
    const codeText = await embedCode.textContent();
    expect(codeText).toContain('<iframe');
    expect(codeText).toContain('/embed');
  });
});
