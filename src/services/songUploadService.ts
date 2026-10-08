/**
 * songUploadService.ts
 *
 * Handles complete end-to-end song and artwork upload lifecycle:
 *   1. Auto-linking / creating Artist and Album
 *   2. Uploading Audio file to Supabase Storage (songs/{songId}/...)
 *   3. Uploading Cover art to Supabase Storage (covers/{songId}/cover.jpg)
 *   4. Persisting complete metadata row to Supabase Database (public.songs)
 *   5. Synchronizing Zustand catalog state
 */

import { useAdminStore } from '@/store/adminStore';
import { uploadMediaWithProgress } from '@/services/storageService';
import { adminSyncSongToFirestore } from '@/services/supabaseService';
import { fetchArtworkBlob, DEFAULT_MR_MUSIC_COVER } from './artworkService';
import type { BulkImportItem } from '@/types/admin';
import type { Track, Artist, Album } from '@/types';

export interface UploadTaskCallbacks {
  onStageChange?: (stage: BulkImportItem['status'], progress: number) => void;
  onError?: (error: Error) => void;
  onSuccess?: (track: Track) => void;
}

import {
  resolveOrCreateArtist,
  resolveOrCreateAlbum,
  parseCollaboratingArtists,
  cleanDisplayName
} from '@/services/musicIdentityService';

export async function ensureArtistAndAlbum(params: {
  artistName: string;
  albumTitle?: string;
  genre: string;
  year: number;
  coverUrl?: string;
  artists?: string[];
}): Promise<{ artist: Artist; album: Album; collaboratingArtists: Artist[] }> {
  const { artistName, albumTitle, genre, year, coverUrl, artists } = params;

  // 1. Resolve Primary Artist
  const artist = await resolveOrCreateArtist(artistName, {
    genre: genre || 'Tamil',
    imageUrl: coverUrl || DEFAULT_MR_MUSIC_COVER,
  });

  // 2. Also resolve any secondary / collaborating artists concurrently
  const parsed = parseCollaboratingArtists(artists && artists.length > 0 ? artists : artistName);
  const collaboratingArtists: Artist[] = [artist];

  for (const altArtistName of parsed.allArtists) {
    if (cleanDisplayName(altArtistName).toLowerCase() !== artist.name.toLowerCase()) {
      try {
        const extra = await resolveOrCreateArtist(altArtistName, {
          genre: genre || 'Tamil',
          imageUrl: coverUrl || DEFAULT_MR_MUSIC_COVER,
        });
        collaboratingArtists.push(extra);
      } catch { /* ignore non-blocking */ }
    }
  }

  // 3. Resolve or Create Album linked to Primary Artist
  const album = await resolveOrCreateAlbum(
    albumTitle || `${artist.name} Singles`,
    artist,
    {
      genre: genre || 'Tamil',
      year: year || new Date().getFullYear(),
      coverUrl: coverUrl || DEFAULT_MR_MUSIC_COVER,
    }
  );

  return { artist, album, collaboratingArtists };
}

/**
 * Uploads a single bulk import song item with granular status updates.
 */
