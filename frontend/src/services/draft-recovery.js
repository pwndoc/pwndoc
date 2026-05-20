import { openDB, deleteDB } from 'idb'
import { reactive } from 'vue'

const DB_NAME = 'pwndoc-drafts'
const DB_VERSION = 1
const STORE_NAME = 'drafts'
const DRAFT_VERSION = 1
const DEFAULT_TTL_DAYS = 7
const DRAFT_STATUS = {
  ACTIVE: 'active_draft',
  DISCARDED: 'discarded_draft',
  SYNCED: 'synced'
}

let dbPromise = null
let dbInstance = null
let openDbImpl = openDB
const state = reactive({
  current: null,
  revision: 0
})

function cloneData(data) {
  if (typeof structuredClone === 'function')
    return structuredClone(data)
  return JSON.parse(JSON.stringify(data))
}

function classifyError(err) {
  if (!err)
    return 'unknown'

  if (err.name === 'QuotaExceededError')
    return 'quota'

  if (
    err.name === 'InvalidStateError' ||
    err.name === 'SecurityError' ||
    err.name === 'NotAllowedError' ||
    err.name === 'UnknownError'
  )
    return 'unavailable'

  return 'unknown'
}

function getDb() {
  if (!dbPromise) {
    dbPromise = openDbImpl(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' })
          store.createIndex('by_userId', 'userId')
          store.createIndex('by_updatedAt', 'updatedAt')
        }
      }
    }).then((db) => {
      dbInstance = db
      return db
    })
  }

  return dbPromise
}

function buildKey(userId, scope, refKey) {
  return `pwndoc.draft.${userId}.${scope}.${refKey}`
}

function isExpired(draft, ttlDays = DEFAULT_TTL_DAYS) {
  return !!draft?.updatedAt && draft.updatedAt < Date.now() - ttlDays * 24 * 60 * 60 * 1000
}

function setStatus(status) {
  state.current = status
}

function clearStatus(key) {
  if (!key || state.current?.key === key)
    state.current = null
}

function bumpRevision() {
  state.revision += 1
}

async function saveDraft({ userId, scope, refKey, data }) {
  if (!userId || !scope || !refKey)
    return { ok: false, error: 'unavailable' }

  try {
    const db = await getDb()
    const key = buildKey(userId, scope, refKey)
    const existing = await db.get(STORE_NAME, key)
    const now = Date.now()

    await db.put(STORE_NAME, {
      key,
      v: DRAFT_VERSION,
      scope,
      refKey,
      userId,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      status: DRAFT_STATUS.ACTIVE,
      data: cloneData(data)
    })

    bumpRevision()
    return { ok: true }
  }
  catch (err) {
    return { ok: false, error: classifyError(err) }
  }
}

async function loadDraft({ userId, scope, refKey }) {
  if (!userId || !scope || !refKey)
    return null

  try {
    const db = await getDb()
    const draft = await db.get(STORE_NAME, buildKey(userId, scope, refKey))
    if (!draft || draft.v !== DRAFT_VERSION)
      return null
    if (isExpired(draft))
      return null
    if (!draft.status)
      draft.status = DRAFT_STATUS.ACTIVE
    return draft
  }
  catch {
    return null
  }
}

async function listDrafts({ userId, scopes, refKeyPrefix, ttlDays = DEFAULT_TTL_DAYS } = {}) {
  if (!userId)
    return []

  try {
    const db = await getDb()
    const index = db.transaction(STORE_NAME).store.index('by_userId')
    let cursor = await index.openCursor(userId)
    const scopeSet = Array.isArray(scopes) && scopes.length ? new Set(scopes) : null
    const drafts = []

    while (cursor) {
      const draft = cursor.value
      if (
        draft?.v === DRAFT_VERSION &&
        (!scopeSet || scopeSet.has(draft.scope)) &&
        (!refKeyPrefix || draft.refKey?.startsWith(refKeyPrefix)) &&
        !isExpired(draft, ttlDays)
      ) {
        drafts.push({
          ...draft,
          status: draft.status || DRAFT_STATUS.ACTIVE
        })
      }
      cursor = await cursor.continue()
    }

    return drafts
  }
  catch {
    return []
  }
}

async function markDraftDiscarded({ userId, scope, refKey }) {
  if (!userId || !scope || !refKey)
    return { ok: true }

  try {
    const db = await getDb()
    const key = buildKey(userId, scope, refKey)
    const draft = await db.get(STORE_NAME, key)
    if (!draft || draft.v !== DRAFT_VERSION)
      return { ok: true }

    await db.put(STORE_NAME, {
      ...draft,
      status: DRAFT_STATUS.DISCARDED,
      discardedAt: Date.now()
    })
    bumpRevision()
    return { ok: true }
  }
  catch (err) {
    return { ok: false, error: classifyError(err) }
  }
}

async function clearDraft({ userId, scope, refKey }) {
  if (!userId || !scope || !refKey)
    return { ok: true }

  try {
    const db = await getDb()
    await db.delete(STORE_NAME, buildKey(userId, scope, refKey))
    bumpRevision()
    return { ok: true }
  }
  catch (err) {
    return { ok: false, error: classifyError(err) }
  }
}

async function clearScope({ userId, scope }) {
  if (!userId || !scope)
    return { ok: true, count: 0 }

  try {
    const db = await getDb()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const index = tx.store.index('by_userId')
    let cursor = await index.openCursor(userId)
    let count = 0

    while (cursor) {
      if (cursor.value.scope === scope) {
        await cursor.delete()
        count++
      }
      cursor = await cursor.continue()
    }

    await tx.done
    if (count)
      bumpRevision()
    return { ok: true, count }
  }
  catch (err) {
    return { ok: false, error: classifyError(err), count: 0 }
  }
}

async function purgeExpired(ttlDays = DEFAULT_TTL_DAYS) {
  try {
    const db = await getDb()
    const cutoff = Date.now() - ttlDays * 24 * 60 * 60 * 1000
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const index = tx.store.index('by_updatedAt')
    let cursor = await index.openCursor(IDBKeyRange.upperBound(cutoff))
    let count = 0

    while (cursor) {
      await cursor.delete()
      count++
      cursor = await cursor.continue()
    }

    await tx.done
    if (count)
      bumpRevision()
    return { ok: true, count }
  }
  catch (err) {
    return { ok: false, error: classifyError(err), count: 0 }
  }
}

async function isStorageAvailable() {
  try {
    await getDb()
    return true
  }
  catch {
    return false
  }
}

async function __resetForTests() {
  if (dbInstance && typeof dbInstance.close === 'function') {
    dbInstance.close()
  }
  dbInstance = null
  dbPromise = null
  openDbImpl = openDB
  await deleteDB(DB_NAME)
}

function __setOpenDBForTests(fn) {
  if (dbInstance && typeof dbInstance.close === 'function') {
    dbInstance.close()
  }
  dbInstance = null
  dbPromise = null
  openDbImpl = fn || openDB
}

export default {
  DRAFT_STATUS,
  state,
  setStatus,
  clearStatus,
  buildKey,
  saveDraft,
  loadDraft,
  listDrafts,
  clearDraft,
  markDraftDiscarded,
  clearScope,
  purgeExpired,
  isStorageAvailable,
  __resetForTests,
  __setOpenDBForTests
}
