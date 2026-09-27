import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Track, Artist, Album } from '@/types';
import { isFirebaseConfigured } from '@/services/firebase';
import type {
  AdminTab,
  AdminStats,
  ManagedUser,
  AdminActivityLog,
  SongFormData,
  ArtistFormData,
  AlbumFormData,
} from '@/types/admin';
import { tracks as initialTracks, artists as initialArtists, albums as initialAlbums, playlists } from '@/data/demo';
import {
  adminSyncSongToFirestore,
  adminDeleteSongFromFirestore,
  adminSyncArtistToFirestore,
  adminDeleteArtistFromFirestore,
  adminSyncAlbumToFirestore,
  adminDeleteAlbumFromFirestore,
  adminUpdateUserStatusInFirestore,
  adminDeleteUserFromFirestore,
  fetchAllSongsFromFirestore,
  fetchAllArtistsFromFirestore,
  fetchAllAlbumsFromFirestore,
  fetchAllUsersFromFirestore,
} from '@/services/firestoreService';
import { getAllMediaKeys, getMediaUrl, isBlobUrlAlive } from '@/services/mediaStorage';

const SEED_USERS: ManagedUser[] = [
  {
    id: 'u1',
    email: 'alex.rivera@melodix.fm',
    displayName: 'Alex Rivera',
    username: 'arivera',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
    role: 'admin',
    status: 'active',
    joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 120,
    lastActive: Date.now() - 1000 * 60 * 5,
    playsCount: 1420,
    likedCount: 88,
    playlistsCount: 12,
    country: 'United States',
  },
  {
    id: 'u2',
    email: 'sophia.chen@soundwave.io',
    displayName: 'Sophia Chen',
    username: 'sophiac',
    photoURL: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80',
    role: 'creator',
    status: 'active',
    joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 65,
    lastActive: Date.now() - 1000 * 60 * 45,
    playsCount: 890,
    likedCount: 42,
    playlistsCount: 5,
    country: 'Canada',
  },
  {
    id: 'u3',
    email: 'marcus.vance@groove.net',
    displayName: 'Marcus Vance',
    username: 'marcusv',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    role: 'listener',
    status: 'active',
    joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
    lastActive: Date.now() - 1000 * 60 * 120,
    playsCount: 310,
    likedCount: 29,
    playlistsCount: 3,
    country: 'United Kingdom',
  },
  {
    id: 'u4',
    email: 'elena.rostova@cyberbeat.org',
    displayName: 'Elena Rostova',
    username: 'erostova',
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
    role: 'creator',
    status: 'active',
    joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 18,
    lastActive: Date.now() - 1000 * 60 * 15,
    playsCount: 540,
    likedCount: 35,
    playlistsCount: 4,
    country: 'Germany',
  },
  {
    id: 'u5',
    email: 'spammer_bot99@tempmail.com',
    displayName: 'Spam Bot 99',
    username: 'bot99',
    role: 'listener',
    status: 'blocked',
    joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
    lastActive: Date.now() - 1000 * 60 * 60 * 48,
    playsCount: 2,
    likedCount: 0,
    playlistsCount: 0,
    country: 'Unknown',
  },
];

const initialCatalogSongs = isFirebaseConfigured() ? [] as Track[] : initialTracks;
const initialCatalogArtists = isFirebaseConfigured() ? [] as Artist[] : initialArtists;
const initialCatalogAlbums = isFirebaseConfigured() ? [] as Album[] : initialAlbums;

const INITIAL_LOGS: AdminActivityLog[] = [
  {
    id: 'log-1',
    action: 'update',
    entityType: 'song',
    entityTitle: 'Celestial Drift',
    adminName: 'Admin System',
    timestamp: Date.now() - 1000 * 60 * 18,
    details: 'Synchronized audio master file',
  },
  {
    id: 'log-2',
    action: 'block',
    entityType: 'user',
    entityTitle: 'Spam Bot 99',
    adminName: 'Alex Rivera',
    timestamp: Date.now() - 1000 * 60 * 60 * 2,
    details: 'Flagged for automated spam activity',
  },
  {
    id: 'log-3',
    action: 'create',
    entityType: 'album',
    entityTitle: 'Northern Lights Deluxe',
    adminName: 'Alex Rivera',
    timestamp: Date.now() - 1000 * 60 * 60 * 24,
    details: 'Added 4 bonus tracks',
  },
];

