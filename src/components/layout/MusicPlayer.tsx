import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Volume2, VolumeX, Heart, ListMusic, Maximize2, Mic2, Loader2,
  Share2, Moon
} from 'lucide-react';
import { usePlayerStore } from '@/store/playerStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useUIStore } from '@/store/uiStore';
import { SleepTimerModal } from '@/components/ui/SleepTimerModal';
import { ShareModal } from '@/components/ui/ShareModal';
import { formatDuration } from '@/utils/cn';
import { cn } from '@/utils/cn';

function EQBars() {
  return (
    <div className="flex items-end gap-[2px] h-3.5 bg-black/50 backdrop-blur-sm p-1 rounded">
      <span className="eq-bar w-[2px] bg-violet-400" />
      <span className="eq-bar w-[2px] bg-violet-400" />
      <span className="eq-bar w-[2px] bg-violet-400" />
      <span className="eq-bar w-[2px] bg-violet-400" />
    </div>
  );
}

export function MusicPlayer() {
  const {
    currentTrack, isPlaying, isLoading, volume, isMuted, progress, currentTime, duration,
    queue, shuffle, repeat, togglePlay, next, prev, seek, setVolume,
    toggleMute, toggleShuffle, cycleRepeat, toggleLike,
    sleepTimerOption, sleepTimerRemaining
  } = usePlayerStore();

  const isLiked = useLibraryStore((s) => currentTrack ? s.likedSongIds.includes(currentTrack.id) : false);

  const {
    isQueueOpen, toggleQueue,
    isLyricsOpen, toggleLyrics,
    toggleFullscreen,
    addToast
  } = useUIStore();

  const [isSleepOpen, setIsSleepOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  if (!currentTrack) return null;

  const progressPercent = Math.min(100, Math.max(0, progress * 100));
  const volumePercent = isMuted ? 0 : volume * 100;

  // Count upcoming tracks
  const currentIdx = queue.findIndex((t) => t.id === currentTrack.id);
  const upcomingCount = currentIdx >= 0 ? queue.length - 1 - currentIdx : queue.length;

  const handleLike = () => {
    toggleLike(currentTrack.id);
    addToast(isLiked ? 'Removed from favorites' : 'Added to favorites', 'success');
  };

  return (
    <div
      className="hidden md:flex items-center gap-5 px-6 py-3 glass-dark border-t border-white/5 flex-shrink-0 relative z-30"
      style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.6)' }}
    >
      {/* 1. Track info (Left) */}
      <div className="flex items-center gap-3.5 w-60 min-w-0">
        <div className="relative flex-shrink-0 cursor-pointer" onClick={toggleFullscreen} title="Click for fullscreen">
          <motion.div
            animate={{ rotate: isPlaying ? 360 : 0 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-violet-500/30 shadow-md"
          >
            <img src={currentTrack.coverUrl} alt={currentTrack.album} className="w-full h-full object-cover" />
          </motion.div>
          {isPlaying && (
            <div className="absolute -bottom-1 -right-1">
              <EQBars />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p
            onClick={toggleFullscreen}
            className="text-sm font-semibold text-white truncate hover:text-violet-300 transition-colors cursor-pointer"
          >
            {currentTrack.title}
          </p>
          <p className="text-xs text-white/50 truncate hover:text-white/80 transition-colors cursor-pointer">
            {currentTrack.artist}
          </p>
        </div>

        <button
          onClick={handleLike}
          className="flex-shrink-0 p-2 hover:bg-white/10 rounded-xl transition-all"
          title={isLiked ? 'Liked' : 'Like'}
        >
          <Heart
            size={16}
            className={cn('transition-all', isLiked ? 'fill-violet-400 text-violet-400 scale-110' : 'text-white/40 hover:text-white')}
          />
        </button>
      </div>

      {/* 2. Center controls (Center) */}
      <div className="flex-1 flex flex-col items-center gap-1.5 max-w-2xl">
        {/* Buttons */}
        <div className="flex items-center gap-5">
          <button
            onClick={toggleShuffle}
            className={cn(
              'p-1.5 rounded-lg transition-all hover:scale-110',
              shuffle ? 'text-violet-400 bg-violet-500/10' : 'text-white/40 hover:text-white'
            )}
            title={shuffle ? 'Shuffle enabled' : 'Shuffle disabled'}
          >
            <Shuffle size={16} />
          </button>

          <button
            onClick={prev}
            className="text-white/70 hover:text-white transition-all hover:scale-110 active:scale-95"
            title="Previous (P)"
          >
            <SkipBack size={20} fill="currentColor" />
          </button>

          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={togglePlay}
            disabled={isLoading}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg hover:shadow-violet-500/30 transition-all text-black"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Loader2 size={18} className="animate-spin text-black" />
                </motion.div>
              ) : isPlaying ? (
                <motion.div key="pause" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Pause size={18} fill="black" />
                </motion.div>
              ) : (
                <motion.div key="play" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Play size={18} fill="black" className="ml-0.5" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          <button
            onClick={next}
            className="text-white/70 hover:text-white transition-all hover:scale-110 active:scale-95"
            title="Next (N)"
          >
            <SkipForward size={20} fill="currentColor" />
          </button>

          <button
            onClick={cycleRepeat}
            className={cn(
              'p-1.5 rounded-lg transition-all hover:scale-110 relative',
              repeat !== 'none' ? 'text-violet-400 bg-violet-500/10' : 'text-white/40 hover:text-white'
            )}
            title={`Repeat mode: ${repeat}`}
          >
            {repeat === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full flex items-center gap-3">
          <span className="text-xs text-white/40 w-11 text-right tabular-nums">
            {formatDuration(currentTime)}
          </span>

          <div className="flex-1 relative group cursor-pointer py-1.5">
            <div className="h-1 bg-white/10 rounded-full overflow-hidden group-hover:h-1.5 transition-all">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 via-pink-500 to-rose-400"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={progressPercent}
              onChange={(e) => seek(Number(e.target.value) / 100)}
              className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
            />
          </div>

          <span className="text-xs text-white/40 w-11 tabular-nums">
            {formatDuration(duration)}
          </span>
        </div>
      </div>

      {/* 3. Right side controls (Volume, Sleep, Share, Lyrics, Queue, Fullscreen) */}
      <div className="flex items-center gap-2 w-72 justify-end">
        {/* Volume */}
        <button
          onClick={toggleMute}
          className="text-white/50 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
          title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
        >
          {isMuted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>

        <div className="w-16 relative group py-2">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden group-hover:h-1.5 transition-all">
            <div className="h-full rounded-full bg-white/70 group-hover:bg-white transition-colors" style={{ width: `${volumePercent}%` }} />
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={volumePercent}
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
            className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
          />
        </div>

        <div className="h-4 w-[1px] bg-white/10 mx-0.5" />

        {/* Sleep Timer */}
        <button
          onClick={() => setIsSleepOpen(true)}
          className={cn(
            'p-2 rounded-xl transition-all hover:scale-105',
            sleepTimerOption ? 'bg-purple-600/20 text-purple-300' : 'text-white/40 hover:text-white hover:bg-white/5'
          )}
          title={sleepTimerOption ? `Sleep timer: ${sleepTimerOption}` : 'Sleep timer'}
        >
          <Moon size={15} />
        </button>

        {/* Share */}
        <button
          onClick={() => setIsShareOpen(true)}
          className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all hover:scale-105"
          title="Share song"
        >
          <Share2 size={15} />
        </button>

        {/* Lyrics */}
        <button
          onClick={toggleLyrics}
          className={cn(
            'p-2 rounded-xl transition-all hover:scale-105',
            isLyricsOpen ? 'bg-pink-500/20 text-pink-400' : 'text-white/40 hover:text-white hover:bg-white/5'
          )}
          title="Lyrics"
        >
          <Mic2 size={16} />
        </button>

        {/* Queue with badge */}
        <button
          onClick={toggleQueue}
          className={cn(
            'p-2 rounded-xl transition-all hover:scale-105 relative',
            isQueueOpen ? 'bg-violet-500/20 text-violet-400' : 'text-white/40 hover:text-white hover:bg-white/5'
          )}
          title="Queue (Q)"
        >
          <ListMusic size={16} />
          {upcomingCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-violet-600 text-white text-[9px] font-bold flex items-center justify-center">
              {upcomingCount > 9 ? '9+' : upcomingCount}
            </span>
          )}
        </button>

        {/* Fullscreen */}
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all hover:scale-105"
          title="Fullscreen (F)"
        >
          <Maximize2 size={15} />
        </button>
      </div>

      {/* Sleep Timer and Share Modals */}
      <SleepTimerModal
        isOpen={isSleepOpen}
        onClose={() => setIsSleepOpen(false)}
      />
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        track={currentTrack}
      />
    </div>
  );
}
