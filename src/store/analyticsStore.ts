import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Track } from '@/types';
import { tracks } from '@/data/demo';
import { useAuthStore } from '@/store/authStore';

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
  resetUserData: (uid?: string) => void;
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

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_song',
    title: 'First Beat',
    description: 'Play your first track on Melodix',
    icon: 'Music',
    category: 'listening',
    target: 1,
    current: 1,
    unit: 'song',
    unlocked: true,
    unlockedAt: 'Yesterday',
  },
  {
    id: 'hundred_songs',
    title: 'Century Club',
    description: 'Listen to 100 songs',
    icon: 'Award',
    category: 'listening',
    target: 100,
    current: 48,
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
    current: 345,
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
    current: 1,
    unit: 'playlist',
    unlocked: true,
    unlockedAt: '2 days ago',
  },
  {
    id: 'music_explorer',
    title: 'Sonic Pioneer',
    description: 'Listen to songs across 4 different genres',
    icon: 'Compass',
    category: 'exploration',
    target: 4,
    current: 3,
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
    current: 5,
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
    current: 5,
    unit: 'plays',
    unlocked: true,
    unlockedAt: '3 days ago',
  },
  {
    id: 'audiophile',
    title: 'Visual Symphony',
    description: 'Experience the real-time Audio Visualizer in Fullscreen',
    icon: 'Activity',
    category: 'exploration',
    target: 1,
    current: 1,
    unit: 'session',
    unlocked: true,
    unlockedAt: 'Today',
  },
];

// Generate past 7 days realistic initial seed data
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

const getAnalyticsStorageKey = (uid?: string) => `melodix-analytics-storage-${uid || 'guest'}`;

const getDefaultAnalyticsState = () => ({
  totalListeningSeconds: 0,
  songsPlayedCount: 0,
  listeningHistory: [],
  playCounts: {},
  artistPlayCounts: {},
  genrePlayCounts: {},
  dailyListeningMinutes: {},
  currentStreakDays: 0,
  lastListenedDate: null,
  visualizerUsedCount: 0,
  hasCreatedPlaylist: false,
  achievements: INITIAL_ACHIEVEMENTS.map((achievement) => ({
    ...achievement,
    current: 0,
    unlocked: false,
    unlockedAt: null,
  })),
});

export const useAnalyticsStore = create<AnalyticsState>()(
  persist(
    (set, get) => ({
      ...getDefaultAnalyticsState(),

      resetUserData: () => {
        set(getDefaultAnalyticsState());
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

        const newGenreCounts = {
          ...state.genrePlayCounts,
          [track.genre]: (state.genrePlayCounts[track.genre] || 0) + 1,
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
          genre: track.genre,
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

        set({
          songsPlayedCount: totalSongsPlayed,
          playCounts: newPlayCounts,
          artistPlayCounts: newArtistCounts,
          genrePlayCounts: newGenreCounts,
          listeningHistory: updatedHistory,
          currentStreakDays: streak,
          lastListenedDate: todayStr,
          achievements: updatedAchievements,
        });
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

        set({
          totalListeningSeconds: newTotalSeconds,
          dailyListeningMinutes: updatedDailyMinutes,
          achievements: updatedAchievements,
        });
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
        set({ visualizerUsedCount: state.visualizerUsedCount + 1, achievements: updatedAchievements });
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
        set({ hasCreatedPlaylist: true, achievements: updatedAchievements });
      },

      getTopSong: () => {
        const { playCounts } = get();
        let topId: string | null = null;
        let maxCount = -1;

        for (const [id, count] of Object.entries(playCounts)) {
          if (count > maxCount) {
            maxCount = count;
            topId = id;
          }
        }

        if (!topId) return null;
        const foundTrack = tracks.find((t) => t.id === topId || t.id === `t${topId}`) || tracks[0];
        return { track: foundTrack, count: Math.max(1, maxCount) };
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
    }),
    {
      name: 'melodix-analytics-storage',
      version: 2,
      storage: {
        getItem: () => {
          const uid = useAuthStore.getState().user?.uid;
          const key = getAnalyticsStorageKey(uid);
          const stored = localStorage.getItem(key);
          return stored ? JSON.parse(stored) : null;
        },
        setItem: (_name, value) => {
          const uid = useAuthStore.getState().user?.uid;
          localStorage.setItem(getAnalyticsStorageKey(uid), JSON.stringify(value));
        },
        removeItem: () => {
          const uid = useAuthStore.getState().user?.uid;
          localStorage.removeItem(getAnalyticsStorageKey(uid));
        },
      },
      migrate: (persistedState: any, version: number) => {
        if (version < 2 && persistedState?.playCounts) {
          const migratedCounts: Record<string, number> = {};
          for (const [key, val] of Object.entries(persistedState.playCounts)) {
            const newKey = key.startsWith('t') ? key : `t${key}`;
            migratedCounts[newKey] = (migratedCounts[newKey] || 0) + (val as number);
          }
          persistedState.playCounts = migratedCounts;
        }
        return persistedState;
      },
    }
  )
);
