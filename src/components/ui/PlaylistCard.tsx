import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Bookmark, BookmarkCheck } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatLargeNumber } from '@/utils/cn';
import { usePlayerStore } from '@/store/playerStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useUIStore } from '@/store/uiStore';
import type { Playlist } from '@/types';

interface PlaylistCardProps {
  playlist: Playlist;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PlaylistCard({ playlist, className, size = 'md' }: PlaylistCardProps) {
  const navigate = useNavigate();
  const { playQueue } = usePlayerStore();
  const { isPlaylistSaved, toggleSavePlaylist } = useLibraryStore();
  const { addToast } = useUIStore();

  const isSaved = isPlaylistSaved(playlist.id);

  const sizeClasses = { sm: 'w-36', md: 'w-44', lg: 'w-52' };

  const coverStyle = playlist.coverColors
    ? { background: `linear-gradient(135deg, ${playlist.coverColors[0]}, ${playlist.coverColors[1]})` }
    : undefined;

  const handleToggleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    const saved = toggleSavePlaylist(playlist.id);
    addToast(saved ? `Saved "${playlist.title}" to library` : `Removed "${playlist.title}" from library`, 'success');
  };

  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const target = event.currentTarget;
    target.onerror = null;
    target.src = 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=300&q=80';
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    playQueue(playlist.tracks);
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      onClick={() => navigate(`/playlists/${playlist.id}`)}
      className={cn('flex flex-col gap-3 group cursor-pointer', className?.includes('w-') ? '' : cn('flex-shrink-0', sizeClasses[size]), className)}
    >
      {/* Cover */}
      <div className="relative aspect-square rounded-xl overflow-hidden shadow-lg">
        {playlist.coverUrl ? (
          <img
            src={playlist.coverUrl}
            alt={playlist.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={handleImageError}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl" style={coverStyle}>
            {playlist.tracks.length >= 4 ? (
              <div className="grid grid-cols-2 w-full h-full">
                {playlist.tracks.slice(0, 4).map((t, i) => (
                  <img key={i} src={t.coverUrl} alt="" className="w-full h-full object-cover" />
                ))}
              </div>
            ) : (
              <span className="text-5xl">🎵</span>
            )}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Play button */}
        <motion.button
          type="button"
          aria-label={`Play playlist ${playlist.title}`}
          initial={{ opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.1 }}
          onClick={handlePlay}
          className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ boxShadow: '0 4px 20px rgba(124,58,237,0.5)' }}
          title="Play Playlist"
        >
          <Play size={16} fill="white" className="text-white ml-0.5" />
        </motion.button>

        {/* Save to library button */}
        <button
          type="button"
          aria-label={isSaved ? `Remove ${playlist.title} from library` : `Save ${playlist.title} to library`}
          onClick={handleToggleSave}
          className={cn(
            'absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center transition-all',
            isSaved ? 'text-violet-400 opacity-100' : 'text-white/60 opacity-0 group-hover:opacity-100 hover:text-white'
          )}
          title={isSaved ? 'Remove from library' : 'Save to library'}
        >
          {isSaved ? <BookmarkCheck size={14} className="fill-violet-400 text-violet-400" /> : <Bookmark size={14} />}
        </button>
      </div>

      {/* Info */}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white truncate group-hover:text-violet-400 transition-colors">{playlist.title}</p>
        <p className="text-xs text-white/50 truncate">
          {playlist.tracks.length} tracks
          {playlist.followers > 0 && ` · ${formatLargeNumber(playlist.followers)} saves`}
        </p>
      </div>
    </motion.div>
  );
}
