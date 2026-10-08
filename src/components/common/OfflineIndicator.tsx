/**
 * OfflineIndicator.tsx
 *
 * Visual indicator shown when user is offline or reconnects.
 * Informs the user they are playing offline downloaded songs without disrupting UI.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, HardDrive } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useLibraryStore } from '@/store/libraryStore';

export function OfflineIndicator() {
  const { isOnline, wasOffline } = useOnlineStatus();
  const downloadedCount = useLibraryStore((s) => s.downloadedTrackIds.length);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
        >
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-amber-950/90 border border-amber-500/30 text-amber-200 text-xs shadow-2xl backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <WifiOff size={14} className="text-amber-400 flex-shrink-0" />
            <span className="font-semibold">Offline Mode</span>
            <span className="text-amber-300/60 hidden sm:inline">•</span>
            <span className="text-amber-300/80 hidden sm:inline">Playing downloaded tracks</span>
            <Link
              to="/downloads"
              className="ml-1 px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-medium flex items-center gap-1 transition-colors"
            >
              <HardDrive size={11} />
              <span>{downloadedCount} Available</span>
            </Link>
          </div>
        </motion.div>
      )}

      {isOnline && wasOffline && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-950/90 border border-emerald-500/30 text-emerald-200 text-xs shadow-2xl backdrop-blur-md">
            <Wifi size={14} className="text-emerald-400 flex-shrink-0" />
            <span className="font-semibold">Back Online</span>
            <span className="text-emerald-300/80 hidden sm:inline">• Reconnected to Supabase</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
