import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Volume2, VolumeX, Heart, Minimize2, ListMusic, Mic2, Share2,
  Moon, Activity, ChevronDown, RotateCcw, RotateCw, Disc
} from 'lucide-react';
import { usePlayerStore } from '@/store/playerStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useUIStore } from '@/store/uiStore';
import { AudioVisualizer, type VisualizerMode } from '@/components/ui/AudioVisualizer';
import { SleepTimerModal } from '@/components/ui/SleepTimerModal';
import { ShareModal } from '@/components/ui/ShareModal';
import { formatDuration } from '@/utils/cn';
import { cn } from '@/utils/cn';

export function FullscreenPlayer() {
  const { isFullscreen, setFullscreen, toggleQueue, addToast } = useUIStore();
  const {
    currentTrack, isPlaying, volume, isMuted, progress, duration,
    shuffle, repeat, togglePlay, next, prev, seek, setVolume,
    toggleMute, toggleShuffle, cycleRepeat, toggleLike, currentTime,
    sleepTimerOption, sleepTimerRemaining, queue
  } = usePlayerStore();

  const isLiked = useLibraryStore((s) => currentTrack ? s.likedSongIds.includes(currentTrack.id) : false);

  const [activeTab, setActiveTab] = useState<'artwork' | 'lyrics'>('artwork');
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode | 'off'>('bars');
  const [isSleepModalOpen, setIsSleepModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAutoScroll, setIsAutoScroll] = useState(true);

  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);
  const activeLyricRef = useRef<HTMLDivElement | null>(null);
  const userScrollingTimeoutRef = useRef<number | null>(null);

  const lyrics = currentTrack?.lyrics || [
    { time: 0, text: '♪ Instrumental Prelude ♪' },
    { time: 14, text: 'Drifting into the celestial sky' },
    { time: 28, text: 'Electric waves that rise and sigh' },
    { time: 42, text: 'Can you feel the pulse tonight?' },
    { time: 56, text: 'Boundless in this velvet light' },
    { time: 72, text: 'Bassline echoing in the deep' },
    { time: 88, text: 'Promises we swore to keep' },
    { time: 104, text: '♪ Melodic Break ♪' },
    { time: 124, text: 'Nothing left to hide away' },
    { time: 144, text: 'Living for another day' },
  ];

  // Find index of current active lyric line
  let activeLyricIndex = 0;
  for (let i = 0; i < lyrics.length; i++) {
    if (currentTime >= lyrics[i].time) {
      activeLyricIndex = i;
    }
  }

  // Smooth auto-scroll to current lyric line
  useEffect(() => {
    if (isAutoScroll && activeLyricRef.current && activeTab === 'lyrics') {
      activeLyricRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLyricIndex, isAutoScroll, activeTab]);

  // Handle manual scroll detection
  const handleUserScroll = () => {
    // When user manually scrolls, temporarily pause aggressive centering if auto-scroll is on
    if (userScrollingTimeoutRef.current) {
      window.clearTimeout(userScrollingTimeoutRef.current);
    }
  };

  const progressPercent = Math.min(100, Math.max(0, progress * 100));
  const volumePercent = isMuted ? 0 : volume * 100;

  const cycleVisualizer = () => {
    if (visualizerMode === 'bars') setVisualizerMode('waveform');
    else if (visualizerMode === 'waveform') setVisualizerMode('spectrum');
    else if (visualizerMode === 'spectrum') setVisualizerMode('off');
    else setVisualizerMode('bars');
  };

  const seekBackward = () => {
    const target = Math.max(0, currentTime - 10);
    seek(target / (duration || 200));
  };

  const seekForward = () => {
    const target = Math.min(duration || 200, currentTime + 10);
    seek(target / (duration || 200));
  };

  const handleLike = () => {
    if (currentTrack) {
      toggleLike(currentTrack.id);
      addToast(currentTrack.liked ? 'Removed from Liked Songs' : 'Added to Liked Songs', 'success');
    }
  };

  return (
    <AnimatePresence>
      {isFullscreen && currentTrack && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed inset-0 z-50 bg-[#06060e] flex flex-col justify-between p-4 sm:p-6 md:p-8 overflow-hidden select-none"
        >
          {/* Animated Background Effects Based on Album Artwork */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Ambient Blob 1 */}
            <div
              className={cn(
                'absolute -top-32 -left-32 w-[550px] h-[550px] rounded-full filter blur-[140px] transition-all duration-1000 animate-float-ambient',
                isPlaying ? 'opacity-40 bg-violet-600' : 'opacity-15 bg-violet-900'
              )}
            />
            {/* Ambient Blob 2 */}
            <div
              className={cn(
                'absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full filter blur-[160px] transition-all duration-1000 animate-float-ambient',
                isPlaying ? 'opacity-35 bg-pink-600' : 'opacity-15 bg-pink-950'
              )}
              style={{ animationDelay: '-6s' }}
            />
            {/* Ambient Center Glow */}
            <div
              className={cn(
                'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full filter blur-[180px] transition-all duration-1000',
                isPlaying ? 'opacity-25 bg-cyan-600' : 'opacity-10 bg-indigo-950'
              )}
              style={{ animationDelay: '-12s' }}
            />
            {/* Subtle dark vignette overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
          </div>

          {/* Top Bar Navigation */}
          <div className="relative z-10 flex items-center justify-between max-w-5xl mx-auto w-full">
            <button
              onClick={() => setFullscreen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5 transition-all"
              title="Close Fullscreen (Esc)"
            >
              <ChevronDown size={18} />
              <span className="text-xs font-semibold uppercase tracking-wider hidden sm:inline">Minimize</span>
            </button>

            {/* Middle Badge / View Switcher */}
            <div className="flex items-center bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-md">
              <button
                onClick={() => setActiveTab('artwork')}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all',
                  activeTab === 'artwork'
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                    : 'text-white/50 hover:text-white'
                )}
              >
                <Disc size={14} />
                <span>Player</span>
              </button>
              <button
                onClick={() => setActiveTab('lyrics')}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all',
                  activeTab === 'lyrics'
                    ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30'
                    : 'text-white/50 hover:text-white'
                )}
              >
                <Mic2 size={14} />
                <span>Lyrics</span>
              </button>
            </div>

            {/* Top Right Quick Controls */}
            <div className="flex items-center gap-2">
              {/* Visualizer Mode Toggle */}
              <button
                onClick={cycleVisualizer}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all',
                  visualizerMode !== 'off'
                    ? 'bg-violet-600/20 border-violet-500/40 text-violet-300'
                    : 'bg-white/5 border-white/5 text-white/40 hover:text-white'
                )}
                title={`Visualizer: ${visualizerMode}`}
              >
                <Activity size={15} />
                <span className="capitalize hidden md:inline">{visualizerMode}</span>
              </button>

              {/* Sleep Timer Indicator */}
              <button
                onClick={() => setIsSleepModalOpen(true)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all',
                  sleepTimerOption
                    ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'
                    : 'bg-white/5 border-white/5 text-white/40 hover:text-white'
                )}
                title="Sleep Timer"
              >
                <Moon size={15} />
                {sleepTimerOption && (
                  <span className="tabular-nums font-mono text-[11px]">
                    {sleepTimerOption === 'end_of_song' ? 'End of song' : formatDuration(sleepTimerRemaining || 0)}
                  </span>
                )}
              </button>

              <button
                onClick={() => setFullscreen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5 transition-colors sm:hidden"
                title="Close"
              >
                <Minimize2 size={16} />
              </button>
            </div>
          </div>

          {/* Center Area: Large Artwork with Rotation & Glow, OR Fullscreen Lyrics */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-2 max-w-3xl mx-auto w-full overflow-hidden">
            {activeTab === 'artwork' ? (
              <div className="flex flex-col items-center justify-center w-full max-w-md text-center">
                {/* Center: Large Album Artwork with Smooth Rotation, Glow & Blur */}
                <div className="relative flex items-center justify-center mb-6">
                  {/* Dynamic Multi-layered Ambient Glow */}
                  <div
                    className={cn(
                      'absolute w-64 h-64 sm:w-72 sm:h-72 rounded-full filter blur-3xl transition-all duration-700 pointer-events-none',
                      isPlaying
                        ? 'opacity-70 scale-110 bg-gradient-to-tr from-violet-600 via-pink-600 to-cyan-400'
                        : 'opacity-20 scale-95 bg-violet-900'
                    )}
                  />

                  {/* Album Cover Container */}
                  <div
                    className={cn(
                      'relative w-56 h-56 sm:w-72 sm:h-72 md:w-80 md:h-80 rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 border border-white/10',
                      isPlaying ? 'ring-4 ring-violet-500/30 scale-100' : 'ring-1 ring-white/10 scale-95'
                    )}
                    style={{
                      boxShadow: isPlaying
                        ? '0 25px 60px -12px rgba(0,0,0,0.8), 0 0 50px rgba(124, 58, 237, 0.3)'
                        : '0 15px 35px -10px rgba(0,0,0,0.7)',
                    }}
                  >
                    <img
                      src={currentTrack.coverUrl}
                      alt={currentTrack.title}
                      className={cn(
                        'w-full h-full object-cover spin-continuous transition-opacity',
                        isPlaying ? 'spin-running' : 'spin-paused'
                      )}
                    />
                    {/* Vinyl Groove Overlay */}
                    <div className="absolute inset-0 rounded-3xl pointer-events-none border border-white/10 bg-gradient-to-tr from-black/20 via-transparent to-white/10" />
                  </div>
                </div>

                {/* Below Artwork: Song Title & Artist */}
                <div className="w-full px-4 mb-3">
                  <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight truncate">
                    {currentTrack.title}
                  </h1>
                  <p className="text-base sm:text-lg text-white/70 font-medium mt-1 truncate">
                    {currentTrack.artist}
                  </p>
                  <p className="text-xs text-white/40 mt-1">
                    {currentTrack.album} • {currentTrack.genre}
                  </p>
                </div>

                {/* Real-time Audio Visualizer Display */}
                {visualizerMode !== 'off' && (
                  <div className="w-full max-w-sm px-4 py-2 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-sm shadow-inner">
                    <AudioVisualizer mode={visualizerMode} height={42} />
                  </div>
                )}
              </div>
            ) : (
              /* Fullscreen Synchronized Lyrics Mode */
              <div className="w-full max-w-2xl h-full flex flex-col justify-between py-2 overflow-hidden">
                <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs text-white/50 px-2">
                  <div className="flex items-center gap-2">
                    <img
                      src={currentTrack.coverUrl}
                      alt=""
                      className="w-7 h-7 rounded-lg object-cover"
                    />
                    <div className="text-left">
                      <p className="font-semibold text-white truncate max-w-[180px]">{currentTrack.title}</p>
                      <p className="text-[10px] text-white/40">{currentTrack.artist}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsAutoScroll(!isAutoScroll)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                      isAutoScroll
                        ? 'bg-violet-600/30 border-violet-500/40 text-violet-300'
                        : 'bg-white/5 border-white/5 text-white/40'
                    )}
                  >
                    Auto-Scroll: {isAutoScroll ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Scrollable lyrics list with click-to-seek and manual scroll */}
                <div
                  ref={lyricsContainerRef}
                  onScroll={handleUserScroll}
                  className="flex-1 overflow-y-auto space-y-6 text-center py-10 no-scrollbar"
                >
                  {lyrics.map((line, idx) => {
                    const isActive = idx === activeLyricIndex;
                    const isPast = idx < activeLyricIndex;

                    return (
                      <div
                        key={idx}
                        ref={isActive ? activeLyricRef : null}
                        onClick={() => seek(line.time / (duration || 200))}
                        className={cn(
                          'cursor-pointer py-2.5 px-6 rounded-2xl transition-all duration-300 transform',
                          isActive
                            ? 'text-white text-2xl sm:text-3xl md:text-4xl font-black scale-105 bg-white/10 shadow-2xl'
                            : isPast
                            ? 'text-white/40 text-lg sm:text-xl font-medium hover:text-white/70'
                            : 'text-white/20 text-lg sm:text-xl font-normal hover:text-white/50'
                        )}
                      >
                        <p className="leading-relaxed">{line.text}</p>
                        {isActive && (
                          <div className="w-12 h-1 bg-gradient-to-r from-violet-500 to-pink-500 rounded-full mx-auto mt-2" />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="text-center text-[11px] text-white/30 pt-2 border-t border-white/5">
                  Click any line to seek • Auto-scroll smoothly tracks audio
                </div>
              </div>
            )}
          </div>

          {/* Below: Progress Bar, Playback Controls & Additional Controls */}
          <div className="relative z-10 max-w-2xl mx-auto w-full flex flex-col gap-4">
            {/* Progress bar with scrubber */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/50 w-10 text-right tabular-nums">
                {formatDuration(currentTime)}
              </span>

              <div className="flex-1 relative group cursor-pointer py-2">
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden group-hover:h-2 transition-all">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 via-pink-500 to-rose-400 rounded-full"
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

              <span className="text-xs text-white/50 w-10 tabular-nums">
                {formatDuration(duration)}
              </span>
            </div>

            {/* Playback Controls (Previous, Seek -10s, Play/Pause, Seek +10s, Next) */}
            <div className="flex items-center justify-center gap-4 sm:gap-6">
              <button
                onClick={seekBackward}
                className="p-2 text-white/50 hover:text-white transition-all hover:scale-110 active:scale-95"
                title="Rewind 10s"
              >
                <RotateCcw size={20} />
              </button>

              <button
                onClick={prev}
                className="p-3 text-white/80 hover:text-white transition-all hover:scale-110 active:scale-95"
                title="Previous Track"
              >
                <SkipBack size={26} fill="currentColor" />
              </button>

              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:shadow-violet-500/40 transition-shadow"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause size={28} fill="black" />
                ) : (
                  <Play size={28} fill="black" className="ml-1" />
                )}
              </motion.button>

              <button
                onClick={next}
                className="p-3 text-white/80 hover:text-white transition-all hover:scale-110 active:scale-95"
                title="Next Track"
              >
                <SkipForward size={26} fill="currentColor" />
              </button>

              <button
                onClick={seekForward}
                className="p-2 text-white/50 hover:text-white transition-all hover:scale-110 active:scale-95"
                title="Fast-forward 10s"
              >
                <RotateCw size={20} />
              </button>
            </div>

            {/* Additional Controls Bar (Like, Shuffle, Repeat, Queue, Lyrics, Share) */}
            <div className="flex items-center justify-between px-2 pt-1 border-t border-white/5">
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Like */}
                <button
                  onClick={handleLike}
                  className={cn(
                    'p-2.5 rounded-xl transition-all hover:scale-110',
                    currentTrack.liked ? 'text-pink-500 bg-pink-500/10' : 'text-white/40 hover:text-white'
                  )}
                  title={currentTrack.liked ? 'Liked' : 'Like'}
                >
                  <Heart size={18} className={cn(currentTrack.liked && 'fill-pink-500')} />
                </button>

                {/* Shuffle */}
                <button
                  onClick={toggleShuffle}
                  className={cn(
                    'p-2.5 rounded-xl transition-all hover:scale-110',
                    shuffle ? 'text-violet-400 bg-violet-500/10' : 'text-white/40 hover:text-white'
                  )}
                  title={shuffle ? 'Shuffle: ON' : 'Shuffle: OFF'}
                >
                  <Shuffle size={18} />
                </button>

                {/* Repeat */}
                <button
                  onClick={cycleRepeat}
                  className={cn(
                    'p-2.5 rounded-xl transition-all hover:scale-110',
                    repeat !== 'none' ? 'text-violet-400 bg-violet-500/10' : 'text-white/40 hover:text-white'
                  )}
                  title={`Repeat: ${repeat}`}
                >
                  {repeat === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
                </button>
              </div>

              {/* Center/Right Additional Controls */}
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Lyrics */}
                <button
                  onClick={() => setActiveTab(activeTab === 'lyrics' ? 'artwork' : 'lyrics')}
                  className={cn(
                    'p-2.5 rounded-xl transition-all hover:scale-110',
                    activeTab === 'lyrics' ? 'text-pink-400 bg-pink-500/20' : 'text-white/40 hover:text-white'
                  )}
                  title="Lyrics"
                >
                  <Mic2 size={18} />
                </button>

                {/* Queue */}
                <button
                  onClick={toggleQueue}
                  className="p-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all hover:scale-110 relative"
                  title="Queue"
                >
                  <ListMusic size={18} />
                  {queue.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-violet-600 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                      {queue.length > 9 ? '9+' : queue.length}
                    </span>
                  )}
                </button>

                {/* Share */}
                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="p-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all hover:scale-110"
                  title="Share"
                >
                  <Share2 size={18} />
                </button>

                {/* Volume Slider (Inline on desktop) */}
                <div className="hidden sm:flex items-center gap-2 ml-2 pl-2 border-l border-white/10">
                  <button
                    onClick={toggleMute}
                    className="text-white/50 hover:text-white transition-colors"
                  >
                    {isMuted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
                  </button>
                  <div className="w-16 relative group py-2">
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white/70 group-hover:bg-white transition-colors"
                        style={{ width: `${volumePercent}%` }}
                      />
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
                </div>
              </div>
            </div>
          </div>

          {/* Sleep Timer & Share Modals */}
          <SleepTimerModal
            isOpen={isSleepModalOpen}
            onClose={() => setIsSleepModalOpen(false)}
          />
          <ShareModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            track={currentTrack}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