interface AdminState {
  activeTab: AdminTab;
  songs: Track[];
  artists: Artist[];
  albums: Album[];
  users: ManagedUser[];
  activityLogs: AdminActivityLog[];

  // Navigation
  setActiveTab: (tab: AdminTab) => void;

  // Stats
  getStats: () => AdminStats;

  // Songs CRUD
  addSong: (formData: SongFormData) => Track;
  updateSong: (id: string, updates: Partial<Track>) => void;
  deleteSong: (id: string) => void;

  // Artists CRUD
  addArtist: (formData: ArtistFormData) => Artist;
  updateArtist: (id: string, updates: Partial<Artist>) => void;
  deleteArtist: (id: string) => void;

  // Albums CRUD
  addAlbum: (formData: AlbumFormData) => Album;
  updateAlbum: (id: string, updates: Partial<Album>) => void;
  deleteAlbum: (id: string) => void;

  // Users Management
  toggleUserBlock: (userId: string) => void;
  deleteUser: (userId: string) => void;

  // Audit Log
  logActivity: (log: Omit<AdminActivityLog, 'id' | 'timestamp'>) => void;

  // Catalog hydration
  hydrateCatalog: () => Promise<void>;
  hydrateUsers: () => Promise<void>;
}

const mergeCatalogItems = <T extends { id: string }>(localItems: T[], remoteItems: T[]) => {
  const merged = new Map<string, T>();
  [...remoteItems, ...localItems].forEach((item) => merged.set(item.id, item));
  return Array.from(merged.values());
};

