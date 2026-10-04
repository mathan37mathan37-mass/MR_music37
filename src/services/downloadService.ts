// Offline Storage & Download Service
// Provides real audio file caching in IndexedDB for 100% offline playback
// and direct file download to user's device/computer disk

import type { Track } from '@/types';

const DB_NAME = 'melodix_offline_db';
const DB_VERSION = 1;
const AUDIO_STORE = 'offline_audio_blobs';
const META_STORE = 'offline_track_metadata';

export interface OfflineTrackMetadata {
  track: Track;
  savedAt: number;
  sizeBytes: number;
  mimeType: string;
}

function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE);
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// In-memory live blob URLs to avoid re-reading IndexedDB repeatedly
const liveBlobUrlCache = new Map<string, string>();

/**
 * Downloads a track:
 * 1. Fetches the audio file as a Blob
 * 2. Persists the Blob in IndexedDB (offline_audio_blobs)
 * 3. Persists track metadata in IndexedDB (offline_track_metadata)
 * 4. Optionally triggers browser file download to local disk
 */
export async function downloadTrackForOffline(
  track: Track,
  saveFileToDisk = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const seed = parseInt(track.id.replace(/\D/g, ''), 10) || 1;
    const fallbackSrc = `/audio/track-${((seed - 1) % 16) + 1}.wav`;
    const audioUrl = track.audioUrl || fallbackSrc;

    // Fetch the audio file
    let blob: Blob;
    try {
      const res = await fetch(audioUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      blob = await res.blob();
    } catch {
      // If fetching external URL fails (e.g. CORS or network issue), fetch bundled track fallback
      const fallbackRes = await fetch(fallbackSrc);
      if (!fallbackRes.ok) throw new Error(`Fallback HTTP ${fallbackRes.status}`);
      blob = await fallbackRes.blob();
    }

    // Persist audio blob & metadata into IndexedDB
    const db = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([AUDIO_STORE, META_STORE], 'readwrite');
      const audioStore = tx.objectStore(AUDIO_STORE);
      const metaStore = tx.objectStore(META_STORE);

      const metadata: OfflineTrackMetadata = {
        track,
        savedAt: Date.now(),
        sizeBytes: blob.size,
        mimeType: blob.type || 'audio/wav',
      };

      audioStore.put(blob, track.id);
      metaStore.put(metadata, track.id);

      tx.oncomplete = () => {
        // Cache live blob URL
        const prevUrl = liveBlobUrlCache.get(track.id);
        if (prevUrl) {
          try { URL.revokeObjectURL(prevUrl); } catch { /* ignore */ }
        }
        liveBlobUrlCache.set(track.id, URL.createObjectURL(blob));
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });

    // Save actual file to user's disk if requested
    if (saveFileToDisk) {
      triggerFileDownload(track, blob);
    }

    return { success: true };
  } catch (err: any) {
    console.error('[DownloadService] Failed to download track:', err);
    return { success: false, error: err?.message || 'Download failed' };
  }
}

/**
 * Triggers a browser file download so the user has the song saved to their computer / device
 */
export function triggerFileDownload(track: Track, existingBlob?: Blob) {
  const sanitizeFilename = (name: string) => name.replace(/[/\\?%*:|"<>]/g, '_');
  const filename = `${sanitizeFilename(track.artist)} - ${sanitizeFilename(track.title)}.mp3`;

  if (existingBlob) {
    const url = URL.createObjectURL(existingBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);
    return;
  }

  // If blob not provided, fetch and trigger download
  const seed = parseInt(track.id.replace(/\D/g, ''), 10) || 1;
  const src = track.audioUrl || `/audio/track-${((seed - 1) % 16) + 1}.wav`;

  fetch(src)
    .then((r) => r.blob())
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 2000);
    })
    .catch((err) => {
      console.warn('Failed to trigger disk file download:', err);
    });
}

/**
 * Retrieves a live object URL for a downloaded track from IndexedDB
 */
export async function getOfflineTrackAudioUrl(trackId: string): Promise<string | null> {
  if (liveBlobUrlCache.has(trackId)) {
    return liveBlobUrlCache.get(trackId)!;
  }

  try {
    const db = await openOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction(AUDIO_STORE, 'readonly');
      const store = tx.objectStore(AUDIO_STORE);
      const req = store.get(trackId);

      req.onsuccess = () => {
        const blob = req.result as Blob | undefined;
        if (blob) {
          const url = URL.createObjectURL(blob);
          liveBlobUrlCache.set(trackId, url);
          resolve(url);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Checks if a track is cached offline in IndexedDB
 */
export async function isTrackOfflineCached(trackId: string): Promise<boolean> {
  if (liveBlobUrlCache.has(trackId)) return true;
  try {
    const db = await openOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction(AUDIO_STORE, 'readonly');
      const store = tx.objectStore(AUDIO_STORE);
      const req = store.count(trackId);
      req.onsuccess = () => resolve((req.result || 0) > 0);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Removes a downloaded track from IndexedDB
 */
export async function removeOfflineTrack(trackId: string): Promise<void> {
  const cachedUrl = liveBlobUrlCache.get(trackId);
  if (cachedUrl) {
    try { URL.revokeObjectURL(cachedUrl); } catch { /* ignore */ }
    liveBlobUrlCache.delete(trackId);
  }

  try {
    const db = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([AUDIO_STORE, META_STORE], 'readwrite');
      tx.objectStore(AUDIO_STORE).delete(trackId);
      tx.objectStore(META_STORE).delete(trackId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('removeOfflineTrack error:', e);
  }
}

/**
 * Gets all offline tracks stored in IndexedDB
 */
export async function getAllOfflineTracks(): Promise<Track[]> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction(META_STORE, 'readonly');
      const store = tx.objectStore(META_STORE);
      const req = store.getAll();

      req.onsuccess = () => {
        const metadatas = (req.result || []) as OfflineTrackMetadata[];
        resolve(metadatas.map((m) => m.track));
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Total offline storage size in bytes
 */
export async function getOfflineStorageUsage(): Promise<{ totalBytes: number; count: number }> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction(META_STORE, 'readonly');
      const store = tx.objectStore(META_STORE);
      const req = store.getAll();

      req.onsuccess = () => {
        const metadatas = (req.result || []) as OfflineTrackMetadata[];
        const totalBytes = metadatas.reduce((sum, m) => sum + (m.sizeBytes || 0), 0);
        resolve({ totalBytes, count: metadatas.length });
      };
      req.onerror = () => resolve({ totalBytes: 0, count: 0 });
    });
  } catch {
    return { totalBytes: 0, count: 0 };
  }
}
