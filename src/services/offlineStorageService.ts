/**
 * offlineStorageService.ts
 *
 * Professional IndexedDB-based offline music and cover storage for MR Music.
 * Database: MRMusicOffline
 * Stores:
 *   - songs:  Track metadata (id, title, artist, album, duration, etc.)
 *   - audio:  Raw MP3/audio Blobs keyed by song ID
 *   - covers: Raw cover image Blobs keyed by song ID
 *
 * Provides real-time download progress tracking (0% -> 100%),
 * offline audio Object URL lifecycle management, and storage statistics.
 */

import type { Track } from '@/types';

export const OFFLINE_DB_NAME = 'MRMusicOffline';
export const OFFLINE_DB_VERSION = 1;

export const STORES = {
  SONGS: 'songs',
  AUDIO: 'audio',
  COVERS: 'covers',
} as const;

export interface OfflineSongRecord {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  genre: string;
  coverUrl: string;
  hasLocalCover: boolean;
  audioUrl?: string;
  downloadedAt: number;
  sizeBytes: number;
  mimeType: string;
  year?: number;
  playsCount?: number;
}

export interface OfflineStorageStats {
  totalSongs: number;
  totalBytes: number;
  formattedSize: string;
}

function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORES.SONGS)) {
        const songStore = db.createObjectStore(STORES.SONGS, { keyPath: 'id' });
        songStore.createIndex('downloadedAt', 'downloadedAt', { unique: false });
        songStore.createIndex('artist', 'artist', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.AUDIO)) {
        db.createObjectStore(STORES.AUDIO);
      }
      if (!db.objectStoreNames.contains(STORES.COVERS)) {
        db.createObjectStore(STORES.COVERS);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// In-memory live blob URL cache for fast synchronous access and memory management
const liveAudioUrlCache = new Map<string, string>();
const liveCoverUrlCache = new Map<string, string>();

/**
 * Format bytes into human readable string (e.g. "18.4 MB")
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Downloads audio file with progress tracking and stores audio, cover, and metadata in IndexedDB.
 */
export async function saveSongOffline(
  track: Track,
  onProgress?: (percent: number) => void
): Promise<{ success: boolean; sizeBytes: number; error?: string }> {
  try {
    const seed = parseInt(track.id.replace(/\D/g, ''), 10) || 1;
    const fallbackAudio = `/audio/track-${((seed - 1) % 16) + 1}.wav`;
    const audioUrl = track.audioUrl || fallbackAudio;

    onProgress?.(5);

    // 1. Fetch audio with readable stream for fine-grained progress if possible
    let audioBlob: Blob;
    try {
      const response = await fetch(audioUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

      if (response.body && totalBytes > 0) {
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let receivedBytes = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            receivedBytes += value.length;
            const progress = Math.min(85, Math.round((receivedBytes / totalBytes) * 80) + 5);
            onProgress?.(progress);
          }
        }
        audioBlob = new Blob(chunks as BlobPart[], { type: response.headers.get('content-type') || 'audio/mpeg' });
      } else {
        audioBlob = await response.blob();
        onProgress?.(75);
      }
    } catch {
      // Fallback to bundled sound
      onProgress?.(40);
      const fbResponse = await fetch(fallbackAudio);
      if (!fbResponse.ok) throw new Error(`Fallback HTTP ${fbResponse.status}`);
      audioBlob = await fbResponse.blob();
      onProgress?.(75);
    }

    // 2. Fetch and store cover image if available
    let coverBlob: Blob | null = null;
    let hasLocalCover = false;
    if (track.coverUrl && !track.coverUrl.startsWith('data:')) {
      try {
        const coverRes = await fetch(track.coverUrl);
        if (coverRes.ok) {
          coverBlob = await coverRes.blob();
          hasLocalCover = true;
        }
      } catch {
        // Ignore cover fetch failure; metadata retains original coverUrl
      }
    }
    onProgress?.(90);

    // 3. Persist in IndexedDB
    const db = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORES.SONGS, STORES.AUDIO, STORES.COVERS], 'readwrite');
      const songStore = tx.objectStore(STORES.SONGS);
      const audioStore = tx.objectStore(STORES.AUDIO);
      const coverStore = tx.objectStore(STORES.COVERS);

      const record: OfflineSongRecord = {
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: track.duration,
        genre: track.genre,
        coverUrl: track.coverUrl,
        hasLocalCover,
        audioUrl: track.audioUrl,
        downloadedAt: Date.now(),
        sizeBytes: audioBlob.size,
        mimeType: audioBlob.type || 'audio/mpeg',
        year: track.year,
        playsCount: track.playCount,
      };

      songStore.put(record);
      audioStore.put(audioBlob, track.id);
      if (coverBlob) {
        coverStore.put(coverBlob, track.id);
      }

      tx.oncomplete = () => {
        // Cache live object URL
        const prevUrl = liveAudioUrlCache.get(track.id);
        if (prevUrl) {
          try { URL.revokeObjectURL(prevUrl); } catch { /* ignore */ }
        }
        liveAudioUrlCache.set(track.id, URL.createObjectURL(audioBlob));

        if (coverBlob) {
          const prevCover = liveCoverUrlCache.get(track.id);
          if (prevCover) {
            try { URL.revokeObjectURL(prevCover); } catch { /* ignore */ }
          }
          liveCoverUrlCache.set(track.id, URL.createObjectURL(coverBlob));
        }

        onProgress?.(100);
        resolve();
      };

      tx.onerror = () => reject(tx.error);
    });

    return { success: true, sizeBytes: audioBlob.size };
  } catch (err: any) {
    console.error('[offlineStorageService] saveSongOffline error:', err);
    return { success: false, sizeBytes: 0, error: err?.message || 'Download failed' };
  }
}

