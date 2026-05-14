import { test, expect } from './base.js';

function draftKey(userId, refKey) {
  return `pwndoc.draft.${userId}.custom-field.${refKey}`;
}

async function getApiJson(request, url) {
  const res = await request.get(url);
  expect(res.ok()).toBeTruthy();
  return res.json();
}

async function listDrafts(page) {
  return page.evaluate(async () => {
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
      };
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

async function deleteDrafts(page, keys) {
  await page.evaluate(async (keys) => {
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
      };
    });

    if (!db.objectStoreNames.contains('drafts')) {
      db.close();
      return;
    }

    const tx = db.transaction('drafts', 'readwrite');
    const store = tx.objectStore('drafts');
    for (const key of keys)
      store.delete(key);

    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, keys);
}

async function openCustomFields(page) {
  await page.goto('/data/custom');
  await page.getByRole('tab', { name: 'Custom Fields' }).click();
  await expect(page.getByText('Create and manage Custom Fields')).toBeVisible();
}

async function selectView(page, name) {
  await page.getByLabel('Select View').click();
  await page.getByRole('option', { name }).click();
}

async function selectSection(page, name) {
  await page.getByLabel('Select Section').click();
  await page.getByRole('option', { name }).click();
}

test.describe('Custom Data Draft Recovery', () => {
  test('recovers custom field drafts by selected section context and shows context badges', async ({ page, request }) => {
    const runId = Date.now();
    const draftLabel = `Recovered Custom Field ${runId}`;
    const user = await getApiJson(request, '/api/users/me');
    const userId = user.datas._id;
    const refKeys = ['section:Executive Summary', 'section:Methodology'];
    const keys = refKeys.map((refKey) => draftKey(userId, refKey));

    await openCustomFields(page);
    const backedUpDrafts = (await listDrafts(page)).filter((draft) => keys.includes(draft.key));

    try {
      await deleteDrafts(page, keys);

      await selectView(page, 'Audit Section');
      await selectSection(page, 'Executive Summary');
      await page.getByLabel('Label').first().fill(draftLabel);

      await expect.poll(async () => {
        const drafts = await listDrafts(page);
        return drafts.find((draft) =>
          draft.scope === 'custom-field' &&
          draft.refKey === 'section:Executive Summary'
        )?.data?.newCustomField?.label || '';
      }).toBe(draftLabel);

      await openCustomFields(page);
      await page.getByLabel('Select View').click();
      await expect(page.getByTestId('custom-field-draft-badge-view-section')).toBeVisible();
      await page.getByRole('option', { name: 'Audit Section' }).click();

      await page.getByLabel('Select Section').click();
      await expect(page.getByTestId('custom-field-draft-badge-section-Executive Summary')).toBeVisible();
      await page.getByRole('option', { name: 'Methodology' }).click();
      await expect(page.getByTestId('draft-recovery-status')).not.toBeVisible();
      await expect(page.getByLabel('Label').first()).toHaveValue('');

      await selectSection(page, 'Executive Summary');
      await expect(page.getByLabel('Label').first()).toHaveValue(draftLabel);
      await expect(page.getByTestId('draft-recovery-status')).toBeVisible();
    }
    finally {
      await deleteDrafts(page, keys);
      await putDrafts(page, backedUpDrafts);
    }
  });
});
