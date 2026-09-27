import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Track, Playlist } from '@/types';
import { tracks, playlists as initialPlaylists, artists } from '@/data/demo';
import { isFirebaseConfigured } from '@/services/firebase';
import {
  syncLike,
  syncPlaylist,
  deleteFirestorePlaylist,
  recordTrackPlayedInFirestore,
  fetchUserLikes,
  fetchUserPlaylistsFromFirestore,
  fetchUserRecentlyPlayedEntries,
  syncSavedAlbum,
  fetchUserSavedAlbums,
  syncFollowArtist,
  fetchFollowedArtists,
  syncDownload,
  fetchUserDownloads,
} from '@/services/firestoreService';
import { useAuthStore } from '@/store/authStore';
import { useAdminStore } from '@/store/adminStore';

export interface RecentlyPlayedItem {
  track: Track;
  playedAt: number;
}

interface LibraryState {
  likedSongIds: string[];
  savedAlbumIds: string[];
  savedPlaylistIds: string[];
  downloadedTrackIds: string[];
  recentlyPlayed: RecentlyPlayedItem[];
  recentSearches: string[];
  userPlaylists: Playlist[];
  followedArtistIds: string[];

  // Liked songs actions
  toggleLikeSong: (track: Track | { id: string } | string) => boolean;
  isSongLiked: (trackId: string) => boolean;

  // Albums actions
  toggleSaveAlbum: (albumId: string) => boolean;
  isAlbumSaved: (albumId: string) => boolean;

  // Playlists actions
  toggleSavePlaylist: (playlistId: string) => boolean;
  isPlaylistSaved: (playlistId: string) => boolean;
  getPlaylistById: (id: string) => Playlist | undefined;
  createPlaylist: (title: string, description?: string, coverUrl?: string, isPublic?: boolean) => Playlist;
  updatePlaylist: (id: string, updates: Partial<Playlist>) => void;
  deletePlaylist: (id: string) => void;
  duplicatePlaylist: (id: string) => Playlist | null;
  addSongToPlaylist: (playlistId: string, track: Track) => void;
  removeSongFromPlaylist: (playlistId: string, trackId: string) => void;
  reorderPlaylistSongs: (playlistId: string, fromIndex: number, toIndex: number) => void;

  // Artist follow actions
  toggleFollowArtist: (artistId: string) => boolean;
  isFollowingArtist: (artistId: string) => boolean;

  // Downloads actions
  toggleDownload: (trackId: string) => boolean;
  isDownloaded: (trackId: string) => boolean;

  // Recently played actions
  addRecentlyPlayed: (track: Track) => void;
  clearRecentlyPlayed: () => void;

  // Recent searches actions
  addRecentSearch: (query: string) => void;
  removeRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;

  // Remove song from library
  removeSongFromLibrary: (trackId: string) => void;

  // Cloud Firestore Sync
  loadUserFirestoreData: (uid: string) => Promise<void>;
  resetUserData: (uid?: string) => void;
}

const defaultLiked: string[] = [];
const defaultFollowed: string[] = [];
const defaultSavedAlbums: string[] = [];
const defaultDownloaded: string[] = [];
const defaultRecentPlayed: RecentlyPlayedItem[] = [];

const getLibraryStorageKey = (uid?: string) => `melodix-library-storage-${uid || 'guest'}`;

const getPersistedLibraryKeys = () => {
  const keys = new Set<string>();
  const currentUser = useAuthStore.getState().user?.uid;

  if (currentUser) keys.add(getLibraryStorageKey(currentUser));
  keys.add(getLibraryStorageKey('guest'));

  try {
    const savedDemo = localStorage.getItem('melodix_demo_auth');
    if (savedDemo) {
      const parsed = JSON.parse(savedDemo) as { uid?: string };
      if (parsed?.uid) keys.add(getLibraryStorageKey(parsed.uid));
    }
  } catch {
    // Ignore malformed auth cache
  }

  return Array.from(keys);
};

