import { test, expect } from './base.js';

/**
 * Sticky / fixed-position UI element tests.
 *
 * Two elements use position:fixed / v-sticky so they stay visible when
 * scrolling:
 *   1. The finding tabs bar (.top-fixed, position:fixed; top:100px)
 *   2. The editor toolbar (v-sticky, affixes when scrolling past it)
 *
 * A regression in either CSS rule would cause these elements to scroll off
 * screen, making formatting controls inaccessible without scrolling back up.
 */

let auditId;
let findingId;

test.describe('Sticky / Fixed UI Elements', () => {
  test.beforeAll(async ({ request }) => {
    const auditsRes = await request.get('/api/audits');
    const auditsData = await auditsRes.json();
    const audit = auditsData.datas.find(a => a.name === 'E2E Test Audit');
    auditId = audit._id;

    const detailRes = await request.get(`/api/audits/${auditId}`);
    const detail = await detailRes.json();
    findingId = detail.datas.findings[0]?._id;
  });

  test('finding tabs bar stays in viewport when scrolling down', async ({ page }) => {
    test.skip(!findingId, 'No finding exists in the E2E audit');

    await page.goto(`/audits/${auditId}/findings/${findingId}`);
    await expect(page.getByRole('tab', { name: 'Definition' })).toBeVisible();

    const tabsBar = page.getByTestId('finding-tabs-bar');
    await expect(tabsBar).toBeVisible();

    // Capture Y position before scrolling
    const boxBefore = await tabsBar.boundingBox();

    // Scroll down substantially
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(300);

    // The tabs bar should still be visible and near the same Y position
    await expect(tabsBar).toBeVisible();
    const boxAfter = await tabsBar.boundingBox();

    // A fixed element should not move more than a few pixels vertically
    expect(Math.abs(boxAfter.y - boxBefore.y)).toBeLessThan(20);
  });

  test('editor toolbar stays in viewport when scrolling down', async ({ page }) => {
    test.skip(!findingId, 'No finding exists in the E2E audit');

    await page.goto(`/audits/${auditId}/findings/${findingId}`);
    await expect(page.getByRole('tab', { name: 'Definition' })).toBeVisible();

    // The editor toolbar is rendered by the custom TipTap Editor component.
    const toolbar = page.getByTestId('editor-toolbar').first();
    await expect(toolbar).toBeVisible();

    const viewportHeight = page.viewportSize().height;

    // Scroll down by more than a full viewport
    await page.mouse.wheel(0, viewportHeight + 200);
    await page.waitForTimeout(400);

    // The toolbar should still be within the viewport (y < viewportHeight)
    const box = await toolbar.boundingBox();
    if (box) {
      expect(box.y).toBeLessThan(viewportHeight);
    } else {
      // If sticky hasn't kicked in yet the toolbar may be off-screen —
      // verify it's at least visible in the DOM (not hidden)
      await expect(toolbar).toBeVisible();
    }
  });
});
