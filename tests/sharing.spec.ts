import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:9323';

test.describe('Sharing and Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForSelector('.monaco-editor', { state: 'visible' });
    await page.waitForTimeout(1000); // Wait for editor to fully initialize
  });

  test('should open share modal and copy share link', async ({ page }) => {
    // Clear any existing code
    await page.keyboard.press('Meta+A');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(500);

    // Type some code to share
    await page.keyboard.type('console.log("Share test");');
    await page.waitForTimeout(500);

    // Click share button
    await page.getByRole('button', { name: 'Share' }).click();
    await page.waitForTimeout(500); // Wait for modal animation

    // Verify share modal appears
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Share your code')).toBeVisible({ timeout: 5000 });

    // Verify share link is generated
    const shareLink = page.locator('input[readonly]');
    await expect(shareLink).toBeVisible({ timeout: 5000 });
    const linkValue = await shareLink.inputValue();
    expect(linkValue).toContain('/');
  });

  test('should open embed modal and show embed code', async ({ page }) => {
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

  test('should toggle sidebar visibility', async ({ page }) => {
    await page.waitForTimeout(1000); // Wait for initial render

    // Check if sidebar is initially visible
    const sidebar = page.locator('nav').first();
    await expect(sidebar).toBeVisible({ timeout: 5000 });

    // Toggle sidebar
    await page.getByRole('button', { name: 'Toggle Sidebar' }).click();
    await page.waitForTimeout(500); // Wait for animation

    // Verify sidebar is hidden
    await expect(sidebar).not.toBeVisible();

    // Toggle sidebar back
    await page.getByRole('button', { name: 'Toggle Sidebar' }).click();
    await page.waitForTimeout(500); // Wait for animation

    // Verify sidebar is visible again
    await expect(sidebar).toBeVisible();
  });

  test('should navigate to credits page', async ({ page }) => {
    // Click credits link in sidebar
    await page.getByRole('link', { name: 'Credits' }).click();

    // Verify navigation to credits page
    await expect(page).toHaveURL(/.*\/credits/);
    await expect(page.getByRole('heading', { name: 'Credits' })).toBeVisible();
  });

  test('should load shared code from URL', async ({ page }) => {
    // Clear any existing code
    await page.keyboard.press('Meta+A');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(500);

    // Type test code
    const testCode = 'console.log("Shared code test");';
    await page.keyboard.type(testCode);
    await page.waitForTimeout(500);

    // Create share
    await page.getByRole('button', { name: 'Share' }).click();
    await page.waitForTimeout(500); // Wait for modal animation

    // Wait for share link
    const shareLink = page.locator('input[readonly]');
    await expect(shareLink).toBeVisible({ timeout: 10000 });
    const linkValue = await shareLink.inputValue();

    // Navigate to share link
    await page.goto(linkValue);
    await page.waitForSelector('.monaco-editor', { state: 'visible' });
    await page.waitForTimeout(2000); // Wait for content to load

    // Get editor content
    const editorContent = await page.evaluate(() => {
      // @ts-ignore
      return window.monaco?.editor?.getModels()[0]?.getValue() || '';
    });

    expect(editorContent).toContain(testCode);
  });
});
