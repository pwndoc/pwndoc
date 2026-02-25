import { test, expect } from './base.js';

/**
 * Vulnerability merge tests.
 *
 * The merge dialog lets users consolidate vulnerabilities that exist in
 * different languages into a single multilingual entry.  This is a unique
 * workflow with its own API call (mergeVulnerabilities) not tested elsewhere.
 */

let vulnEnId;
let vulnFrId;

test.describe('Vulnerability Merge', () => {
  test.beforeAll(async ({ request }) => {
    // Create two vulnerabilities: one English-only, one French-only
    const res = await request.post('/api/vulnerabilities', {
      data: [
        { details: [{ locale: 'en', title: 'E2E Merge Vuln EN' }] },
        { details: [{ locale: 'fr', title: 'E2E Merge Vuln FR' }] },
      ],
    });
    await res.json();

    // Resolve their IDs from the vulnerability list
    const listRes = await request.get('/api/vulnerabilities');
    const listData = await listRes.json();
    vulnEnId = listData.datas.find(v =>
      v.details?.some(d => d.title === 'E2E Merge Vuln EN')
    )?._id;
    vulnFrId = listData.datas.find(v =>
      v.details?.some(d => d.title === 'E2E Merge Vuln FR')
    )?._id;
  });

  test.afterAll(async ({ request }) => {
    // Clean up any remaining test vulns
    const listRes = await request.get('/api/vulnerabilities');
    const listData = await listRes.json();
    for (const vuln of listData.datas) {
      if (
        vuln.details?.some(d =>
          d.title === 'E2E Merge Vuln EN' || d.title === 'E2E Merge Vuln FR'
        )
      ) {
        await request.delete(`/api/vulnerabilities/${vuln._id}`);
      }
    }
  });

  test('Merge Vulnerabilities button opens the merge dialog', async ({ page }) => {
    await page.goto('/vulnerabilities');
    await expect(page.getByRole('button', { name: 'Merge Vulnerabilities' })).toBeVisible();

    await page.getByRole('button', { name: 'Merge Vulnerabilities' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText('Merge Vulnerabilities')).toBeVisible();
  });

  test('merging EN and FR vulnerabilities produces a single bilingual entry', async ({ page, request }) => {
    test.skip(!vulnEnId || !vulnFrId, 'Test vulnerabilities were not created');

    await page.goto('/vulnerabilities');
    await expect(page.getByRole('button', { name: 'Merge Vulnerabilities' })).toBeVisible();

    await page.getByRole('button', { name: 'Merge Vulnerabilities' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    const dialog = page.getByRole('dialog');

    // Left panel: select English language via its labelled select
    await dialog.getByLabel('Language (Add from right)').click();
    await page.getByRole('option', { name: 'English' }).click();
    await expect(page.getByRole('listbox')).toBeHidden();

    // Click the list item that contains the English vuln title (tag="label" wraps radio+text)
    await expect(dialog.getByText('E2E Merge Vuln EN')).toBeVisible({ timeout: 5000 });
    await dialog.getByText('E2E Merge Vuln EN').click();

    // Right panel: select French language
    await dialog.getByLabel('Language (Move to left)').click();
    await page.getByRole('option', { name: 'French' }).click();
    await expect(page.getByRole('listbox')).toBeHidden();

    // Click the French vuln
    await expect(dialog.getByText('E2E Merge Vuln FR')).toBeVisible({ timeout: 5000 });
    await dialog.getByText('E2E Merge Vuln FR').click();

    // Click Merge
    await dialog.getByRole('button', { name: 'Merge' }).click();

    await expect(page.getByText('Vulnerability merge successfully')).toBeVisible({
      timeout: 5000,
    });

    // Verify via API: two separate vulns should now be one bilingual entry.
    // The backend merge deletes the FR-only source vuln and adds its FR detail
    // to the EN vuln — so there must be exactly 1 vuln containing our test titles.
    const checkRes = await request.get('/api/vulnerabilities');
    const checkData = await checkRes.json();
    const testVulns = checkData.datas.filter(v =>
      v.details?.some(d => d.title === 'E2E Merge Vuln EN' || d.title === 'E2E Merge Vuln FR')
    );
    expect(testVulns.length).toBe(1);
    expect(testVulns[0].details.some(d => d.title === 'E2E Merge Vuln EN')).toBe(true);
    expect(testVulns[0].details.some(d => d.title === 'E2E Merge Vuln FR')).toBe(true);
  });
});
