/**
 * useOfflineSongs.ts
 *
 * Hook for managing offline songs, tracking real-time download progress per track,
 * querying storage statistics, and synchronizing with IndexedDB.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Track } from '@/types';
import {
  getAllOfflineSongs,
  saveSongOffline,
  deleteSongOffline,
  clearAllOfflineSongs,
  getOfflineStorageStats,
  type OfflineStorageStats,
} from '@/services/offlineStorageService';
import { useLibraryStore } from '@/store/libraryStore';
import { useUIStore } from '@/store/uiStore';

// Global map to track active downloads across components
const activeDownloads = new Map<string, number>();
const listeners = new Set<() => void>();

function notifyDownloadListeners() {
  listeners.forEach((l) => l());
}

export function useOfflineSongs() {
  const [offlineTracks, setOfflineTracks] = useState<Track[]>([]);
  const [stats, setStats] = useState<OfflineStorageStats>({ totalSongs: 0, totalBytes: 0, formattedSize: '0 B' });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [, setTick] = useState(0);

  const downloadedTrackIds = useLibraryStore((s) => s.downloadedTrackIds);
  const { addToast } = useUIStore();

  const refresh = useCallback(async () => {
    try {
      const [tracks, storageStats] = await Promise.all([
        getAllOfflineSongs(),
        getOfflineStorageStats(),
      ]);
      setOfflineTracks(tracks);
      setStats(storageStats);

      // Sync with library store IDs if needed
      const offlineIds = tracks.map((t) => t.id);
      const storeIds = useLibraryStore.getState().downloadedTrackIds;
      const missingInStore = offlineIds.filter((id) => !storeIds.includes(id));
      if (missingInStore.length > 0) {
        useLibraryStore.setState({ downloadedTrackIds: Array.from(new Set([...storeIds, ...offlineIds])) });
      }
    } catch (err) {
      console.warn('[useOfflineSongs] refresh error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const onUpdate = () => {
      setTick((t) => t + 1);
    };
    listeners.add(onUpdate);

    return () => {
      listeners.delete(onUpdate);
    };
  }, [refresh, downloadedTrackIds]);

  const downloadSong = useCallback(
    async (track: Track) => {
      if (activeDownloads.has(track.id)) return;

      activeDownloads.set(track.id, 0);
      notifyDownloadListeners();

      try {
        const result = await saveSongOffline(track, (percent) => {
          activeDownloads.set(track.id, percent);
          notifyDownloadListeners();
        });

        if (result.success) {
          useLibraryStore.getState().toggleDownload(track);
          addToast(`"${track.title}" downloaded for offline playback ✓`, 'success');
          await refresh();
        } else {
          addToast(`Download failed: ${result.error || 'Network error'}`, 'error');
        }
      } catch (err: any) {
        addToast(`Failed to download: ${err?.message || 'Error'}`, 'error');
      } finally {
        activeDownloads.delete(track.id);
        notifyDownloadListeners();
      }
    },
    [addToast, refresh]
  );

  const removeSong = useCallback(
    async (trackId: string, trackTitle?: string) => {
      try {
        await deleteSongOffline(trackId);
        // Also remove from libraryStore
        const { downloadedTrackIds } = useLibraryStore.getState();
        if (downloadedTrackIds.includes(trackId)) {
          useLibraryStore.setState({
            downloadedTrackIds: downloadedTrackIds.filter((id) => id !== trackId),
          });
        }
        addToast(trackTitle ? `Removed "${trackTitle}" from offline storage` : 'Removed from downloads', 'info');
        await refresh();
      } catch (err: any) {
        addToast(`Failed to remove: ${err?.message || 'Error'}`, 'error');
      }
    },
    [addToast, refresh]
  );

  const clearAll = useCallback(async () => {
    try {
      await clearAllOfflineSongs();
      useLibraryStore.setState({ downloadedTrackIds: [] });
      addToast('All offline downloads cleared', 'info');
      await refresh();
    } catch (err: any) {
      addToast(`Failed to clear: ${err?.message || 'Error'}`, 'error');
    }
  }, [addToast, refresh]);

  const isDownloading = useCallback((trackId: string) => activeDownloads.has(trackId), []);
  const getDownloadProgress = useCallback((trackId: string) => activeDownloads.get(trackId) ?? 0, []);

  return {
    offlineTracks,
    stats,
    isLoading,
    downloadSong,
    removeSong,
    clearAll,
    refresh,
    isDownloading,
    getDownloadProgress,
  };
}
