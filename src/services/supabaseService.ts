/**
 * supabaseService.ts
 *
 * Drop-in Supabase replacement for firestoreService.ts.
 * All functions maintain the same signatures so callsites only need to
 * swap the import, not the call shape.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { UserProfile, UserPreferences } from '@/types/auth';
import type { Track, Playlist } from '@/types';
import type { ManagedUser } from '@/types/admin';

// ── helpers ──────────────────────────────────────────────────────────────────

function localKey(prefix: string, uid: string) {
  return `melodix_${prefix}_${uid}`;
}

function getLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function setLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota exceeded — ignore */ }
}

// ── 1. USER PROFILE ──────────────────────────────────────────────────────────

export async function syncUserProfile(profile: UserProfile): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    setLocal(localKey('user', profile.uid), profile);
    return;
  }

  try {
    const { error } = await supabase.from('profiles').upsert({
      id: profile.uid,
      username: profile.username,
      display_name: profile.displayName,
      bio: (profile as any).bio ?? null,
      avatar_url: profile.photoURL,
      favorite_genres: profile.favoriteGenres ?? [],
      favorite_artists: profile.favoriteArtists ?? [],
      preferences: profile.preferences ?? {},
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase syncUserProfile error:', error.message);
      setLocal(localKey('user', profile.uid), profile);
    }
  } catch (err) {
    console.warn('syncUserProfile threw:', err);
    setLocal(localKey('user', profile.uid), profile);
  }
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  if (!isSupabaseConfigured() || !supabase) {
    return getLocal<UserProfile | null>(localKey('user', uid), null);
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    if (error || !data) {
      return getLocal<UserProfile | null>(localKey('user', uid), null);
    }

    const profile: UserProfile = {
      uid: data.id,
      email: null,                     // filled by auth layer
      displayName: data.display_name,
      username: data.username ?? 'user',
      photoURL: data.avatar_url ?? null,
      favoriteGenres: data.favorite_genres ?? [],
      favoriteArtists: data.favorite_artists ?? [],
      preferences: data.preferences ?? {},
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime(),
      role: data.role ?? 'user',
      status: (data.status === 'blocked' ? 'blocked' : 'active'),
    };

    return profile;
  } catch (err) {
    console.warn('fetchUserProfile threw:', err);
    return getLocal<UserProfile | null>(localKey('user', uid), null);
  }
}

// ── 2. USER PREFERENCES ──────────────────────────────────────────────────────

export async function syncUserPreferences(uid: string, preferences: UserPreferences): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    setLocal(localKey('pref', uid), preferences);
    return;
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ preferences, updated_at: new Date().toISOString() })
      .eq('id', uid);

    if (error) {
      console.warn('Supabase syncUserPreferences error:', error.message);
      setLocal(localKey('pref', uid), preferences);
    }
  } catch (err) {
    console.warn('syncUserPreferences threw:', err);
    setLocal(localKey('pref', uid), preferences);
  }
}

// ── 3. LIKED SONGS ───────────────────────────────────────────────────────────

export async function syncLike(userId: string, trackId: string, isLiked: boolean): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    const key = localKey('likes', userId);
    const existing = getLocal<string[]>(key, []);
    const updated = isLiked
      ? Array.from(new Set([...existing, trackId]))
      : existing.filter((id) => id !== trackId);
    setLocal(key, updated);
    return;
  }

  try {
    if (isLiked) {
      const { error } = await supabase
        .from('liked_songs')
        .upsert({ user_id: userId, song_id: trackId }, { onConflict: 'user_id,song_id' });
      if (error) console.warn('syncLike upsert error:', error.message);
    } else {
      const { error } = await supabase
        .from('liked_songs')
        .delete()
        .eq('user_id', userId)
        .eq('song_id', trackId);
      if (error) console.warn('syncLike delete error:', error.message);
    }
  } catch (err) {
    console.warn('syncLike threw:', err);
  }
}

export async function fetchUserLikes(userId: string): Promise<string[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return getLocal<string[]>(localKey('likes', userId), []);
  }

  try {
    const { data, error } = await supabase
      .from('liked_songs')
      .select('song_id')
      .eq('user_id', userId);

    if (error) {
      console.warn('fetchUserLikes error:', error.message);
      return getLocal<string[]>(localKey('likes', userId), []);
    }

    return (data ?? []).map((row) => row.song_id);
  } catch (err) {
    console.warn('fetchUserLikes threw:', err);
    return getLocal<string[]>(localKey('likes', userId), []);
  }
}

