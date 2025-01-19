import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:9323';

test.describe('Package Management and Module Types', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForSelector('.monaco-editor', { state: 'visible' });
    await page.waitForTimeout(1000); // Wait for editor to fully initialize
  });

  test('should open packages modal and search for packages', async ({ page }) => {
    // Open packages modal
    await page.getByRole('button', { name: 'Packages' }).click();
    await page.waitForTimeout(500); // Wait for modal animation

    // Wait for modal to be visible
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });

    // Search for a package
    const searchInput = page.getByPlaceholder('Search packages');
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await searchInput.fill('lodash');
    await page.waitForTimeout(1000); // Wait for search results

    // Verify search results
    await expect(page.getByText('lodash')).toBeVisible();
  });

  test('should add and use a package', async ({ page }) => {
    // Open packages modal
    await page.getByRole('button', { name: 'Packages' }).click();
    await page.waitForTimeout(500); // Wait for modal animation

    // Wait for modal and search input
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
    const searchInput = page.getByPlaceholder('Search packages');
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // Search and add lodash
    await searchInput.fill('lodash');
    await page.waitForTimeout(1000); // Wait for search results
    await page.getByText('lodash').click();

    // Close modal (if it doesn't auto-close)
    try {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500); // Wait for modal to close
    } catch (e) {
      // Modal might have auto-closed
    }

    // Clear any existing code
    await page.keyboard.press('Meta+A');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(500);

    // Type test code using lodash
    await page.keyboard.type(`import _ from 'lodash';\nconsole.log(_.capitalize('hello'));`);
    await page.waitForTimeout(500);

    // Run the code
    await page.getByRole('button', { name: /Run/i }).click();

    // Check output
    const output = page.locator('.bg-gray-800.font-mono');
    await expect(output).toBeVisible({ timeout: 5000 });
    await expect(output).toContainText('Hello', { timeout: 5000 });
  });

  test('should switch between module types', async ({ page }) => {
    // Click module type selector
    await page.getByText('Module Type:').click();

    // Switch to CommonJS
    await page.getByText('CommonJS').click();

    // Verify module type changed
    await expect(page.getByText('Module Type: CommonJS')).toBeVisible();

    // Clear any existing code
    await page.keyboard.press('Meta+A');
    await page.keyboard.press('Backspace');

    // Type CommonJS code
    await page.keyboard.type(`const _ = require('lodash');\nconsole.log(_.capitalize('hello'));`);

    // Run the code
    await page.getByRole('button', { name: /Run/i }).click();

    // Check output
    const output = page.locator('.bg-gray-800.font-mono');
    await expect(output).toBeVisible();
    await expect(output).toContainText('Hello');
  });

  test('should show package import suggestions', async ({ page }) => {
    // Clear any existing code
    await page.keyboard.press('Meta+A');
    await page.keyboard.press('Backspace');

    // Add lodash package first
    await page.getByRole('button', { name: 'Packages' }).click();
    await page.getByPlaceholder('Search packages').fill('lodash');
    await page.waitForTimeout(500);
    await page.getByText('lodash').click();

    // Type import statement
    await page.keyboard.type('import lodash');

    // Wait for suggestion popup
    await page.waitForTimeout(500);
    await expect(page.locator('.suggest-widget')).toBeVisible();

    // Verify lodash appears in suggestions
    await expect(page.locator('.suggest-widget')).toContainText('lodash');
  });
});
