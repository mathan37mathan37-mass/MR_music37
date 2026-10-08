/**
 * searchUtils.ts
 *
 * Universal music search matcher supporting:
 * - Song title
 * - Primary & collaborating artists
 * - Album title & album artist
 * - Composer
 * - Genre
 * - Filename & original filename
 * - Track number
 * - Year
 * - Case-insensitive, Unicode & Tamil script matching
 */

import type { Track } from '@/types';
import type { BulkImportItem } from '@/types/admin';

export interface SearchableSongEntity {
  title?: string;
  artist?: string;
  artists?: string[];
  album?: string;
  albumArtist?: string;
  composer?: string;
  genre?: string;
  fileName?: string;
  originalFileName?: string;
  trackNumber?: number;
  year?: number;
}

/**
 * Normalizes query string for uniform matching (NFKC, lowercase, trimmed).
 */
export function normalizeSearchTerm(term: string): string {
  if (!term) return '';
  return term.normalize('NFKC').trim().toLowerCase();
}

/**
 * Checks if a song entity matches the search query across all metadata fields.
 */
export function matchSongSearch(item: SearchableSongEntity, query: string): boolean {
  const q = normalizeSearchTerm(query);
  if (!q) return true;

  // 1. Title match
  if (item.title && normalizeSearchTerm(item.title).includes(q)) return true;

  // 2. Primary Artist match
  if (item.artist && normalizeSearchTerm(item.artist).includes(q)) return true;

  // 3. Collaborating Artists match (all artists)
  if (Array.isArray(item.artists)) {
    for (const a of item.artists) {
      if (a && normalizeSearchTerm(a).includes(q)) return true;
    }
  }

  // 4. Album Title match
  if (item.album && normalizeSearchTerm(item.album).includes(q)) return true;

  // 5. Album Artist match
  if (item.albumArtist && normalizeSearchTerm(item.albumArtist).includes(q)) return true;

  // 6. Composer match
  if (item.composer && normalizeSearchTerm(item.composer).includes(q)) return true;

  // 7. Genre match
  if (item.genre && normalizeSearchTerm(item.genre).includes(q)) return true;

  // 8. Filename / Original Filename match
  if (item.fileName && normalizeSearchTerm(item.fileName).includes(q)) return true;
  if (item.originalFileName && normalizeSearchTerm(item.originalFileName).includes(q)) return true;

  // 9. Year match (if query is numeric e.g. "2025" or "2015")
  if (item.year && String(item.year).includes(q)) return true;

  // 10. Track Number match (if query is "track 3" or "3")
  if (item.trackNumber !== undefined && String(item.trackNumber) === q) return true;

  return false;
}
