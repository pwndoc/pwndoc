import { test, expect } from './base.js';

/**
 * Drag-and-drop reordering tests.
 *
 * PwnDoc uses vuedraggable to reorder:
 *   - Findings in the audit sidebar (handle visible only when auto-sort is off)
 *   - Languages in the custom-data edit mode
 *
 * These tests require slow mouse-based drags (steps: 10) so vuedraggable
 * receives the intermediate mousemove events it needs to compute new order.
 */

let auditId;
let secondFindingId;

test.describe('Drag and Drop Reordering', () => {
  const disableAutoSort = async (page) => {
    // Open sort options from the findings category header row.
    await page
      .locator('.q-item')
      .filter({ has: page.locator('.q-item__label--header') })
      .getByRole('button')
      .first()
      .click();

    // Toggle automatic sorting off and wait for persistence.
    const sortToggle = page.locator('.q-menu').getByRole('switch').first();
    const isChecked = await sortToggle.getAttribute('aria-checked');
    if (isChecked !== 'false') {
      const saveResponse = page.waitForResponse(r =>
        r.request().method() === 'PUT' &&
        r.url().includes(`/api/audits/${auditId}/sortfindings`) &&
        r.status() === 200
      );
      await sortToggle.click();
      await saveResponse;
    }
    await expect(sortToggle).toHaveAttribute('aria-checked', 'false');

    // Close the menu so handles are unobstructed.
    await page.keyboard.press('Escape');
  };

  test.beforeAll(async ({ request }) => {
    const auditsRes = await request.get('/api/audits');
    const auditsData = await auditsRes.json();
    const audit = auditsData.datas.find(a => a.name === 'E2E Test Audit');
    auditId = audit._id;

    // Create a second finding so there are 2 to reorder
    const findingRes = await request.post(`/api/audits/${auditId}/findings`, {
      data: { title: 'E2E DragDrop Second Finding', vulnType: '' },
    });
    const findingData = await findingRes.json();
    secondFindingId = findingData.datas?._id;
  });

  test.afterAll(async ({ request }) => {
    // Remove the extra finding created for this test
    if (secondFindingId) {
      await request.delete(`/api/audits/${auditId}/findings/${secondFindingId}`);
    }
  });

  test('drag handle is hidden when auto-sort is on', async ({ page }) => {
    await page.goto(`/audits/${auditId}`);
    await page.waitForResponse(r =>
      r.url().includes(`/api/audits/${auditId}`) && r.status() === 200
    );

    // By default sortAuto is true — no drag handles should be visible
    await expect(page.locator('.q-icon.handle').first()).toBeHidden();
  });

  test('auto-sort can be disabled from sort options', async ({ page }) => {
    await page.goto(`/audits/${auditId}`);
    await page.waitForResponse(r =>
      r.url().includes(`/api/audits/${auditId}`) && r.status() === 200
    );

    await disableAutoSort(page);

    // Verified in helper: auto-sort switch ends in OFF state.
  });

  test('drag reorders findings and persists after reload', async ({ page }) => {
    await page.goto(`/audits/${auditId}`);
    await page.waitForResponse(r =>
      r.url().includes(`/api/audits/${auditId}`) && r.status() === 200
    );

    await disableAutoSort(page);

    const handles = page.locator('.q-icon.handle');
    await expect(handles.nth(0)).toBeVisible({ timeout: 10000 });
    await expect(handles.nth(1)).toBeVisible({ timeout: 10000 });

    // Read sidebar text order before drag
    const items = page.locator('.q-item').filter({ has: page.locator('.handle') });
    const titleBefore = await items.nth(0).textContent();

    // Slow drag from first handle to second handle position
    const handle0 = handles.nth(0);
    const handle1 = handles.nth(1);
    const box0 = await handle0.boundingBox();
    const box1 = await handle1.boundingBox();

    await page.mouse.move(box0.x + box0.width / 2, box0.y + box0.height / 2);
    await page.mouse.down();
    await page.mouse.move(box1.x + box1.width / 2, box1.y + box1.height / 2, { steps: 10 });
    await page.mouse.up();


    // After drag the first item should be different from what it was before
    const titleAfter = await items.nth(0).textContent();
    expect(titleAfter?.trim()).not.toBe(titleBefore?.trim());

    // Reload and confirm reordered state persisted.
    await page.reload();
    await page.waitForResponse(r =>
      r.url().includes(`/api/audits/${auditId}`) && r.status() === 200
    );
    const itemsAfterReload = page.locator('.q-item').filter({ has: page.locator('.handle') });
    const titleAfterReload = await itemsAfterReload.nth(0).textContent();
    expect(titleAfterReload?.trim()).toBe(titleAfter?.trim());
  });
});