// ── 4. SAVED ALBUMS ──────────────────────────────────────────────────────────

export async function syncSavedAlbum(userId: string, albumId: string, isSaved: boolean): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    const key = localKey('saved_albums', userId);
    const existing = getLocal<string[]>(key, []);
    const updated = isSaved
      ? Array.from(new Set([...existing, albumId]))
      : existing.filter((id) => id !== albumId);
    setLocal(key, updated);
    return;
  }

  try {
    if (isSaved) {
      const { error } = await supabase
        .from('saved_albums')
        .upsert({ user_id: userId, album_id: albumId }, { onConflict: 'user_id,album_id' });
      if (error) console.warn('syncSavedAlbum error:', error.message);
    } else {
      const { error } = await supabase
        .from('saved_albums')
        .delete()
        .eq('user_id', userId)
        .eq('album_id', albumId);
      if (error) console.warn('syncSavedAlbum delete error:', error.message);
    }
  } catch (err) {
    console.warn('syncSavedAlbum threw:', err);
  }
}

export async function fetchUserSavedAlbums(userId: string): Promise<string[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return getLocal<string[]>(localKey('saved_albums', userId), []);
  }

  try {
    const { data, error } = await supabase
      .from('saved_albums')
      .select('album_id')
      .eq('user_id', userId);

    if (error) {
      console.warn('fetchUserSavedAlbums error:', error.message);
      return getLocal<string[]>(localKey('saved_albums', userId), []);
    }

    return (data ?? []).map((row) => row.album_id);
  } catch (err) {
    console.warn('fetchUserSavedAlbums threw:', err);
    return getLocal<string[]>(localKey('saved_albums', userId), []);
  }
}

// ── 5. FOLLOWED ARTISTS ──────────────────────────────────────────────────────

export async function syncFollowArtist(userId: string, artistId: string, isFollowing: boolean): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    const key = localKey('followed_artists', userId);
    const existing = getLocal<string[]>(key, []);
    const updated = isFollowing
      ? Array.from(new Set([...existing, artistId]))
      : existing.filter((id) => id !== artistId);
    setLocal(key, updated);
    return;
  }

  try {
    if (isFollowing) {
      const { error } = await supabase
        .from('followed_artists')
        .upsert({ user_id: userId, artist_id: artistId }, { onConflict: 'user_id,artist_id' });
      if (error) console.warn('syncFollowArtist error:', error.message);
    } else {
      const { error } = await supabase
        .from('followed_artists')
        .delete()
        .eq('user_id', userId)
        .eq('artist_id', artistId);
      if (error) console.warn('syncFollowArtist delete error:', error.message);
    }
  } catch (err) {
    console.warn('syncFollowArtist threw:', err);
  }
}

export async function fetchFollowedArtists(userId: string): Promise<string[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return getLocal<string[]>(localKey('followed_artists', userId), []);
  }

  try {
    const { data, error } = await supabase
      .from('followed_artists')
      .select('artist_id')
      .eq('user_id', userId);

    if (error) {
      console.warn('fetchFollowedArtists error:', error.message);
      return getLocal<string[]>(localKey('followed_artists', userId), []);
    }

    return (data ?? []).map((row) => row.artist_id);
  } catch (err) {
    console.warn('fetchFollowedArtists threw:', err);
    return getLocal<string[]>(localKey('followed_artists', userId), []);
  }
}

// ── 6. DOWNLOADS ─────────────────────────────────────────────────────────────

export async function syncDownload(userId: string, trackId: string, isDownloaded: boolean): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    const key = localKey('downloads', userId);
    const existing = getLocal<string[]>(key, []);
    const updated = isDownloaded
      ? Array.from(new Set([...existing, trackId]))
      : existing.filter((id) => id !== trackId);
    setLocal(key, updated);
    return;
  }

  try {
    if (isDownloaded) {
      const { error } = await supabase
        .from('downloads')
        .upsert({ user_id: userId, song_id: trackId }, { onConflict: 'user_id,song_id' });
      if (error) console.warn('syncDownload error:', error.message);
    } else {
      const { error } = await supabase
        .from('downloads')
        .delete()
        .eq('user_id', userId)
        .eq('song_id', trackId);
      if (error) console.warn('syncDownload delete error:', error.message);
    }
  } catch (err) {
    console.warn('syncDownload threw:', err);
  }
}

