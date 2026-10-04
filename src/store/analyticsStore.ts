import { create } from 'zustand';
import type { Track } from '@/types';
import { tracks } from '@/data/demo';
import { useAuthStore } from '@/store/authStore';
import { useAdminStore } from '@/store/adminStore';
import { syncUserAnalytics, fetchUserAnalytics } from '@/services/supabaseService';

export interface ListeningHistoryEntry {
  id: string;
  trackId: string;
  title: string;
  artist: string;
  genre: string;
  coverUrl: string;
  timestamp: number;
  duration: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'listening' | 'exploration' | 'library' | 'loyalty';
  target: number;
  current: number;
  unit: string;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface AnalyticsState {
  activeUserId: string;

  // Core metrics
  totalListeningSeconds: number;
  songsPlayedCount: number;
  listeningHistory: ListeningHistoryEntry[];
  playCounts: Record<string, number>; // trackId -> count
  artistPlayCounts: Record<string, number>; // artist -> count
  genrePlayCounts: Record<string, number>; // genre -> count
  dailyListeningMinutes: Record<string, number>; // 'YYYY-MM-DD' -> minutes

  // Streaks
  currentStreakDays: number;
  lastListenedDate: string | null; // 'YYYY-MM-DD'

  // Visualizer and playlist flags
  visualizerUsedCount: number;
  hasCreatedPlaylist: boolean;

  // Achievements
  achievements: Achievement[];

  // Actions
  loadUserData: (uid?: string) => Promise<void>;
  resetUserData: (uid?: string) => void;
  onLogout: () => void;
  clearAnalytics: () => void;
  recordPlay: (track: Track) => void;
  recordListeningTime: (seconds: number) => void;
  recordVisualizerUsed: () => void;
  recordPlaylistCreated: () => void;
  getTopSong: () => { track: Track; count: number } | null;
  getTopArtist: () => { artist: string; count: number } | null;
  getTopGenre: () => { genre: string; count: number; percentage: number } | null;
  getWeeklyListening: () => { day: string; minutes: number; date: string }[];
  getMonthlyTotalHours: () => number;
}

const getTodayString = () => new Date().toISOString().split('T')[0];

export const getAnalyticsStorageKey = (uid?: string | null) =>
  `melodix-analytics-storage-${uid || 'guest'}`;

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_song',
    title: 'First Beat',
    description: 'Play your first track on Melodix',
    icon: 'Music',
    category: 'listening',
    target: 1,
    current: 0,
    unit: 'song',
    unlocked: false,
    unlockedAt: null,
  },
  {
    id: 'hundred_songs',
    title: 'Century Club',
    description: 'Listen to 100 songs',
    icon: 'Award',
    category: 'listening',
    target: 100,
    current: 0,
    unit: 'songs',
    unlocked: false,
    unlockedAt: null,
  },
  {
    id: 'ten_hours',
    title: 'Marathon Listener',
    description: 'Accumulate 10 hours of listening time',
    icon: 'Clock',
    category: 'listening',
    target: 600, // minutes
    current: 0,
    unit: 'minutes',
    unlocked: false,
    unlockedAt: null,
  },
  {
    id: 'playlist_creator',
    title: 'Curator at Heart',
    description: 'Create a custom playlist',
    icon: 'ListPlus',
    category: 'library',
    target: 1,
    current: 0,
    unit: 'playlist',
    unlocked: false,
    unlockedAt: null,
  },
  {
    id: 'music_explorer',
    title: 'Sonic Pioneer',
    description: 'Listen to songs across 4 different genres',
    icon: 'Compass',
    category: 'exploration',
    target: 4,
    current: 0,
    unit: 'genres',
    unlocked: false,
    unlockedAt: null,
  },
  {
    id: 'seven_day_streak',
    title: 'Unstoppable Rhythm',
    description: 'Maintain a 7-day music listening streak',
    icon: 'Flame',
    category: 'loyalty',
    target: 7,
    current: 0,
    unit: 'days',
    unlocked: false,
    unlockedAt: null,
  },
  {
    id: 'repeat_offender',
    title: 'On Infinite Loop',
    description: 'Play a single track at least 5 times',
    icon: 'Repeat',
    category: 'listening',
    target: 5,
    current: 0,
    unit: 'plays',
    unlocked: false,
    unlockedAt: null,
  },
  {
    id: 'audiophile',
    title: 'Visual Symphony',
    description: 'Experience the real-time Audio Visualizer in Fullscreen',
    icon: 'Activity',
    category: 'exploration',
    target: 1,
    current: 0,
    unit: 'session',
    unlocked: false,
    unlockedAt: null,
  },
];

