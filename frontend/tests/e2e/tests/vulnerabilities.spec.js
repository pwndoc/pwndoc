import { test, expect } from './base.js';

const RECOVERY_CATEGORY = 'Critical Findings';

async function openCreateVulnerability(page, category = 'No Category') {
  await page.getByRole('button', { name: 'New Vulnerability' }).click();
  await expect(page.getByText('Select category')).toBeVisible();
  await page.getByRole('listitem').filter({ hasText: category }).click();
  await expect(page.getByRole('dialog').getByText(/add vulnerability/i)).toBeVisible();
  await expect(page.getByTestId('create-vulnerability-title')).toBeVisible();
}

async function closeCreateVulnerability(page) {
  await page.getByTestId('create-vulnerability-close').click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
}

async function closeEditVulnerability(page) {
  await page.getByTestId('edit-vulnerability-close').click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
}

async function openRecoveryMenu(page) {
  await page.getByRole('dialog').getByTestId('draft-recovery-status').click();
}

async function clickRecoveryAction(page, name) {
  await openRecoveryMenu(page);
  if (name instanceof RegExp)
    await page.getByText(name).click();
  else
    await page.getByText(name, { exact: true }).click();
}

async function listDrafts(page) {
  return page.evaluate(async () => {
    const request = indexedDB.open('pwndoc-drafts', 1);
    const db = await new Promise((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => resolve(request.result);
    });

    if (!db.objectStoreNames.contains('drafts')) {
      db.close();
      return [];
    }

    const tx = db.transaction('drafts', 'readonly');
    const drafts = await new Promise((resolve, reject) => {
      const req = tx.objectStore('drafts').getAll();
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result || []);
    });
    db.close();
    return drafts;
  });
}

async function putDrafts(page, drafts) {
  await page.evaluate(async (drafts) => {
    const request = indexedDB.open('pwndoc-drafts', 1);
    const db = await new Promise((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('drafts')) {
          const store = db.createObjectStore('drafts', { keyPath: 'key' });
          store.createIndex('by_userId', 'userId');
          store.createIndex('by_updatedAt', 'updatedAt');
        }
        resolve(db);
      };
    });

    const tx = db.transaction('drafts', 'readwrite');
    const store = tx.objectStore('drafts');
    for (const draft of drafts)
      store.put(draft);

    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, drafts);
}

async function deleteDrafts(page, predicateSource, arg) {
  await page.evaluate(async ({ predicateSource, arg }) => {
    const predicate = new Function('draft', 'arg', `return (${predicateSource})(draft, arg)`);
    const request = indexedDB.open('pwndoc-drafts', 1);
    const db = await new Promise((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => resolve(request.result);
    });

    if (!db.objectStoreNames.contains('drafts')) {
      db.close();
      return;
    }

    const tx = db.transaction('drafts', 'readwrite');
    const store = tx.objectStore('drafts');
    const drafts = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result || []);
    });

    for (const draft of drafts) {
      if (predicate(draft, arg))
        store.delete(draft.key);
    }

    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, { predicateSource, arg });
}

async function createVulnerabilityViaApi(request, title, category = null) {
  const payload = [{
    category,
    status: 0,
    cvssv3: '',
    cvssv4: '',
    priority: '',
    remediationComplexity: '',
    details: [{
      locale: 'en',
      title,
      vulnType: '',
      description: '',
      observation: '',
      remediation: '',
      references: [],
      customFields: [],
    }],
  }];

  const createRes = await request.post('/api/vulnerabilities', { data: payload });
  expect(createRes.ok()).toBeTruthy();

  const listRes = await request.get('/api/vulnerabilities');
  const list = await listRes.json();
  const vulnerability = list.datas.find(vuln => vuln.details?.some(detail => detail.title === title));
  expect(vulnerability).toBeTruthy();
  return vulnerability._id;
}

async function openEditVulnerability(page, title) {
  await page.getByTestId('search-vulnerability-title').fill(title);
  const row = page.getByRole('row').filter({ hasText: title });
  await expect(row).toBeVisible();
  await row.getByTestId('edit-vulnerability-button').click();
  await expect(page.getByRole('dialog').getByText(/edit vulnerability/i)).toBeVisible();
  await expect(page.getByTestId('edit-vulnerability-title')).toBeVisible();
}

