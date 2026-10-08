/**
 * artworkService.ts
 *
 * Professional artwork discovery & management service.
 * Supports:
 *   1. Embedded artwork from ID3 / audio containers
 *   2. Local matching companion images
 *   3. Online metadata lookup (iTunes Search API + MusicBrainz Cover Art Archive)
 *   4. High-resolution cover art upscaling
 *   5. MR Music default cover art placeholder
 */

import type { ArtworkCandidate, ArtworkSourceType } from '@/types/admin';

export const DEFAULT_MR_MUSIC_COVER =
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80';

// In-memory cache to prevent duplicate online queries for same song/album
const artworkSearchCache = new Map<string, ArtworkCandidate[]>();

/**
 * Searches online music catalogs for high-resolution album artwork.
 * Primary provider: iTunes Search API (fast, worldwide + regional Indian/Tamil/Bollywood coverage)
 * Includes intelligent query sanitization (strips "Unknown Artist", "- Single", watermarks)
 * and regional store priority (&country=IN).
 */
export async function searchOnlineArtwork(params: {
  title: string;
  artist?: string;
  album?: string;
}): Promise<ArtworkCandidate[]> {
  const { title, artist, album } = params;
  if (!title && !album) return [];

  // Filter out placeholder artist names so they don't break online queries
  const isGenericArtist =
    !artist ||
    /^unknown(?:\s+artist)?$/i.test(artist.trim()) ||
    /^various(?:\s+artists)?$/i.test(artist.trim());

  const cleanArtist = isGenericArtist ? '' : artist.trim();

  // Clean title: strip "- Single", "(Single)", "[Single]", extra punctuation
  const cleanTitle = (title || '')
    .replace(/\s*-\s*Single$/i, '')
    .replace(/\s*\((?:Single|From\s+[^)]+)\)$/i, '')
    .replace(/\s*\[(?:Single|From\s+[^\]]+)\]$/i, '')
    .replace(/[_]+/g, ' ')
    .trim();

  const cleanAlbum = (album || '')
    .replace(/\s*-\s*Single$/i, '')
    .replace(/[_]+/g, ' ')
    .trim();

  const cacheKey = `${cleanArtist}::${cleanAlbum}::${cleanTitle}`.toLowerCase().trim();
  if (artworkSearchCache.has(cacheKey)) {
    return artworkSearchCache.get(cacheKey)!;
  }

  const candidates: ArtworkCandidate[] = [];

  const addCandidate = (item: any) => {
    if (!item?.artworkUrl100) return;
    const highResUrl = item.artworkUrl100
      .replace('100x100bb', '600x600bb')
      .replace('60x60bb', '600x600bb');

    if (!candidates.some((c) => c.url === highResUrl)) {
      candidates.push({
        url: highResUrl,
        source: 'online',
        title: item.trackName || item.collectionName || cleanTitle,
        artist: item.artistName || cleanArtist,
        album: item.collectionName || cleanAlbum,
        width: 600,
        height: 600,
      });
    }
  };

  // ── Strategy List (tried in order of precision) ────────────────────────────
  const queries: { term: string; country?: string; entity?: string }[] = [];

  // 1. Artist + Title (Indian store)
  if (cleanArtist && cleanTitle) {
    queries.push({ term: `${cleanArtist} ${cleanTitle}`, country: 'IN', entity: 'song' });
  }

  // 2. Title + "Tamil" (Indian store - great for Tamil songs with Unknown Artist)
  if (cleanTitle) {
    queries.push({ term: `${cleanTitle} Tamil`, country: 'IN', entity: 'song' });
    queries.push({ term: cleanTitle, country: 'IN', entity: 'song' });
  }

  // 3. Extracted Movie name if present in title (e.g. "From Takkar", "From Aaromaley")
  const fromMatch = (title || '').match(/(?:from|_from_)\s*([a-zA-Z0-9\s]+)/i);
  if (fromMatch && fromMatch[1]) {
    const movieName = fromMatch[1].replace(/[_()\[\]]/g, '').trim();
    if (movieName.length > 2) {
      queries.push({ term: `${movieName} Tamil`, country: 'IN', entity: 'album' });
    }
  }

  // 4. Album name if distinct
  if (cleanAlbum && cleanAlbum !== cleanTitle) {
    queries.push({ term: `${cleanAlbum} Tamil`, country: 'IN', entity: 'album' });
    queries.push({ term: cleanAlbum, country: 'IN', entity: 'album' });
  }

  // 5. Worldwide fallback
  if (cleanTitle) {
    queries.push({ term: cleanArtist ? `${cleanArtist} ${cleanTitle}` : cleanTitle, entity: 'song' });
  }

  for (const q of queries) {
    if (candidates.length >= 4) break;

    try {
      const countryParam = q.country ? `&country=${q.country}` : '';
      const entityParam = q.entity ? `&entity=${q.entity}` : '&entity=song';
      const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(q.term)}${countryParam}${entityParam}&limit=4`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(searchUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.results)) {
          data.results.forEach(addCandidate);
        }
      }
    } catch {
      // Continue to next fallback
    }
  }

  artworkSearchCache.set(cacheKey, candidates);
  return candidates;
}

/**
 * Downloads a remote image URL and converts it into a local Blob.
 * Useful for saving online discovered artwork into Supabase Storage.
 */
export async function fetchArtworkBlob(imageUrl: string): Promise<Blob | null> {
  if (!imageUrl || imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      mode: 'cors',
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;
    return await response.blob();
  } catch (err) {
    console.warn(`[artworkService] Could not fetch remote blob for ${imageUrl}:`, err);
    return null;
  }
}

/**
 * Validates whether a file or blob is a valid image type and size.
 */
export function validateCoverImage(file: File | Blob): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
  if (file.type && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported image format: "${file.type}". Allowed: JPG, PNG, WEBP`,
    };
  }

  const maxBytes = 8 * 1024 * 1024; // 8MB
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `Cover image size is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Max: 8 MB`,
    };
  }

  return { valid: true };
}
