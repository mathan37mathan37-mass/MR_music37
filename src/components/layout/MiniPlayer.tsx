import { motion } from 'framer-motion';
import { Play, Pause, SkipForward, Heart, ListMusic } from 'lucide-react';
import { usePlayerStore } from '@/store/playerStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/utils/cn';

export function MiniPlayer() {
  const { currentTrack, isPlaying, progress, togglePlay, next, toggleLike } = usePlayerStore();
  const isLiked = useLibraryStore((s) => currentTrack ? s.likedSongIds.includes(currentTrack.id) : false);
  const { toggleQueue, toggleFullscreen } = useUIStore();

  if (!currentTrack) return null;

  const progressPercent = Math.min(100, Math.max(0, progress * 100));

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="md:hidden fixed bottom-16 left-3 right-3 z-30 glass-dark rounded-2xl border border-white/10 overflow-hidden shadow-2xl backdrop-blur-xl"
    >
      {/* Progress bar */}
      <div className="h-0.5 bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-pink-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex items-center gap-3 px-3.5 py-2.5">
        {/* Cover with spinning effect when playing */}
        <div
          className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer shadow-md"
          onClick={toggleFullscreen}
        >
          <img src={currentTrack.coverUrl} alt={currentTrack.album} className="w-full h-full object-cover" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={toggleFullscreen}>
          <p className="text-sm font-semibold text-white truncate">{currentTrack.title}</p>
          <p className="text-xs text-white/50 truncate">{currentTrack.artist}</p>
        </div>

        {/* Quick controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => toggleLike(currentTrack.id)}
            className="p-2 text-white/40 hover:text-violet-400 transition-colors"
          >
            <Heart size={16} className={cn(isLiked && 'fill-violet-400 text-violet-400')} />
          </button>

          <button
            onClick={toggleQueue}
            className="p-2 text-white/40 hover:text-white transition-colors"
          >
            <ListMusic size={17} />
          </button>

          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all ml-1"
          >
            {isPlaying ? (
              <Pause size={16} fill="black" />
            ) : (
              <Play size={16} fill="black" className="ml-0.5" />
            )}
          </button>

          <button
            onClick={next}
            className="p-2 text-white/60 hover:text-white transition-colors"
          >
            <SkipForward size={18} fill="currentColor" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