export async function fetchUserDownloads(userId: string): Promise<string[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return getLocal<string[]>(localKey('downloads', userId), []);
  }

  try {
    const { data, error } = await supabase
      .from('downloads')
      .select('song_id')
      .eq('user_id', userId);

    if (error) {
      console.warn('fetchUserDownloads error:', error.message);
      return getLocal<string[]>(localKey('downloads', userId), []);
    }

    return (data ?? []).map((row) => row.song_id);
  } catch (err) {
    console.warn('fetchUserDownloads threw:', err);
    return getLocal<string[]>(localKey('downloads', userId), []);
  }
}

// ── 7. PLAYLISTS ─────────────────────────────────────────────────────────────

function playlistToRow(playlist: Playlist, userId: string) {
  return {
    id: playlist.id,
    user_id: userId,
    title: playlist.title,
    description: playlist.description ?? '',
    cover_url: playlist.coverUrl ?? null,
    cover_colors: playlist.coverColors ?? [],
    is_public: Boolean(playlist.isPublic),
    followers: playlist.followers ?? 0,
    created_by: playlist.createdBy ?? 'You',
    updated_at: new Date().toISOString(),
  };
}

function rowToPlaylist(row: any, songs: Track[] = []): Playlist {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    coverUrl: row.cover_url ?? undefined,
    coverColors: row.cover_colors ?? [],
    tracks: songs,
    createdBy: row.created_by ?? 'You',
    isPublic: row.is_public,
    followers: row.followers ?? 0,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined,
    creatorId: row.user_id,
    userId: row.user_id,
  };
}

export async function syncPlaylist(playlist: Playlist, userId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  try {
    const { error } = await supabase
      .from('playlists')
      .upsert(playlistToRow(playlist, userId), { onConflict: 'id' });

    if (error) {
      console.warn('syncPlaylist upsert error:', error.message);
      return;
    }

    // Sync tracks: delete existing entries, then insert
    await supabase.from('playlist_songs').delete().eq('playlist_id', playlist.id);

    if (playlist.tracks && playlist.tracks.length > 0) {
      const songRows = playlist.tracks.map((track, idx) => ({
        playlist_id: playlist.id,
        song_id: track.id,
        position: idx,
      }));

      const { error: songsError } = await supabase.from('playlist_songs').insert(songRows);
      if (songsError) console.warn('syncPlaylist songs error:', songsError.message);
    }
  } catch (err) {
    console.warn('syncPlaylist threw:', err);
  }
}

export async function deleteFirestorePlaylist(userId: string, playlistId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  try {
    // playlist_songs will cascade
    const { error } = await supabase
      .from('playlists')
      .delete()
      .eq('id', playlistId)
      .eq('user_id', userId);

    if (error) console.warn('deletePlaylist error:', error.message);
  } catch (err) {
    console.warn('deletePlaylist threw:', err);
  }
}

export async function fetchUserPlaylistsFromFirestore(userId: string): Promise<Playlist[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const client = supabase;

  try {
    const { data: playlistRows, error } = await client
      .from('playlists')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('fetchUserPlaylists error:', error.message);
      return [];
    }

    const playlists: Playlist[] = await Promise.all(
      (playlistRows ?? []).map(async (row) => {
        const { data: songRows } = await client
          .from('playlist_songs')
          .select('song_id, position')
          .eq('playlist_id', row.id)
          .order('position', { ascending: true });

        // Fetch track details for each song
        const trackIds = (songRows ?? []).map((s) => s.song_id);
        let tracks: Track[] = [];

        if (trackIds.length > 0) {
          const { data: songData } = await client
            .from('songs')
            .select('*')
            .in('id', trackIds);

          // Preserve order from playlist_songs
          const songMap = new Map((songData ?? []).map((s) => [s.id, songRowToTrack(s)]));
          tracks = trackIds
            .map((id) => songMap.get(id))
            .filter(Boolean) as Track[];
        }

        return rowToPlaylist(row, tracks);
      })
    );

    return playlists;
  } catch (err) {
    console.warn('fetchUserPlaylists threw:', err);
    return [];
  }
}

