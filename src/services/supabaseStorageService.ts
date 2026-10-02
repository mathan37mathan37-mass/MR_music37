/**
 * supabaseStorageService.ts
 *
 * Supabase Storage upload helpers — replaces the Firebase Storage portions of
 * storageService.ts.  The existing file validation constants / helpers are
 * re-exported from storageService.ts so call-sites need no changes.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface UploadOptions {
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
  onSuccess?: (downloadUrl: string) => void;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function getPublicUrl(bucket: string, path: string): Promise<string> {
  const { data } = supabase!.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ── Core upload ───────────────────────────────────────────────────────────────

/**
 * Uploads a file to a Supabase Storage bucket at the given path prefix.
 * Simulates progress via a timer since Supabase JS v2 does not expose
 * real-time upload progress events for standard uploads.
 */
export async function uploadToSupabase(
  bucket: 'songs' | 'covers' | 'avatars',
  pathPrefix: string,
  file: File,
  options?: UploadOptions
): Promise<string> {
  const { onProgress, onError, onSuccess } = options ?? {};

  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured. Cannot upload file.');
  }

  const safeName = sanitize(file.name);
  const filePath = `${pathPrefix}/${Date.now()}_${safeName}`;

  // Fake progress while upload runs
  let prog = 10;
  onProgress?.(prog);
  const ticker = setInterval(() => {
    prog = Math.min(85, prog + 10);
    onProgress?.(prog);
  }, 300);

  try {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { upsert: false });

    clearInterval(ticker);

    if (error) {
      const err = new Error(`Supabase Storage upload failed: ${error.message}`);
      onError?.(err);
      throw err;
    }

    onProgress?.(95);
    const publicUrl = await getPublicUrl(bucket, filePath);
    onProgress?.(100);
    onSuccess?.(publicUrl);
    return publicUrl;
  } catch (err) {
    clearInterval(ticker);
    const wrapped = err instanceof Error ? err : new Error(String(err));
    onError?.(wrapped);
    throw wrapped;
  }
}

// ── Convenience wrappers ──────────────────────────────────────────────────────

/** Upload a song's audio file */
export async function uploadSongAudio(
  songId: string,
  file: File,
  options?: UploadOptions
): Promise<string> {
  return uploadToSupabase('songs', `songs/${songId}`, file, options);
}

/** Upload a song/album cover image */
export async function uploadSongCover(
  songId: string,
  file: File,
  options?: UploadOptions
): Promise<string> {
  return uploadToSupabase('covers', `covers/${songId}`, file, options);
}

/** Upload a user avatar */
export async function uploadUserAvatar(
  userId: string,
  file: File,
  options?: UploadOptions
): Promise<string> {
  return uploadToSupabase('avatars', `avatars/${userId}`, file, options);
}

/** Delete a file from a bucket given its full public URL */
export async function deleteFromSupabase(
  bucket: 'songs' | 'covers' | 'avatars',
  publicUrl: string
): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  try {
    // Extract the path after the bucket name from the public URL
    const urlObj = new URL(publicUrl);
    const pathParts = urlObj.pathname.split(`/${bucket}/`);
    if (pathParts.length < 2) return;
    const filePath = pathParts[1];

    const { error } = await supabase.storage.from(bucket).remove([filePath]);
    if (error) console.warn('deleteFromSupabase error:', error.message);
  } catch (err) {
    console.warn('deleteFromSupabase threw:', err);
  }
}
