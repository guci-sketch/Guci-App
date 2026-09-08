import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSupabaseClient, isSupabaseStorageConfigured, EVIDENCE_BUCKET } from '../../lib/supabase.js';

/**
 * Evidence photo storage — PRD Section 33's repository seam in practice.
 *
 * Two backends behind the same three functions:
 *   - Supabase Storage, used automatically when SUPABASE_URL and
 *     SUPABASE_SERVICE_ROLE_KEY are set (this is what runs on Vercel).
 *   - Local disk, used otherwise, so local development doesn't need a
 *     cloud account just to run `npm run dev`.
 *
 * Nothing outside this file needs to know which one is active — routes
 * call savePhoto/readPhoto/deletePhoto and get a storage_path back either way.
 *
 * IMPORTANT for Vercel: serverless functions have an ephemeral, often
 * read-only filesystem outside /tmp. The local-disk branch below will not
 * work in that environment — this is exactly why the Supabase branch
 * exists and is selected automatically once the env vars are set.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOAD_ROOT = process.env.UPLOAD_DIR
  ? join(process.cwd(), process.env.UPLOAD_DIR)
  : join(__dirname, '../../../uploads');

export async function savePhoto(buffer: Buffer, extension: string): Promise<string> {
  const folder = new Date().toISOString().slice(0, 7); // YYYY-MM, keeps one dir/prefix from growing unbounded
  const filename = `${randomUUID()}.${extension}`;
  const storagePath = `${folder}/${filename}`;

  if (isSupabaseStorageConfigured) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.storage
      .from(EVIDENCE_BUCKET)
      .upload(storagePath, buffer, { contentType: `image/${extension}`, upsert: false });
    if (error) throw new Error(`Gagal menyimpan foto ke Supabase Storage: ${error.message}`);
    return storagePath;
  }

  const dir = join(UPLOAD_ROOT, folder);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, filename), buffer);
  return storagePath;
}

export async function readPhoto(storagePath: string): Promise<Buffer> {
  if (isSupabaseStorageConfigured) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage.from(EVIDENCE_BUCKET).download(storagePath);
    if (error || !data) throw new Error(`Foto tidak ditemukan di Supabase Storage: ${error?.message ?? 'unknown error'}`);
    return Buffer.from(await data.arrayBuffer());
  }

  return readFile(join(UPLOAD_ROOT, storagePath));
}

export async function deletePhoto(storagePath: string): Promise<void> {
  if (isSupabaseStorageConfigured) {
    const supabase = getSupabaseClient();
    await supabase.storage.from(EVIDENCE_BUCKET).remove([storagePath]).catch(() => undefined);
    return;
  }

  await unlink(join(UPLOAD_ROOT, storagePath)).catch(() => undefined);
}