export async function fetchPublicPlaylistsFromFirestore(): Promise<Playlist[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  try {
    const { data: rows, error } = await supabase
      .from('playlists')
      .select('*')
      .eq('is_public', true)
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('fetchPublicPlaylists error:', error.message);
      return [];
    }

    return (rows ?? []).filter((r) => r.id && r.title).map((row) => rowToPlaylist(row));
  } catch (err) {
    console.warn('fetchPublicPlaylists threw:', err);
    return [];
  }
}

// ── 8. RECENTLY PLAYED ───────────────────────────────────────────────────────

export async function recordTrackPlayedInFirestore(userId: string, track: Track): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  try {
    const { error } = await supabase.from('listening_history').insert({
      user_id: userId,
      song_id: track.id,
      track_data: track,
      played_at: new Date().toISOString(),
    });

    if (error) console.warn('recordTrackPlayed error:', error.message);

    // Keep only the 100 most recent entries for the user
    const { data: oldest } = await supabase
      .from('listening_history')
      .select('id')
      .eq('user_id', userId)
      .order('played_at', { ascending: true });

    if (oldest && oldest.length > 100) {
      const toDelete = oldest.slice(0, oldest.length - 100).map((r) => r.id);
      await supabase.from('listening_history').delete().in('id', toDelete);
    }
  } catch (err) {
    console.warn('recordTrackPlayed threw:', err);
  }
}

export async function fetchRecentlyPlayedFromFirestore(userId: string): Promise<Track[]> {
  const entries = await fetchUserRecentlyPlayedEntries(userId);
  return entries.map((e) => e.track);
}

export async function fetchUserRecentlyPlayedEntries(
  userId: string
): Promise<{ track: Track; playedAt: number }[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  try {
    const { data, error } = await supabase
      .from('listening_history')
      .select('track_data, played_at')
      .eq('user_id', userId)
      .order('played_at', { ascending: false })
      .limit(30);

    if (error) {
      console.warn('fetchUserRecentlyPlayedEntries error:', error.message);
      return [];
    }

    // Deduplicate by track id, keeping most recent
    const seen = new Set<string>();
    const results: { track: Track; playedAt: number }[] = [];

    for (const row of data ?? []) {
      const track = row.track_data as Track;
      if (!track?.id || seen.has(track.id)) continue;
      seen.add(track.id);
      results.push({ track, playedAt: new Date(row.played_at).getTime() });
    }

    return results;
  } catch (err) {
    console.warn('fetchUserRecentlyPlayedEntries threw:', err);
    return [];
  }
}

// ── 9. SONGS CATALOG ─────────────────────────────────────────────────────────

function songRowToTrack(row: any): Track {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    artistId: row.artist_id ?? '',
    album: row.album ?? 'Singles',
    albumId: row.album_id ?? 'al_single',
    duration: row.duration ?? 0,
    coverUrl: row.cover_url ?? '',
    audioUrl: row.audio_url ?? undefined,
    lyrics: row.lyrics ?? [],
    genre: row.genre ?? 'Electronic',
    playCount: row.play_count ?? 0,
    liked: false,
    year: row.year ?? new Date().getFullYear(),
    trackNumber: row.track_number ?? undefined,
  };
}

function trackToSongRow(song: Track) {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    artist_id: song.artistId,
    album: song.album,
    album_id: song.albumId,
    duration: song.duration,
    cover_url: song.coverUrl,
    audio_url: song.audioUrl ?? null,
    lyrics: song.lyrics ?? [],
    genre: song.genre,
    play_count: song.playCount ?? 0,
    year: song.year,
    track_number: song.trackNumber ?? null,
    updated_at: new Date().toISOString(),
  };
}

export async function fetchAllSongsFromFirestore(): Promise<Track[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  try {
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('fetchAllSongs error:', error.message);
      return [];
    }

    return (data ?? []).map(songRowToTrack);
  } catch (err) {
    console.warn('fetchAllSongs threw:', err);
    return [];
  }
}

