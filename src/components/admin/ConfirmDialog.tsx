import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  itemName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  /** When true, the confirm button shows a spinner and is disabled */
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  itemName,
  confirmLabel = 'Delete Permanently',
  cancelLabel = 'Cancel',
  isDanger = true,
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isLoading ? undefined : onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Dialog Body */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            className="relative w-full max-w-md rounded-3xl bg-[#14121d] border border-white/10 p-6 shadow-2xl shadow-black/80 space-y-5 overflow-hidden"
          >
            {/* Top red glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-rose-500/20 rounded-full filter blur-2xl pointer-events-none" />

            <div className="relative flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                  {isLoading ? (
                    <Loader2 size={22} className="animate-spin" />
                  ) : (
                    <AlertTriangle size={22} />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    {isLoading ? 'Deleting — please wait…' : 'Destructive Administrator Action'}
                  </p>
                </div>
              </div>
              <button
                onClick={isLoading ? undefined : onClose}
                disabled={isLoading}
                className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-sm text-white/70">
              <p>{description}</p>
              {itemName && (
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 font-mono text-xs text-rose-300 break-all">
                  Target: <span className="font-semibold text-white">{itemName}</span>
                </div>
              )}
              <p className="text-xs text-white/40">
                This operation will immediately synchronize with Supabase and local caches. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-semibold border border-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  if (!isLoading) onConfirm();
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                <span>{isLoading ? 'Deleting…' : confirmLabel}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
