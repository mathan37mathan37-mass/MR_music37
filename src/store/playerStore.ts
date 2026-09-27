import { create } from 'zustand';
import type { Track, RepeatMode } from '@/types';
import { tracks } from '@/data/demo';
import { isFirebaseConfigured } from '@/services/firebase';
import { audioEngine } from '@/audio/audioEngine';
import { useLibraryStore } from '@/store/libraryStore';
import { useAnalyticsStore } from '@/store/analyticsStore';

export interface PlayerState {
  currentTrack: Track | null;
  currentTrackIndex: number;
  queue: Track[];
  originalQueue: Track[];
  isPlaying: boolean;
  isLoading: boolean;
  volume: number;
  isMuted: boolean;
  progress: number; // 0 to 1
  currentTime: number; // seconds
  duration: number; // seconds
  shuffle: boolean;
  repeat: RepeatMode;
  isExpanded: boolean;

  sleepTimerOption: string | null;
  sleepTimerRemaining: number | null; // seconds
  setSleepTimer: (option: '5m' | '10m' | '15m' | '30m' | '60m' | 'end_of_song' | null) => void;

  // Actions
  playTrack: (track: Track, newQueue?: Track[]) => void;
  playQueue: (queue: Track[], startIndex?: number) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (progress: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (track: Track) => void;
  playNext: (track: Track) => void;
  removeFromQueue: (trackId: string) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
  playQueueIndex: (index: number) => void;
  toggleLike: (trackId?: string) => void;
  setExpanded: (expanded: boolean) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => {
  let lastRecordedSec = 0;

  // Initialize audio callbacks
  audioEngine.onTimeUpdate((currentTime, duration) => {
    const totalDuration = duration > 0 ? duration : (get().currentTrack?.duration || 200);
    const progress = totalDuration > 0 ? Math.min(1, Math.max(0, currentTime / totalDuration)) : 0;
    set({ currentTime, duration: totalDuration, progress });

    const currentSec = Math.floor(currentTime);
    if (currentSec > lastRecordedSec && currentSec - lastRecordedSec <= 3) {
      useAnalyticsStore.getState().recordListeningTime(currentSec - lastRecordedSec);
    }
    lastRecordedSec = currentSec;
  });

  audioEngine.onLoading((isLoading) => {
    set({ isLoading });
  });

  let sleepTimerInterval: number | null = null;

  audioEngine.onTrackEnd(() => {
    const { repeat, queue, currentTrack, sleepTimerOption } = get();

    if (sleepTimerOption === 'end_of_song') {
      audioEngine.pause();
      set({ isPlaying: false, sleepTimerOption: null, sleepTimerRemaining: null });
      return;
    }

    if (repeat === 'one') {
      audioEngine.seek(0);
      audioEngine.play();
      set({ progress: 0, currentTime: 0, isPlaying: true });
      return;
    }

    if (!currentTrack || queue.length === 0) return;
    const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);

    if (currentIndex < queue.length - 1) {
      // Play next track
      const nextTrack = queue[currentIndex + 1];
      get().playTrack(nextTrack);
    } else if (repeat === 'all' && queue.length > 0) {
      // Loop to beginning
      get().playTrack(queue[0]);
    } else {
      // End of queue
      set({ isPlaying: false, progress: 0, currentTime: 0 });
    }
  });

  const initialTrack = isFirebaseConfigured() ? null : tracks[0];
  const initialQueue = isFirebaseConfigured() ? [] : tracks.slice(0, 8);

  return {
    currentTrack: initialTrack,
    currentTrackIndex: initialTrack ? 0 : -1,
    queue: initialQueue,
    originalQueue: initialQueue,
    isPlaying: false,
    isLoading: false,
    volume: 0.8,
    isMuted: false,
    progress: 0,
    currentTime: 0,
    duration: initialTrack?.duration ?? 0,
    shuffle: false,
    repeat: 'none',
    isExpanded: false,
    sleepTimerOption: null,
    sleepTimerRemaining: null,

    setSleepTimer: (option) => {
      if (sleepTimerInterval) {
        clearInterval(sleepTimerInterval);
        sleepTimerInterval = null;
      }

      if (!option) {
        set({ sleepTimerOption: null, sleepTimerRemaining: null });
        return;
      }

      if (option === 'end_of_song') {
        set({ sleepTimerOption: 'end_of_song', sleepTimerRemaining: null });
        return;
      }

      const mins = parseInt(option.replace('m', ''), 10);
      const totalSeconds = mins * 60;
      set({ sleepTimerOption: option, sleepTimerRemaining: totalSeconds });

      sleepTimerInterval = window.setInterval(() => {
        const remaining = get().sleepTimerRemaining;
        if (remaining === null || remaining <= 1) {
          if (sleepTimerInterval) clearInterval(sleepTimerInterval);
          sleepTimerInterval = null;
          audioEngine.pause();
          set({ isPlaying: false, sleepTimerOption: null, sleepTimerRemaining: null });
        } else {
          set({ sleepTimerRemaining: remaining - 1 });
        }
      }, 1000);
    },

    playTrack: (track, newQueue) => {
      const state = get();
      let queue = state.queue;
      let currentIndex = queue.findIndex((t) => t.id === track.id);

      if (newQueue) {
        queue = [...newQueue];
        currentIndex = Math.max(0, queue.findIndex((t) => t.id === track.id));
      } else if (!queue.some((t) => t.id === track.id)) {
        queue = [track, ...queue];
        currentIndex = 0;
      }

      set({
        currentTrack: track,
        currentTrackIndex: currentIndex,
        queue,
        originalQueue: newQueue ? [...newQueue] : queue,
        isPlaying: true,
        progress: 0,
        currentTime: 0,
        duration: track.duration,
      });

      // Automatically add to Recently Played
      useLibraryStore.getState().addRecentlyPlayed(track);
      useAnalyticsStore.getState().recordPlay(track);

      // Load source – use audioUrl with graceful bundled track fallback
      const seed = parseInt(track.id.replace(/\D/g, ''), 10) || 1;
      const fallback = `/audio/track-${((seed - 1) % 16) + 1}.wav`;
      const src = track.audioUrl || fallback;
      audioEngine.setSource(src, true, seed, track.duration, track.title);
    },

    playQueue: (newQueue, startIndex = 0) => {
      if (!newQueue || newQueue.length === 0) return;
      const safeQueue = [...newQueue];
      const safeStartIndex = Math.min(Math.max(startIndex, 0), safeQueue.length - 1);
      const targetTrack = safeQueue[safeStartIndex] || safeQueue[0];
      set({
        queue: safeQueue,
        originalQueue: [...safeQueue],
        currentTrack: targetTrack,
        currentTrackIndex: safeStartIndex,
        isPlaying: true,
        progress: 0,
        currentTime: 0,
        duration: targetTrack.duration,
      });

      // Automatically add to Recently Played
      useLibraryStore.getState().addRecentlyPlayed(targetTrack);
      useAnalyticsStore.getState().recordPlay(targetTrack);

      // Load source – use audioUrl with graceful bundled track fallback
      const seed = parseInt(targetTrack.id.replace(/\D/g, ''), 10) || 1;
      const fallback = `/audio/track-${((seed - 1) % 16) + 1}.wav`;
      const src = targetTrack.audioUrl || fallback;
      audioEngine.setSource(src, true, seed, targetTrack.duration, targetTrack.title);
    },

    togglePlay: () => {
      const { isPlaying, currentTrack, currentTime } = get();
      if (!currentTrack) return;

      if (isPlaying) {
        audioEngine.pause();
        set({ isPlaying: false });
      } else {
        if (currentTime === 0) {
          const seed = parseInt(currentTrack.id.replace(/\D/g, ''), 10) || 1;
          const fallback = `/audio/track-${((seed - 1) % 16) + 1}.wav`;
          const src = currentTrack.audioUrl || fallback;
          audioEngine.setSource(src, true, seed, currentTrack.duration, currentTrack.title);
        } else {
          audioEngine.play();
        }
        set({ isPlaying: true });
      }
    },

    next: () => {
      const { queue, currentTrack, repeat, currentTrackIndex } = get();
      if (!currentTrack || queue.length === 0) return;

      const idx = currentTrackIndex >= 0 ? currentTrackIndex : queue.findIndex((t) => t.id === currentTrack.id);
      if (idx === -1) {
        get().playTrack(queue[0]);
        return;
      }

      if (idx + 1 < queue.length) {
        get().playTrack(queue[idx + 1]);
      } else if (repeat === 'all') {
        get().playTrack(queue[0]);
      } else {
        audioEngine.pause();
        audioEngine.seek(0);
        set({ isPlaying: false, progress: 0, currentTime: 0 });
      }
    },

    prev: () => {
      const { queue, currentTrack, currentTime, currentTrackIndex } = get();
      if (!currentTrack) return;

      // If more than 3 seconds into track, restart current track
      if (currentTime > 3) {
        audioEngine.seek(0);
        set({ progress: 0, currentTime: 0 });
        return;
      }

      const idx = currentTrackIndex >= 0 ? currentTrackIndex : queue.findIndex((t) => t.id === currentTrack.id);
      if (idx > 0) {
        get().playTrack(queue[idx - 1]);
      } else {
        audioEngine.seek(0);
        set({ progress: 0, currentTime: 0 });
      }
    },

    seek: (progressRatio) => {
      const { duration } = get();
      const clamped = Math.max(0, Math.min(1, progressRatio));
      const targetTime = clamped * duration;
      audioEngine.seek(targetTime);
      set({ progress: clamped, currentTime: targetTime });
    },

    setVolume: (volume) => {
      const clamped = Math.max(0, Math.min(1, volume));
      audioEngine.setVolume(clamped);
      set({ volume: clamped, isMuted: clamped === 0 ? true : false });
    },

    toggleMute: () => {
      const { isMuted, volume } = get();
      const nextMuted = !isMuted;
      audioEngine.setMuted(nextMuted);
      set({ isMuted: nextMuted, volume: nextMuted ? volume : (volume === 0 ? 0.5 : volume) });
    },

    toggleShuffle: () => {
      const { shuffle, originalQueue, queue, currentTrack, currentTrackIndex } = get();
      if (!shuffle) {
        const others = queue.filter((t) => t.id !== currentTrack?.id);
        const shuffled = currentTrack ? [currentTrack, ...others.sort(() => Math.random() - 0.5)] : queue;
        set({
          shuffle: true,
          queue: shuffled,
          currentTrackIndex: currentTrack ? 0 : -1,
        });
      } else {
        set({
          shuffle: false,
          queue: originalQueue,
          currentTrackIndex: currentTrack ? originalQueue.findIndex((t) => t.id === currentTrack.id) : -1,
        });
      }
    },

    cycleRepeat: () => {
      set((s) => ({
        repeat: s.repeat === 'none' ? 'all' : s.repeat === 'all' ? 'one' : 'none',
      }));
    },

    addToQueue: (track) => {
      set((s) => ({
        queue: [...s.queue, track],
        originalQueue: [...s.originalQueue, track],
        currentTrackIndex: s.currentTrack ? s.queue.findIndex((t) => t.id === s.currentTrack?.id) : s.currentTrackIndex,
      }));
    },

    playNext: (track) => {
      const { queue, currentTrack } = get();
      if (!currentTrack) {
        get().playTrack(track);
        return;
      }
      const filtered = queue.filter((t) => t.id !== track.id);
      const currentIdx = filtered.findIndex((t) => t.id === currentTrack.id);
      const newQueue = [...filtered];
      if (currentIdx !== -1) {
        newQueue.splice(currentIdx + 1, 0, track);
      } else {
        newQueue.unshift(track);
      }
      set({ queue: newQueue, originalQueue: newQueue });
    },

    removeFromQueue: (trackId) => {
      set((s) => {
        const nextQueue = s.queue.filter((t) => t.id !== trackId);
        const nextOriginalQueue = s.originalQueue.filter((t) => t.id !== trackId);
        const currentIndex = s.currentTrack ? nextQueue.findIndex((t) => t.id === s.currentTrack?.id) : -1;

        return {
          queue: nextQueue,
          originalQueue: nextOriginalQueue,
          currentTrackIndex: currentIndex,
        };
      });
    },

    reorderQueue: (fromIndex, toIndex) => {
      const { queue, currentTrack } = get();
      if (fromIndex < 0 || fromIndex >= queue.length || toIndex < 0 || toIndex >= queue.length) return;
      const updated = [...queue];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      const nextIndex = currentTrack ? updated.findIndex((t) => t.id === currentTrack.id) : -1;
      set({ queue: updated, originalQueue: updated, currentTrackIndex: nextIndex });
    },

    clearQueue: () => {
      const { currentTrack } = get();
      const updated = currentTrack ? [currentTrack] : [];
      set({ queue: updated, originalQueue: updated, currentTrackIndex: currentTrack ? 0 : -1 });
    },

    playQueueIndex: (index) => {
      const { queue } = get();
      if (queue[index]) {
        get().playTrack(queue[index]);
      }
    },

    toggleLike: (trackId) => {
      const targetId = trackId || get().currentTrack?.id;
      if (!targetId) return;

      useLibraryStore.getState().toggleLikeSong(targetId);

      set((s) => {
        const updateLiked = (t: Track) => (t.id === targetId ? { ...t, liked: !t.liked } : t);
        return {
          currentTrack: s.currentTrack && s.currentTrack.id === targetId
            ? { ...s.currentTrack, liked: !s.currentTrack.liked }
            : s.currentTrack,
          queue: s.queue.map(updateLiked),
          originalQueue: s.originalQueue.map(updateLiked),
        };
      });
    },

    setExpanded: (expanded) => set({ isExpanded: expanded }),
  };
});