export async function fetchAllArtistsFromFirestore(): Promise<any[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  try {
    const { data, error } = await supabase.from('artists').select('*');
    if (error) {
      console.warn('fetchAllArtists error:', error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      imageUrl: row.image_url ?? '',
      bio: row.bio ?? '',
      genres: row.genres ?? [],
      verified: row.verified ?? false,
      monthlyListeners: row.monthly_listeners ?? 0,
      followers: row.followers ?? 0,
      following: false,
    }));
  } catch (err) {
    console.warn('fetchAllArtists threw:', err);
    return [];
  }
}

export async function fetchAllAlbumsFromFirestore(): Promise<any[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  try {
    const { data, error } = await supabase.from('albums').select('*');
    if (error) {
      console.warn('fetchAllAlbums error:', error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      artistId: row.artist_id,
      artist: row.artist,
      coverUrl: row.cover_url ?? '',
      year: row.year ?? new Date().getFullYear(),
      genre: row.genre ?? 'Electronic',
      trackCount: row.track_count ?? 0,
      description: row.description ?? '',
      tracks: [],
    }));
  } catch (err) {
    console.warn('fetchAllAlbums threw:', err);
    return [];
  }
}

export async function fetchAllUsersFromFirestore(): Promise<ManagedUser[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  try {
    const [profilesRes, likesRes, playlistsRes, historyRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, role, status, created_at, updated_at'),
      supabase.from('liked_songs').select('user_id'),
      supabase.from('playlists').select('user_id'),
      supabase.from('listening_history').select('user_id, played_at'),
    ]);

    if (profilesRes.error) {
      console.warn('fetchAllUsers error:', profilesRes.error.message);
      return [];
    }

    const likesMap = new Map<string, number>();
    (likesRes.data ?? []).forEach((row: any) => {
      if (row.user_id) likesMap.set(row.user_id, (likesMap.get(row.user_id) ?? 0) + 1);
    });

    const playlistsMap = new Map<string, number>();
    (playlistsRes.data ?? []).forEach((row: any) => {
      if (row.user_id) playlistsMap.set(row.user_id, (playlistsMap.get(row.user_id) ?? 0) + 1);
    });

    const playsMap = new Map<string, number>();
    const lastActiveMap = new Map<string, number>();
    (historyRes.data ?? []).forEach((row: any) => {
      if (row.user_id) {
        playsMap.set(row.user_id, (playsMap.get(row.user_id) ?? 0) + 1);
        const time = row.played_at ? new Date(row.played_at).getTime() : 0;
        if (time > (lastActiveMap.get(row.user_id) ?? 0)) {
          lastActiveMap.set(row.user_id, time);
        }
      }
    });

    return (profilesRes.data ?? []).map((row) => {
      const role: ManagedUser['role'] =
        row.role === 'admin' ? 'admin' :
        row.role === 'creator' ? 'creator' :
        'listener';

      const rowUpdatedAt = row.updated_at ? new Date(row.updated_at).getTime() : Date.now();
      const historyLatest = lastActiveMap.get(row.id) ?? 0;
      const lastActive = Math.max(rowUpdatedAt, historyLatest);

      return {
        id: row.id,
        email: `${row.username ?? row.id}@melodix.local`,
        displayName: row.display_name ?? row.username ?? 'Unknown User',
        username: row.username ?? '',
        photoURL: row.avatar_url ?? undefined,
        role,
        status: (row.status === 'blocked' ? 'blocked' : 'active') as 'active' | 'blocked',
        joinedAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
        lastActive,
        playsCount: playsMap.get(row.id) ?? 0,
        likedCount: likesMap.get(row.id) ?? 0,
        playlistsCount: playlistsMap.get(row.id) ?? 0,
        country: 'Global Listener',
      } satisfies ManagedUser;
    });
  } catch (err) {
    console.warn('fetchAllUsers threw:', err);
    return [];
  }
}

// ── 10. ADMIN CATALOG MANAGEMENT ─────────────────────────────────────────────

export async function adminSyncSongToFirestore(song: Track): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  try {
    const { error } = await supabase
      .from('songs')
      .upsert(trackToSongRow(song), { onConflict: 'id' });

    if (error) console.warn('adminSyncSong error:', error.message);
  } catch (err) {
    console.warn('adminSyncSong threw:', err);
  }
}

export async function adminDeleteSongFromFirestore(songId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  try {
    const { error } = await supabase.from('songs').delete().eq('id', songId);
    if (error) console.warn('adminDeleteSong error:', error.message);
  } catch (err) {
    console.warn('adminDeleteSong threw:', err);
  }
}