const getDefaultLibraryState = () => ({
  likedSongIds: defaultLiked,
  savedAlbumIds: defaultSavedAlbums,
  savedPlaylistIds: [],
  downloadedTrackIds: defaultDownloaded,
  recentlyPlayed: defaultRecentPlayed,
  recentSearches: [],
  userPlaylists: [],
  followedArtistIds: defaultFollowed,
});

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      ...getDefaultLibraryState(),

      loadUserFirestoreData: async (uid: string) => {
        try {
          const [remoteLikes, remotePlaylists, remoteRecent, remoteSavedAlbums, remoteFollowedArtists, remoteDownloads] = await Promise.all([
            fetchUserLikes(uid),
            fetchUserPlaylistsFromFirestore(uid),
            fetchUserRecentlyPlayedEntries(uid),
            fetchUserSavedAlbums(uid),
            fetchFollowedArtists(uid),
            fetchUserDownloads(uid),
          ]);

          const fallbackPlaylists = isFirebaseConfigured() ? [] : initialPlaylists;

          set((state) => ({
            likedSongIds: remoteLikes,
            savedAlbumIds: remoteSavedAlbums,
            followedArtistIds: remoteFollowedArtists,
            downloadedTrackIds: remoteDownloads,
            userPlaylists:
              remotePlaylists.length > 0
                ? [...remotePlaylists, ...state.userPlaylists.filter((p) => !remotePlaylists.some((r) => r.id === p.id))]
                : state.userPlaylists.length > 0
                  ? state.userPlaylists
                  : fallbackPlaylists,
            recentlyPlayed: remoteRecent.length > 0 ? remoteRecent : [],
          }));
        } catch (err) {
          console.warn('loadUserFirestoreData error:', err);
        }
      },

      resetUserData: (uid?: string) => {
        const next = getDefaultLibraryState();
        if (!uid) {
          set((state) => ({
            ...state,
            recentlyPlayed: [],
            recentSearches: [],
          }));
          return;
        }

        set({
          ...next,
          userPlaylists: [],
          savedPlaylistIds: [],
        });
      },

      toggleLikeSong: (track) => {
        const trackId = typeof track === 'string' ? track : track.id;
        const { likedSongIds } = get();
        const isLiked = likedSongIds.includes(trackId);
        const nextLiked = isLiked
          ? likedSongIds.filter((id) => id !== trackId)
          : [...likedSongIds, trackId];

        set({ likedSongIds: nextLiked });

        // Sync with Firestore if authenticated
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          syncLike(currentUser.uid, trackId, !isLiked);
          void useAdminStore.getState().hydrateUsers();
        }

        return !isLiked;
      },

      isSongLiked: (trackId) => {
        return get().likedSongIds.includes(trackId);
      },

      toggleSaveAlbum: (albumId) => {
        const { savedAlbumIds } = get();
        const isSaved = savedAlbumIds.includes(albumId);
        const nextSaved = isSaved
          ? savedAlbumIds.filter((id) => id !== albumId)
          : [...savedAlbumIds, albumId];

        set({ savedAlbumIds: nextSaved });

        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          syncSavedAlbum(currentUser.uid, albumId, !isSaved);
        }
        return !isSaved;
      },

      isAlbumSaved: (albumId) => {
        return get().savedAlbumIds.includes(albumId);
      },

      toggleSavePlaylist: (playlistId) => {
        const { savedPlaylistIds } = get();
        const isSaved = savedPlaylistIds.includes(playlistId);
        const nextSaved = isSaved
          ? savedPlaylistIds.filter((id) => id !== playlistId)
          : [...savedPlaylistIds, playlistId];

        set({ savedPlaylistIds: nextSaved });
        return !isSaved;
      },

      isPlaylistSaved: (playlistId) => {
        return get().savedPlaylistIds.includes(playlistId);
      },

      getPlaylistById: (id) => {
        return get().userPlaylists.find((p) => p.id === id);
      },

      createPlaylist: (title, description = '', coverUrl, isPublic = true) => {
        const newPlaylist: Playlist = {
          id: `pl-user-${Date.now()}`,
          title: title.trim(),
          description: description.trim(),
          coverUrl: coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80',
          coverColors: ['#4c1d95', '#1e1b4b'],
          tracks: [],
          createdBy: 'You',
          isPublic,
          followers: 0,
        };

        set((s) => ({
          userPlaylists: [newPlaylist, ...s.userPlaylists],
          savedPlaylistIds: [newPlaylist.id, ...s.savedPlaylistIds],
        }));

        // Sync with Firestore if authenticated
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          syncPlaylist(newPlaylist, currentUser.uid);
          void useAdminStore.getState().hydrateUsers();
        }

        return newPlaylist;
      },

      updatePlaylist: (id, updates) => {
        set((s) => ({
          userPlaylists: s.userPlaylists.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));

        const updated = get().userPlaylists.find((p) => p.id === id);
        const currentUser = useAuthStore.getState().user;
        if (updated && currentUser) {
          syncPlaylist(updated, currentUser.uid);
          void useAdminStore.getState().hydrateUsers();
        }
      },

      deletePlaylist: (id) => {
        set((s) => ({
          userPlaylists: s.userPlaylists.filter((p) => p.id !== id),
          savedPlaylistIds: s.savedPlaylistIds.filter((pid) => pid !== id),
        }));

        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          deleteFirestorePlaylist(currentUser.uid, id);
          void useAdminStore.getState().hydrateUsers();
        }
      },

      duplicatePlaylist: (id) => {
        const original = get().userPlaylists.find((p) => p.id === id);
        if (!original) return null;

        const duplicated: Playlist = {
          ...original,
          id: `pl-user-${Date.now()}`,
          title: `${original.title} (Copy)`,
          createdBy: 'You',
          followers: 0,
        };

        set((s) => ({
          userPlaylists: [duplicated, ...s.userPlaylists],
          savedPlaylistIds: [duplicated.id, ...s.savedPlaylistIds],
        }));

        return duplicated;
      },

      addSongToPlaylist: (playlistId, track) => {
        set((s) => ({
          userPlaylists: s.userPlaylists.map((p) => {
            if (p.id !== playlistId) return p;
            if (p.tracks.some((t) => t.id === track.id)) return p;
            return { ...p, tracks: [...p.tracks, track] };
          }),
        }));
      },

      removeSongFromPlaylist: (playlistId, trackId) => {
        set((s) => ({
          userPlaylists: s.userPlaylists.map((p) => {
            if (p.id !== playlistId) return p;
            return { ...p, tracks: p.tracks.filter((t) => t.id !== trackId) };
          }),
        }));
      },

      reorderPlaylistSongs: (playlistId, fromIndex, toIndex) => {
        set((s) => ({
          userPlaylists: s.userPlaylists.map((p) => {
            if (p.id !== playlistId) return p;
            const reordered = [...p.tracks];
            const [moved] = reordered.splice(fromIndex, 1);
            reordered.splice(toIndex, 0, moved);
            return { ...p, tracks: reordered };
          }),
        }));
      },

      toggleFollowArtist: (artistId) => {
        const { followedArtistIds } = get();
        const isFollowing = followedArtistIds.includes(artistId);
        const updated = isFollowing
          ? followedArtistIds.filter((id) => id !== artistId)
          : [...followedArtistIds, artistId];

        set({ followedArtistIds: updated });

        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          syncFollowArtist(currentUser.uid, artistId, !isFollowing);
        }
        return !isFollowing;
      },

      isFollowingArtist: (artistId) => {
        return get().followedArtistIds.includes(artistId);
      },

      toggleDownload: (trackId) => {
        const { downloadedTrackIds } = get();
        const isDown = downloadedTrackIds.includes(trackId);
        const nextDown = isDown
          ? downloadedTrackIds.filter((id) => id !== trackId)
          : [...downloadedTrackIds, trackId];

        set({ downloadedTrackIds: nextDown });

        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          syncDownload(currentUser.uid, trackId, !isDown);
        }
        return !isDown;
      },

      isDownloaded: (trackId) => {
        return get().downloadedTrackIds.includes(trackId);
      },

      addRecentlyPlayed: (track) => {
        const { recentlyPlayed } = get();
        const filtered = recentlyPlayed.filter((item) => item.track.id !== track.id);
        const updated: RecentlyPlayedItem[] = [
          { track, playedAt: Date.now() },
          ...filtered,
        ].slice(0, 50);

        set({ recentlyPlayed: updated });

        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          recordTrackPlayedInFirestore(currentUser.uid, track);
          void useAdminStore.getState().hydrateUsers();
        }
      },

      clearRecentlyPlayed: () => {
        set({ recentlyPlayed: [] });
      },

      addRecentSearch: (query) => {
        const trimmed = query.trim();
        if (!trimmed) return;
        const { recentSearches } = get();
        const filtered = recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
        set({ recentSearches: [trimmed, ...filtered].slice(0, 10) });
      },

      removeRecentSearch: (query) => {
        const { recentSearches } = get();
        set({ recentSearches: recentSearches.filter((s) => s.toLowerCase() !== query.toLowerCase()) });
      },

      clearRecentSearches: () => {
        set({ recentSearches: [] });
      },

      removeSongFromLibrary: (trackId) => {
        const { likedSongIds, downloadedTrackIds, recentlyPlayed } = get();
        set({
          likedSongIds: likedSongIds.filter((id) => id !== trackId),
          downloadedTrackIds: downloadedTrackIds.filter((id) => id !== trackId),
          recentlyPlayed: recentlyPlayed.filter((item) => item.track.id !== trackId),
        });
      },
    }),
    {
      name: 'melodix-library-storage',
      version: 3,
      storage: {
        getItem: () => {
          for (const key of getPersistedLibraryKeys()) {
            const stored = localStorage.getItem(key);
            if (stored) {
              try {
                return JSON.parse(stored);
              } catch {
                localStorage.removeItem(key);
              }
            }
          }
          return null;
        },
        setItem: (_name, value) => {
          const userUid = useAuthStore.getState().user?.uid;
          const preferredKeys = [
            userUid ? getLibraryStorageKey(userUid) : null,
            getLibraryStorageKey('guest'),
          ].filter(Boolean) as string[];

          try {
            const savedDemo = localStorage.getItem('melodix_demo_auth');
            if (savedDemo) {
              const parsed = JSON.parse(savedDemo) as { uid?: string };
              if (parsed?.uid) preferredKeys.unshift(getLibraryStorageKey(parsed.uid));
            }
          } catch {
            // Ignore malformed auth cache
          }

          const uniqueKeys = [...new Set(preferredKeys)];
          uniqueKeys.forEach((key) => localStorage.setItem(key, JSON.stringify(value)));
        },
        removeItem: () => {
          getPersistedLibraryKeys().forEach((key) => localStorage.removeItem(key));
        },
      },
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          // Remove pl6 from savedPlaylistIds if it exists (it's already in userPlaylists)
          if (persistedState?.savedPlaylistIds) {
            persistedState.savedPlaylistIds = persistedState.savedPlaylistIds.filter(
              (id: string) => id !== 'pl6'
            );
          }
          // Deduplicate userPlaylists by id
          if (persistedState?.userPlaylists) {
            const seen = new Set<string>();
            persistedState.userPlaylists = persistedState.userPlaylists.filter((p: any) => {
              if (seen.has(p.id)) return false;
              seen.add(p.id);
              return true;
            });
          }
        }
        if (version < 3) {
          // Never re-seed user actions from the demo catalog.
          // Only deduplicate stored arrays; keep empty states empty until the user acts.
          if (persistedState?.likedSongIds) {
            persistedState.likedSongIds = [...new Set(persistedState.likedSongIds)];
          }
          if (persistedState?.savedAlbumIds) {
            persistedState.savedAlbumIds = [...new Set(persistedState.savedAlbumIds)];
          }
          if (persistedState?.savedPlaylistIds) {
            persistedState.savedPlaylistIds = [...new Set(persistedState.savedPlaylistIds)];
          }
          if (persistedState?.followedArtistIds) {
            persistedState.followedArtistIds = [...new Set(persistedState.followedArtistIds)];
          }
        }
        return persistedState;
      },
    }
  )
);
