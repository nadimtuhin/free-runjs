import { test, expect } from '@playwright/test';

test.describe('Main Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.monaco-editor', { state: 'visible' });

    // Clear any existing code
    await page.keyboard.press('Meta+A');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(500); // Wait for editor to update
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
    // Type some test code
    await page.keyboard.type('console.log("Hello, RunJS!");');
    await page.waitForTimeout(500); // Wait for editor to update

    // Run the code
    await page.getByRole('button', { name: /Run/i }).click();

    // Wait for output to appear and not be the default text
    const output = page.locator('.bg-gray-800.font-mono');
    await expect(output).toBeVisible();
    await expect(async () => {
      const text = await output.textContent();
      expect(text).not.toBe('Output will appear here...');
      expect(text).toContain('Hello, RunJS!');
    }).toPass();
  });

  test('should handle syntax errors gracefully', async ({ page }) => {
    // Type code with syntax error
    await page.keyboard.type('console.log("Unclosed string);');
    await page.waitForTimeout(500); // Wait for editor to update

    // Run the code
    await page.getByRole('button', { name: /Run/i }).click();

    // Wait for error to appear
    const output = page.locator('.bg-gray-800.font-mono');
    await expect(output).toBeVisible();
    await expect(async () => {
      const text = await output.textContent();
      expect(text).not.toBe('Output will appear here...');
      expect(text).toContain('SyntaxError');
    }).toPass();
  });

  test('should persist code changes', async ({ page }) => {
    const testCode = 'console.log("Test persistence");';

    // Type test code
    await page.keyboard.type(testCode);
    await page.waitForTimeout(1000); // Wait for auto-save

    // Reload the page
    await page.reload();
    await page.waitForSelector('.monaco-editor', { state: 'visible' });
    await page.waitForTimeout(1000); // Wait for content to load

    // Get editor content using Monaco API
    const editorContent = await page.evaluate(() => {
      // @ts-ignore
      return window.monaco?.editor?.getModels()[0]?.getValue() || '';
    });

    expect(editorContent.trim()).toBe(testCode.trim());
  });
});
