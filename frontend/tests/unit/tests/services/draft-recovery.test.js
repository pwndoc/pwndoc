import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import DraftRecoveryService from '@/services/draft-recovery'

describe('DraftRecoveryService', () => {
  beforeEach(async () => {
    await DraftRecoveryService.__resetForTests()
  })

  afterEach(async () => {
    await DraftRecoveryService.__resetForTests()
  })

  it('builds stable scoped keys', () => {
    expect(DraftRecoveryService.buildKey('user1', 'audit-finding', 'audit:finding'))
      .toBe('pwndoc.draft.user1.audit-finding.audit:finding')
  })

  it('saves and loads drafts by user, scope, and refKey', async () => {
    await expect(DraftRecoveryService.saveDraft({
      userId: 'user1',
      scope: 'audit-general',
      refKey: 'audit1',
      data: { name: 'Draft Audit' }
    })).resolves.toEqual({ ok: true })

    await DraftRecoveryService.saveDraft({
      userId: 'user2',
      scope: 'audit-general',
      refKey: 'audit1',
      data: { name: 'Other User' }
    })

    const draft = await DraftRecoveryService.loadDraft({
      userId: 'user1',
      scope: 'audit-general',
      refKey: 'audit1'
    })

    expect(draft.data).toEqual({ name: 'Draft Audit' })
    expect(draft.status).toBe(DraftRecoveryService.DRAFT_STATUS.ACTIVE)
  })

  it('marks discarded drafts without deleting them', async () => {
    await DraftRecoveryService.saveDraft({
      userId: 'user1',
      scope: 'audit-general',
      refKey: 'audit1',
      data: { name: 'Draft Audit' }
    })

    await expect(DraftRecoveryService.markDraftDiscarded({
      userId: 'user1',
      scope: 'audit-general',
      refKey: 'audit1'
    })).resolves.toEqual({ ok: true })

    const draft = await DraftRecoveryService.loadDraft({
      userId: 'user1',
      scope: 'audit-general',
      refKey: 'audit1'
    })

    expect(draft).not.toBeNull()
    expect(draft.status).toBe(DraftRecoveryService.DRAFT_STATUS.DISCARDED)
    expect(draft.data).toEqual({ name: 'Draft Audit' })
  })

  it('lists drafts by user, scopes, and refKey prefix including discarded drafts', async () => {
    await DraftRecoveryService.saveDraft({ userId: 'user1', scope: 'audit-general', refKey: 'audit1', data: { name: 'General' } })
    await DraftRecoveryService.saveDraft({ userId: 'user1', scope: 'audit-section', refKey: 'audit1:section1', data: { text: 'Section' } })
    await DraftRecoveryService.saveDraft({ userId: 'user1', scope: 'audit-finding', refKey: 'audit1:finding1', data: { title: 'Finding' } })
    await DraftRecoveryService.saveDraft({ userId: 'user1', scope: 'vulnerability', refKey: 'audit1:vuln1', data: { title: 'Vuln' } })
    await DraftRecoveryService.saveDraft({ userId: 'user1', scope: 'audit-section', refKey: 'audit2:section1', data: { text: 'Other Audit' } })
    await DraftRecoveryService.saveDraft({ userId: 'user2', scope: 'audit-section', refKey: 'audit1:section2', data: { text: 'Other User' } })

    await DraftRecoveryService.markDraftDiscarded({
      userId: 'user1',
      scope: 'audit-section',
      refKey: 'audit1:section1'
    })

    const drafts = await DraftRecoveryService.listDrafts({
      userId: 'user1',
      scopes: ['audit-general', 'audit-section', 'audit-finding'],
      refKeyPrefix: 'audit1'
    })

    expect(drafts.map(draft => `${draft.scope}:${draft.refKey}`).sort()).toEqual([
      'audit-finding:audit1:finding1',
      'audit-general:audit1',
      'audit-section:audit1:section1'
    ])
    expect(drafts.find(draft => draft.refKey === 'audit1:section1').status)
      .toBe(DraftRecoveryService.DRAFT_STATUS.DISCARDED)
  })

  it('does not list deleted drafts', async () => {
    await DraftRecoveryService.saveDraft({ userId: 'user1', scope: 'audit-section', refKey: 'audit1:section1', data: {} })
    await DraftRecoveryService.saveDraft({ userId: 'user1', scope: 'audit-section', refKey: 'audit1:section2', data: {} })
    await DraftRecoveryService.clearDraft({ userId: 'user1', scope: 'audit-section', refKey: 'audit1:section1' })

    const drafts = await DraftRecoveryService.listDrafts({
      userId: 'user1',
      scopes: ['audit-section'],
      refKeyPrefix: 'audit1'
    })

    expect(drafts.map(draft => draft.refKey)).toEqual(['audit1:section2'])
  })

  it('ignores unknown draft schema versions', async () => {
    await DraftRecoveryService.saveDraft({
      userId: 'user1',
      scope: 'audit-general',
      refKey: 'audit1',
      data: { name: 'Draft Audit' }
    })

    const db = await indexedDB.open('pwndoc-drafts')
    await new Promise((resolve, reject) => {
      db.onsuccess = () => resolve()
      db.onerror = () => reject(db.error)
    })
    const conn = db.result
    const tx = conn.transaction('drafts', 'readwrite')
    const store = tx.objectStore('drafts')
    const draft = await new Promise((resolve, reject) => {
      const req = store.get('pwndoc.draft.user1.audit-general.audit1')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    draft.v = 99
    store.put(draft)
    await new Promise(resolve => { tx.oncomplete = resolve })
    conn.close()

    await expect(DraftRecoveryService.loadDraft({
      userId: 'user1',
      scope: 'audit-general',
      refKey: 'audit1'
    })).resolves.toBeNull()
  })

  it('classifies open failures as unavailable', async () => {
    DraftRecoveryService.__setOpenDBForTests(() => Promise.reject({ name: 'InvalidStateError' }))

    await expect(DraftRecoveryService.saveDraft({
      userId: 'user1',
      scope: 'audit-general',
      refKey: 'audit1',
      data: {}
    })).resolves.toEqual({ ok: false, error: 'unavailable' })
  })

  it('classifies quota failures', async () => {
    DraftRecoveryService.__setOpenDBForTests(() => Promise.resolve({
      get: () => Promise.resolve(null),
      put: () => Promise.reject({ name: 'QuotaExceededError' })
    }))

    await expect(DraftRecoveryService.saveDraft({
      userId: 'user1',
      scope: 'audit-general',
      refKey: 'audit1',
      data: {}
    })).resolves.toEqual({ ok: false, error: 'quota' })
  })

  it('purges only expired drafts', async () => {
    const now = Date.now()
    await DraftRecoveryService.saveDraft({ userId: 'user1', scope: 'a', refKey: 'old', data: { old: true } })
    await DraftRecoveryService.saveDraft({ userId: 'user1', scope: 'a', refKey: 'new', data: { old: false } })

    const openReq = indexedDB.open('pwndoc-drafts')
    const conn = await new Promise((resolve, reject) => {
      openReq.onsuccess = () => resolve(openReq.result)
      openReq.onerror = () => reject(openReq.error)
    })
    const tx = conn.transaction('drafts', 'readwrite')
    const store = tx.objectStore('drafts')
    const oldReq = store.get('pwndoc.draft.user1.a.old')
    oldReq.onsuccess = () => {
      const oldDraft = oldReq.result
      oldDraft.updatedAt = now - 8 * 24 * 60 * 60 * 1000
      store.put(oldDraft)
    }
    await new Promise(resolve => { tx.oncomplete = resolve })
    conn.close()

    await expect(DraftRecoveryService.purgeExpired(7)).resolves.toEqual({ ok: true, count: 1 })
    await expect(DraftRecoveryService.loadDraft({ userId: 'user1', scope: 'a', refKey: 'old' })).resolves.toBeNull()
    await expect(DraftRecoveryService.loadDraft({ userId: 'user1', scope: 'a', refKey: 'new' })).resolves.not.toBeNull()
  })

  it('clears a single draft and a full scope', async () => {
    await DraftRecoveryService.saveDraft({ userId: 'user1', scope: 'a', refKey: '1', data: {} })
    await DraftRecoveryService.saveDraft({ userId: 'user1', scope: 'a', refKey: '2', data: {} })
    await DraftRecoveryService.saveDraft({ userId: 'user1', scope: 'b', refKey: '1', data: {} })

    await DraftRecoveryService.clearDraft({ userId: 'user1', scope: 'a', refKey: '1' })
    await expect(DraftRecoveryService.loadDraft({ userId: 'user1', scope: 'a', refKey: '1' })).resolves.toBeNull()

    await expect(DraftRecoveryService.clearScope({ userId: 'user1', scope: 'a' })).resolves.toEqual({ ok: true, count: 1 })
    await expect(DraftRecoveryService.loadDraft({ userId: 'user1', scope: 'a', refKey: '2' })).resolves.toBeNull()
    await expect(DraftRecoveryService.loadDraft({ userId: 'user1', scope: 'b', refKey: '1' })).resolves.not.toBeNull()
  })
})
