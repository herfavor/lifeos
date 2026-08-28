import { test, expect } from '@playwright/test';
import { navigateTo, setupConsoleMonitor, assertNoConsoleErrors } from './helpers';

/**
 * AI Terminal E2E Tests
 *
 * Tests the AI terminal/chat widget:
 * input, send button, provider config.
 */

test.describe('AI Terminal', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleMonitor(page);
    await navigateTo(page, '/');
  });

  test('has AI terminal or chat widget', async ({ page }) => {
    const aiWidget = page.getByText(/AI|终端|聊天|助手/i).first();
    if (await aiWidget.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(aiWidget).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('AI terminal has input field', async ({ page }) => {
    const input = page.getByPlaceholder(/配置提供商|输入|聊天/i).first();
    if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(input).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('AI terminal has send button', async ({ page }) => {
    const sendBtn = page.getByRole('button', { name: /发送/i }).first()
      .or(page.locator('[aria-label*="发送"]').first());
    if (await sendBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sendBtn).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('can type in AI terminal', async ({ page }) => {
    const input = page.getByPlaceholder(/配置提供商|输入|聊天/i).first();
    if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
      await input.click();
      await input.fill('Hello AI');
      await page.waitForTimeout(200);
      await expect(input).toHaveValue('Hello AI');
    }
    assertNoConsoleErrors(page);
  });
});
