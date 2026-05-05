import { test, expect } from './base.js';

const AUDIT_NAME = 'E2E Test Audit';

let auditId;
let findingId;
let sectionId;
let userId;

function buildDraft(userId, scope, refKey, data, overrides = {}) {
  const now = Date.now();
  return {
    key: `pwndoc.draft.${userId}.${scope}.${refKey}`,
    v: 1,
    scope,
    refKey,
    userId,
    createdAt: now,
    updatedAt: now,
    status: 'active_draft',
    data,
    ...overrides,
  };
}

function customField(id, label, fieldType = 'input') {
  return {
    _id: id,
    label,
    fieldType,
    display: '',
    displaySub: '',
    size: 12,
    offset: 0,
    required: false,
    description: '',
    inline: false,
    options: [],
  };
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

async function getApiJson(request, url) {
  const res = await request.get(url);
  expect(res.ok()).toBeTruthy();
  return res.json();
}

async function seedDrafts(page, drafts) {
  await page.goto('/audits');
  await expect(page.getByRole('listitem').filter({ hasText: 'Audits' })).toBeVisible();
  await putDrafts(page, drafts);
}

async function expectDraftStatus(page) {
  await expect(page.getByTestId('draft-recovery-status')).toBeVisible();
}

test.describe('Audit Draft Recovery', () => {
  test.beforeAll(async ({ request }) => {
    const users = await getApiJson(request, '/api/users/me');
    userId = users.datas._id;

    const audits = await getApiJson(request, '/api/audits');
    const candidateAudits = audits.datas.filter((audit) => audit.name === AUDIT_NAME && audit.type === 'default');
    expect(candidateAudits).toHaveLength(1);
    auditId = candidateAudits[0]._id;

    const detail = await getApiJson(request, `/api/audits/${auditId}`);
    findingId = detail.datas.findings[0]?._id;
    sectionId = detail.datas.sections[0]?._id;
    expect(findingId).toBeTruthy();
    expect(sectionId).toBeTruthy();
  });

  test('recovers nested draft values in general, network, finding, and section edit routes', async ({ page, request }) => {
    const runId = Date.now();
    const general = (await getApiJson(request, `/api/audits/${auditId}/general`)).datas;
    const network = (await getApiJson(request, `/api/audits/${auditId}/network`)).datas;
    const finding = (await getApiJson(request, `/api/audits/${auditId}/findings/${findingId}`)).datas;
    const section = (await getApiJson(request, `/api/audits/${auditId}/sections/${sectionId}`)).datas;

    const generalCustomLabel = `E2E General Draft ${runId}`;
    const findingCustomLabel = `E2E Finding Draft ${runId}`;
    const sectionCustomLabel = `E2E Section Draft ${runId}`;

    const generalDraft = {
      ...general,
      name: `Recovered Audit ${runId}`,
      date_start: '2026-04-01',
      scope: [`10.10.${runId % 255}.0/24`, `nested-${runId}.example.local`],
      customFields: [
        ...(general.customFields || []),
        {
          customField: customField('64f000000000000000000001', generalCustomLabel),
          text: `general custom ${runId}`,
        },
      ],
    };

    const hostIp = `192.0.2.${runId % 200}`;
    const networkDraft = {
      ...network,
      scope: [{
        name: `Recovered Scope ${runId}`,
        hosts: [{
          ip: hostIp,
          hostname: `host-${runId}.local`,
          os: 'Linux',
          services: [{
            port: '8443',
            protocol: 'tcp',
            state: 'open',
            name: 'https-alt',
            product: 'nginx',
            version: `1.${runId % 10}`,
          }],
        }],
      }],
    };

    const findingDraft = {
      ...finding,
      title: `Recovered Finding ${runId}`,
      description: `<p>Recovered description editor ${runId}</p>`,
      references: [`https://example.test/${runId}`, `CVE-2026-${runId % 10000}`],
      remediationComplexity: 3,
      priority: 4,
      remediation: `<p>Recovered remediation editor ${runId}</p>`,
      customFields: [
        ...(finding.customFields || []),
        {
          customField: customField('64f000000000000000000002', findingCustomLabel),
          text: `finding custom ${runId}`,
        },
      ],
    };

    const sectionDraft = {
      ...section,
      customFields: [
        ...(section.customFields || []).map((field, index) => index === 0
          ? { ...field, text: `<p>Recovered section editor ${runId}</p>` }
          : field),
        {
          customField: customField('64f000000000000000000003', sectionCustomLabel),
          text: `section custom ${runId}`,
        },
      ],
    };

    const drafts = [
      buildDraft(userId, 'audit-general', auditId, generalDraft),
      buildDraft(userId, 'audit-network', auditId, networkDraft),
      buildDraft(userId, 'audit-finding', `${auditId}:${findingId}`, findingDraft),
      buildDraft(userId, 'audit-section', `${auditId}:${sectionId}`, sectionDraft),
    ];
    const draftKeys = drafts.map((draft) => draft.key);
    await page.goto('/audits');
    const existingDrafts = (await listDrafts(page)).filter((draft) => draftKeys.includes(draft.key));

    try {
      await seedDrafts(page, drafts);

      await page.goto(`/audits/${auditId}/general`);
      await expect(page.getByLabel(/Name/).first()).toHaveValue(generalDraft.name);
      await expect(page.getByLabel(/Start Date/).first()).toHaveValue('2026-04-01');
      await expect(page.getByLabel(/Scope/)).toHaveValue(generalDraft.scope.join('\n'));
      await expect(page.getByLabel(generalCustomLabel)).toHaveValue(`general custom ${runId}`);
      await expectDraftStatus(page);

      await page.goto(`/audits/${auditId}/network`);
      await expect(page.getByText(networkDraft.scope[0].name)).toBeVisible();
      await page.getByText(hostIp).click();
      await expect(page.getByRole('cell', { name: '8443' })).toBeVisible();
      await expect(page.getByRole('cell', { name: 'https-alt' })).toBeVisible();
      await expectDraftStatus(page);

      await page.goto(`/audits/${auditId}/findings/${findingId}`);
      await expect(page.getByLabel('Title').first()).toHaveValue(findingDraft.title);
      await expect(page.getByText(`Recovered description editor ${runId}`)).toBeVisible();
      await expect(page.getByLabel(/References/)).toHaveValue(findingDraft.references.join('\n'));
      await expect(page.getByLabel(findingCustomLabel)).toHaveValue(`finding custom ${runId}`);
      await page.getByRole('tab', { name: 'Details' }).click();
      await expect(page.getByText(`Recovered remediation editor ${runId}`)).toBeVisible();
      await expectDraftStatus(page);

      await page.goto(`/audits/${auditId}/sections/${sectionId}`);
      await expect(page.getByText(`Recovered section editor ${runId}`)).toBeVisible();
      await expect(page.getByLabel(sectionCustomLabel)).toHaveValue(`section custom ${runId}`);
      await expectDraftStatus(page);
    }
    finally {
      await deleteDrafts(page, draftKeys);
      await putDrafts(page, existingDrafts);
    }
  });

  test('does not show recovery for matching, expired, wrong-user, or wrong-ref drafts', async ({ page, request }) => {
    const general = (await getApiJson(request, `/api/audits/${auditId}/general`)).datas;
    const network = (await getApiJson(request, `/api/audits/${auditId}/network`)).datas;
    const expiredAt = Date.now() - 8 * 24 * 60 * 60 * 1000;

    const edgeDrafts = [
      buildDraft(userId, 'audit-general', auditId, general),
      buildDraft(userId, 'audit-network', auditId, {
        ...network,
        scope: [{ name: 'Expired Scope', hosts: [] }],
      }, { updatedAt: expiredAt }),
      buildDraft('000000000000000000000000', 'audit-finding', `${auditId}:${findingId}`, {
        title: 'Wrong User Finding',
      }),
      buildDraft(userId, 'audit-section', `${auditId}:000000000000000000000000`, {
        customFields: [{
          customField: customField('64f000000000000000000004', 'Wrong Ref Section'),
          text: 'wrong ref',
        }],
      }),
    ];
    const draftKeys = edgeDrafts.map((draft) => draft.key);
    await page.goto('/audits');
    const existingDrafts = (await listDrafts(page)).filter((draft) => draftKeys.includes(draft.key));

    try {
      await seedDrafts(page, edgeDrafts);

      await page.goto(`/audits/${auditId}/general`);
      await expect(page.getByLabel(/Name/).first()).toHaveValue(general.name);
      await expect(page.getByTestId('draft-recovery-status')).not.toBeVisible();

      await page.goto(`/audits/${auditId}/network`);
      await expect(page.getByText('Expired Scope')).not.toBeVisible();
      await expect(page.getByTestId('draft-recovery-status')).not.toBeVisible();

      await page.goto(`/audits/${auditId}/findings/${findingId}`);
      await expect(page.getByLabel('Title').first()).not.toHaveValue('Wrong User Finding');
      await expect(page.getByTestId('draft-recovery-status')).not.toBeVisible();

      await page.goto(`/audits/${auditId}/sections/${sectionId}`);
      await expect(page.getByText('wrong ref')).not.toBeVisible();
      await expect(page.getByTestId('draft-recovery-status')).not.toBeVisible();
    }
    finally {
      await deleteDrafts(page, draftKeys);
      await putDrafts(page, existingDrafts);
    }
  });

  test('clears only the saved audit edit draft and leaves other section drafts available', async ({ page, request }) => {
    const runId = Date.now();
    const general = (await getApiJson(request, `/api/audits/${auditId}/general`)).datas;
    const section = (await getApiJson(request, `/api/audits/${auditId}/sections/${sectionId}`)).datas;
    const originalName = general.name;

    const generalDraft = {
      ...general,
      name: `Saved Draft ${runId}`,
    };
    const sectionDraft = {
      ...section,
      customFields: [
        ...(section.customFields || []).map((field, index) => index === 0
          ? { ...field, text: `<p>Still pending section draft ${runId}</p>` }
          : field),
      ],
    };
    const drafts = [
      buildDraft(userId, 'audit-general', auditId, generalDraft),
      buildDraft(userId, 'audit-section', `${auditId}:${sectionId}`, sectionDraft),
    ];
    const draftKeys = drafts.map((draft) => draft.key);
    await page.goto('/audits');
    const existingDrafts = (await listDrafts(page)).filter((draft) => draftKeys.includes(draft.key));

    try {
      await seedDrafts(page, drafts);

      await page.goto(`/audits/${auditId}/general`);
      await expect(page.getByLabel(/Name/).first()).toHaveValue(generalDraft.name);
      await page.getByRole('button', { name: /Save/ }).click();
      await expect(page.getByRole('button', { name: /Saved/ })).toBeVisible();

      await expect.poll(async () => {
        const storedDrafts = await listDrafts(page);
        return {
          generalExists: storedDrafts.some((draft) => draft.key === drafts[0].key),
          sectionExists: storedDrafts.some((draft) => draft.key === drafts[1].key),
        };
      }).toEqual({ generalExists: false, sectionExists: true });

      await page.goto(`/audits/${auditId}/sections/${sectionId}`);
      await expect(page.getByText(`Still pending section draft ${runId}`)).toBeVisible();
      await expectDraftStatus(page);
    }
    finally {
      await deleteDrafts(page, draftKeys);
      await putDrafts(page, existingDrafts);

      const latestGeneral = (await getApiJson(request, `/api/audits/${auditId}/general`)).datas;
      if (latestGeneral.name !== originalName) {
        await request.put(`/api/audits/${auditId}/general`, {
          data: {
            ...latestGeneral,
            name: originalName,
          },
        });
      }
    }
  });
});
