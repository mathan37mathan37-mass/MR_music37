import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic2, Sparkles, Volume2, Maximize2, Minimize2 } from 'lucide-react';
import { usePlayerStore } from '@/store/playerStore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/utils/cn';

export function LyricsDrawer() {
  const { isLyricsOpen, setLyricsOpen } = useUIStore();
  const { currentTrack, currentTime, isPlaying, seek, duration } = usePlayerStore();
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [isFullscreenLyrics, setIsFullscreenLyrics] = useState(false);
  const activeLineRef = useRef<HTMLDivElement | null>(null);

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

  // Find the index of the currently active lyric
  let activeIndex = 0;
  for (let i = 0; i < lyrics.length; i++) {
    if (currentTime >= lyrics[i].time) {
      activeIndex = i;
    }
  }

  // Auto-scroll to active line smoothly when enabled
  useEffect(() => {
    if (isAutoScroll && activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex, isAutoScroll]);

  return (
    <AnimatePresence>
      {isLyricsOpen && currentTrack && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLyricsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Lyrics Panel (Drawer or Fullscreen Modal) */}
          <motion.div
            initial={{ x: isFullscreenLyrics ? 0 : '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isFullscreenLyrics ? 0 : '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={cn(
              'relative h-full bg-[#090914]/95 border-l border-white/10 backdrop-blur-2xl shadow-2xl flex flex-col z-10 transition-all duration-300',
              isFullscreenLyrics ? 'w-full max-w-none inset-0' : 'w-full max-w-lg'
            )}
          >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center">
                <Mic2 size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Live Lyrics</h2>
                <p className="text-xs text-white/40">Synchronized playback with auto-scroll</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Auto-scroll toggle */}
              <button
                onClick={() => setIsAutoScroll(!isAutoScroll)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors',
                  isAutoScroll ? 'bg-violet-600/30 text-violet-300 border border-violet-500/30' : 'bg-white/5 text-white/40'
                )}
                title="Toggle Auto-Scroll"
              >
                Auto-Scroll: {isAutoScroll ? 'ON' : 'OFF'}
              </button>

              {/* Fullscreen lyrics toggle */}
              <button
                onClick={() => setIsFullscreenLyrics(!isFullscreenLyrics)}
                className="w-8 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
                title={isFullscreenLyrics ? 'Exit Fullscreen Lyrics' : 'Fullscreen Lyrics'}
              >
                {isFullscreenLyrics ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>

              {/* Close */}
              <button
                onClick={() => setLyricsOpen(false)}
                className="w-8 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Current track banner */}
          <div className="flex items-center gap-4 px-6 py-4 bg-white/5 border-b border-white/5">
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              className="w-12 h-12 rounded-xl object-cover shadow ring-1 ring-white/10"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-white truncate">{currentTrack.title}</h4>
              <p className="text-xs text-white/50 truncate">{currentTrack.artist}</p>
            </div>
            {isPlaying && (
              <div className="flex items-center gap-1.5 text-xs text-violet-400 bg-violet-500/10 px-2.5 py-1 rounded-full">
                <Volume2 size={14} className="animate-pulse" />
                <span className="text-[11px] font-medium">Singing Live</span>
              </div>
            )}
          </div>

          {/* Lyrics lines */}
          <div className="flex-1 overflow-y-auto p-8 space-y-7 no-scrollbar text-center">
            {lyrics.map((line, idx) => {
              const isActive = idx === activeIndex;
              const isPast = idx < activeIndex;

              return (
                <div
                  key={idx}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => seek(line.time / (duration || 200))}
                  className={cn(
                    'cursor-pointer py-2 px-6 rounded-2xl transition-all duration-300 transform',
                    isActive
                      ? 'text-white text-3xl font-black scale-105 bg-white/10 shadow-lg text-glow'
                      : isPast
                      ? 'text-white/40 text-xl font-medium hover:text-white/60'
                      : 'text-white/20 text-xl font-normal hover:text-white/40'
                  )}
                >
                  <p className="leading-relaxed">{line.text}</p>
                  {isActive && (
                    <motion.div
                      layoutId="active-lyric-bar"
                      className="w-16 h-1 bg-gradient-to-r from-violet-500 via-pink-500 to-rose-400 rounded-full mx-auto mt-2.5"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="px-6 py-4 border-t border-white/10 text-center text-xs text-white/30 flex items-center justify-center gap-2">
            <Sparkles size={13} className="text-pink-400" />
            <span>Click any lyric line to seek directly • Manual scroll is supported</span>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
