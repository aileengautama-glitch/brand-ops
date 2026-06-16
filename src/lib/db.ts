import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

// ─── Schema ───────────────────────────────────────────────────────────────────

interface BrandOpsDB extends DBSchema {
  images: {
    key: string
    value: { id: string; blob: Blob; mimeType: string; name: string; createdAt: string }
  }
  files: {
    key: string
    value: { id: string; blob: Blob; mimeType: string; name: string; createdAt: string }
  }
}

// ─── DB singleton ─────────────────────────────────────────────────────────────

let _db: IDBPDatabase<BrandOpsDB> | null = null

async function getDB(): Promise<IDBPDatabase<BrandOpsDB>> {
  if (_db) return _db
  _db = await openDB<BrandOpsDB>('brand-ops-db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'id' })
      }
    },
  })
  return _db
}

// ─── Image helpers ────────────────────────────────────────────────────────────

export async function saveImage(id: string, file: File): Promise<void> {
  const db = await getDB()
  await db.put('images', {
    id,
    blob: file,
    mimeType: file.type,
    name: file.name,
    createdAt: new Date().toISOString(),
  })
}

export async function getImageUrl(id: string): Promise<string | null> {
  if (!id) return null
  try {
    const db = await getDB()
    const record = await db.get('images', id)
    if (!record) return null
    return URL.createObjectURL(record.blob)
  } catch {
    return null
  }
}

export async function deleteImage(id: string): Promise<void> {
  if (!id) return
  const db = await getDB()
  await db.delete('images', id)
}

// ─── Invoice / file helpers ───────────────────────────────────────────────────

export async function saveFile(id: string, file: File): Promise<void> {
  const db = await getDB()
  await db.put('files', {
    id,
    blob: file,
    mimeType: file.type,
    name: file.name,
    createdAt: new Date().toISOString(),
  })
}

export async function getFileBlob(id: string): Promise<Blob | null> {
  if (!id) return null
  try {
    const db = await getDB()
    const record = await db.get('files', id)
    return record?.blob ?? null
  } catch {
    return null
  }
}

export async function deleteFile(id: string): Promise<void> {
  if (!id) return
  const db = await getDB()
  await db.delete('files', id)
}
