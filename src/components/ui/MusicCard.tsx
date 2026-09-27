import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Heart, MoreHorizontal, Music, ListPlus, CornerDownRight,
  DownloadCloud, Check, ListMusic, Trash2
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatDuration, formatLargeNumber } from '@/utils/cn';
import { usePlayerStore } from '@/store/playerStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useUIStore } from '@/store/uiStore';
import type { Track } from '@/types';

interface MusicCardProps {
  track: Track;
  index?: number;
  showIndex?: boolean;
  className?: string;
  onRemove?: () => void;
  removeTooltip?: string;
  queue?: Track[];
}

export function MusicCard({ track, index, showIndex, className, onRemove, removeTooltip, queue }: MusicCardProps) {
  const { playTrack, playQueue, currentTrack, isPlaying, togglePlay, addToQueue, playNext, toggleLike } = usePlayerStore();
  const { toggleDownload, userPlaylists, addSongToPlaylist } = useLibraryStore();
  const isLiked = useLibraryStore((s) => s.likedSongIds.includes(track.id));
  const isDown = useLibraryStore((s) => s.downloadedTrackIds.includes(track.id));
  const { addToast } = useUIStore();
  const [showMenu, setShowMenu] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showMenu]);

  const isActive = currentTrack?.id === track.id;

  const handleToggleMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const button = menuButtonRef.current;
    if (button) {
      const rect = button.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpwards(spaceBelow < 260);
    }
    setShowMenu((prev) => !prev);
  };

  const handlePlay = () => {
    if (isActive) {
      togglePlay();
    } else if (queue && queue.length > 0) {
      const targetIndex = queue.findIndex((item) => item.id === track.id);
      const startIndex = targetIndex >= 0 ? targetIndex : 0;
      playQueue(queue, startIndex);
    } else {
      playTrack(track);
    }
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLike(track.id);
    addToast(isLiked ? 'Removed from favorites' : 'Added to favorites', 'success');
  };

  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToQueue(track);
    setShowMenu(false);
    addToast(`Added "${track.title}" to queue`, 'success');
  };

  const handlePlayNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    playNext(track);
    setShowMenu(false);
    addToast(`"${track.title}" will play next`, 'success');
  };

  const handleToggleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const downloaded = toggleDownload(track.id);
    setShowMenu(false);
    addToast(downloaded ? `Downloaded "${track.title}" for offline` : `Removed download "${track.title}"`, 'success');
  };

  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const target = event.currentTarget;
    target.onerror = null;
    target.src = 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=300&q=80';
  };

  return (
    <motion.div
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
      className={cn(
        'group relative flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-colors',
        isActive && 'bg-white/5',
        className
      )}
      onClick={handlePlay}
    >
      {/* Index / Play icon */}
      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
        {isActive && isPlaying ? (
          <div className="flex items-end gap-[2px] h-4">
            <span className="eq-bar w-[2px] bg-violet-400" style={{ height: 8 }} />
            <span className="eq-bar w-[2px] bg-violet-400" style={{ height: 14 }} />
            <span className="eq-bar w-[2px] bg-violet-400" style={{ height: 6 }} />
            <span className="eq-bar w-[2px] bg-violet-400" style={{ height: 12 }} />
          </div>
        ) : (
          <>
            {showIndex && (
              <span className={cn('text-sm font-medium group-hover:hidden', isActive ? 'text-violet-400' : 'text-white/40')}>
                {(index ?? 0) + 1}
              </span>
            )}
            <Play
              size={14}
              fill="currentColor"
              className={cn(
                'text-white transition-all',
                showIndex ? 'hidden group-hover:block' : 'opacity-0 group-hover:opacity-100'
              )}
            />
          </>
        )}
      </div>

      {/* Cover Art */}
      <div className="relative w-11 h-11 flex-shrink-0 rounded-lg overflow-hidden shadow">
        <img
          src={track.coverUrl}
          alt={track.album}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={handleImageError}
          className="w-full h-full object-cover"
        />
        {isActive && (
          <div className="absolute inset-0 bg-violet-600/20" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn('text-sm font-semibold truncate', isActive ? 'text-violet-400' : 'text-white')}>
            {track.title}
          </p>
          {isDown && (
            <span title="Available offline" className="flex-shrink-0 w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Check size={9} strokeWidth={3} />
            </span>
          )}
        </div>
        <p className="text-xs text-white/50 truncate">{track.artist}</p>
      </div>

      {/* Play count */}
      <div className="hidden md:flex items-center gap-1 text-white/30 text-xs w-16 justify-end">
        <Music size={10} />
        {formatLargeNumber(track.playCount)}
      </div>

      {/* Actions */}
      <div className={cn('flex items-center gap-1 transition-opacity relative opacity-100')}>
        <button
          type="button"
          aria-label={isLiked ? `Unlike ${track.title}` : `Like ${track.title}`}
          onClick={handleLike}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          title={isLiked ? 'Unlike' : 'Like'}
        >
          <Heart size={15} className={cn('transition-colors', isLiked ? 'fill-violet-400 text-violet-400' : 'text-white/40 hover:text-white')} />
        </button>

        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-rose-400 hover:bg-rose-500/15 transition-colors"
            title={removeTooltip || "Remove from library"}
          >
            <Trash2 size={14} />
          </button>
        )}

        <div className="relative" ref={menuRef}>
          <button
            ref={menuButtonRef}
            type="button"
            aria-label={`More actions for ${track.title}`}
            onClick={handleToggleMenu}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
              showMenu ? 'bg-white/15 text-white opacity-100' : 'hover:bg-white/10 text-white/40 hover:text-white opacity-100'
            )}
            title="More actions"
          >
            <MoreHorizontal size={15} />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: openUpwards ? 6 : -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: openUpwards ? 6 : -6 }}
                className={cn(
                  'absolute right-0 w-52 rounded-2xl bg-[var(--color-bg-card)]/95 backdrop-blur-2xl border border-[var(--color-border)] shadow-2xl p-1.5 z-50 divide-y divide-[var(--color-border)]',
                  openUpwards ? 'bottom-full mb-2' : 'top-full mt-1.5'
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-0.5 pb-1">
                  <button
                    onClick={handlePlayNext}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-overlay)] flex items-center gap-2.5 transition-colors"
                  >
                    <CornerDownRight size={14} className="text-violet-400" />
                    Play Next
                  </button>
                  <button
                    onClick={handleAddToQueue}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-overlay)] flex items-center gap-2.5 transition-colors"
                  >
                    <ListPlus size={14} className="text-pink-400" />
                    Add to Queue
                  </button>
                  <button
                    onClick={handleToggleDownload}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-overlay)] flex items-center gap-2.5 transition-colors"
                  >
                    <DownloadCloud size={14} className={isDown ? 'text-emerald-400' : 'text-white/40'} />
                    {isDown ? 'Remove Download' : 'Download Offline'}
                  </button>
                </div>

                {/* Add to Playlist Sub-list */}
                {userPlaylists.length > 0 && (
                  <div className="pt-1.5 pb-1 space-y-0.5">
                    <p className="px-3 py-1 text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                      Add to Playlist
                    </p>
                    {userPlaylists.slice(0, 3).map((pl) => (
                      <button
                        key={pl.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          addSongToPlaylist(pl.id, track);
                          setShowMenu(false);
                          addToast(`Added to "${pl.title}"`, 'success');
                        }}
                        className="w-full text-left px-3 py-1.5 rounded-xl text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-overlay)] flex items-center gap-2.5 transition-colors truncate"
                      >
                        <ListMusic size={13} className="text-violet-400 flex-shrink-0" />
                        <span className="truncate">{pl.title}</span>
                      </button>
                    ))}
                  </div>
                )}

                {onRemove && (
                  <div className="pt-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onRemove();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 flex items-center gap-2.5 transition-colors"
                    >
                      <Trash2 size={14} className="text-rose-400" />
                      {removeTooltip || 'Remove from Library'}
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Duration */}
      <span className="text-xs text-white/40 w-10 text-right flex-shrink-0 tabular-nums">
        {formatDuration(track.duration)}
      </span>
    </motion.div>
  );
}
