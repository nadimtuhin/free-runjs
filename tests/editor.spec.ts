import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:9323';

test.describe('Main Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForSelector('.monaco-editor', { state: 'visible', timeout: 30000 });
    await page.waitForTimeout(1000); // Wait for editor to fully initialize

    // Clear any existing code and local storage
    await page.evaluate(() => {
      localStorage.clear();
      // @ts-ignore
      window.monaco?.editor?.getModels()[0]?.setValue('');
    });
    await page.waitForTimeout(1000); // Wait for editor to update
  });

  test('should load the editor with default configuration', async ({ page }) => {
    // Check if editor is visible and interactive
    await expect(page.locator('.monaco-editor')).toBeVisible();

    // Check if Run button is present
    const runButton = page.getByRole('button', { name: /Run/i });
    await expect(runButton).toBeVisible();
    await expect(runButton).toBeEnabled();
  });

  test('should execute code and display output', async ({ page }) => {
    // Clear editor and type test code
    await page.evaluate(() => {
      // @ts-ignore
      window.monaco?.editor?.getModels()[0]?.setValue('');
    });
    await page.waitForTimeout(500);
    await page.keyboard.type('console.log("Hello, RunJS!");');
    await page.waitForTimeout(500); // Wait for editor to update

    // Run the code
    await page.getByRole('button', { name: /Run/i }).click();

    // Check output
    const output = page.locator('.bg-gray-800.font-mono');
    await expect(output).toBeVisible({ timeout: 5000 });
    await expect(async () => {
      const text = await output.textContent();
      expect(text).toContain('Hello, RunJS!');
    }).toPass({ timeout: 10000 });
  });

  test('should handle syntax errors gracefully', async ({ page }) => {
    // Clear editor and type code with syntax error
    await page.evaluate(() => {
      // @ts-ignore
      window.monaco?.editor?.getModels()[0]?.setValue('');
    });
    await page.waitForTimeout(500);
    await page.keyboard.type('console.log("Unclosed string);');
    await page.waitForTimeout(500); // Wait for editor to update

    // Run the code
    await page.getByRole('button', { name: /Run/i }).click();

    // Check output
    const output = page.locator('.bg-gray-800.font-mono');
    await expect(output).toBeVisible({ timeout: 5000 });
    await expect(async () => {
      const text = await output.textContent();
      expect(text).toContain('SyntaxError');
    }).toPass({ timeout: 10000 });
  });

  test('should persist code changes', async ({ page }) => {
    const testCode = 'console.log("Test persistence");';

    // Clear editor and type test code
    await page.evaluate(() => {
      localStorage.clear();
      // @ts-ignore
      window.monaco?.editor?.getModels()[0]?.setValue('');
    });
    await page.waitForTimeout(500);
    await page.keyboard.type(testCode);
    await page.waitForTimeout(1000); // Wait for auto-save

    // Reload the page
    await page.reload();
    await page.waitForSelector('.monaco-editor', { state: 'visible', timeout: 30000 });
    await page.waitForTimeout(1000); // Wait for content to load

    // Get editor content
    const editorContent = await page.evaluate(() => {
      // @ts-ignore
      return window.monaco?.editor?.getModels()[0]?.getValue() || '';
    });

    // Compare content
    expect(editorContent.trim()).toBe(testCode.trim());
  });
});
