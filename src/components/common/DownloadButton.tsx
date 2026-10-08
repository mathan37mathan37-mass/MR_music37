/**
 * DownloadButton.tsx
 *
 * Universal Download Button for tracks.
 * Handles offline caching in IndexedDB with real-time download progress.
 */

import { motion } from 'framer-motion';
import { Download, Check, Loader2, Trash2 } from 'lucide-react';
import { useOfflineSongs } from '@/hooks/useOfflineSongs';
import { useLibraryStore } from '@/store/libraryStore';
import type { Track } from '@/types';
import { cn } from '@/utils/cn';

interface DownloadButtonProps {
  track: Track;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  allowDelete?: boolean;
}

export function DownloadButton({
  track,
  size = 'md',
  showLabel = false,
  className,
  allowDelete = false,
}: DownloadButtonProps) {
  const { downloadSong, removeSong, isDownloading, getDownloadProgress } = useOfflineSongs();
  const isDownloaded = useLibraryStore((s) => s.downloadedTrackIds.includes(track.id));
  const downloading = isDownloading(track.id);
  const progress = getDownloadProgress(track.id);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (downloading) return;

    if (isDownloaded) {
      if (allowDelete) {
        void removeSong(track.id, track.title);
      }
    } else {
      void downloadSong(track);
    }
  };

  const iconSizes = {
    sm: 13,
    md: 15,
    lg: 18,
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      disabled={downloading}
      title={
        downloading
          ? `Downloading: ${progress}%`
          : isDownloaded
            ? allowDelete
              ? 'Remove download'
              : 'Downloaded for offline playback'
            : 'Download for offline playback'
      }
      className={cn(
        'relative flex items-center justify-center gap-1.5 rounded-xl transition-all cursor-pointer',
        isDownloaded
          ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20'
          : downloading
            ? 'text-violet-400 bg-violet-500/10 border border-violet-500/30'
            : 'text-white/40 hover:text-white hover:bg-white/10 border border-white/5',
        size === 'sm' && 'p-1.5 text-xs',
        size === 'md' && 'p-2 text-xs',
        size === 'lg' && 'px-3.5 py-2 text-sm font-medium',
        className
      )}
    >
      {downloading ? (
        <>
          <Loader2 size={iconSizes[size]} className="animate-spin text-violet-400 flex-shrink-0" />
          {showLabel && <span className="font-mono text-[11px]">{progress}%</span>}
        </>
      ) : isDownloaded ? (
        <>
          {allowDelete ? (
            <Trash2 size={iconSizes[size]} className="text-red-400" />
          ) : (
            <Check size={iconSizes[size]} strokeWidth={2.5} className="text-emerald-400" />
          )}
          {showLabel && <span>{allowDelete ? 'Remove' : 'Downloaded'}</span>}
        </>
      ) : (
        <>
          <Download size={iconSizes[size]} />
          {showLabel && <span>Download</span>}
        </>
      )}
    </motion.button>
  );
}
