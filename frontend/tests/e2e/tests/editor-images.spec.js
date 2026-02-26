import { test, expect } from './base.js';

/**
 * Editor image paste / drop tests.
 *
 * The TipTap editor has a custom handlePaste plugin (editor-image.js) that
 * intercepts clipboard images, uploads them to /api/images, then inserts
 * an image node.  A matching handleDrop plugin covers drag-and-drop.
 *
 * These tests are Chromium-only because WebKit and Firefox have divergent
 * clipboard / DataTransfer APIs that make synthetic paste events unreliable
 * across browsers.
 *
 * The project entry for this spec already restricts it to Chromium via the
 * playwright.config.js editor-images project.
 */

let auditId;
let findingId;

test.describe('Editor Image Paste and Drop', () => {
  test.beforeAll(async ({ request }) => {
    const auditsRes = await request.get('/api/audits');
    const auditsData = await auditsRes.json();
    const audit = auditsData.datas.find(a => a.name === 'E2E Test Audit');
    auditId = audit._id;

    const detailRes = await request.get(`/api/audits/${auditId}`);
    const detail = await detailRes.json();
    findingId = detail.datas.findings[0]?._id;
  });

  test('paste image from clipboard inserts an image node in the editor', async ({ page }) => {
    test.skip(!findingId, 'No finding exists in the E2E audit');

    await page.goto(`/audits/${auditId}/findings/${findingId}`);
    await expect(page.getByRole('tab', { name: 'Definition' })).toBeVisible();

    // Click into the description rich-text editor.
    // We scope to .editor__content to target the TipTap ProseMirror editor
    // rather than a plain text input (e.g. the Title field).
    const editor = page.locator('.editor__content .ProseMirror').first();
    await editor.click();

    // Dispatch a synthetic paste event carrying a 1×1 PNG blob
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, 1, 1);
        canvas.toBlob((blob) => {
          const file = new File([blob], 'paste-test.png', { type: 'image/png' });
          const dt = new DataTransfer();
          dt.items.add(file);
          const target = document.querySelector('.ProseMirror');
          if (target) {
            const event = new ClipboardEvent('paste', {
              clipboardData: dt,
              bubbles: true,
              cancelable: true,
            });
            target.dispatchEvent(event);
          }
          resolve();
        }, 'image/png');
      });
    });

    // An <img> node should now exist in the editor
    await expect(editor.locator('img')).toBeVisible({ timeout: 5000 });
  });

  test('drop image file onto editor inserts an image node', async ({ page }) => {
    test.skip(!findingId, 'No finding exists in the E2E audit');

    await page.goto(`/audits/${auditId}/findings/${findingId}`);
    await expect(page.getByRole('tab', { name: 'Definition' })).toBeVisible();

    // Scope to .editor__content to target the TipTap ProseMirror editor.
    const editor = page.locator('.editor__content .ProseMirror').first();
    await editor.click();

    // Dispatch a synthetic drop event carrying an image file.
    //
    // Two requirements for ProseMirror's drop handler to reach our handleDrop plugin:
    //   1. event.dataTransfer.files must contain the image (use DragEvent init dict — Chrome
    //      properly honours `dataTransfer` in the DragEventInit per the HTML spec).
    //   2. event.clientX/clientY must be within the editor bounds so that
    //      view.posAtCoords() returns a valid position; ProseMirror returns early
    //      (before calling handleDrop) if posAtCoords returns null.
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'blue';
        ctx.fillRect(0, 0, 1, 1);
        canvas.toBlob((blob) => {
          const file = new File([blob], 'drop-test.png', { type: 'image/png' });
          const dt = new DataTransfer();
          dt.items.add(file);
          const target = document.querySelector('.ProseMirror');
          if (target) {
            const rect = target.getBoundingClientRect();
            const dropEvent = new DragEvent('drop', {
              dataTransfer: dt,
              bubbles: true,
              cancelable: true,
              clientX: Math.floor(rect.left + rect.width / 2),
              clientY: Math.floor(rect.top + rect.height / 2),
            });
            target.dispatchEvent(dropEvent);
          }
          resolve();
        }, 'image/png');
      });
    });

    await expect(editor.locator('img')).toBeVisible({ timeout: 5000 });
  });
});