// Generate past 7 days realistic initial seed data for demo
const generateInitialDailyMinutes = () => {
  const result: Record<string, number> = {};
  const today = new Date();
  const seedMinutes = [42, 65, 38, 55, 78, 45, 60];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    result[dateStr] = seedMinutes[6 - i] || 45;
  }
  return result;
};

const getDefaultAnalyticsState = (uid = 'guest') => ({
  activeUserId: uid,
  totalListeningSeconds: 0,
  songsPlayedCount: 0,
  listeningHistory: [] as ListeningHistoryEntry[],
  playCounts: {} as Record<string, number>,
  artistPlayCounts: {} as Record<string, number>,
  genrePlayCounts: {} as Record<string, number>,
  dailyListeningMinutes: {} as Record<string, number>,
  currentStreakDays: 0,
  lastListenedDate: null as string | null,
  visualizerUsedCount: 0,
  hasCreatedPlaylist: false,
  achievements: INITIAL_ACHIEVEMENTS.map((achievement) => ({
    ...achievement,
    current: 0,
    unlocked: false,
    unlockedAt: null,
  })),
});

const getDemoAnalyticsState = (uid = 'demo-melodix-user-01') => ({
  activeUserId: uid,
  totalListeningSeconds: 18420, // ~5h 7m
  songsPlayedCount: 48,
  listeningHistory: tracks.slice(0, 10).map((t, i) => ({
    id: `hist-demo-${t.id}-${i}`,
    trackId: t.id,
    title: t.title,
    artist: t.artist,
    genre: t.genre,
    coverUrl: t.coverUrl,
    timestamp: Date.now() - i * 3600000,
    duration: t.duration,
  })),
  playCounts: {
    '1': 14,
    '2': 10,
    '3': 8,
    '4': 6,
    '5': 5,
    '6': 3,
    '7': 2,
  },
  artistPlayCounts: {
    'Nova Echo': 18,
    'The Midnight Vibe': 12,
    Cyberpulse: 10,
    'Lunar Dream': 8,
  },
  genrePlayCounts: {
    Synthwave: 24,
    Electronic: 14,
    'Lo-Fi': 8,
    Ambient: 2,
  },
  dailyListeningMinutes: generateInitialDailyMinutes(),
  currentStreakDays: 5,
  lastListenedDate: getTodayString(),
  visualizerUsedCount: 2,
  hasCreatedPlaylist: true,
  achievements: INITIAL_ACHIEVEMENTS.map((a) => {
    if (a.id === 'first_song') return { ...a, current: 1, unlocked: true, unlockedAt: 'Yesterday' };
    if (a.id === 'hundred_songs') return { ...a, current: 48, unlocked: false, unlockedAt: null };
    if (a.id === 'ten_hours') return { ...a, current: 307, unlocked: false, unlockedAt: null };
    if (a.id === 'playlist_creator') return { ...a, current: 1, unlocked: true, unlockedAt: '2 days ago' };
    if (a.id === 'music_explorer') return { ...a, current: 4, unlocked: true, unlockedAt: 'Yesterday' };
    if (a.id === 'seven_day_streak') return { ...a, current: 5, unlocked: false, unlockedAt: null };
    if (a.id === 'repeat_offender') return { ...a, current: 14, unlocked: true, unlockedAt: '2 days ago' };
    if (a.id === 'audiophile') return { ...a, current: 2, unlocked: true, unlockedAt: 'Today' };
    return a;
  }),
});

// Helper to extract serializable analytics payload
const extractAnalyticsData = (state: Partial<AnalyticsState>) => ({
  totalListeningSeconds: state.totalListeningSeconds ?? 0,
  songsPlayedCount: state.songsPlayedCount ?? 0,
  listeningHistory: state.listeningHistory ?? [],
  playCounts: state.playCounts ?? {},
  artistPlayCounts: state.artistPlayCounts ?? {},
  genrePlayCounts: state.genrePlayCounts ?? {},
  dailyListeningMinutes: state.dailyListeningMinutes ?? {},
  currentStreakDays: state.currentStreakDays ?? 0,
  lastListenedDate: state.lastListenedDate ?? null,
  visualizerUsedCount: state.visualizerUsedCount ?? 0,
  hasCreatedPlaylist: state.hasCreatedPlaylist ?? false,
  achievements: state.achievements ?? [],
});

