/**
 * musicMetadataService.ts
 *
 * Professional in-browser audio metadata extraction engine using music-metadata.
 * Extracts ID3v1, ID3v2, MP4/AAC, FLAC, Vorbis/OGG, and WAV metadata,
 * extracts embedded artwork into Blobs/URLs, parses multiple artists,
 * provides intelligent filename cleaning, and fallback duration detection.
 */

import { parseBlob } from 'music-metadata';
import type { ArtworkSourceType, MetadataConfidenceSource } from '@/types/admin';

export interface ExtractedArtwork {
  blob: Blob;
  url: string;
  mimeType: string;
  source: ArtworkSourceType;
  description?: string;
}

export interface AnalyzedAudioMetadata {
  title: string;
  artist: string;
  artists: string[];
  album: string;
  albumArtist?: string;
  composer?: string;
  genre: string;
  year: number;
  duration: number; // in seconds
  trackNumber?: number;
  discNumber?: number;
  bitrate?: number; // kbps
  fileSize: number;
  mimeType: string;
  fileName: string;
  artwork: ExtractedArtwork | null;
  metadataSource: string;
  confidence: {
    title: MetadataConfidenceSource;
    artist: MetadataConfidenceSource;
    album: MetadataConfidenceSource;
    year: MetadataConfidenceSource;
    genre: MetadataConfidenceSource;
    composer: MetadataConfidenceSource;
    artwork: ArtworkSourceType;
  };
  rawTags?: Record<string, any>;
}

// ── 1. FILENAME CLEANING & ARTIST DETECTION ──────────────────────────────────

/**
 * Strips track prefixes, site watermarks, bitrates, and file extensions
 * from filenames to produce a clean song title and optional artist name.
 */
export function cleanSongTitle(fileName: string): {
  title: string;
  artist?: string;
  trackNo?: number;
} {
  // 1. Remove extension
  let clean = fileName.replace(/\.[a-zA-Z0-9]{2,5}$/i, '').trim();

  // 2. Extract leading track number (e.g. "01 - ", "01. ", "47 ", "03_")
  let trackNo: number | undefined;
  const trackMatch = clean.match(/^(\d{1,3})[\s.\-_]+/);
  if (trackMatch) {
    trackNo = parseInt(trackMatch[1], 10);
    clean = clean.replace(/^(\d{1,3})[\s.\-_]+/, '').trim();
  }

  // 3. Remove common download sites, watermarks, tags, bitrates
  const watermarks = [
    /\[Masstamilan(?:\.in|\.com|\.dev)?\]/gi,
    /\(Masstamilan(?:\.in|\.com|\.dev)?\)/gi,
    /\[Starmusiq(?:\.com|\.fun)?\]/gi,
    /\(Starmusiq(?:\.com|\.fun)?\)/gi,
    /\[Isaimini(?:\.co|\.com)?\]/gi,
    /\(Isaimini(?:\.co|\.com)?\)/gi,
    /\[Sensongs(?:\.com|\.co)?\]/gi,
    /\[Tamiltunes(?:\.com)?\]/gi,
    /\[Kuttyweb(?:\.com)?\]/gi,
    /\[Tamilanda(?:\.com)?\]/gi,
    /\[128\s*kbps\]/gi,
    /\(128\s*kbps\)/gi,
    /\[320\s*kbps\]/gi,
    /\(320\s*kbps\)/gi,
    /\[HQ\]/gi,
    /\(HQ\)/gi,
    /\[HD\]/gi,
    /\(HD\)/gi,
    /\[5\.1\]/gi,
    /\(5\.1\)/gi,
    /\[lossless\]/gi,
    /\(lossless\)/gi,
    /\(Official Video\)/gi,
    /\[Official Audio\]/gi,
    /\(Official Audio\)/gi,
    /\(Lyrics\)/gi,
    /\[Lyrics\]/gi,
    /www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
  ];

  for (const wm of watermarks) {
    clean = clean.replace(wm, '');
  }

  // 4. Normalize brackets, underscores, and multiple spaces
  clean = clean.replace(/[_]+/g, ' ');
  clean = clean.replace(/\s{2,}/g, ' ');
  clean = clean.replace(/^[-\s|~]+|[-\s|~]+$/g, '').trim();

  // 5. Detect "Artist - Title" format if hyphen/divider is present
  let detectedArtist: string | undefined;
  if (clean.includes(' - ')) {
    const parts = clean.split(' - ');
    if (parts.length === 2 && parts[0].trim().length > 0 && parts[1].trim().length > 0) {
      detectedArtist = parts[0].trim();
      clean = parts[1].trim();
    }
  }

  return {
    title: clean || fileName.replace(/\.[^.]+$/, ''),
    artist: detectedArtist,
    trackNo,
  };
}