export async function adminSyncArtistToFirestore(artist: any): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  try {
    const { error } = await supabase.from('artists').upsert({
      id: artist.id,
      name: artist.name,
      image_url: artist.imageUrl ?? null,
      bio: artist.bio ?? null,
      genres: artist.genres ?? [],
      verified: artist.verified ?? false,
      monthly_listeners: artist.monthlyListeners ?? 0,
      followers: artist.followers ?? 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (error) console.warn('adminSyncArtist error:', error.message);
  } catch (err) {
    console.warn('adminSyncArtist threw:', err);
  }
}

export async function adminDeleteArtistFromFirestore(artistId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  try {
    const { error } = await supabase.from('artists').delete().eq('id', artistId);
    if (error) console.warn('adminDeleteArtist error:', error.message);
  } catch (err) {
    console.warn('adminDeleteArtist threw:', err);
  }
}

export async function adminSyncAlbumToFirestore(album: any): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  try {
    const { error } = await supabase.from('albums').upsert({
      id: album.id,
      title: album.title,
      artist_id: album.artistId ?? null,
      artist: album.artist ?? '',
      cover_url: album.coverUrl ?? null,
      year: album.year ?? null,
      genre: album.genre ?? 'Electronic',
      track_count: album.trackCount ?? 0,
      description: album.description ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (error) console.warn('adminSyncAlbum error:', error.message);
  } catch (err) {
    console.warn('adminSyncAlbum threw:', err);
  }
}

export async function adminDeleteAlbumFromFirestore(albumId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  try {
    const { error } = await supabase.from('albums').delete().eq('id', albumId);
    if (error) console.warn('adminDeleteAlbum error:', error.message);
  } catch (err) {
    console.warn('adminDeleteAlbum threw:', err);
  }
}

export async function adminUpdateUserStatusInFirestore(uid: string, status: 'active' | 'blocked'): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', uid);

    if (error) console.warn('adminUpdateUserStatus error:', error.message);
  } catch (err) {
    console.warn('adminUpdateUserStatus threw:', err);
  }
}

export async function adminDeleteUserFromFirestore(uid: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  try {
    const { error } = await supabase.from('profiles').delete().eq('id', uid);
    if (error) console.warn('adminDeleteUser error:', error.message);
  } catch (err) {
    console.warn('adminDeleteUser threw:', err);
  }
}

// ── 11. ROLE CHECKING ─────────────────────────────────────────────────────────

export async function fetchUserRole(uid: string): Promise<'user' | 'admin'> {
  if (!isSupabaseConfigured() || !supabase) return 'user';

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', uid)
      .maybeSingle();

    if (error || !data) return 'user';
    return data.role === 'admin' ? 'admin' : 'user';
  } catch {
    return 'user';
  }
}

// ── 12. USER ANALYTICS ────────────────────────────────────────────────────────

export async function syncUserAnalytics(uid: string, analyticsData: any): Promise<void> {
  if (!uid || uid === 'guest') return;

  setLocal(localKey('analytics', uid), analyticsData);

  if (!isSupabaseConfigured() || !supabase) return;

  try {
    const { data } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', uid)
      .maybeSingle();

    const currentPref = data?.preferences || {};
    const updatedPref = { ...currentPref, analytics: analyticsData };

    const { error } = await supabase
      .from('profiles')
      .update({ preferences: updatedPref, updated_at: new Date().toISOString() })
      .eq('id', uid);

    if (error) console.warn('Supabase syncUserAnalytics error:', error.message);
  } catch (err) {
    console.warn('syncUserAnalytics threw:', err);
  }
}

export async function fetchUserAnalytics(uid: string): Promise<any | null> {
  if (!uid || uid === 'guest') return null;

  const localCached = getLocal<any | null>(localKey('analytics', uid), null);

  if (!isSupabaseConfigured() || !supabase) {
    return localCached;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', uid)
      .maybeSingle();

    if (!error && data?.preferences?.analytics) {
      setLocal(localKey('analytics', uid), data.preferences.analytics);
      return data.preferences.analytics;
    }

    return localCached;
  } catch (err) {
    console.warn('fetchUserAnalytics threw:', err);
    return localCached;
  }
}
