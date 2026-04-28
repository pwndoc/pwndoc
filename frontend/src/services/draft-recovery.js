import { openDB, deleteDB } from 'idb'

const DB_NAME = 'pwndoc-drafts'
const DB_VERSION = 1
const STORE_NAME = 'drafts'
const DRAFT_VERSION = 1
const DEFAULT_TTL_DAYS = 7

let dbPromise = null
let dbInstance = null
let openDbImpl = openDB

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
      data: cloneData(data)
    })

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
    return draft
  }
  catch {
    return null
  }
}

async function clearDraft({ userId, scope, refKey }) {
  if (!userId || !scope || !refKey)
    return { ok: true }

  try {
    const db = await getDb()
    await db.delete(STORE_NAME, buildKey(userId, scope, refKey))
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
  buildKey,
  saveDraft,
  loadDraft,
  clearDraft,
  clearScope,
  purgeExpired,
  isStorageAvailable,
  __resetForTests,
  __setOpenDBForTests
}