test.describe('Vulnerabilities Page', () => {

  // Cleanup: remove test vulnerabilities (languages persist from data-setup)
  test.afterAll(async ({ request }) => {
    await request.delete('/api/vulnerabilities');
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/vulnerabilities');
    // Wait for the page to finish loading by checking for a key UI element
    await expect(page.getByRole('button', { name: 'New Vulnerability' })).toBeVisible();
  });

  test.describe('Page Layout', () => {
    test('should display navigation and page elements', async ({ page }) => {
      // Verify nav items
      await expect(page.getByRole('listitem').filter({ hasText: 'Audits' })).toBeVisible();
      await expect(page.getByRole('listitem').filter({ hasText: 'Vulnerabilities' })).toBeVisible();
      await expect(page.getByRole('listitem').filter({ hasText: 'Data' })).toBeVisible();
      await expect(page.getByRole('listitem').filter({ hasText: 'Settings' })).toBeVisible();

      // Verify language selector is present
      await expect(page.getByLabel('Language')).toBeVisible();

      // Verify filter toggles
      await expect(page.getByText('Valid')).toBeVisible();
      await expect(page.getByText('New', { exact: true })).toBeVisible();
      await expect(page.getByText('Updates')).toBeVisible();

      // Verify "New Vulnerability" dropdown button
      await expect(page.getByRole('button', { name: 'New Vulnerability' })).toBeVisible();

      // Verify "Merge Vulnerabilities" button
      await expect(page.getByRole('button', { name: 'Merge Vulnerabilities' })).toBeVisible();
    });

    test('should show empty table when no vulnerabilities exist', async ({ page }) => {
      await expect(page.getByText('No matching records found')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('CRUD Operations', () => {
    test('should create a new vulnerability', async ({ page }) => {
      // Click "New Vulnerability" dropdown and wait for menu to appear
      await page.getByRole('button', { name: 'New Vulnerability' }).click();
      await expect(page.getByText('Select category')).toBeVisible();
      await page.getByRole('listitem').filter({ hasText: 'No Category' }).click();

      // Wait for the create dialog to open and fill in the title
      await expect(page.getByRole('dialog').getByText(/add vulnerability/i)).toBeVisible();
      // await expect(page.getByTestId('create-vulnerability-title')).toBeVisible({ timeout: 10000 });
      await page.getByTestId('create-vulnerability-title').fill('Test SQL Injection');

      // Click Create button
      await page.getByRole('button', { name: 'Create' }).click();

      // Verify success notification
      await expect(page.getByText('Vulnerability created successfully')).toBeVisible();

      // Verify the vulnerability appears in the table
      await expect(page.getByRole('cell', { name: 'Test SQL Injection' })).toBeVisible();
    });

    test('should edit an existing vulnerability', async ({ page }) => {
      // First create a vulnerability to edit
      await page.getByRole('button', { name: 'New Vulnerability' }).click();
      await page.getByRole('listitem').filter({ hasText: 'No Category' }).click();
      await page.getByTestId('create-vulnerability-title').fill('Vuln To Edit');
      await page.getByRole('button', { name: 'Create' }).click();
      await expect(page.getByText('Vulnerability created successfully')).toBeVisible();

      // Click the edit button on the row
      const row = page.getByRole('row').filter({ hasText: 'Vuln To Edit' });
      await row.getByTestId('edit-vulnerability-button').click();

      // The edit modal should appear
      await expect(page.getByText('Edit Vulnerability (No Category)')).toBeVisible();

      // Clear and update the title
      await page.getByTestId('edit-vulnerability-title').fill('Vuln Edited Successfully');

      // Click Update button
      await page.getByRole('button', { name: 'Update' }).click();

      // Verify success notification
      await expect(page.getByText('Vulnerability updated successfully')).toBeVisible();

      // Verify the updated title appears in the table
      await expect(page.getByRole('cell', { name: 'Vuln Edited Successfully' })).toBeVisible();

      // Verify old title is gone
      await expect(page.getByRole('cell', { name: 'Vuln To Edit' })).not.toBeVisible();
    });

    test('should delete a vulnerability', async ({ page }) => {
      // First create a vulnerability to delete
      await page.getByRole('button', { name: 'New Vulnerability' }).click();
      await page.getByRole('listitem').filter({ hasText: 'No Category' }).click();
      await page.getByTestId('create-vulnerability-title').fill('Vuln To Delete');
      await page.getByRole('button', { name: 'Create' }).click();
      await expect(page.getByText('Vulnerability created successfully')).toBeVisible();

      // Click the delete button on the row
      const row = page.getByRole('row').filter({ hasText: 'Vuln To Delete' });
      await row.getByTestId('delete-vulnerability-button').click();

      // Confirm deletion in the dialog
      await expect(page.getByText('Vulnerability will be permanently deleted')).toBeVisible();
      await page.getByRole('button', { name: 'Confirm' }).click();

      // Verify success notification
      await expect(page.getByText('Vulnerability deleted successfully')).toBeVisible();

      // Verify the vulnerability is no longer in the table
      await expect(page.getByRole('cell', { name: 'Vuln To Delete' })).not.toBeVisible();
    });
  });

  test.describe('Search and Filter', () => {
    test('should filter vulnerabilities by title search', async ({ page }) => {
      // Create two vulnerabilities with different titles
      await page.getByRole('button', { name: 'New Vulnerability' }).click();
      await page.getByRole('listitem').filter({ hasText: 'No Category' }).click();
      await page.getByTestId('create-vulnerability-title').fill('XSS Reflected');
      await page.getByRole('button', { name: 'Create' }).click();
      await expect(page.getByText('Vulnerability created successfully')).toBeVisible();

      await page.getByRole('button', { name: 'New Vulnerability' }).click();
      await page.getByRole('listitem').filter({ hasText: 'No Category' }).click();
      await page.getByTestId('create-vulnerability-title').fill('CSRF Token Missing');
      await page.getByRole('button', { name: 'Create' }).click();
      await expect(page.getByText('Vulnerability created successfully')).toBeVisible();

      // Both should be visible initially
      await expect(page.getByRole('cell', { name: 'XSS Reflected' })).toBeVisible();
      await expect(page.getByRole('cell', { name: 'CSRF Token Missing' })).toBeVisible();

      // Type in the search field (the title search input in the top row of the table)
      const searchInput = page.getByTestId('search-vulnerability-title');
      await searchInput.fill('xss');

      // XSS should still be visible, CSRF should be filtered out
      await expect(page.getByRole('cell', { name: 'XSS Reflected' })).toBeVisible();
      await expect(page.getByRole('cell', { name: 'CSRF Token Missing' })).not.toBeVisible();

      // Clear search to see all again
      await searchInput.clear();
      await expect(page.getByRole('cell', { name: 'XSS Reflected' })).toBeVisible();
      await expect(page.getByRole('cell', { name: 'CSRF Token Missing' })).toBeVisible();
    });
  });

  test.describe('Validation', () => {
    test('should show error when creating vulnerability without title', async ({ page }) => {
      // Click "New Vulnerability" dropdown
      await page.getByRole('button', { name: 'New Vulnerability' }).click();

      // Select "No Category"
      await page.getByRole('listitem').filter({ hasText: 'No Category' }).click();

      // Verify create dialog opened
      const createDialog = page.getByRole('dialog');
      await expect(createDialog).toBeVisible();
      await expect(page.getByTestId('create-vulnerability-title')).toBeVisible();

      // Click Create without filling the title
      await page.getByRole('button', { name: 'Create' }).click();

      // Verify error message for missing title
      await expect(page.getByText('Title required')).toBeVisible();
    });
  });

  test.describe('Draft Recovery', () => {
    test('should recover new vulnerability drafts independently by category and support revert/restore', async ({ page }) => {
      const runId = `E2E Recovery ${Date.now()}`;
      const noCategoryDraftTitle = `${runId} No Category Draft`;
      const savedNoCategoryTitle = `${runId} No Category Saved`;
      const categoryDraftTitle = `${runId} Category Draft`;
      const createRefKeys = ['_new:none', `_new:${RECOVERY_CATEGORY}`];
      const existingDrafts = await listDrafts(page);
      const backedUpDrafts = existingDrafts.filter(draft =>
        draft.scope === 'vuln-modal-create' && createRefKeys.includes(draft.refKey)
      );

      await deleteDrafts(
        page,
        '(draft, refKeys) => draft.scope === "vuln-modal-create" && refKeys.includes(draft.refKey)',
        createRefKeys
      );

      try {
        await openCreateVulnerability(page);
        await expect(page.getByRole('dialog').getByTestId('draft-recovery-status')).not.toBeVisible();
        await page.getByTestId('create-vulnerability-title').fill(noCategoryDraftTitle);
        await closeCreateVulnerability(page);

        await openCreateVulnerability(page);
        await expect(page.getByTestId('create-vulnerability-title')).toHaveValue(noCategoryDraftTitle);
        await expect(page.getByRole('dialog').getByTestId('draft-recovery-status')).toBeVisible();

        await clickRecoveryAction(page, /^View changes/);
        const diffDialog = page.getByRole('dialog').filter({ hasText: 'Review the differences between your recovered changes and the last saved version.' });
        await expect(diffDialog.getByText('Recovered changes', { exact: true })).toBeVisible();
        await diffDialog.getByRole('button').first().click();

        await clickRecoveryAction(page, 'Revert to saved version');
        await expect(page.getByTestId('create-vulnerability-title')).toHaveValue('');

        await expect(page.getByRole('dialog').getByTestId('draft-recovery-status')).toBeVisible();
        await clickRecoveryAction(page, 'Restore recovered changes');
        await expect(page.getByTestId('create-vulnerability-title')).toHaveValue(noCategoryDraftTitle);

        await page.getByTestId('create-vulnerability-title').fill(savedNoCategoryTitle);
        await expect.poll(async () => {
          const drafts = await listDrafts(page);
          return drafts.find(draft =>
            draft.scope === 'vuln-modal-create' && draft.refKey === '_new:none'
          )?.data?.details?.some(detail => detail.title === savedNoCategoryTitle) || false;
        }).toBe(true);
        await page.getByRole('button', { name: 'Create' }).click();
        await expect(page.getByText('Vulnerability created successfully')).toBeVisible();

        await expect.poll(async () => {
          const drafts = await listDrafts(page);
          return drafts.some(draft => draft.scope === 'vuln-modal-create' && draft.refKey === '_new:none');
        }).toBe(false);

        await openCreateVulnerability(page, RECOVERY_CATEGORY);
        await expect(page.getByRole('dialog').getByTestId('draft-recovery-status')).not.toBeVisible();
        await page.getByTestId('create-vulnerability-title').fill(categoryDraftTitle);
        await closeCreateVulnerability(page);

        await openCreateVulnerability(page, RECOVERY_CATEGORY);
        await expect(page.getByTestId('create-vulnerability-title')).toHaveValue(categoryDraftTitle);
        await closeCreateVulnerability(page);

        await openCreateVulnerability(page);
        await expect(page.getByTestId('create-vulnerability-title')).toHaveValue('');
        await closeCreateVulnerability(page);

        await openCreateVulnerability(page, RECOVERY_CATEGORY);
        await expect(page.getByTestId('create-vulnerability-title')).toHaveValue(categoryDraftTitle);
        await closeCreateVulnerability(page);
      }
      finally {
        await deleteDrafts(
          page,
          '(draft, refKeys) => draft.scope === "vuln-modal-create" && refKeys.includes(draft.refKey)',
          createRefKeys
        );
        await putDrafts(page, backedUpDrafts);
      }
    });

    test('should isolate edit drafts per vulnerability and clear only the saved draft', async ({ page, request }) => {
      const runId = `E2E Recovery ${Date.now()}`;
      const editABase = `${runId} Edit A Base`;
      const editBBase = `${runId} Edit B Base`;
      const editADraft = `${runId} Edit A Draft`;
      const editBDraft = `${runId} Edit B Draft`;
      const editAId = await createVulnerabilityViaApi(request, editABase);
      const editBId = await createVulnerabilityViaApi(request, editBBase, RECOVERY_CATEGORY);

      await page.reload();
      await expect(page.getByRole('button', { name: 'New Vulnerability' })).toBeVisible();

      try {
        await openEditVulnerability(page, editABase);
        await expect(page.getByRole('dialog').getByTestId('draft-recovery-status')).not.toBeVisible();
        await page.getByTestId('edit-vulnerability-title').fill(editADraft);
        await closeEditVulnerability(page);

        await openEditVulnerability(page, editABase);
        await expect(page.getByTestId('edit-vulnerability-title')).toHaveValue(editADraft);
        await closeEditVulnerability(page);

        await openEditVulnerability(page, editBBase);
        await page.getByTestId('edit-vulnerability-title').fill(editBDraft);
        await closeEditVulnerability(page);

        await openEditVulnerability(page, editBBase);
        await expect(page.getByTestId('edit-vulnerability-title')).toHaveValue(editBDraft);
        await closeEditVulnerability(page);

        await openEditVulnerability(page, editABase);
        await expect(page.getByTestId('edit-vulnerability-title')).toHaveValue(editADraft);

        await page.getByRole('button', { name: 'Update' }).click();
        await expect(page.getByText('Vulnerability updated successfully')).toBeVisible();

        await expect.poll(async () => {
          const drafts = await listDrafts(page);
          return {
            editAExists: drafts.some(draft => draft.scope === 'vuln-modal-edit' && draft.refKey === editAId),
            editBExists: drafts.some(draft => draft.scope === 'vuln-modal-edit' && draft.refKey === editBId),
          };
        }).toEqual({ editAExists: false, editBExists: true });

        await openEditVulnerability(page, editADraft);
        await expect(page.getByRole('dialog').getByTestId('draft-recovery-status')).not.toBeVisible();
        await closeEditVulnerability(page);

        await openEditVulnerability(page, editBBase);
        await expect(page.getByTestId('edit-vulnerability-title')).toHaveValue(editBDraft);
        await expect(page.getByRole('dialog').getByTestId('draft-recovery-status')).toBeVisible();
        await closeEditVulnerability(page);
      }
      finally {
        await deleteDrafts(
          page,
          '(draft, refKeys) => draft.scope === "vuln-modal-edit" && refKeys.includes(draft.refKey)',
          [editAId, editBId]
        );
      }
    });
  });
});
