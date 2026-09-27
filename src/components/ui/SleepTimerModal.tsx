import { motion, AnimatePresence } from 'framer-motion';
import { Moon, X, Clock, CheckCircle2, StopCircle } from 'lucide-react';
import { usePlayerStore } from '@/store/playerStore';
import { useUIStore } from '@/store/uiStore';
import { formatDuration } from '@/utils/cn';

interface SleepTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TIMER_OPTIONS: { label: string; value: '5m' | '10m' | '15m' | '30m' | '60m' | 'end_of_song' }[] = [
  { label: '5 minutes', value: '5m' },
  { label: '10 minutes', value: '10m' },
  { label: '15 minutes', value: '15m' },
  { label: '30 minutes', value: '30m' },
  { label: '60 minutes', value: '60m' },
  { label: 'End of current song', value: 'end_of_song' },
];

export function SleepTimerModal({ isOpen, onClose }: SleepTimerModalProps) {
  const { sleepTimerOption, sleepTimerRemaining, setSleepTimer } = usePlayerStore();
  const { addToast } = useUIStore();

  const handleSelect = (option: typeof TIMER_OPTIONS[0]['value']) => {
    setSleepTimer(option);
    addToast(
      option === 'end_of_song'
        ? 'Sleep timer set: Audio will pause after this song'
        : `Sleep timer set for ${option.replace('m', ' minutes')}`,
      'success'
    );
    onClose();
  };

  const handleTurnOff = () => {
    setSleepTimer(null);
    addToast('Sleep timer turned off', 'info');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-sm bg-[#101020] border border-white/10 rounded-3xl p-6 shadow-2xl z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5 text-white">
              <Moon size={18} className="text-violet-400" />
              <h3 className="font-semibold text-base">Sleep Timer</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Active Timer Indicator */}
          {sleepTimerOption && (
            <div className="mt-4 p-3.5 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Clock size={16} className="text-violet-400 animate-pulse" />
                <div>
                  <p className="text-xs font-semibold text-violet-300">
                    {sleepTimerOption === 'end_of_song'
                      ? 'Stopping at end of song'
                      : `Stopping in ${formatDuration(sleepTimerRemaining || 0)}`}
                  </p>
                  <p className="text-[10px] text-white/40">Timer is currently counting down</p>
                </div>
              </div>
              <button
                onClick={handleTurnOff}
                className="text-xs text-red-400 hover:text-red-300 font-semibold px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors flex items-center gap-1"
              >
                <StopCircle size={13} />
                Turn Off
              </button>
            </div>
          )}

          {/* Timer Options List */}
          <div className="mt-4 space-y-1.5">
            {TIMER_OPTIONS.map((opt) => {
              const isSelected = sleepTimerOption === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-semibold transition-all text-left ${
                    isSelected
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                      : 'bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/5'
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && <CheckCircle2 size={16} className="text-white" />}
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