export async function uploadSingleSong(
  item: BulkImportItem,
  callbacks?: UploadTaskCallbacks
): Promise<Track> {
  const { onStageChange, onError, onSuccess } = callbacks || {};

  try {
    const songId = item.duplicateSongId && item.duplicateAction === 'replace'
      ? item.duplicateSongId
      : `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // ── 1. Upload Audio Asset ────────────────────────────────────────────────
    onStageChange?.('uploading_audio', 15);

    let audioDownloadUrl: string;
    try {
      audioDownloadUrl = await uploadMediaWithProgress(
        `songs/${songId}`,
        item.file,
        {
          onProgress: (p) => {
            const scaled = 15 + Math.round((p / 100) * 55); // 15% -> 70%
            onStageChange?.('uploading_audio', scaled);
          },
        }
      );
    } catch (err) {
      throw new Error(`Audio upload failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // ── 2. Resolve & Upload Artwork ──────────────────────────────────────────
    onStageChange?.('uploading_cover', 72);

    let finalCoverUrl = item.coverUrl || DEFAULT_MR_MUSIC_COVER;

    try {
      let coverFileToUpload: File | null = null;

      if (item.coverFile) {
        coverFileToUpload = item.coverFile;
      } else if (item.coverBlob) {
        coverFileToUpload = new File(
          [item.coverBlob],
          `cover_${Date.now()}.jpg`,
          { type: item.coverBlob.type || 'image/jpeg' }
        );
      } else if (item.coverUrl && item.coverUrl.startsWith('http')) {
        // Try fetching online artwork blob to upload into Supabase Storage
        const remoteBlob = await fetchArtworkBlob(item.coverUrl);
        if (remoteBlob) {
          coverFileToUpload = new File(
            [remoteBlob],
            `cover_${Date.now()}.jpg`,
            { type: remoteBlob.type || 'image/jpeg' }
          );
        }
      }

      if (coverFileToUpload) {
        finalCoverUrl = await uploadMediaWithProgress(
          `covers/${songId}`,
          coverFileToUpload,
          {
            onProgress: (p) => {
              const scaled = 72 + Math.round((p / 100) * 18); // 72% -> 90%
              onStageChange?.('uploading_cover', scaled);
            },
          }
        );
      }
    } catch (coverErr) {
      console.warn(`[songUploadService] Cover upload skipped, using fallback url:`, coverErr);
    }

    // ── 3. Link Artist & Album ───────────────────────────────────────────────
    onStageChange?.('saving_database', 92);

    const { artist, album } = await ensureArtistAndAlbum({
      artistName: item.artist,
      albumTitle: item.album,
      genre: item.genre,
      year: item.year,
      coverUrl: finalCoverUrl,
      artists: item.artists,
    });

    // ── 4. Construct Track Record ────────────────────────────────────────────
    const trackRecord: Track = {
      id: songId,
      title: item.title,
      artist: artist.name,
      artistId: artist.id,
      album: album.title,
      albumId: album.id,
      duration: item.duration || 180,
      year: item.year || new Date().getFullYear(),
      coverUrl: finalCoverUrl,
      audioUrl: audioDownloadUrl,
      genre: item.genre || 'Tamil',
      playCount: 0,
      liked: false,
      trackNumber: item.trackNumber,
      // Extended Metadata
      albumArtist: item.albumArtist,
      composer: item.composer,
      discNumber: item.discNumber,
      bitrate: item.bitrate,
      fileName: item.fileName,
      originalFileName: item.fileName,
      fileSize: item.fileSize,
      mimeType: item.mimeType,
      metadataSource: item.metadataSource,
      artworkSource: item.artworkSource,
      artists: item.artists && item.artists.length > 0 ? item.artists : [artist.name],
    };

    // ── 5. Save in Database & Admin Store ────────────────────────────────────
    const store = useAdminStore.getState();

    if (item.duplicateSongId && item.duplicateAction === 'replace') {
      store.updateSong(item.duplicateSongId, trackRecord);
    } else {
      // Add into store
      store.songs = [trackRecord, ...store.songs.filter((s) => s.id !== trackRecord.id)];
      // Also update album tracks list
      store.albums = store.albums.map((al) =>
        al.id === album.id
          ? { ...al, tracks: [...al.tracks.filter((t) => t.id !== trackRecord.id), trackRecord] }
          : al
      );
      useAdminStore.setState({ songs: store.songs, albums: store.albums });
    }

    // Upsert into Supabase songs table
    await adminSyncSongToFirestore(trackRecord);

    onStageChange?.('completed', 100);
    onSuccess?.(trackRecord);
    return trackRecord;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    onStageChange?.('failed', 0);
    onError?.(error);
    throw error;
  }
}
