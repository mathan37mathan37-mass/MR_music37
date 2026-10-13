/**
 * storageService.ts
 *
 * Unified upload entry-point for MR Music using Supabase Storage.
 *
 * Priority:
 *   1. Supabase Storage  — when VITE_SUPABASE_URL is configured
 *   2. Local IndexedDB   — offline / demo fallback
 *
 * All validation helpers and the local IndexedDB fallback are preserved
 * so the rest of the app (admin upload forms, player, etc.) works seamlessly.
 */

import { isSupabaseConfigured } from '@/lib/supabase';
import { uploadToSupabase } from './supabaseStorageService';
import { storeMediaBlob, compressImageToDataUrl } from './mediaStorage';
export { resolveAudioSource, getMediaUrl, isBlobUrlAlive } from './mediaStorage';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export interface UploadOptions {
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
  onSuccess?: (downloadUrl: string) => void;
}

// ── VALIDATION CONSTANTS ───────────────────────────────────────────────────
export const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/aac',
  'audio/flac',
  'audio/m4a',
  'audio/mp4',
];

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
];

export const MAX_AUDIO_SIZE_BYTES = 35 * 1024 * 1024; // 35 MB
export const MAX_IMAGE_SIZE_BYTES = 6 * 1024 * 1024;  // 6 MB

export function validateAudioFile(file: File): FileValidationResult {
  if (!file) return { valid: false, error: 'No file provided' };

  const isAudioType = ALLOWED_AUDIO_TYPES.includes(file.type) ||
    /\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(file.name);

  if (!isAudioType) {
    return {
      valid: false,
      error: `Unsupported audio format "${file.type || 'unknown'}". Allowed: MP3, WAV, OGG, AAC, FLAC, M4A`,
    };
  }

  if (file.size > MAX_AUDIO_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return { valid: false, error: `Audio file is too large (${sizeMb} MB). Maximum: 35 MB.` };
  }

  return { valid: true };
}

export function validateImageFile(file: File): FileValidationResult {
  if (!file) return { valid: false, error: 'No file provided' };

  const isImageType = ALLOWED_IMAGE_TYPES.includes(file.type) ||
    /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(file.name);

  if (!isImageType) {
    return {
      valid: false,
      error: `Unsupported image format "${file.type || 'unknown'}". Allowed: JPG, PNG, WEBP, GIF`,
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return { valid: false, error: `Image file is too large (${sizeMb} MB). Maximum: 6 MB.` };
  }

  return { valid: true };
}

// ── Local fallback (IndexedDB / Data URLs for offline/demo) ────────────────
async function runLocalFallback(
  file: File,
  sanitizedName: string,
  options?: UploadOptions
): Promise<string> {
  const { onProgress, onSuccess } = options || {};

  let currentProg = 25;
  onProgress?.(currentProg);
  const progTimer = setInterval(() => {
    currentProg = Math.min(95, currentProg + 25);
    onProgress?.(currentProg);
  }, 70);

  try {
    let resultUrl: string;
    if (file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(file.name)) {
      resultUrl = await compressImageToDataUrl(file, 600, 0.82);
    } else {
      const mediaKey = `audio_${Date.now()}_${sanitizedName}`;
      resultUrl = await storeMediaBlob(mediaKey, file);
    }
    clearInterval(progTimer);
    onProgress?.(100);
    onSuccess?.(resultUrl);
    return resultUrl;
  } catch {
    clearInterval(progTimer);
    const mediaKey = `audio_${Date.now()}_${sanitizedName}`;
    const persistentUri = `idb://${mediaKey}`;
    try { await storeMediaBlob(mediaKey, file); } catch { /* ignore */ }
    onProgress?.(100);
    onSuccess?.(persistentUri);
    return persistentUri;
  }
}

/**
 * Uploads a media file — tries Supabase Storage first, then local demo fallback.
 *
 * @param path    Storage path prefix (e.g. "songs/t123" or "covers/t123")
 * @param file    The file to upload
 * @param options Progress / success / error callbacks
 */
export async function uploadMediaWithProgress(
  path: string,
  file: File,
  options?: UploadOptions
): Promise<string> {
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

  // ── 1. Supabase Storage ──────────────────────────────────────────────────
  if (isSupabaseConfigured()) {
    try {
      // Derive the bucket from the path prefix
      let bucket: 'songs' | 'covers' | 'avatars' = 'covers';
      if (path.startsWith('songs') || path.includes('audio')) bucket = 'songs';
      else if (path.startsWith('avatars') || path.includes('avatar')) bucket = 'avatars';

      return await uploadToSupabase(bucket, path, file, options);
    } catch (err) {
      console.warn('[uploadMediaWithProgress] Supabase upload failed, falling back to local demo storage:', err);
    }
  }

  // ── 2. Local offline/demo fallback ───────────────────────────────────────
  return runLocalFallback(file, sanitizedName, options);
}

/** Backwards-compatible simple upload */
export async function uploadMediaFile(path: string, file: File): Promise<string> {
  return uploadMediaWithProgress(path, file);
}
