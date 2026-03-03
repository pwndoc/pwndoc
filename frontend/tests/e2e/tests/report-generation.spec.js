import { test, expect } from './base.js';

/**
 * Report generation test.
 *
 * Clicking the download icon on an audit row triggers generateReport() which
 * calls the backend to build a .docx and returns it as a download.  This is
 * the core output of PwnDoc and has no other E2E coverage.
 */

let auditId;
let templateId;

test.describe('Report Generation', () => {
  test.beforeAll(async ({ request }) => {
    // Resolve audit
    const auditsRes = await request.get('/api/audits');
    const auditsData = await auditsRes.json();
    const audit = auditsData.datas.find(a => a.name === 'E2E Test Audit');
    auditId = audit._id;

    // Find the template created by data-setup.spec.js
    const templatesRes = await request.get('/api/templates');
    const templatesData = await templatesRes.json();
    const template = templatesData.datas.find(t =>
      t.name?.includes('E2E Full Template')
    );
    templateId = template?._id;

    // Ensure a template is set on the audit general info so report generation works
    if (templateId) {
      await request.put(`/api/audits/${auditId}/general`, {
        data: { template: templateId },
      });
    }
  });

  test('clicking download report button downloads a .docx file', async ({ page }) => {
    await page.goto('/audits');
    const row = page.getByRole('row').filter({ hasText: 'E2E Test Audit' }).first();
    await expect(row).toBeVisible();

    // Intercept the download event
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      row.getByTestId('download-report-button').click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.docx$/i);
  });
});
