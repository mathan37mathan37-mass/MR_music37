import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Command } from 'lucide-react';
import { usePlayerStore } from '@/store/playerStore';
import { useUIStore } from '@/store/uiStore';

const SHORTCUTS = [
  { key: 'Space', desc: 'Play / Pause' },
  { key: '→', desc: 'Seek forward 5s' },
  { key: '←', desc: 'Seek backward 5s' },
  { key: '↑', desc: 'Increase volume 10%' },
  { key: '↓', desc: 'Decrease volume 10%' },
  { key: 'M', desc: 'Mute / Unmute' },
  { key: 'N', desc: 'Next track' },
  { key: 'P', desc: 'Previous track' },
  { key: 'Q', desc: 'Open / Close Queue' },
  { key: 'L', desc: 'Like / Unlike current track' },
  { key: 'F', desc: 'Toggle Fullscreen Player' },
  { key: '?', desc: 'Show shortcuts list' },
];

export function KeyboardShortcuts() {
  const {
    isShortcutsOpen,
    setShortcutsOpen,
    toggleQueue,
    toggleFullscreen,
    addToast
  } = useUIStore();

  const {
    togglePlay,
    next,
    prev,
    seek,
    volume,
    setVolume,
    toggleMute,
    toggleLike,
    currentTime,
    duration
  } = usePlayerStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when focused inside input, textarea, or contentEditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (duration > 0) {
            seek((currentTime + 5) / duration);
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (duration > 0) {
            seek((currentTime - 5) / duration);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.1));
          break;
        case 'm':
        case 'M':
          toggleMute();
          break;
        case 'n':
        case 'N':
          next();
          break;
        case 'p':
        case 'P':
          prev();
          break;
        case 'q':
        case 'Q':
          toggleQueue();
          break;
        case 'l':
        case 'L':
          toggleLike();
          addToast('Updated favorites', 'info');
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case '?':
          setShortcutsOpen(!isShortcutsOpen);
          break;
        case 'Escape':
          useUIStore.getState().setFullscreen(false);
          useUIStore.getState().setQueueOpen(false);
          useUIStore.getState().setLyricsOpen(false);
          setShortcutsOpen(false);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    togglePlay,
    next,
    prev,
    seek,
    volume,
    setVolume,
    toggleMute,
    toggleLike,
    toggleQueue,
    toggleFullscreen,
    currentTime,
    duration,
    isShortcutsOpen,
    setShortcutsOpen,
    addToast
  ]);

  if (!isShortcutsOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShortcutsOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md bg-[#10101c] border border-white/10 rounded-2xl p-6 shadow-2xl z-10"
        >
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5 text-white">
              <Command size={18} className="text-violet-400" />
              <h3 className="font-semibold text-base">Keyboard Shortcuts</h3>
            </div>
            <button
              onClick={() => setShortcutsOpen(false)}
              className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2.5 max-h-96 overflow-y-auto pr-1">
            {SHORTCUTS.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5"
              >
                <span className="text-xs text-white/70">{item.desc}</span>
                <kbd className="px-2.5 py-1 bg-black/40 border border-white/20 rounded-md text-[11px] font-mono font-bold text-violet-300 shadow">
                  {item.key}
                </kbd>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
