import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Trash2, ArrowUp, ArrowDown, Music, Sparkles, Heart } from 'lucide-react';
import { usePlayerStore } from '@/store/playerStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useUIStore } from '@/store/uiStore';
import { formatDuration } from '@/utils/cn';
import { cn } from '@/utils/cn';
import { tracks } from '@/data/demo';

export function QueueDrawer() {
  const { isQueueOpen, setQueueOpen, addToast } = useUIStore();
  const {
    currentTrack,
    currentTrackIndex,
    queue,
    isPlaying,
    playTrack,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    toggleLike,
  } = usePlayerStore();

  const isLiked = useLibraryStore((s) => currentTrack ? s.likedSongIds.includes(currentTrack.id) : false);

  if (!isQueueOpen) return null;

  // Split queue into current track and upcoming tracks using the stable queue index.
  const currentIdx = currentTrackIndex >= 0 ? currentTrackIndex : (currentTrack ? queue.findIndex((t) => t.id === currentTrack.id) : -1);
  const upcomingTracks = currentIdx >= 0 ? queue.slice(currentIdx + 1) : queue;

  const handleMoveUp = (indexInUpcoming: number) => {
    if (indexInUpcoming <= 0) return;
    const realIdx = currentIdx + 1 + indexInUpcoming;
    reorderQueue(realIdx, realIdx - 1);
  };

  const handleMoveDown = (indexInUpcoming: number) => {
    if (indexInUpcoming >= upcomingTracks.length - 1) return;
    const realIdx = currentIdx + 1 + indexInUpcoming;
    reorderQueue(realIdx, realIdx + 1);
  };

  const handleClear = () => {
    clearQueue();
    addToast('Queue cleared', 'info');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setQueueOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Drawer panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full max-w-md h-full bg-[#0d0d18]/95 border-l border-white/10 backdrop-blur-xl shadow-2xl flex flex-col z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center">
                <Music size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Playback Queue</h2>
                <p className="text-xs text-white/40">{queue.length} {queue.length === 1 ? 'song' : 'songs'} in playlist</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {upcomingTracks.length > 0 && (
                <button
                  onClick={handleClear}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 size={13} />
                  Clear
                </button>
              )}
              <button
                onClick={() => setQueueOpen(false)}
                className="w-8 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Queue Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
            {/* Section: NOW PLAYING */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-violet-400">Now Playing</span>
                {isPlaying && (
                  <span className="flex items-center gap-1 text-[11px] text-violet-300/80 bg-violet-500/10 px-2 py-0.5 rounded-full">
                    Playing live
                  </span>
                )}
              </div>

              {currentTrack ? (
                <div className="relative group flex items-center gap-3.5 p-3 rounded-2xl bg-gradient-to-r from-violet-900/30 to-purple-900/20 border border-violet-500/20">
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 shadow-md ring-2 ring-violet-500/30">
                    <img src={currentTrack.coverUrl} alt={currentTrack.title} className="w-full h-full object-cover" />
                    {isPlaying && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="flex items-end gap-[3px] h-4">
                          <span className="eq-bar h-4" />
                          <span className="eq-bar h-2" />
                          <span className="eq-bar h-3" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white truncate">{currentTrack.title}</h4>
                    <p className="text-xs text-white/60 truncate mt-0.5">{currentTrack.artist}</p>
                    <span className="text-[11px] text-white/40 mt-1 inline-block">
                      {formatDuration(currentTrack.duration)} • {currentTrack.album}
                    </span>
                  </div>

                  <button
                    onClick={() => toggleLike(currentTrack.id)}
                    className="p-2 rounded-xl hover:bg-white/10 text-white/40 hover:text-violet-400 transition-colors"
                  >
                    <Heart
                      size={18}
                      className={cn(isLiked ? 'fill-violet-400 text-violet-400' : '')}
                    />
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-white/5 text-center text-sm text-white/40">
                  No song selected
                </div>
              )}
            </div>

            {/* Section: UP NEXT */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-white/50">Up Next</span>
                <span className="text-xs text-white/40">{upcomingTracks.length} upcoming</span>
              </div>

              {upcomingTracks.length > 0 ? (
                <div className="space-y-2">
                  {upcomingTracks.map((track, idx) => (
                    <motion.div
                      key={`${track.id}-${idx}`}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all"
                    >
                      {/* Play Immediately */}
                      <button
                        onClick={() => playTrack(track)}
                        className="w-10 h-10 rounded-lg overflow-hidden relative flex-shrink-0 group/img"
                        title="Play immediately"
                      >
                        <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                          <Play size={14} fill="white" className="text-white ml-0.5" />
                        </div>
                      </button>

                      {/* Info */}
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => playTrack(track)}>
                        <h5 className="text-xs font-medium text-white truncate group-hover:text-violet-300 transition-colors">
                          {track.title}
                        </h5>
                        <p className="text-[11px] text-white/40 truncate">{track.artist}</p>
                      </div>

                      {/* Duration */}
                      <span className="text-[11px] text-white/30 tabular-nums">
                        {formatDuration(track.duration)}
                      </span>

                      {/* Reorder & Remove Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          disabled={idx === 0}
                          onClick={() => handleMoveUp(idx)}
                          className={cn(
                            'p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors',
                            idx === 0 && 'opacity-20 cursor-not-allowed'
                          )}
                          title="Move up"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          disabled={idx === upcomingTracks.length - 1}
                          onClick={() => handleMoveDown(idx)}
                          className={cn(
                            'p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors',
                            idx === upcomingTracks.length - 1 && 'opacity-20 cursor-not-allowed'
                          )}
                          title="Move down"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          onClick={() => removeFromQueue(track.id)}
                          className="p-1 rounded text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Remove from queue"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-8 rounded-2xl border border-dashed border-white/10 text-center flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/30">
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-white">Your queue is empty</h5>
                    <p className="text-xs text-white/40 mt-1 max-w-xs">
                      Add songs from Explore or choose recommendations below to keep the vibe going.
                    </p>
                  </div>
                  <div className="pt-2 flex flex-wrap justify-center gap-2">
                    {tracks.slice(4, 7).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          usePlayerStore.getState().addToQueue(t);
                          addToast(`Added "${t.title}" to queue`, 'success');
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-violet-600/30 hover:text-violet-300 border border-white/10 text-white/70 transition-all flex items-center gap-1.5"
                      >
                        + {t.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
