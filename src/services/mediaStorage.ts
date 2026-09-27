// IndexedDB storage for offline audio files and large assets
// Prevents localStorage 5MB quota errors and provides persistent audio playback across page reloads

const DB_NAME = 'melodix_media_db';
const DB_VERSION = 1;
const STORE_NAME = 'media_blobs';

// Open IndexedDB instance
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// In-memory cache of object URLs for fast synchronous access
const objectUrlCache = new Map<string, string>();

/**
 * Stores a Blob or File in IndexedDB and returns a persistent idb:// URI
 */
export async function storeMediaBlob(key: string, blob: Blob): Promise<string> {
  const persistentUri = `idb://${key}`;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(blob, key);

      req.onsuccess = () => {
        // Revoke old URL if cached
        const oldUrl = objectUrlCache.get(key);
        if (oldUrl) {
          try { URL.revokeObjectURL(oldUrl); } catch { /* ignore */ }
        }

        const newUrl = URL.createObjectURL(blob);
        objectUrlCache.set(key, newUrl);
        objectUrlCache.set(persistentUri, newUrl);
        // Return persistent idb:// URI
        resolve(persistentUri);
      };

      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('storeMediaBlob IndexedDB error, using fallback ObjectURL:', err);
    const fallbackUrl = URL.createObjectURL(blob);
    objectUrlCache.set(key, fallbackUrl);
    objectUrlCache.set(persistentUri, fallbackUrl);
    return persistentUri;
  }
}

/**
 * Retrieves all stored media keys in IndexedDB
 */
export async function getAllMediaKeys(): Promise<string[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAllKeys();
      req.onsuccess = () => resolve((req.result as string[]) || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Retrieves a stored Blob by key and returns a live Object URL for playback / display
 */
export async function getMediaUrl(key: string): Promise<string | null> {
  // Check memory cache first
  if (objectUrlCache.has(key)) {
    const cached = objectUrlCache.get(key)!;
    return cached;
  }

  const cleanKey = key.startsWith('idb://') ? key.slice(6) : key;
  if (objectUrlCache.has(cleanKey)) {
    return objectUrlCache.get(cleanKey)!;
  }

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(cleanKey);

      req.onsuccess = () => {
        const blob = req.result as Blob | undefined;
        if (blob) {
          const url = URL.createObjectURL(blob);
          objectUrlCache.set(cleanKey, url);
          objectUrlCache.set(`idb://${cleanKey}`, url);
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
 * Checks if an in-memory blob: URL is still valid and not expired
 */
export async function isBlobUrlAlive(blobUrl: string): Promise<boolean> {
  if (!blobUrl || !blobUrl.startsWith('blob:')) return false;
  try {
    const res = await fetch(blobUrl, { method: 'GET', headers: { Range: 'bytes=0-0' } });
    return res.status === 200 || res.status === 206;
  } catch {
    return false;
  }
}

/**
 * Resolves any audio source (idb://, dead blob://, relative path, or external URL)
 * into a live, playable URL ready for HTML5 Audio playback.
 */
export async function resolveAudioSource(
  src?: string,
  trackTitle?: string,
  trackSeed = 1
): Promise<string> {
  const fallbackTrack = `/audio/track-${((trackSeed - 1) % 16) + 1}.wav`;

  if (!src) {
    return fallbackTrack;
  }

  // 1. Persistent IndexedDB URI: idb://<key>
  if (src.startsWith('idb://')) {
    const key = src.slice(6);
    const liveUrl = await getMediaUrl(key);
    if (liveUrl) return liveUrl;
    console.warn(`[Melodix Audio] Key ${key} not found in IndexedDB. This usually means the upload was stored as a local-only fallback instead of a Firebase Storage URL.`);
    return src;
  }

  // 2. Normal HTTP/HTTPS URL (not a blob URL)
  if (
    (src.startsWith('http://') || src.startsWith('https://')) &&
    !src.startsWith('blob:')
  ) {
    return src;
  }

  // 3. Static public assets (/audio/...) or data URLs
  if (src.startsWith('/') || src.startsWith('data:')) {
    return src;
  }

  // 4. Session blob URL: check if alive, or auto-recover from IndexedDB
  if (src.startsWith('blob:')) {
    const alive = await isBlobUrlAlive(src);
    if (alive) {
      return src;
    }

    console.warn(`[Melodix Audio] Expired blob URL detected (${src}). Auto-recovering from IndexedDB...`);
    try {
      const keys = await getAllMediaKeys();
      const audioKeys = keys.filter((k) => typeof k === 'string' && k.startsWith('audio_'));

      if (audioKeys.length > 0) {
        let matchedKey = audioKeys[audioKeys.length - 1]; // default: latest uploaded audio file
        if (trackTitle) {
          const cleanTitle = trackTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
          const candidate = audioKeys.find((k) => {
            const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
            return cleanKey.includes(cleanTitle);
          });
          if (candidate) matchedKey = candidate;
        }

        const recoveredUrl = await getMediaUrl(matchedKey);
        if (recoveredUrl) {
          console.log(`[Melodix Audio] Successfully recovered audio blob from IndexedDB key: ${matchedKey}`);
          return recoveredUrl;
        }
      }
    } catch (e) {
      console.warn('[Melodix Audio] IndexedDB recovery error:', e);
    }

    return fallbackTrack;
  }

  return src;
}

/**
 * Downscales and compresses an image file to a lightweight JPEG Data URL (<100KB)
 * This prevents localStorage quota limits when saving artist/album/song covers.
 */
export function compressImageToDataUrl(file: File, maxDimension = 600, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };

      img.onerror = () => {
        resolve(e.target?.result as string);
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
