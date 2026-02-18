import { test, expect } from './base.js';

/**
 * Double-click to edit tests.
 *
 * Multiple tables use @row-dblclick="dblClick" to open an edit modal or
 * navigate to the edit page.  Button-click navigation is tested elsewhere;
 * these tests cover the separate dblclick code path.
 */

let auditId;

test.describe('Double-Click to Edit', () => {
  test.beforeAll(async ({ request }) => {
    // Resolve audit created by audit-edit.spec.js
    const res = await request.get('/api/audits');
    const data = await res.json();
    const audit = data.datas.find(a => a.name === 'E2E Test Audit');
    auditId = audit._id;

    // Seed a temporary vulnerability for the vuln table test
    await request.post('/api/vulnerabilities', {
      data: [{ details: [{ locale: 'en', title: 'E2E DblClick Vuln' }] }],
    });
  });

  test.afterAll(async ({ request }) => {
    // Remove only the temp vulnerability created above
    const res = await request.get('/api/vulnerabilities');
    const data = await res.json();
    const vuln = data.datas.find(v =>
      v.details?.some(d => d.title === 'E2E DblClick Vuln')
    );
    if (vuln) await request.delete(`/api/vulnerabilities/${vuln._id}`);
  });

  test('double-click audit row navigates to audit edit page', async ({ page }) => {
    await page.goto('/audits');
    await page.waitForResponse(r =>
      r.url().includes('/api/audits') && r.status() === 200
    );

    const row = page.getByRole('row').filter({ hasText: 'E2E Test Audit' });
    await row.dblclick();

    // Should navigate to the audit edit page
    await expect(page).toHaveURL(new RegExp(`/audits/${auditId}`));
  });

  test('double-click vulnerability row opens edit dialog', async ({ page }) => {
    await page.goto('/vulnerabilities');
    await page.waitForResponse(r =>
      r.url().includes('/api/vulnerabilities') && r.status() === 200
    );

    const row = page.getByRole('row').filter({ hasText: 'E2E DblClick Vuln' });
    await row.dblclick();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  });

  test('double-click collaborator row opens edit dialog', async ({ page }) => {
    await page.goto('/data/collaborators');
    await page.waitForResponse(r =>
      r.url().includes('/api/users') && r.status() === 200
    );

    // The admin user is always present
    const row = page.getByRole('row').filter({ hasText: 'admin' });
    await row.dblclick();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  });

  test('double-click template row opens edit dialog', async ({ page }) => {
    await page.goto('/data/templates');
    await page.waitForResponse(r =>
      r.url().includes('/api/templates') && r.status() === 200
    );

    // The template created by data-setup.spec.js
    const row = page.getByRole('row').filter({ hasText: 'E2E Full Template' });
    await row.dblclick();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  });
});