const getLocalDemoUserMetrics = (): ManagedUser[] => {
  const savedUser = localStorage.getItem('melodix_demo_auth');
  if (!savedUser) return [];

  try {
    const profile = JSON.parse(savedUser);
    const libBlob = localStorage.getItem(`melodix-library-storage-${profile.uid}`);
    const libraryState = libBlob ? JSON.parse(libBlob)?.state || JSON.parse(libBlob) : {};

    const mappedUser: ManagedUser = {
      id: profile.uid,
      email: profile.email || 'demo@melodix.music',
      displayName: profile.displayName || 'Demo User',
      username: profile.username || 'demo_user',
      photoURL: profile.photoURL || undefined,
      role: 'listener',
      status: 'active',
      joinedAt: Number(profile.createdAt || Date.now()),
      lastActive: Date.now(),
      playsCount: Array.isArray(libraryState.recentlyPlayed) ? libraryState.recentlyPlayed.length : 0,
      likedCount: Array.isArray(libraryState.likedSongIds) ? libraryState.likedSongIds.length : 0,
      playlistsCount: Array.isArray(libraryState.userPlaylists) ? libraryState.userPlaylists.length : 0,
      country: 'Local Demo',
    };

    return [mappedUser];
  } catch {
    return [];
  }
};

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      activeTab: 'overview',
      songs: initialCatalogSongs,
      artists: initialCatalogArtists,
      albums: initialCatalogAlbums,
      users: SEED_USERS,
      activityLogs: INITIAL_LOGS,

      setActiveTab: (tab) => set({ activeTab: tab }),

      hydrateCatalog: async () => {
        try {
          const [remoteSongs, remoteArtists, remoteAlbums] = await Promise.all([
            fetchAllSongsFromFirestore(),
            fetchAllArtistsFromFirestore(),
            fetchAllAlbumsFromFirestore(),
          ]);

          if (remoteSongs.length === 0 && remoteArtists.length === 0 && remoteAlbums.length === 0) {
            return;
          }

          set((state) => ({
            songs: mergeCatalogItems(state.songs, remoteSongs),
            artists: mergeCatalogItems(state.artists, remoteArtists),
            albums: mergeCatalogItems(state.albums, remoteAlbums),
          }));
        } catch (err) {
          console.warn('[AdminStore] Catalog hydration failed:', err);
        }
      },

      hydrateUsers: async () => {
        try {
          const remoteUsers = await fetchAllUsersFromFirestore();
          const localDemoUsers = remoteUsers.length > 0 ? [] : getLocalDemoUserMetrics();

          if (remoteUsers.length === 0 && localDemoUsers.length === 0) {
            return;
          }

          set((state) => {
            const merged = mergeCatalogItems(state.users, remoteUsers.length > 0 ? remoteUsers : localDemoUsers);
            const demoMap = new Map(merged.map((user) => [user.id, user]));
            if (localDemoUsers.length > 0) {
              const demoUser = localDemoUsers[0];
              demoMap.set(demoUser.id, demoUser);
            }
            return { users: Array.from(demoMap.values()) };
          });
        } catch (err) {
          console.warn('[AdminStore] User hydration failed:', err);
        }
      },

      getStats: () => {
        const { songs, artists, albums, users } = get();
        const totalPlays = songs.reduce((acc, song) => acc + (song.playCount || 0), 0);

        return {
          totalUsers: users.length,
          totalSongs: songs.length,
          totalArtists: artists.length,
          totalAlbums: albums.length,
          totalPlaylists: playlists.length,
          totalPlays,
          activeListenersToday: Math.round(users.filter((u) => u.status === 'active').length * 28),
          newUsersThisWeek: 12,
        };
      },

      logActivity: (logData) => {
        const newLog: AdminActivityLog = {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
          ...logData,
        };
        set((state) => ({
          activityLogs: [newLog, ...state.activityLogs].slice(0, 50),
        }));
      },

      // ── SONGS CRUD ─────────────────────────────────────────────────────────
      addSong: (formData) => {
        const { songs, artists, albums, logActivity } = get();
        const artist = artists.find((a) => a.id === formData.artistId) || artists[0];
        const album = albums.find((al) => al.id === formData.albumId);

        const newId = `t${Date.now()}`;
        const newSong: Track = {
          id: newId,
          title: formData.title,
          artist: artist?.name || 'Unknown Artist',
          artistId: formData.artistId,
          album: album?.title || 'Singles',
          albumId: formData.albumId || 'al_single',
          duration: Number(formData.duration) || 180,
          year: Number(formData.year) || new Date().getFullYear(),
          coverUrl: formData.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80',
          audioUrl: formData.audioUrl || '/audio/track-1.wav',
          lyrics: formData.lyrics || [],
          genre: formData.genre || 'Electronic',
          playCount: 0,
          liked: false,
        };

        // Also inject the new song into the album's tracks array so it shows on the Albums page
        let updatedAlbums = albums;
        if (album) {
          updatedAlbums = albums.map((al) =>
            al.id === album.id
              ? { ...al, tracks: [...al.tracks, newSong] }
              : al
          );
        }

        set({ songs: [newSong, ...songs], albums: updatedAlbums });
        adminSyncSongToFirestore(newSong);

        logActivity({
          action: 'create',
          entityType: 'song',
          entityTitle: newSong.title,
          adminName: 'Admin',
          details: `Added new track by ${newSong.artist}`,
        });

        return newSong;
      },

      updateSong: (id, updates) => {
        const { songs, logActivity } = get();
        const target = songs.find((s) => s.id === id);
        if (!target) return;

        const updated = { ...target, ...updates };
        set({
          songs: songs.map((s) => (s.id === id ? updated : s)),
        });

        adminSyncSongToFirestore(updated);

        logActivity({
          action: 'update',
          entityType: 'song',
          entityTitle: updated.title,
          adminName: 'Admin',
          details: 'Updated track metadata or audio asset',
        });
      },

      deleteSong: (id) => {
        const { songs, logActivity } = get();
        const target = songs.find((s) => s.id === id);
        if (!target) return;

        set({ songs: songs.filter((s) => s.id !== id) });
        adminDeleteSongFromFirestore(id);

        logActivity({
          action: 'delete',
          entityType: 'song',
          entityTitle: target.title,
          adminName: 'Admin',
          details: `Deleted song from catalog`,
        });
      },

      // ── ARTISTS CRUD ───────────────────────────────────────────────────────
      addArtist: (formData) => {
        const { artists, logActivity } = get();
        const newArtist: Artist = {
          id: `a${Date.now()}`,
          name: formData.name,
          genres: formData.genres.length ? formData.genres : ['Electronic'],
          imageUrl: formData.imageUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
          bio: formData.bio || '',
          verified: formData.verified,
          monthlyListeners: Number(formData.monthlyListeners) || 50000,
          followers: Number(formData.followers) || 12000,
          following: false,
        };

        set({ artists: [newArtist, ...artists] });
        adminSyncArtistToFirestore(newArtist);

        logActivity({
          action: 'create',
          entityType: 'artist',
          entityTitle: newArtist.name,
          adminName: 'Admin',
          details: 'Registered new official artist profile',
        });

        return newArtist;
      },

      updateArtist: (id, updates) => {
        const { artists, logActivity } = get();
        const target = artists.find((a) => a.id === id);
        if (!target) return;

        const updated = { ...target, ...updates };
        set({
          artists: artists.map((a) => (a.id === id ? updated : a)),
        });

        adminSyncArtistToFirestore(updated);

        logActivity({
          action: 'update',
          entityType: 'artist',
          entityTitle: updated.name,
          adminName: 'Admin',
          details: 'Updated artist profile and biography',
        });
      },

      deleteArtist: (id) => {
        const { artists, logActivity } = get();
        const target = artists.find((a) => a.id === id);
        if (!target) return;

        set({ artists: artists.filter((a) => a.id !== id) });
        adminDeleteArtistFromFirestore(id);

        logActivity({
          action: 'delete',
          entityType: 'artist',
          entityTitle: target.name,
          adminName: 'Admin',
          details: 'Removed artist profile',
        });
      },

      // ── ALBUMS CRUD ────────────────────────────────────────────────────────
      addAlbum: (formData) => {
        const { albums, artists, songs, logActivity } = get();
        const artist = artists.find((a) => a.id === formData.artistId) || artists[0];
        const assignedTracks = songs.filter((s) => formData.trackIds.includes(s.id));

        const newId = `al${Date.now()}`;
        const newAlbum: Album = {
          id: newId,
          title: formData.title,
          artist: artist?.name || 'Various Artists',
          artistId: formData.artistId,
          genre: formData.genre || 'Electronic',
          year: Number(formData.year) || new Date().getFullYear(),
          coverUrl: formData.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80',
          description: formData.description || '',
          trackCount: assignedTracks.length,
          tracks: assignedTracks,
        };

        set({ albums: [newAlbum, ...albums] });
        adminSyncAlbumToFirestore(newAlbum);

        logActivity({
          action: 'create',
          entityType: 'album',
          entityTitle: newAlbum.title,
          adminName: 'Admin',
          details: `Published album with ${assignedTracks.length} tracks`,
        });

        return newAlbum;
      },

      updateAlbum: (id, updates) => {
        const { albums, logActivity } = get();
        const target = albums.find((al) => al.id === id);
        if (!target) return;

        const updated = { ...target, ...updates };
        set({
          albums: albums.map((al) => (al.id === id ? updated : al)),
        });

        adminSyncAlbumToFirestore(updated);

        logActivity({
          action: 'update',
          entityType: 'album',
          entityTitle: updated.title,
          adminName: 'Admin',
          details: 'Updated album tracklist & release data',
        });
      },

      deleteAlbum: (id) => {
        const { albums, logActivity } = get();
        const target = albums.find((al) => al.id === id);
        if (!target) return;

        set({ albums: albums.filter((al) => al.id !== id) });
        adminDeleteAlbumFromFirestore(id);

        logActivity({
          action: 'delete',
          entityType: 'album',
          entityTitle: target.title,
          adminName: 'Admin',
          details: 'Deleted album release',
        });
      },

      // ── USERS MANAGEMENT ───────────────────────────────────────────────────
      toggleUserBlock: (userId) => {
        const { users, logActivity } = get();
        const user = users.find((u) => u.id === userId);
        if (!user) return;

        const nextStatus = user.status === 'active' ? 'blocked' : 'active';
        set({
          users: users.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u)),
        });

        adminUpdateUserStatusInFirestore(userId, nextStatus);

        logActivity({
          action: nextStatus === 'blocked' ? 'block' : 'unblock',
          entityType: 'user',
          entityTitle: user.displayName,
          adminName: 'Admin',
          details: `Account status changed to ${nextStatus}`,
        });
      },

      deleteUser: (userId) => {
        const { users, logActivity } = get();
        const user = users.find((u) => u.id === userId);
        if (!user) return;

        set({ users: users.filter((u) => u.id !== userId) });
        adminDeleteUserFromFirestore(userId);

        logActivity({
          action: 'delete',
          entityType: 'user',
          entityTitle: user.displayName,
          adminName: 'Admin',
          details: `Permanently removed user account (${user.email})`,
        });
      },
    }),
    {
      name: 'melodix-admin-storage',
      version: 1,
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch (e) {
            console.warn('LocalStorage quota exceeded for admin store, safely trimming oversized data URLs:', e);
            try {
              const cleaned = {
                ...value,
                state: {
                  ...value.state,
                  songs: value.state.songs.map((s: any) => ({
                    ...s,
                    audioUrl: s.audioUrl?.startsWith('data:audio') ? '/audio/track-1.wav' : s.audioUrl,
                  })),
                },
              };
              localStorage.setItem(name, JSON.stringify(cleaned));
            } catch (innerErr) {
              console.warn('Could not persist adminStore to localStorage:', innerErr);
            }
          }
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);