// ── 2. MULTIPLE ARTISTS PARSER ───────────────────────────────────────────────

/**
 * Intelligently separates combined artists (e.g. "Anirudh Ravichander; Dhanush, Alisha Thomas")
 * into a distinct list while preserving full names.
 */
export function parseMultipleArtists(artistInput?: string | string[]): string[] {
  if (!artistInput) return [];

  const rawList = Array.isArray(artistInput) ? artistInput : [artistInput];
  const results: string[] = [];

  for (const raw of rawList) {
    if (!raw || typeof raw !== 'string') continue;

    // Replace common artist conjunctions with semicolon delimiter
    const normalized = raw
      .replace(/\s+feat\.?\s+/gi, ';')
      .replace(/\s+ft\.?\s+/gi, ';')
      .replace(/\s+featuring\s+/gi, ';')
      .replace(/\s+with\s+/gi, ';')
      .replace(/\s*&\s*/g, ';')
      .replace(/\s*\/\s*/g, ';')
      .replace(/\s*\|\s*/g, ';');

    const split = normalized.split(/[;,]+/);
    for (const item of split) {
      const trimmed = item.trim();
      if (trimmed.length > 0 && !results.includes(trimmed)) {
        results.push(trimmed);
      }
    }
  }

  return results.length > 0 ? results : (rawList[0] ? [rawList[0].trim()] : []);
}

// ── 3. FALLBACK DURATION PROBING ─────────────────────────────────────────────

/**
 * Uses an ephemeral HTMLAudioElement to get exact duration if ID3 metadata
 * did not contain duration information.
 */
export async function extractAudioDurationFallback(file: File): Promise<number> {
  if (typeof window === 'undefined') return 180;

  return new Promise((resolve) => {
    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(file);
      const audio = new Audio();
      let resolved = false;

      const cleanup = (dur: number) => {
        if (!resolved) {
          resolved = true;
          audio.removeAttribute('src');
          audio.load();
          try { URL.revokeObjectURL(objectUrl); } catch { /* ignore */ }
          resolve(Math.round(dur));
        }
      };

      const timeout = setTimeout(() => cleanup(180), 3500);

      audio.preload = 'metadata';
      audio.onloadedmetadata = () => {
        clearTimeout(timeout);
        const d = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 180;
        cleanup(d);
      };

      audio.onerror = () => {
        clearTimeout(timeout);
        cleanup(180);
      };

      audio.src = objectUrl;
    } catch {
      resolve(180);
    }
  });
}

// ── 4. EXTRACT EMBEDDED ARTWORK ──────────────────────────────────────────────

/**
 * Extracts attached picture from music-metadata tags into a Blob and Object URL.
 */
export function extractArtworkFromPictures(pictures?: any[]): ExtractedArtwork | null {
  if (!pictures || !pictures.length) return null;

  try {
    const pic = pictures[0];
    const mimeType = pic.format || 'image/jpeg';
    const dataBuffer = pic.data;

    if (!dataBuffer || dataBuffer.length === 0) return null;

    const blob = new Blob([dataBuffer], { type: mimeType });
    const url = URL.createObjectURL(blob);

    return {
      blob,
      url,
      mimeType,
      source: 'embedded',
      description: pic.description || pic.type || 'Cover Art',
    };
  } catch (err) {
    console.warn('Failed to extract embedded picture:', err);
    return null;
  }
}

// ── 5. MAIN AUDIO FILE ANALYZER ──────────────────────────────────────────────

/**
 * Analyzes an audio file using music-metadata, extracting complete tags,
 * embedded cover art, bitrate, duration, and fallback confidence ratings.
 */
