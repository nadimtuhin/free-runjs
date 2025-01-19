import { test, expect } from '@playwright/test';

test.describe('Sharing and Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.monaco-editor', { state: 'visible' });
  });

  test('should open share modal and copy share link', async ({ page }) => {
    // Clear any existing code
    await page.keyboard.press('Meta+A');
    await page.keyboard.press('Backspace');

    // Type some code to share
    await page.keyboard.type('console.log("Share test");');

    // Click share button
    await page.getByRole('button', { name: 'Share' }).click();

    // Verify share modal appears
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Share your code')).toBeVisible();

    // Verify share link is generated
    const shareLink = page.locator('input[readonly]');
    await expect(shareLink).toBeVisible();
    const linkValue = await shareLink.inputValue();
    expect(linkValue).toContain('/');
  });

  test('should open embed modal and show embed code', async ({ page }) => {
    // Click embed button
    await page.getByRole('button', { name: 'Embed' }).click();

    // Verify embed modal appears
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Copy this code to embed the editor:')).toBeVisible();

    // Verify iframe code is present
    const embedCode = page.locator('pre');
    await expect(embedCode).toBeVisible();
    const codeText = await embedCode.textContent();
    expect(codeText).toContain('<iframe');
    expect(codeText).toContain('/embed');
  });

  test('should toggle sidebar visibility', async ({ page }) => {
    // Check if sidebar is initially visible
    await expect(page.locator('nav.w-64')).toBeVisible();

    // Toggle sidebar
    await page.getByRole('button', { name: 'Toggle Sidebar' }).click();

    // Verify sidebar is hidden
    await expect(page.locator('nav.w-64')).not.toBeVisible();

    // Toggle sidebar back
    await page.getByRole('button', { name: 'Toggle Sidebar' }).click();

    // Verify sidebar is visible again
    await expect(page.locator('nav.w-64')).toBeVisible();
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

    // Type test code
    const testCode = 'console.log("Shared code test");';
    await page.keyboard.type(testCode);

    // Create share
    await page.getByRole('button', { name: 'Share' }).click();
    const shareLink = page.locator('input[readonly]');
    await expect(shareLink).toBeVisible();
    const linkValue = await shareLink.inputValue();

    // Navigate to share link
    await page.goto(linkValue);

    // Wait for editor and content to load
    await page.waitForSelector('.monaco-editor', { state: 'visible' });
    await page.waitForTimeout(1000);

    // Get editor content
    const editorContent = await page.evaluate(() => {
      // @ts-ignore
      return window.monaco?.editor?.getModels()[0]?.getValue() || '';
    });

    expect(editorContent).toContain(testCode);
  });
});