/**
 * Checks if a song is stored offline in IndexedDB
 */
export async function isSongOffline(trackId: string): Promise<boolean> {
  if (liveAudioUrlCache.has(trackId)) return true;
  try {
    const db = await openOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.AUDIO, 'readonly');
      const store = tx.objectStore(STORES.AUDIO);
      const req = store.count(trackId);
      req.onsuccess = () => resolve((req.result || 0) > 0);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Retrieves a live playable Object URL for an offline song
 */
export async function getOfflineAudioUrl(trackId: string): Promise<string | null> {
  if (liveAudioUrlCache.has(trackId)) {
    return liveAudioUrlCache.get(trackId)!;
  }

  try {
    const db = await openOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.AUDIO, 'readonly');
      const store = tx.objectStore(STORES.AUDIO);
      const req = store.get(trackId);

      req.onsuccess = () => {
        const blob = req.result as Blob | undefined;
        if (blob) {
          const url = URL.createObjectURL(blob);
          liveAudioUrlCache.set(trackId, url);
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
 * Retrieves a live Object URL for an offline cover
 */
export async function getOfflineCoverUrl(trackId: string): Promise<string | null> {
  if (liveCoverUrlCache.has(trackId)) {
    return liveCoverUrlCache.get(trackId)!;
  }

  try {
    const db = await openOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.COVERS, 'readonly');
      const store = tx.objectStore(STORES.COVERS);
      const req = store.get(trackId);

      req.onsuccess = () => {
        const blob = req.result as Blob | undefined;
        if (blob) {
          const url = URL.createObjectURL(blob);
          liveCoverUrlCache.set(trackId, url);
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
 * Retrieves all offline songs formatted as standard Track objects
 */
export async function getAllOfflineSongs(): Promise<Track[]> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.SONGS, 'readonly');
      const store = tx.objectStore(STORES.SONGS);
      const req = store.getAll();

      req.onsuccess = () => {
        const records = (req.result || []) as OfflineSongRecord[];
        // Sort most recently downloaded first
        records.sort((a, b) => (b.downloadedAt || 0) - (a.downloadedAt || 0));

        const tracks: Track[] = records.map((r) => ({
          id: r.id,
          title: r.title,
          artist: r.artist,
          artistId: `art-${r.artist.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          album: r.album,
          albumId: `alb-${r.album.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          duration: r.duration,
          genre: r.genre || 'Various',
          coverUrl: liveCoverUrlCache.get(r.id) || r.coverUrl,
          audioUrl: liveAudioUrlCache.get(r.id) || r.audioUrl || '',
          playCount: r.playsCount || 0,
          liked: false,
          year: r.year || new Date().getFullYear(),
        }));
        resolve(tracks);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Removes a song and its audio/cover blobs from offline IndexedDB
 */
export async function deleteSongOffline(trackId: string): Promise<void> {
  const audioUrl = liveAudioUrlCache.get(trackId);
  if (audioUrl) {
    try { URL.revokeObjectURL(audioUrl); } catch { /* ignore */ }
    liveAudioUrlCache.delete(trackId);
  }

  const coverUrl = liveCoverUrlCache.get(trackId);
  if (coverUrl) {
    try { URL.revokeObjectURL(coverUrl); } catch { /* ignore */ }
    liveCoverUrlCache.delete(trackId);
  }

  try {
    const db = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORES.SONGS, STORES.AUDIO, STORES.COVERS], 'readwrite');
      tx.objectStore(STORES.SONGS).delete(trackId);
      tx.objectStore(STORES.AUDIO).delete(trackId);
      tx.objectStore(STORES.COVERS).delete(trackId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[offlineStorageService] deleteSongOffline error:', err);
  }
}

/**
 * Clears all offline songs from IndexedDB
 */
export async function clearAllOfflineSongs(): Promise<void> {
  liveAudioUrlCache.forEach((url) => {
    try { URL.revokeObjectURL(url); } catch { /* ignore */ }
  });
  liveAudioUrlCache.clear();

  liveCoverUrlCache.forEach((url) => {
    try { URL.revokeObjectURL(url); } catch { /* ignore */ }
  });
  liveCoverUrlCache.clear();

  try {
    const db = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORES.SONGS, STORES.AUDIO, STORES.COVERS], 'readwrite');
      tx.objectStore(STORES.SONGS).clear();
      tx.objectStore(STORES.AUDIO).clear();
      tx.objectStore(STORES.COVERS).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[offlineStorageService] clearAllOfflineSongs error:', err);
  }
}

/**
 * Computes storage metrics for offline music
 */
export async function getOfflineStorageStats(): Promise<OfflineStorageStats> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.SONGS, 'readonly');
      const store = tx.objectStore(STORES.SONGS);
      const req = store.getAll();

      req.onsuccess = () => {
        const records = (req.result || []) as OfflineSongRecord[];
        const totalBytes = records.reduce((sum, r) => sum + (r.sizeBytes || 0), 0);
        resolve({
          totalSongs: records.length,
          totalBytes,
          formattedSize: formatBytes(totalBytes),
        });
      };
      req.onerror = () => resolve({ totalSongs: 0, totalBytes: 0, formattedSize: '0 B' });
    });
  } catch {
    return { totalSongs: 0, totalBytes: 0, formattedSize: '0 B' };
  }
}