export async function analyzeAudioFile(
  file: File,
  companionImages?: Map<string, File>
): Promise<AnalyzedAudioMetadata> {
  const cleanedInfo = cleanSongTitle(file.name);
  let metadata: any = null;
  let parseError = false;

  try {
    metadata = await parseBlob(file, {
      duration: true,
      skipCovers: false,
    });
  } catch (err) {
    console.warn(`[musicMetadataService] Native tag parsing failed for "${file.name}":`, err);
    parseError = true;
  }

  const common = metadata?.common || {};
  const format = metadata?.format || {};

  // Extract / Calculate Duration
  let duration = format.duration ? Math.round(format.duration) : 0;
  if (!duration || duration <= 0) {
    duration = await extractAudioDurationFallback(file);
  }

  // Extract Bitrate
  const bitrate = format.bitrate ? Math.round(format.bitrate / 1000) : undefined;

  // Embedded Artwork
  let artwork: ExtractedArtwork | null = null;
  if (common.picture && common.picture.length > 0) {
    artwork = extractArtworkFromPictures(common.picture);
  }

  // Check companion image if embedded artwork missing
  if (!artwork && companionImages && companionImages.size > 0) {
    const baseName = file.name.replace(/\.[^/.]+$/, '').toLowerCase();
    const companion =
      companionImages.get(baseName) ||
      companionImages.get('cover') ||
      companionImages.get('folder') ||
      companionImages.get('album') ||
      companionImages.get('front');

    if (companion) {
      try {
        const url = URL.createObjectURL(companion);
        artwork = {
          blob: companion,
          url,
          mimeType: companion.type || 'image/jpeg',
          source: 'local',
          description: companion.name,
        };
      } catch { /* ignore */ }
    }
  }

  // Determine Title & Confidence
  const rawTitle = common.title?.trim();
  const hasEmbeddedTitle = Boolean(rawTitle && rawTitle.length > 0);
  const title = hasEmbeddedTitle ? rawTitle : cleanedInfo.title;
  const titleConfidence: MetadataConfidenceSource = hasEmbeddedTitle ? 'embedded' : 'filename';

  // Determine Artists & Confidence
  const rawArtist = common.artist?.trim() || common.albumartist?.trim();
  const rawArtistsList = common.artists && common.artists.length > 0 ? common.artists : (rawArtist ? [rawArtist] : []);
  const parsedArtists = parseMultipleArtists(rawArtistsList.length > 0 ? rawArtistsList : cleanedInfo.artist);
  const primaryArtist = parsedArtists[0] || rawArtist || cleanedInfo.artist || 'Unknown Artist';
  const hasEmbeddedArtist = Boolean(rawArtist && rawArtist.length > 0);
  const artistConfidence: MetadataConfidenceSource = hasEmbeddedArtist
    ? 'embedded'
    : (cleanedInfo.artist ? 'filename' : 'default');

  // Determine Album & Confidence
  const rawAlbum = common.album?.trim();
  const hasEmbeddedAlbum = Boolean(rawAlbum && rawAlbum.length > 0);
  const album = hasEmbeddedAlbum ? rawAlbum : (cleanedInfo.title ? `${cleanedInfo.title} - Single` : 'Singles');
  const albumConfidence: MetadataConfidenceSource = hasEmbeddedAlbum ? 'embedded' : 'default';

  // Determine Year & Confidence
  const rawYear = common.year || (common.date ? parseInt(common.date.slice(0, 4), 10) : undefined);
  const year = rawYear && rawYear > 1900 && rawYear <= new Date().getFullYear() + 1 ? rawYear : new Date().getFullYear();
  const yearConfidence: MetadataConfidenceSource = rawYear ? 'embedded' : 'default';

  // Determine Genre & Confidence
  const rawGenre = common.genre?.[0]?.trim() || (typeof common.genre === 'string' ? common.genre : undefined);
  const genre = rawGenre || 'Tamil';
  const genreConfidence: MetadataConfidenceSource = rawGenre ? 'embedded' : 'default';

  // Determine Composer & Confidence
  const rawComposer = common.composer?.[0]?.trim() || (typeof common.composer === 'string' ? common.composer : undefined);
  const composer = rawComposer || undefined;
  const composerConfidence: MetadataConfidenceSource = rawComposer ? 'embedded' : 'default';

  // Track / Disc Numbers
  const trackNumber = common.track?.no ?? cleanedInfo.trackNo;
  const discNumber = common.disk?.no ?? undefined;
  const albumArtist = common.albumartist?.trim() || undefined;

  const metadataSource = parseError
    ? 'Filename Fallback (Corrupted/Missing ID3)'
    : (hasEmbeddedTitle && hasEmbeddedArtist ? 'Embedded ID3 Metadata' : 'Hybrid (Embedded + Filename)');

  return {
    title,
    artist: primaryArtist,
    artists: parsedArtists.length > 0 ? parsedArtists : [primaryArtist],
    album,
    albumArtist,
    composer,
    genre,
    year,
    duration,
    trackNumber: trackNumber || undefined,
    discNumber: discNumber || undefined,
    bitrate,
    fileSize: file.size,
    mimeType: file.type || (format.container ? `audio/${format.container}` : 'audio/mpeg'),
    fileName: file.name,
    artwork,
    metadataSource,
    confidence: {
      title: titleConfidence,
      artist: artistConfidence,
      album: albumConfidence,
      year: yearConfidence,
      genre: genreConfidence,
      composer: composerConfidence,
      artwork: artwork ? artwork.source : 'default',
    },
    rawTags: common,
  };
}