// Debounced cloud sync helper
let cloudSyncTimer: ReturnType<typeof setTimeout> | null = null;
const scheduleCloudSync = (uid: string, state: Partial<AnalyticsState>) => {
  if (!uid || uid === 'guest' || uid.startsWith('demo-')) return;
  if (cloudSyncTimer) clearTimeout(cloudSyncTimer);

  cloudSyncTimer = setTimeout(() => {
    const data = extractAnalyticsData(state);
    void syncUserAnalytics(uid, data);
  }, 2500);
};

// Immediate local persist helper
const persistLocally = (uid: string, state: Partial<AnalyticsState>) => {
  try {
    const key = getAnalyticsStorageKey(uid);
    const data = extractAnalyticsData(state);
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn('Analytics local storage persist error:', err);
  }
};

// Initial state resolution on module load
const resolveInitialState = () => {
  let initialUid = 'guest';
  try {
    const savedDemo = localStorage.getItem('melodix_demo_auth');
    if (savedDemo) {
      const parsed = JSON.parse(savedDemo);
      if (parsed?.uid) initialUid = parsed.uid;
    }
  } catch {
    // fallback
  }

  const key = getAnalyticsStorageKey(initialUid);
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        return {
          ...getDefaultAnalyticsState(initialUid),
          ...parsed,
          activeUserId: initialUid,
        };
      }
    } catch {
      // fallback below
    }
  }

  if (initialUid === 'demo-melodix-user-01' || initialUid.startsWith('demo-')) {
    const demo = getDemoAnalyticsState(initialUid);
    persistLocally(initialUid, demo);
    return demo;
  }

  return getDefaultAnalyticsState(initialUid);
};

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  ...resolveInitialState(),

  // Load or switch data for a specific user
  loadUserData: async (uid?: string) => {
    const targetUid = uid || useAuthStore.getState().user?.uid || 'guest';
    const currentUid = get().activeUserId;

    // Flush current user's state before switching
    if (currentUid && currentUid !== targetUid) {
      persistLocally(currentUid, get());
      scheduleCloudSync(currentUid, get());
    }

    const key = getAnalyticsStorageKey(targetUid);
    const stored = localStorage.getItem(key);

    // 1. Try local storage cache
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          set({
            ...getDefaultAnalyticsState(targetUid),
            ...parsed,
            activeUserId: targetUid,
          });
          return;
        }
      } catch {
        // Continue to remote/seed
      }
    }

    // 2. Demo user seed
    if (targetUid === 'demo-melodix-user-01' || targetUid.startsWith('demo-')) {
      const demoData = getDemoAnalyticsState(targetUid);
      persistLocally(targetUid, demoData);
      set(demoData);
      return;
    }

    // 3. Supabase Cloud fetch for authenticated users
    if (targetUid !== 'guest') {
      try {
        const remoteData = await fetchUserAnalytics(targetUid);
        if (remoteData && typeof remoteData === 'object' && Object.keys(remoteData).length > 0) {
          const merged = {
            ...getDefaultAnalyticsState(targetUid),
            ...remoteData,
            activeUserId: targetUid,
          };
          persistLocally(targetUid, merged);
          set(merged);
          return;
        }
      } catch (err) {
        console.warn('Failed to load remote analytics:', err);
      }
    }

    // 4. Default fresh state for brand new user or guest
    const fresh = getDefaultAnalyticsState(targetUid);
    persistLocally(targetUid, fresh);
    set(fresh);
  },

  // Backwards-compatible alias: NEVER wipes data, safely loads user data
  resetUserData: (uid?: string) => {
    const targetUid = uid || useAuthStore.getState().user?.uid || 'guest';
    void get().loadUserData(targetUid);
  },

  // Logout handler: save user data and switch to guest cleanly
  onLogout: () => {
    const currentUid = get().activeUserId;
    if (currentUid && currentUid !== 'guest') {
      persistLocally(currentUid, get());
      scheduleCloudSync(currentUid, get());
    }
    void get().loadUserData('guest');
  },

  // Explicit user action to clear their own stats if desired
  clearAnalytics: () => {
    const uid = get().activeUserId || 'guest';
    const fresh = getDefaultAnalyticsState(uid);
    persistLocally(uid, fresh);
    scheduleCloudSync(uid, fresh);
    set(fresh);
  },

  recordPlay: (track: Track) => {
    const state = get();
    const todayStr = getTodayString();

    // 1. Update play counts
    const newPlayCounts = {
      ...state.playCounts,
      [track.id]: (state.playCounts[track.id] || 0) + 1,
    };

    const newArtistCounts = {
      ...state.artistPlayCounts,
      [track.artist]: (state.artistPlayCounts[track.artist] || 0) + 1,
    };

    const trackGenre = track.genre || 'Electronic';
    const newGenreCounts = {
      ...state.genrePlayCounts,
      [trackGenre]: (state.genrePlayCounts[trackGenre] || 0) + 1,
    };

    // 2. Update streak
    let streak = state.currentStreakDays;
    if (state.lastListenedDate !== todayStr) {
      if (state.lastListenedDate) {
        const lastDate = new Date(state.lastListenedDate);
        const today = new Date(todayStr);
        const diffDays = Math.round((today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
        if (diffDays === 1) {
          streak += 1;
        } else if (diffDays > 1) {
          streak = 1;
        }
      } else {
        streak = 1;
      }
    }

    // 3. Update history
    const newHistoryEntry: ListeningHistoryEntry = {
      id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      genre: trackGenre,
      coverUrl: track.coverUrl,
      timestamp: Date.now(),
      duration: track.duration,
    };

    const updatedHistory = [newHistoryEntry, ...state.listeningHistory.slice(0, 49)];
    const totalSongsPlayed = state.songsPlayedCount + 1;

    // 4. Update achievements progress & check unlocks
    const distinctGenresCount = Object.keys(newGenreCounts).length;
    const maxSingleTrackPlays = Math.max(...Object.values(newPlayCounts), 0);

    const updatedAchievements = state.achievements.map((ach) => {
      let current = ach.current;
      if (ach.id === 'first_song') current = Math.min(ach.target, totalSongsPlayed);
      if (ach.id === 'hundred_songs') current = Math.min(ach.target, totalSongsPlayed);
      if (ach.id === 'music_explorer') current = Math.min(ach.target, distinctGenresCount);
      if (ach.id === 'seven_day_streak') current = Math.min(ach.target, streak);
      if (ach.id === 'repeat_offender') current = Math.min(ach.target, maxSingleTrackPlays);

      const isUnlocked = ach.unlocked || current >= ach.target;
      return {
        ...ach,
        current,
        unlocked: isUnlocked,
        unlockedAt: !ach.unlocked && isUnlocked ? 'Just now' : ach.unlockedAt,
      };
    });

    const nextState = {
      songsPlayedCount: totalSongsPlayed,
      playCounts: newPlayCounts,
      artistPlayCounts: newArtistCounts,
      genrePlayCounts: newGenreCounts,
      listeningHistory: updatedHistory,
      currentStreakDays: streak,
      lastListenedDate: todayStr,
      achievements: updatedAchievements,
    };

    set(nextState);

    // Persist immediately
    persistLocally(state.activeUserId, { ...state, ...nextState });
    scheduleCloudSync(state.activeUserId, { ...state, ...nextState });
  },

  recordListeningTime: (seconds: number) => {
    if (seconds <= 0) return;
    const state = get();
    const todayStr = getTodayString();

    const newTotalSeconds = state.totalListeningSeconds + seconds;
    const currentDailyMins = state.dailyListeningMinutes[todayStr] || 0;
    const addedMins = seconds / 60;

    const updatedDailyMinutes = {
      ...state.dailyListeningMinutes,
      [todayStr]: Math.round((currentDailyMins + addedMins) * 10) / 10,
    };

    const totalMinutes = Math.floor(newTotalSeconds / 60);

    // Check 10 hours achievement
    const updatedAchievements = state.achievements.map((ach) => {
      if (ach.id === 'ten_hours') {
        const current = Math.min(ach.target, totalMinutes);
        const isUnlocked = ach.unlocked || current >= ach.target;
        return {
          ...ach,
          current,
          unlocked: isUnlocked,
          unlockedAt: !ach.unlocked && isUnlocked ? 'Just now' : ach.unlockedAt,
        };
      }
      return ach;
    });

    const nextState = {
      totalListeningSeconds: newTotalSeconds,
      dailyListeningMinutes: updatedDailyMinutes,
      achievements: updatedAchievements,
    };

    set(nextState);

    persistLocally(state.activeUserId, { ...state, ...nextState });
    scheduleCloudSync(state.activeUserId, { ...state, ...nextState });
  },

  recordVisualizerUsed: () => {
    const state = get();
    const updatedAchievements = state.achievements.map((ach) => {
      if (ach.id === 'audiophile') {
        return {
          ...ach,
          current: 1,
          unlocked: true,
          unlockedAt: ach.unlocked ? ach.unlockedAt : 'Just now',
        };
      }
      return ach;
    });

    const nextState = {
      visualizerUsedCount: state.visualizerUsedCount + 1,
      achievements: updatedAchievements,
    };

    set(nextState);
    persistLocally(state.activeUserId, { ...state, ...nextState });
    scheduleCloudSync(state.activeUserId, { ...state, ...nextState });
  },

  recordPlaylistCreated: () => {
    const state = get();
    const updatedAchievements = state.achievements.map((ach) => {
      if (ach.id === 'playlist_creator') {
        return {
          ...ach,
          current: 1,
          unlocked: true,
          unlockedAt: ach.unlocked ? ach.unlockedAt : 'Just now',
        };
      }
      return ach;
    });

    const nextState = {
      hasCreatedPlaylist: true,
      achievements: updatedAchievements,
    };

    set(nextState);
    persistLocally(state.activeUserId, { ...state, ...nextState });
    scheduleCloudSync(state.activeUserId, { ...state, ...nextState });
  },

  getTopSong: () => {
    const { playCounts, listeningHistory } = get();
    let topId: string | null = null;
    let maxCount = -1;

    for (const [id, count] of Object.entries(playCounts)) {
      if (count > maxCount) {
        maxCount = count;
        topId = id;
      }
    }

    if (!topId) return null;

    // Check demo catalog
    const foundDemo = tracks.find((t) => t.id === topId || t.id === `t${topId}`);
    if (foundDemo) return { track: foundDemo, count: Math.max(1, maxCount) };

    // Check admin songs
    const adminSongs = useAdminStore.getState().songs || [];
    const foundAdmin = adminSongs.find((t) => t.id === topId);
    if (foundAdmin) return { track: foundAdmin, count: Math.max(1, maxCount) };

    // Check listening history for metadata
    const hist = listeningHistory.find((h) => h.trackId === topId);
    if (hist) {
      const synthesizedTrack: Track = {
        id: hist.trackId,
        title: hist.title,
        artist: hist.artist,
        artistId: 'art-1',
        genre: hist.genre,
        coverUrl: hist.coverUrl,
        duration: hist.duration,
        audioUrl: '',
        album: 'Single',
        albumId: 'al-1',
        playCount: maxCount,
        liked: false,
        year: new Date().getFullYear(),
      };
      return { track: synthesizedTrack, count: Math.max(1, maxCount) };
    }

    return { track: tracks[0], count: Math.max(1, maxCount) };
  },

  getTopArtist: () => {
    const { artistPlayCounts } = get();
    let topArtist: string | null = null;
    let maxCount = -1;

    for (const [artist, count] of Object.entries(artistPlayCounts)) {
      if (count > maxCount) {
        maxCount = count;
        topArtist = artist;
      }
    }

    if (!topArtist) return null;
    return { artist: topArtist, count: maxCount };
  },

  getTopGenre: () => {
    const { genrePlayCounts } = get();
    let topGenre: string | null = null;
    let maxCount = -1;
    let total = 0;

    for (const [genre, count] of Object.entries(genrePlayCounts)) {
      total += count;
      if (count > maxCount) {
        maxCount = count;
        topGenre = genre;
      }
    }

    if (!topGenre || total === 0) return null;
    const percentage = Math.round((maxCount / total) * 100);
    return { genre: topGenre, count: maxCount, percentage };
  },

  getWeeklyListening: () => {
    const { dailyListeningMinutes } = get();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result: { day: string; minutes: number; date: string }[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = days[d.getDay()];
      const minutes = Math.round(dailyListeningMinutes[dateStr] || 0);
      result.push({ day: dayName, minutes, date: dateStr });
    }

    return result;
  },

  getMonthlyTotalHours: () => {
    const { dailyListeningMinutes } = get();
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let totalMinutes = 0;
    for (const [dateStr, mins] of Object.entries(dailyListeningMinutes)) {
      if (dateStr.startsWith(currentYearMonth)) {
        totalMinutes += mins;
      }
    }

    return Math.round((totalMinutes / 60) * 10) / 10;
  },
}));
