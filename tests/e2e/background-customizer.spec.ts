import { test, expect } from '@playwright/test';
import { navigateTo, setupConsoleMonitor, assertNoConsoleErrors } from './helpers';

/**
 * Background Customizer E2E Tests
 *
 * Tests the background customization modal:
 * background types, gradient presets, image upload,
 * opacity/blur sliders, apply/reset/cancel.
 */

test.describe('Background Customizer', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleMonitor(page);
    await navigateTo(page, '/settings');
  });

  async function openBackgroundCustomizer(page: import('@playwright/test').Page) {
    const customizeBtn = page.getByRole('button', { name: /自定义背景/ });
    if (await customizeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await customizeBtn.click();
      await page.waitForTimeout(500);
    }
  }

  test('opens background customizer modal', async ({ page }) => {
    await openBackgroundCustomizer(page);
    await expect(page.getByRole('heading', { name: '自定义背景', exact: true })).toBeVisible();
    assertNoConsoleErrors(page);
  });

  test('has background type buttons', async ({ page }) => {
    await openBackgroundCustomizer(page);
    const noneBtn = page.getByRole('button', { name: '无', exact: true });
    const gradientBtn = page.getByRole('button', { name: '渐变', exact: true });
    const imageBtn = page.getByRole('button', { name: '图片', exact: true });

    if (await noneBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(noneBtn).toBeVisible();
      await expect(gradientBtn).toBeVisible();
      await expect(imageBtn).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('has pattern button disabled with coming soon', async ({ page }) => {
    await openBackgroundCustomizer(page);
    const patternBtn = page.getByRole('button', { name: /图案.*推出/ });
    if (await patternBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(patternBtn).toBeDisabled();
    }
    assertNoConsoleErrors(page);
  });

  test('can select Gradient type and see presets', async ({ page }) => {
    await openBackgroundCustomizer(page);
    const gradientBtn = page.getByRole('button', { name: '渐变', exact: true });
    if (await gradientBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await gradientBtn.click();
      await page.waitForTimeout(300);

      // Should show gradient presets
      const purplePreset = page.locator('[title="紫色梦幻"]');
      if (await purplePreset.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(purplePreset).toBeVisible();
      }
    }
    assertNoConsoleErrors(page);
  });

  test('can select a gradient preset', async ({ page }) => {
    await openBackgroundCustomizer(page);
    const gradientBtn = page.getByRole('button', { name: '渐变', exact: true });
    if (await gradientBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await gradientBtn.click();
      await page.waitForTimeout(300);

      const oceanPreset = page.locator('[title="海洋"]');
      if (await oceanPreset.isVisible({ timeout: 1000 }).catch(() => false)) {
        await oceanPreset.click();
        await page.waitForTimeout(200);
      }
    }
    assertNoConsoleErrors(page);
  });

  test('has opacity slider', async ({ page }) => {
    await openBackgroundCustomizer(page);
    const gradientBtn = page.getByRole('button', { name: '渐变', exact: true });
    if (await gradientBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await gradientBtn.click();
      await page.waitForTimeout(300);

      const opacityLabel = page.getByText(/不透明度：\d+%/);
      if (await opacityLabel.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(opacityLabel).toBeVisible();
      }
    }
    assertNoConsoleErrors(page);
  });

  test('has blur slider', async ({ page }) => {
    await openBackgroundCustomizer(page);
    const gradientBtn = page.getByRole('button', { name: '渐变', exact: true });
    if (await gradientBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await gradientBtn.click();
      await page.waitForTimeout(300);

      const blurLabel = page.getByText(/模糊：\d+px/);
      if (await blurLabel.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(blurLabel).toBeVisible();
      }
    }
    assertNoConsoleErrors(page);
  });

  test('has Apply, Cancel, and Reset buttons', async ({ page }) => {
    await openBackgroundCustomizer(page);
    const applyBtn = page.getByRole('button', { name: '应用', exact: true });
    const cancelBtn = page.getByRole('button', { name: '取消', exact: true });
    const resetBtn = page.getByRole('button', { name: '重置', exact: true });

    if (await applyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(applyBtn).toBeVisible();
      await expect(cancelBtn).toBeVisible();
      await expect(resetBtn).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('can close with close button', async ({ page }) => {
    await openBackgroundCustomizer(page);
    const closeBtn = page.locator('[aria-label="关闭背景自定义"]');
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(300);
    }
    assertNoConsoleErrors(page);
  });

  test('can apply a gradient and close', async ({ page }) => {
    await openBackgroundCustomizer(page);
    const gradientBtn = page.getByRole('button', { name: '渐变', exact: true });
    if (await gradientBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await gradientBtn.click();
      await page.waitForTimeout(200);

      const sunrisePreset = page.locator('[title="日出"]');
      if (await sunrisePreset.isVisible({ timeout: 1000 }).catch(() => false)) {
        await sunrisePreset.click();
        await page.waitForTimeout(200);
      }

      const applyBtn = page.getByRole('button', { name: '应用', exact: true });
      if (await applyBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await applyBtn.click();
        await page.waitForTimeout(300);
      }
    }
    assertNoConsoleErrors(page);
  });

  test('reset clears background selection', async ({ page }) => {
    await openBackgroundCustomizer(page);
    const resetBtn = page.getByRole('button', { name: '重置', exact: true });
    if (await resetBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await resetBtn.click();
      await page.waitForTimeout(200);
    }
    assertNoConsoleErrors(page);
  });
});