// ── Startup Auto-Healing for Audio Blobs ─────────────────────────────────────
// Recovers any songs previously saved with an ephemeral blob: URL by linking
// them to their persistent IndexedDB audio master files
if (typeof window !== 'undefined') {
  setTimeout(async () => {
    try {
      const state = useAdminStore.getState();
      const songsToHeal = state.songs.filter(
        (s) => s.audioUrl && (s.audioUrl.startsWith('blob:') || s.audioUrl.startsWith('idb://'))
      );

      if (songsToHeal.length > 0) {
        const allKeys = await getAllMediaKeys();
        const audioKeys = allKeys.filter((k) => typeof k === 'string' && k.startsWith('audio_'));

        for (const song of songsToHeal) {
          if (song.audioUrl?.startsWith('blob:')) {
            const alive = await isBlobUrlAlive(song.audioUrl);
            if (!alive && audioKeys.length > 0) {
              let matchedKey = audioKeys[audioKeys.length - 1];
              if (song.title) {
                const clean = song.title.toLowerCase().replace(/[^a-z0-9]/g, '');
                const found = audioKeys.find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(clean));
                if (found) matchedKey = found;
              }
              const freshUrl = await getMediaUrl(matchedKey);
              if (freshUrl) {
                state.updateSong(song.id, { audioUrl: `idb://${matchedKey}` });
                console.log(`[AdminStore] Healed song "${song.title}" from dead blob URL to idb://${matchedKey}`);
              }
            }
          } else if (song.audioUrl?.startsWith('idb://')) {
            // Pre-warm memory cache so instant playback has 0ms latency
            const key = song.audioUrl.slice(6);
            await getMediaUrl(key);
          }
        }
      }
    } catch (err) {
      console.warn('[AdminStore] Blob auto-healing notice:', err);
    }
  }, 250);
}

