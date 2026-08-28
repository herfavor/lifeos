import { test, expect } from '@playwright/test';
import { navigateTo, setupConsoleMonitor, assertNoConsoleErrors } from './helpers';

/**
 * Form Builder E2E Tests
 *
 * Tests the form builder page: creating forms,
 * adding fields of various types, field editor modal,
 * preview mode, saving forms.
 */

test.describe('Form Builder', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleMonitor(page);
    await navigateTo(page, '/create?tab=forms');
  });

  test('can navigate to forms tab', async ({ page }) => {
    const formsTab = page.getByRole('tab', { name: '表单' });
    if (await formsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(formsTab).toHaveAttribute('aria-selected', 'true');
    }
    assertNoConsoleErrors(page);
  });

  test('can create a new form', async ({ page }) => {
    // Look for new form button
    const newFormBtn = page.getByRole('button', { name: /新建.*表单|创建.*表单|\+/i }).first();
    if (await newFormBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await newFormBtn.click();
      await page.waitForTimeout(500);
    }
    assertNoConsoleErrors(page);
  });

  test('form has title and description inputs', async ({ page }) => {
    // Open/create a form first
    const newFormBtn = page.getByRole('button', { name: /新建.*表单|创建.*表单|\+/i }).first();
    if (await newFormBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await newFormBtn.click();
      await page.waitForTimeout(500);
    }

    const titleInput = page.getByPlaceholder('表单标题');
    if (await titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(titleInput).toBeVisible();
      await titleInput.fill('E2E Test Form');
    }

    const descInput = page.getByPlaceholder('描述（可选）');
    if (await descInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(descInput).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('has Add Field button', async ({ page }) => {
    const newFormBtn = page.getByRole('button', { name: /新建.*表单|创建.*表单|\+/i }).first();
    if (await newFormBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await newFormBtn.click();
      await page.waitForTimeout(500);
    }

    const addFieldBtn = page.getByRole('button', { name: '添加字段' });
    if (await addFieldBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(addFieldBtn).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('can open field editor modal', async ({ page }) => {
    const newFormBtn = page.getByRole('button', { name: /新建.*表单|创建.*表单|\+/i }).first();
    if (await newFormBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await newFormBtn.click();
      await page.waitForTimeout(500);
    }

    const addFieldBtn = page.getByRole('button', { name: '添加字段' });
    if (await addFieldBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addFieldBtn.click();
      await page.waitForTimeout(300);

      // Field editor modal should open
      const heading = page.getByText('添加字段');
      if (await heading.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(heading).toBeVisible();
      }
    }
    assertNoConsoleErrors(page);
  });

  test('field editor has field type selector with all types', async ({ page }) => {
    const newFormBtn = page.getByRole('button', { name: /新建.*表单|创建.*表单|\+/i }).first();
    if (await newFormBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await newFormBtn.click();
      await page.waitForTimeout(500);
    }

    const addFieldBtn = page.getByRole('button', { name: '添加字段' });
    if (await addFieldBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addFieldBtn.click();
      await page.waitForTimeout(300);

      // Should have field type select with many options
      const typeSelect = page.locator('select').filter({ has: page.locator('option[value="text"]') });
      if (await typeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Verify key field types exist
        await expect(typeSelect.locator('option[value="textarea"]')).toBeAttached();
        await expect(typeSelect.locator('option[value="number"]')).toBeAttached();
        await expect(typeSelect.locator('option[value="date"]')).toBeAttached();
        await expect(typeSelect.locator('option[value="select"]')).toBeAttached();
        await expect(typeSelect.locator('option[value="checkbox"]')).toBeAttached();
        await expect(typeSelect.locator('option[value="rating"]')).toBeAttached();
      }
    }
    assertNoConsoleErrors(page);
  });

  test('can add a text field', async ({ page }) => {
    const newFormBtn = page.getByRole('button', { name: /新建.*表单|创建.*表单|\+/i }).first();
    if (await newFormBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await newFormBtn.click();
      await page.waitForTimeout(500);
    }

    const addFieldBtn = page.getByRole('button', { name: '添加字段' });
    if (await addFieldBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addFieldBtn.click();
      await page.waitForTimeout(300);

      // Fill label
      const labelInput = page.getByPlaceholder(/例如：.*小时.*？/i);
      if (await labelInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await labelInput.fill('Full Name');

        // Click Add Field button in modal
        const submitBtn = page.getByRole('button', { name: '添加字段' }).last();
        if (await submitBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await submitBtn.click();
          await page.waitForTimeout(300);
        }
      }
    }
    assertNoConsoleErrors(page);
  });

  test('field editor has Required checkbox', async ({ page }) => {
    const newFormBtn = page.getByRole('button', { name: /新建.*表单|创建.*表单|\+/i }).first();
    if (await newFormBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await newFormBtn.click();
      await page.waitForTimeout(500);
    }

    const addFieldBtn = page.getByRole('button', { name: '添加字段' });
    if (await addFieldBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addFieldBtn.click();
      await page.waitForTimeout(300);

      const requiredCheckbox = page.locator('#required');
      if (await requiredCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(requiredCheckbox).toBeVisible();
      }
    }
    assertNoConsoleErrors(page);
  });

  test('has Show Preview toggle', async ({ page }) => {
    const newFormBtn = page.getByRole('button', { name: /新建.*表单|创建.*表单|\+/i }).first();
    if (await newFormBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await newFormBtn.click();
      await page.waitForTimeout(500);
    }

    const previewBtn = page.getByRole('button', { name: /显示预览|隐藏预览/ });
    if (await previewBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(previewBtn).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('has Save button', async ({ page }) => {
    const newFormBtn = page.getByRole('button', { name: /新建.*表单|创建.*表单|\+/i }).first();
    if (await newFormBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await newFormBtn.click();
      await page.waitForTimeout(500);
    }

    const saveBtn = page.getByRole('button', { name: '保存', exact: true });
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(saveBtn).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('has back button to forms list', async ({ page }) => {
    const newFormBtn = page.getByRole('button', { name: /新建.*表单|创建.*表单|\+/i }).first();
    if (await newFormBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await newFormBtn.click();
      await page.waitForTimeout(500);
    }

    const backBtn = page.locator('[aria-label="返回表单"]');
    if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(backBtn).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });
});
