/**
 * Offline queue — IndexedDB backend (Task #2 fix: localStorage limit ~5MB
 * too small for JPEG blobs; IDB handles binary natively without base64 inflation).
 *
 * Also supports TREATMENT action (Task #1 fix) and GPS batching (Task #3 fix).
 */
import { checkIn, addProgressPhoto, checkOut, submitTreatment, EvidencePayload, TreatmentInput } from '../api/workReports';

export type QueuedAction = 'CHECK_IN' | 'PROGRESS' | 'CHECK_OUT' | 'TREATMENT' | 'GPS';

interface QueuedItem {
  id: string;
  action: QueuedAction;
  reportId: string;
  // Photo evidence — stored as Blob (IDB handles binary natively)
  photoBlob?: Blob;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  photoTag?: string;
  notes?: string;
  customerName?: string;
  customerPhone?: string;
  customerFeedback?: string;
  customerSignature?: string;
  // Treatment-specific
  treatmentInput?: TreatmentInput;
  queuedAt: string;
}

const DB_NAME = 'fieldwork_offline_v2';
const STORE = 'queue';
const DB_VERSION = 1;

let _db: IDBDatabase | null = null;

function openDb(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = e => {
      _db = (e.target as IDBOpenDBRequest).result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

function tx(db: IDBDatabase, mode: IDBTransactionMode) {
  return db.transaction(STORE, mode).objectStore(STORE);
}

function idbGetAll(db: IDBDatabase): Promise<QueuedItem[]> {
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readonly').getAll();
    req.onsuccess = () => resolve(req.result as QueuedItem[]);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, item: QueuedItem): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readwrite').put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function idbDelete(db: IDBDatabase, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readwrite').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function getQueueLength(): Promise<number> {
  try {
    const db = await openDb();
    const items = await idbGetAll(db);
    return items.length;
  } catch {
    return 0;
  }
}

/** Enqueue a photo-based action (CHECK_IN / PROGRESS / CHECK_OUT). */
export async function enqueue(action: QueuedAction, reportId: string, evidence: EvidencePayload): Promise<void> {
  const db = await openDb();
  const item: QueuedItem = {
    id: crypto.randomUUID(),
    action,
    reportId,
    photoBlob: evidence.photoBlob,
    latitude: evidence.latitude,
    longitude: evidence.longitude,
    accuracy: evidence.accuracy,
    photoTag: evidence.photoTag,
    notes: evidence.notes,
    customerName: evidence.customerName,
    customerPhone: evidence.customerPhone,
    customerFeedback: evidence.customerFeedback,
    customerSignature: evidence.customerSignature,
    queuedAt: new Date().toISOString(),
  };
  await idbPut(db, item);
}

/** Task #1 fix — Enqueue Treatment form data (no photo). */
export async function enqueueTreatment(reportId: string, input: TreatmentInput): Promise<void> {
  const db = await openDb();
  const item: QueuedItem = {
    id: crypto.randomUUID(),
    action: 'TREATMENT',
    reportId,
    treatmentInput: input,
    queuedAt: new Date().toISOString(),
  };
  await idbPut(db, item);
}

/** Task #3 fix — Enqueue GPS ping (no photo). */
export async function enqueueGps(latitude: number, longitude: number, accuracy: number): Promise<void> {
  const db = await openDb();
  const item: QueuedItem = {
    id: crypto.randomUUID(),
    action: 'GPS',
    reportId: '__gps__',
    latitude,
    longitude,
    accuracy,
    queuedAt: new Date().toISOString(),
  };
  await idbPut(db, item);
}

async function runOne(item: QueuedItem): Promise<void> {
  if (item.action === 'TREATMENT') {
    await submitTreatment(item.reportId, item.treatmentInput!);
    return;
  }
  if (item.action === 'GPS') {
    const { postLocation } = await import('../api/location');
    await postLocation({ latitude: item.latitude!, longitude: item.longitude!, accuracy: item.accuracy });
    return;
  }
  const evidence: EvidencePayload = {
    photoBlob: item.photoBlob!,
    latitude: item.latitude!,
    longitude: item.longitude!,
    accuracy: item.accuracy!,
    photoTag: item.photoTag as any,
    notes: item.notes,
    customerName: item.customerName,
    customerPhone: item.customerPhone,
    customerFeedback: item.customerFeedback,
    customerSignature: item.customerSignature,
  };
  if (item.action === 'CHECK_IN') { await checkIn(item.reportId, evidence); return; }
  if (item.action === 'PROGRESS') { await addProgressPhoto(item.reportId, evidence); return; }
  await checkOut(item.reportId, evidence);
}

/** Replay queued actions in insertion order. Stops at first failure to preserve order. */
export async function syncQueue(onProgress?: (remaining: number) => void): Promise<{ synced: number; failed: boolean }> {
  const db = await openDb();
  const items = (await idbGetAll(db)).sort(
    (a, b) => new Date(a.queuedAt).getTime() - new Date(b.queuedAt).getTime()
  );
  let synced = 0;
  for (const item of items) {
    try {
      await runOne(item);
      await idbDelete(db, item.id);
      synced++;
      const remaining = await getQueueLength();
      onProgress?.(remaining);
    } catch {
      return { synced, failed: true };
    }
  }
  return { synced, failed: false };
}
