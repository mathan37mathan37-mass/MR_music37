import {
  doc, setDoc, getDoc, updateDoc, collection, query, where,
  getDocs, deleteDoc, serverTimestamp, orderBy, limit
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import type { UserProfile, UserPreferences } from '@/types/auth';
import type { Track, Playlist } from '@/types';
import type { ManagedUser } from '@/types/admin';

const defaultPreferences: UserPreferences = {
  theme: 'dark',
  accentColor: 'violet',
  compactMode: false,
  audioQuality: 'high',
  autoplay: true,
  crossfade: false,
  crossfadeDuration: 4,
  gaplessPlayback: true,
  normalizeVolume: true,
  defaultVisualizer: 'bars',
  notifications: true,
  notifyNewReleases: true,
  notifyRecommendations: true,
  notifyPlaylistUpdates: false,
  publicProfile: true,
  publicPlaylists: true,
  shareListeningActivity: false,
  showRecentlyPlayed: true,
};

// ── 1. USER PROFILE ──────────────────────────────────────────────────────────
export async function syncUserProfile(profile: UserProfile): Promise<void> {
  if (!isFirebaseConfigured() || !db) {
    // Local fallback
    localStorage.setItem(`melodix_user_${profile.uid}`, JSON.stringify(profile));
    return;
  }

  try {
    const userRef = doc(db, 'users', profile.uid);
    await setDoc(userRef, {
      ...profile,
      updatedAt: Date.now(),
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore syncUserProfile failed, saving locally:', err);
    localStorage.setItem(`melodix_user_${profile.uid}`, JSON.stringify(profile));
  }
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  if (!isFirebaseConfigured() || !db) {
    const local = localStorage.getItem(`melodix_user_${uid}`);
    return local ? JSON.parse(local) : null;
  }

  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (err) {
    console.warn('Firestore fetchUserProfile failed, checking local:', err);
    const local = localStorage.getItem(`melodix_user_${uid}`);
    return local ? JSON.parse(local) : null;
  }
}

// ── 2. USER PREFERENCES ──────────────────────────────────────────────────────
export async function syncUserPreferences(uid: string, preferences: UserPreferences): Promise<void> {
  if (!isFirebaseConfigured() || !db) {
    localStorage.setItem(`melodix_pref_${uid}`, JSON.stringify(preferences));
    return;
  }

  try {
    const prefRef = doc(db, 'userPreferences', uid);
    await setDoc(prefRef, {
      ...preferences,
      userId: uid,
      updatedAt: Date.now(),
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore syncUserPreferences failed:', err);
    localStorage.setItem(`melodix_pref_${uid}`, JSON.stringify(preferences));
  }
}

// ── 3. LIKED SONGS (Firestore 'likes' collection) ────────────────────────────
export async function syncLike(userId: string, trackId: string, isLiked: boolean): Promise<void> {
  if (!isFirebaseConfigured() || !db) {
    const key = `melodix_likes_${userId}`;
    const existing: string[] = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = isLiked
      ? Array.from(new Set([...existing, trackId]))
      : existing.filter((id) => id !== trackId);
    localStorage.setItem(key, JSON.stringify(updated));
    return;
  }

  try {
    const likeRef = doc(db, 'users', userId, 'likes', trackId);
    if (isLiked) {
      await setDoc(likeRef, {
        userId,
        trackId,
        createdAt: Date.now(),
      });
    } else {
      await deleteDoc(likeRef);
    }

    const likesSnap = await getDocs(collection(db, 'users', userId, 'likes'));
    await updateDoc(doc(db, 'users', userId), {
      likedCount: likesSnap.size,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.warn('Firestore syncLike failed:', err);
  }
}

export async function fetchUserLikes(userId: string): Promise<string[]> {
  if (!isFirebaseConfigured() || !db) {
    const key = `melodix_likes_${userId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  }

  try {
    const likesRef = collection(db, 'users', userId, 'likes');
    const snap = await getDocs(likesRef);
    return snap.docs.map((d) => d.id);
  } catch (err) {
    console.warn('Firestore fetchUserLikes failed, fallback to local:', err);
    const key = `melodix_likes_${userId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
}

export async function syncSavedAlbum(userId: string, albumId: string, isSaved: boolean): Promise<void> {
  if (!isFirebaseConfigured() || !db) {
    const key = `melodix_saved_albums_${userId}`;
    const existing: string[] = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = isSaved
      ? Array.from(new Set([...existing, albumId]))
      : existing.filter((id) => id !== albumId);
    localStorage.setItem(key, JSON.stringify(updated));
    return;
  }

  try {
    const ref = doc(db, 'users', userId, 'savedAlbums', albumId);
    if (isSaved) {
      await setDoc(ref, { userId, albumId, createdAt: Date.now() });
    } else {
      await deleteDoc(ref);
    }
  } catch (err) {
    console.warn('Firestore syncSavedAlbum failed:', err);
  }
}

export async function fetchUserSavedAlbums(userId: string): Promise<string[]> {
  if (!isFirebaseConfigured() || !db) {
    const key = `melodix_saved_albums_${userId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  }

  try {
    const ref = collection(db, 'users', userId, 'savedAlbums');
    const snap = await getDocs(ref);
    return snap.docs.map((d) => d.id);
  } catch (err) {
    console.warn('Firestore fetchUserSavedAlbums failed, fallback to local:', err);
    const key = `melodix_saved_albums_${userId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
}

export async function syncFollowArtist(userId: string, artistId: string, isFollowing: boolean): Promise<void> {
  if (!isFirebaseConfigured() || !db) {
    const key = `melodix_followed_artists_${userId}`;
    const existing: string[] = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = isFollowing
      ? Array.from(new Set([...existing, artistId]))
      : existing.filter((id) => id !== artistId);
    localStorage.setItem(key, JSON.stringify(updated));
    return;
  }

  try {
    const ref = doc(db, 'users', userId, 'followedArtists', artistId);
    if (isFollowing) {
      await setDoc(ref, { userId, artistId, createdAt: Date.now() });
    } else {
      await deleteDoc(ref);
    }
  } catch (err) {
    console.warn('Firestore syncFollowArtist failed:', err);
  }
}

export async function fetchFollowedArtists(userId: string): Promise<string[]> {
  if (!isFirebaseConfigured() || !db) {
    const key = `melodix_followed_artists_${userId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  }

  try {
    const ref = collection(db, 'users', userId, 'followedArtists');
    const snap = await getDocs(ref);
    return snap.docs.map((d) => d.id);
  } catch (err) {
    console.warn('Firestore fetchFollowedArtists failed, fallback to local:', err);
    const key = `melodix_followed_artists_${userId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
}

export async function syncDownload(userId: string, trackId: string, isDownloaded: boolean): Promise<void> {
  if (!isFirebaseConfigured() || !db) {
    const key = `melodix_downloads_${userId}`;
    const existing: string[] = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = isDownloaded
      ? Array.from(new Set([...existing, trackId]))
      : existing.filter((id) => id !== trackId);
    localStorage.setItem(key, JSON.stringify(updated));
    return;
  }

  try {
    const ref = doc(db, 'users', userId, 'downloads', trackId);
    if (isDownloaded) {
      await setDoc(ref, { userId, trackId, createdAt: Date.now() });
    } else {
      await deleteDoc(ref);
    }
  } catch (err) {
    console.warn('Firestore syncDownload failed:', err);
  }
}

export async function fetchUserDownloads(userId: string): Promise<string[]> {
  if (!isFirebaseConfigured() || !db) {
    const key = `melodix_downloads_${userId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  }

  try {
    const ref = collection(db, 'users', userId, 'downloads');
    const snap = await getDocs(ref);
    return snap.docs.map((d) => d.id);
  } catch (err) {
    console.warn('Firestore fetchUserDownloads failed, fallback to local:', err);
    const key = `melodix_downloads_${userId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
}

// ── 4. PLAYLISTS (Firestore 'playlists' collection) ─────────────────────────
export async function syncPlaylist(playlist: Playlist, userId: string): Promise<void> {
  if (!isFirebaseConfigured() || !db) {
    return;
  }

  try {
    const playlistPayload = {
      ...playlist,
      creatorId: userId,
      userId,
      isPublic: Boolean(playlist.isPublic),
      updatedAt: Date.now(),
    };

    const plRef = doc(db, 'users', userId, 'playlists', playlist.id);
    await setDoc(plRef, playlistPayload, { merge: true });

    if (playlist.isPublic) {
      await setDoc(doc(db, 'publicPlaylists', playlist.id), {
        ...playlistPayload,
        public: true,
      }, { merge: true });
    } else {
      const publicRef = doc(db, 'publicPlaylists', playlist.id);
      const publicSnap = await getDoc(publicRef);
      if (publicSnap.exists()) {
        await deleteDoc(publicRef);
      }
    }

    const playlistsSnap = await getDocs(collection(db, 'users', userId, 'playlists'));
    await updateDoc(doc(db, 'users', userId), {
      playlistsCount: playlistsSnap.size,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.warn('Firestore syncPlaylist error:', err);
  }
}

export async function deleteFirestorePlaylist(userId: string, playlistId: string): Promise<void> {
  if (!isFirebaseConfigured() || !db) return;
  try {
    await deleteDoc(doc(db, 'users', userId, 'playlists', playlistId));
    await deleteDoc(doc(db, 'publicPlaylists', playlistId));

    const playlistsSnap = await getDocs(collection(db, 'users', userId, 'playlists'));
    await updateDoc(doc(db, 'users', userId), {
      playlistsCount: playlistsSnap.size,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.warn('Firestore deletePlaylist error:', err);
  }
}

export async function fetchUserPlaylistsFromFirestore(userId: string): Promise<Playlist[]> {
  if (!isFirebaseConfigured() || !db) {
    return [];
  }

  try {
    const plRef = collection(db, 'users', userId, 'playlists');
    const snap = await getDocs(plRef);
    return snap.docs.map((d) => d.data() as Playlist);
  } catch (err) {
    console.warn('Firestore fetchUserPlaylists error:', err);
    return [];
  }
}

export async function fetchPublicPlaylistsFromFirestore(): Promise<Playlist[]> {
  if (!isFirebaseConfigured() || !db) {
    return [];
  }

  try {
    const publicPlaylistsRef = query(collection(db, 'publicPlaylists'), where('isPublic', '==', true));
    const snap = await getDocs(publicPlaylistsRef);

    return snap.docs
      .map((d) => ({ ...(d.data() as Playlist), id: d.id }))
      .filter((playlist) => Boolean(playlist?.id && playlist?.title))
      .sort((a, b) => Number(b.updatedAt ?? 0) - Number(a.updatedAt ?? 0));
  } catch (err) {
    console.warn('Firestore fetchPublicPlaylists error:', err);
    return [];
  }
}

// ── 5. RECENTLY PLAYED & LISTENING HISTORY ──────────────────────────────────
export async function recordTrackPlayedInFirestore(userId: string, track: Track): Promise<void> {
  if (!isFirebaseConfigured() || !db) return;

  try {
    const histRef = doc(collection(db, 'users', userId, 'listeningHistory'));
    await setDoc(histRef, {
      userId,
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      genre: track.genre,
      coverUrl: track.coverUrl,
      timestamp: Date.now(),
      duration: track.duration,
    });

    const recentRef = doc(db, 'users', userId, 'recentlyPlayed', track.id);
    await setDoc(recentRef, {
      userId,
      trackId: track.id,
      track,
      playedAt: Date.now(),
    });

    const historySnap = await getDocs(collection(db, 'users', userId, 'listeningHistory'));
    await updateDoc(doc(db, 'users', userId), {
      playsCount: historySnap.size,
      lastActive: Date.now(),
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.warn('Firestore recordTrackPlayed error:', err);
  }
}

export async function fetchRecentlyPlayedFromFirestore(userId: string): Promise<Track[]> {
  if (!isFirebaseConfigured() || !db) return [];

  try {
    const recRef = collection(db, 'users', userId, 'recentlyPlayed');
    const snap = await getDocs(recRef);
    return snap.docs
      .map((d) => ({
        track: d.data().track as Track,
        playedAt: d.data().playedAt as number,
      }))
      .sort((a, b) => b.playedAt - a.playedAt)
      .slice(0, 30)
      .map((item) => item.track);
  } catch (err) {
    console.warn('Firestore fetchRecentlyPlayed error:', err);
    return [];
  }
}

export async function fetchUserRecentlyPlayedEntries(userId: string): Promise<{ track: Track; playedAt: number }[]> {
  if (!isFirebaseConfigured() || !db) return [];

  try {
    const recRef = collection(db, 'users', userId, 'recentlyPlayed');
    const snap = await getDocs(recRef);
    return snap.docs
      .map((d) => ({
        track: d.data().track as Track,
        playedAt: d.data().playedAt as number,
      }))
      .sort((a, b) => b.playedAt - a.playedAt)
      .slice(0, 30);
  } catch (err) {
    console.warn('Firestore fetchUserRecentlyPlayedEntries error:', err);
    return [];
  }
}

export async function fetchAllSongsFromFirestore(): Promise<Track[]> {
  if (!isFirebaseConfigured() || !db) return [];

  try {
    const snap = await getDocs(collection(db, 'songs'));
    return snap.docs.map((docSnap) => docSnap.data() as Track);
  } catch (err) {
    console.warn('Firestore fetchAllSongs error:', err);
    return [];
  }
}

export async function fetchAllArtistsFromFirestore(): Promise<any[]> {
  if (!isFirebaseConfigured() || !db) return [];

  try {
    const snap = await getDocs(collection(db, 'artists'));
    return snap.docs.map((docSnap) => docSnap.data());
  } catch (err) {
    console.warn('Firestore fetchAllArtists error:', err);
    return [];
  }
}

export async function fetchAllAlbumsFromFirestore(): Promise<any[]> {
  if (!isFirebaseConfigured() || !db) return [];

  try {
    const snap = await getDocs(collection(db, 'albums'));
    return snap.docs.map((docSnap) => docSnap.data());
  } catch (err) {
    console.warn('Firestore fetchAllAlbums error:', err);
    return [];
  }
}

export async function fetchAllUsersFromFirestore(): Promise<ManagedUser[]> {
  if (!isFirebaseConfigured() || !db) return [];

  const fireStore = db;

  try {
    const snap = await getDocs(collection(fireStore, 'users'));
    const userEntries = await Promise.all(
      snap.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const displayName = data.displayName || data.username || 'Unknown User';
        const username = data.username || displayName.toLowerCase().replace(/\s+/g, '_');
        const role: ManagedUser['role'] = data.role === 'admin' || data.role === 'creator' || data.role === 'listener'
          ? data.role
          : 'listener';
        const status: ManagedUser['status'] = data.status === 'blocked' ? 'blocked' : 'active';

        const [likesSnap, playlistsSnap, historySnap] = await Promise.all([
          getDocs(collection(fireStore, 'users', docSnap.id, 'likes')),
          getDocs(collection(fireStore, 'users', docSnap.id, 'playlists')),
          getDocs(collection(fireStore, 'users', docSnap.id, 'listeningHistory')),
        ]);

        return {
          id: docSnap.id,
          email: data.email || `${username}@melodix.local`,
          displayName,
          username,
          photoURL: data.photoURL || undefined,
          role,
          status,
          joinedAt: Number(data.createdAt || data.joinedAt || Date.now()),
          lastActive: Number(data.updatedAt || data.lastActive || Date.now()),
          playsCount: Number(data.playsCount ?? historySnap.size ?? 0),
          likedCount: Number(data.likedCount ?? likesSnap.size ?? 0),
          playlistsCount: Number(data.playlistsCount ?? playlistsSnap.size ?? 0),
          country: data.country || 'Unknown',
        } satisfies ManagedUser;
      })
    );

    return userEntries;
  } catch (err) {
    console.warn('Firestore fetchAllUsers error:', err);
    return [];
  }
}

// ── 6. ADMIN CATALOG MANAGEMENT (Firestore collections: songs, artists, albums) ──
export async function adminSyncSongToFirestore(song: Track): Promise<void> {
  if (!isFirebaseConfigured() || !db) return;
  try {
    await setDoc(doc(db, 'songs', song.id), {
      ...song,
      updatedAt: Date.now(),
    }, { merge: true });
  } catch (err) {
    console.warn('adminSyncSongToFirestore error:', err);
  }
}

export async function adminDeleteSongFromFirestore(songId: string): Promise<void> {
  if (!isFirebaseConfigured() || !db) return;
  try {
    await deleteDoc(doc(db, 'songs', songId));
  } catch (err) {
    console.warn('adminDeleteSongFromFirestore error:', err);
  }
}

export async function adminSyncArtistToFirestore(artist: any): Promise<void> {
  if (!isFirebaseConfigured() || !db) return;
  try {
    await setDoc(doc(db, 'artists', artist.id), {
      ...artist,
      updatedAt: Date.now(),
    }, { merge: true });
  } catch (err) {
    console.warn('adminSyncArtistToFirestore error:', err);
  }
}

export async function adminDeleteArtistFromFirestore(artistId: string): Promise<void> {
  if (!isFirebaseConfigured() || !db) return;
  try {
    await deleteDoc(doc(db, 'artists', artistId));
  } catch (err) {
    console.warn('adminDeleteArtistFromFirestore error:', err);
  }
}

export async function adminSyncAlbumToFirestore(album: any): Promise<void> {
  if (!isFirebaseConfigured() || !db) return;
  try {
    await setDoc(doc(db, 'albums', album.id), {
      ...album,
      updatedAt: Date.now(),
    }, { merge: true });
  } catch (err) {
    console.warn('adminSyncAlbumToFirestore error:', err);
  }
}

export async function adminDeleteAlbumFromFirestore(albumId: string): Promise<void> {
  if (!isFirebaseConfigured() || !db) return;
  try {
    await deleteDoc(doc(db, 'albums', albumId));
  } catch (err) {
    console.warn('adminDeleteAlbumFromFirestore error:', err);
  }
}

export async function adminUpdateUserStatusInFirestore(uid: string, status: 'active' | 'blocked'): Promise<void> {
  if (!isFirebaseConfigured() || !db) return;
  try {
    await updateDoc(doc(db, 'users', uid), { status, updatedAt: Date.now() });
  } catch (err) {
    console.warn('adminUpdateUserStatusInFirestore error:', err);
  }
}

export async function adminDeleteUserFromFirestore(uid: string): Promise<void> {
  if (!isFirebaseConfigured() || !db) return;
  try {
    await deleteDoc(doc(db, 'users', uid));
  } catch (err) {
    console.warn('adminDeleteUserFromFirestore error:', err);
  }
}

