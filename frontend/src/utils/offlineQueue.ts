/**
 * PRD Section 47 (Offline Consideration), scoped down to what an MVP actually
 * needs: if a check-in/progress/check-out submission fails because the
 * device has no connection, queue it locally and retry automatically once
 * the browser reports it's back online. Full background sync (service
 * worker Background Sync API) is a reasonable Phase 2 — this covers the
 * common field case of "signal drops for a few minutes."
 */
import { checkIn, addProgressPhoto, checkOut, EvidencePayload } from '../api/workReports';

type QueuedAction = 'CHECK_IN' | 'PROGRESS' | 'CHECK_OUT';

interface QueuedItem {
  id: string;
  action: QueuedAction;
  reportId: string;
  photoBase64: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  notes?: string;
  queuedAt: string;
}

const STORAGE_KEY = 'fieldwork_offline_queue_v1';

function readQueue(): QueuedItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string): Blob {
  const [, data] = base64.split(',');
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: 'image/jpeg' });
}

export function getQueueLength(): number {
  return readQueue().length;
}

export async function enqueue(action: QueuedAction, reportId: string, evidence: EvidencePayload) {
  const photoBase64 = await blobToBase64(evidence.photoBlob);
  const items = readQueue();
  items.push({
    id: crypto.randomUUID(),
    action,
    reportId,
    photoBase64,
    latitude: evidence.latitude,
    longitude: evidence.longitude,
    accuracy: evidence.accuracy,
    notes: evidence.notes,
    queuedAt: new Date().toISOString(),
  });
  writeQueue(items);
}

async function runOne(item: QueuedItem) {
  const evidence: EvidencePayload = {
    photoBlob: base64ToBlob(item.photoBase64),
    latitude: item.latitude,
    longitude: item.longitude,
    accuracy: item.accuracy,
    notes: item.notes,
  };
  if (item.action === 'CHECK_IN') return checkIn(item.reportId, evidence);
  if (item.action === 'PROGRESS') return addProgressPhoto(item.reportId, evidence);
  return checkOut(item.reportId, evidence);
}

/** Replays queued actions in order. Stops at the first failure so order is preserved for retry. */
export async function syncQueue(onProgress?: (remaining: number) => void): Promise<{ synced: number; failed: boolean }> {
  const items = readQueue();
  let synced = 0;
  for (const item of items) {
    try {
      await runOne(item);
      synced++;
      writeQueue(readQueue().filter(i => i.id !== item.id));
      onProgress?.(readQueue().length);
    } catch {
      return { synced, failed: true };
    }
  }
  return { synced, failed: false };
}
