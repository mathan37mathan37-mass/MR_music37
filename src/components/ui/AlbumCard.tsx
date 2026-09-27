import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Bookmark, BookmarkCheck } from 'lucide-react';
import { cn } from '@/utils/cn';
import { usePlayerStore } from '@/store/playerStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useUIStore } from '@/store/uiStore';
import type { Album } from '@/types';

interface AlbumCardProps {
  album: Album;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function AlbumCard({ album, className, size = 'md' }: AlbumCardProps) {
  const navigate = useNavigate();
  const { playQueue } = usePlayerStore();
  const { toggleSaveAlbum } = useLibraryStore();
  const { addToast } = useUIStore();
  const isSaved = useLibraryStore((s) => s.savedAlbumIds.includes(album.id));

  const sizeClasses = {
    sm: 'w-36',
    md: 'w-44',
    lg: 'w-52',
  };

  const handleToggleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    const saved = toggleSaveAlbum(album.id);
    addToast(saved ? `Saved "${album.title}" to library` : `Removed "${album.title}" from library`, 'success');
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    playQueue(album.tracks.length > 0 ? album.tracks : []);
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      onClick={() => navigate(`/albums/${album.id}`)}
      className={cn('flex flex-col gap-3 group cursor-pointer', className?.includes('w-') ? '' : cn('flex-shrink-0', sizeClasses[size]), className)}
    >
      {/* Cover */}
      <div className="relative aspect-square rounded-xl overflow-hidden shadow-lg">
        <img
          src={album.coverUrl}
          alt={album.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Play button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.1 }}
          onClick={handlePlay}
          className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ boxShadow: '0 4px 20px rgba(124,58,237,0.5)' }}
          title="Play Album"
        >
          <Play size={16} fill="white" className="text-white ml-0.5" />
        </motion.button>

        {/* Save button */}
        <button
          onClick={handleToggleSave}
          className={cn(
            'absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center transition-all',
            isSaved ? 'text-violet-400 opacity-100' : 'text-white/60 opacity-0 group-hover:opacity-100 hover:text-white'
          )}
          title={isSaved ? 'Remove from library' : 'Save album'}
        >
          {isSaved ? <BookmarkCheck size={14} className="fill-violet-400 text-violet-400" /> : <Bookmark size={14} />}
        </button>
      </div>

      {/* Info */}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white truncate group-hover:text-violet-400 transition-colors">{album.title}</p>
        <p className="text-xs text-white/50 truncate">{album.artist} · {album.year}</p>
      </div>
    </motion.div>
  );
}
