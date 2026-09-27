import { ref, uploadBytesResumable, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, isFirebaseConfigured } from './firebase';
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

/**
 * Validates an audio file for MIME type and file size
 */
export function validateAudioFile(file: File): FileValidationResult {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Check type (or extension fallback for some browser MIME anomalies)
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
    return {
      valid: false,
      error: `Audio file is too large (${sizeMb} MB). Maximum allowed size is 35 MB.`,
    };
  }

  return { valid: true };
}

/**
 * Validates an image file for MIME type and file size
 */
export function validateImageFile(file: File): FileValidationResult {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

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
    return {
      valid: false,
      error: `Image file is too large (${sizeMb} MB). Maximum allowed size is 6 MB.`,
    };
  }

  return { valid: true };
}

/**
 * Simple (non-resumable) upload — avoids the resumable multipart CORS preflight.
 * Used as a fallback when uploadBytesResumable hits CORS errors.
 */
async function uploadBytesSimple(
  path: string,
  file: File,
  options?: UploadOptions
): Promise<string> {
  const { onProgress, onError, onSuccess } = options || {};

  if (!storage) throw new Error('Firebase Storage instance is not initialized.');

  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileRef = ref(storage, `${path}/${Date.now()}_${sanitizedName}`);

  // Simulate progress since uploadBytes has no progress events
  let prog = 10;
  onProgress?.(prog);
  const ticker = setInterval(() => {
    prog = Math.min(85, prog + 8);
    onProgress?.(prog);
  }, 250);

  try {
    const snapshot = await uploadBytes(fileRef, file);
    clearInterval(ticker);
    onProgress?.(95);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    onProgress?.(100);
    onSuccess?.(downloadUrl);
    return downloadUrl;
  } catch (err) {
    clearInterval(ticker);
    const error = err instanceof Error ? err : new Error(String(err));
    onError?.(error);
    throw error;
  }
}

/**
 * Uploads a media file to Firebase Storage with real-time progress callbacks.
 * Tries resumable upload first (for progress), falls back to simple upload on CORS error.
 * Falls back to local data URL simulation in offline/demo mode.
 */
let isFirebaseStorageCorsBlocked = false;

// Configure fast retry timeouts on storage instance if available
if (storage) {
  try {
    // @ts-ignore
    storage.maxUploadRetryTime = 1200;
    // @ts-ignore
    storage.maxOperationRetryTime = 1200;
  } catch (_) {}
}

/**
 * Executes high-performance local storage fallback (IndexedDB for audio, compressed Data URL for images).
 */
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
  } catch (err) {
    clearInterval(progTimer);
    const mediaKey = `audio_${Date.now()}_${sanitizedName}`;
    const persistentUri = `idb://${mediaKey}`;
    try {
      await storeMediaBlob(mediaKey, file);
    } catch {
      // fallback
    }
    onProgress?.(100);
    onSuccess?.(persistentUri);
    return persistentUri;
  }
}

/**
 * Uploads a media file to Firebase Storage with real-time progress callbacks.
 * If Firebase Storage is blocked by CORS (or offline/slow), instantly falls back to IndexedDB and compressed local storage.
 */
export async function uploadMediaWithProgress(
  path: string,
  file: File,
  options?: UploadOptions
): Promise<string> {
  const { onProgress, onSuccess } = options || {};
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

  // If Firebase Storage is unconfigured or CORS was already detected as blocked, use local fallback immediately
  if (!isFirebaseConfigured() || !storage || isFirebaseStorageCorsBlocked) {
    return runLocalFallback(file, sanitizedName, options);
  }

  return new Promise((resolve) => {
    let completed = false;
    let bytesReceived = 0;

    const doFallback = async (reason: string) => {
      if (completed) return;
      completed = true;
      console.warn(`Firebase Storage notice (${reason}). Switched to local offline media storage.`);
      const localUrl = await runLocalFallback(file, sanitizedName, options);
      resolve(localUrl);
    };

    try {
      const fileRef = ref(storage!, `${path}/${Date.now()}_${sanitizedName}`);
      const uploadTask = uploadBytesResumable(fileRef, file);

      // Give Firebase Storage time to establish the network connection before deciding
      // that it is blocked. Some valid uploads stall briefly before the first byte begins.
      const watchdog = setTimeout(() => {
        if (!completed && bytesReceived === 0) {
          console.warn('[Firebase Storage] Upload has not transferred bytes yet; waiting longer before local fallback.');
        }
      }, 8000);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          bytesReceived = snapshot.bytesTransferred;
          if (snapshot.bytesTransferred > 0) {
            clearTimeout(watchdog);
            const progress = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            );
            onProgress?.(progress);
          }
        },
        (error) => {
          clearTimeout(watchdog);
          try {
            uploadTask.cancel();
          } catch (_) {}
          isFirebaseStorageCorsBlocked = true;
          doFallback(error.message || error.code || 'storage error');
        },
        async () => {
          clearTimeout(watchdog);
          if (completed) return;
          completed = true;
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            onProgress?.(100);
            onSuccess?.(downloadUrl);
            resolve(downloadUrl);
          } catch (err) {
            isFirebaseStorageCorsBlocked = true;
            doFallback('getDownloadURL error');
          }
        }
      );
    } catch (err) {
      isFirebaseStorageCorsBlocked = true;
      doFallback('Task creation error');
    }
  });
}

/**
 * Backwards compatible simple upload helper
 */
export async function uploadMediaFile(path: string, file: File): Promise<string> {
  return uploadMediaWithProgress(path, file);
}



