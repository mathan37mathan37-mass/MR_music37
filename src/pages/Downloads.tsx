/**
 * Downloads.tsx
 *
 * MR Music - Offline Music & Downloads Management
 * Full IndexedDB offline playback, real storage metrics, track search,
 * and individual / bulk offline cache management.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DownloadCloud,
  Play,
  Trash2,
  HardDrive,
  HardDriveDownload,
  Wifi,
  WifiOff,
  Search,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { MusicCard } from '@/components/ui/MusicCard';
import { useOfflineSongs } from '@/hooks/useOfflineSongs';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { usePlayerStore } from '@/store/playerStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useUIStore } from '@/store/uiStore';
import { formatTotalDuration } from '@/utils/cn';

export default function Downloads() {
  const { offlineTracks, stats, isLoading, removeSong, clearAll } = useOfflineSongs();
  const { isOnline } = useOnlineStatus();
  const { playQueue } = usePlayerStore();
  const { downloadTrackFile } = useLibraryStore();
  const { addToast } = useUIStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Filter tracks based on search query
  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return offlineTracks;
    const q = searchQuery.toLowerCase();
    return offlineTracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q) ||
        t.genre.toLowerCase().includes(q)
    );
  }, [offlineTracks, searchQuery]);

  const totalDuration = useMemo(() => {
    return offlineTracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  }, [offlineTracks]);

  const handlePlayAll = () => {
    if (offlineTracks.length === 0) return;
    playQueue(offlineTracks);
    addToast(`Playing ${offlineTracks.length} offline tracks`, 'success');
  };

  const handleSaveAllToDisk = () => {
    if (offlineTracks.length === 0) return;
    offlineTracks.forEach((t) => downloadTrackFile(t));
    addToast(`Saving ${offlineTracks.length} tracks directly to your device storage…`, 'info');
  };

  const handleConfirmClearAll = async () => {
    await clearAll();
    setShowClearConfirm(false);
  };

  return (
    <div className="px-6 py-6 pb-32 space-y-8 max-w-7xl mx-auto">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 mb-1.5 text-xs font-semibold uppercase tracking-wider">
            <DownloadCloud size={16} />
            <span>Local Offline Storage</span>
            <span
              className={`flex items-center gap-1 ml-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors ${
                isOnline
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
            >
              {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
              {isOnline ? 'Online Sync' : 'Offline Mode'}
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Downloaded Music
          </h1>
          <p className="text-white/60 text-xs sm:text-sm mt-1.5 flex items-center gap-2 flex-wrap">
            <span className="font-medium text-white/90">{stats.totalSongs} {stats.totalSongs === 1 ? 'song' : 'songs'}</span>
            <span>•</span>
            <span>{formatTotalDuration(totalDuration)}</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">{stats.formattedSize} storage used</span>
          </p>
        </div>

        {offlineTracks.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handlePlayAll}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <Play size={14} fill="white" />
              <span>Play All Offline</span>
            </button>

            <button
              onClick={handleSaveAllToDisk}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 active:scale-95 text-white/80 hover:text-white px-4 py-2.5 rounded-xl font-semibold text-xs border border-white/10 transition-all cursor-pointer"
              title="Save MP3 files directly to your device disk"
            >
              <HardDriveDownload size={14} className="text-cyan-400" />
              <span className="hidden sm:inline">Export Files</span>
            </button>

            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 active:scale-95 text-red-400 px-3.5 py-2.5 rounded-xl font-semibold text-xs border border-red-500/20 transition-all cursor-pointer"
              title="Remove all downloaded offline tracks"
            >
              <Trash2 size={13} />
              <span>Clear All</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Offline Info Alert ────────────────────────────────────────────── */}
      {!isOnline && offlineTracks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3.5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs sm:text-sm"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-400">
            <WifiOff size={18} />
          </div>
          <div>
            <p className="font-semibold text-amber-300">You are currently offline</p>
            <p className="text-amber-200/70 text-xs mt-0.5">
              MR Music is seamlessly playing your downloaded audio blobs directly from IndexedDB without network requests.
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Search & Filter Bar ───────────────────────────────────────────── */}
      {offlineTracks.length > 0 && (
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search downloaded songs, artists, albums..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
          {searchQuery && (
            <span className="text-xs text-white/40">
              Found {filteredTracks.length} of {offlineTracks.length}
            </span>
          )}
        </div>
      )}

      {/* ── Track List ────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="p-12 text-center text-white/40 text-xs">
          Loading offline storage…
        </div>
      ) : filteredTracks.length > 0 ? (
        <div className="glass-dark rounded-3xl border border-white/5 divide-y divide-white/5 overflow-hidden shadow-2xl">
          {filteredTracks.map((track, i) => (
            <div key={track.id} className="relative group">
              <MusicCard track={track} index={i} showIndex queue={filteredTracks} />
              {/* Quick remove button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void removeSong(track.id, track.title);
                }}
                className="absolute right-14 top-1/2 -translate-y-1/2 p-2 rounded-lg opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                title="Remove from offline storage"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : offlineTracks.length > 0 ? (
        <div className="p-12 text-center text-white/40 text-xs bg-white/5 rounded-2xl border border-white/5">
          No downloaded tracks match "{searchQuery}"
        </div>
      ) : (
        <div className="p-16 rounded-3xl bg-white/[0.02] border border-dashed border-white/10 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-white/30">
            <HardDrive size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">No downloaded songs yet</h3>
            <p className="text-xs text-white/40 max-w-md mx-auto leading-relaxed">
              When online, click the <strong>Download</strong> icon on any song to save it for offline playback.
              Your songs will be stored locally in browser IndexedDB so you can listen anytime without internet.
            </p>
          </div>
        </div>
      )}

      {/* ── Clear All Confirmation Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#12111f] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Clear All Offline Downloads?</h3>
                <p className="text-xs text-white/60 mt-1 leading-relaxed">
                  This will delete all <span className="text-white font-medium">{stats.totalSongs} cached audio files</span> ({stats.formattedSize}) from your local device storage.
                  Songs on the server will remain intact.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmClearAll}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-600/30 transition-all cursor-pointer"
                >
                  Yes, Clear All
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
