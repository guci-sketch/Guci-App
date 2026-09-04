import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Evidence photo storage.
 *
 * PRD Section 33 asks for a repository abstraction so the storage backend can
 * change without rewriting the app. This module is that seam: today it writes
 * to local disk; in production, swap the body of these three functions for
 * Supabase Storage calls (`supabase.storage.from('evidence').upload(...)`)
 * and nothing above this layer needs to change.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOAD_ROOT = process.env.UPLOAD_DIR
  ? join(process.cwd(), process.env.UPLOAD_DIR)
  : join(__dirname, '../../../uploads');

export async function savePhoto(buffer: Buffer, extension: string): Promise<string> {
  const folder = new Date().toISOString().slice(0, 7); // YYYY-MM, keeps one dir from growing unbounded
  const dir = join(UPLOAD_ROOT, folder);
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.${extension}`;
  await writeFile(join(dir, filename), buffer);
  return `${folder}/${filename}`; // stored as the "storage_path" column
}

export async function readPhoto(storagePath: string): Promise<Buffer> {
  return readFile(join(UPLOAD_ROOT, storagePath));
}

export async function deletePhoto(storagePath: string): Promise<void> {
  await unlink(join(UPLOAD_ROOT, storagePath)).catch(() => undefined);
}
