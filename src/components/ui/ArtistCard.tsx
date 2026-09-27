import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, UserCheck, BadgeCheck } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatLargeNumber } from '@/utils/cn';
import { useLibraryStore } from '@/store/libraryStore';
import { useUIStore } from '@/store/uiStore';
import type { Artist } from '@/types';

interface ArtistCardProps {
  artist: Artist;
  className?: string;
}

export function ArtistCard({ artist, className }: ArtistCardProps) {
  const navigate = useNavigate();
  const { toggleFollowArtist } = useLibraryStore();
  const { addToast } = useUIStore();
  const isFollowing = useLibraryStore((s) => s.followedArtistIds.includes(artist.id));

  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    const following = toggleFollowArtist(artist.id);
    addToast(following ? `Following ${artist.name}` : `Unfollowed ${artist.name}`, 'info');
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      onClick={() => navigate(`/artists/${artist.id}`)}
      className={cn('flex flex-col items-center gap-3 group cursor-pointer', className?.includes('w-') ? '' : 'flex-shrink-0 w-36', className)}
    >
      {/* Avatar */}
      <div className="relative">
        <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-violet-500 transition-all duration-300 shadow-lg">
          <img
            src={artist.imageUrl}
            alt={artist.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        </div>
        {/* Glow on hover */}
        <div
          className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ boxShadow: '0 0 30px rgba(124,58,237,0.4)', borderRadius: '50%' }}
        />
        {artist.verified && (
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center border-2 border-[#080810]">
            <BadgeCheck size={12} className="text-white" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="text-center min-w-0 w-full">
        <p className="text-sm font-semibold text-white truncate group-hover:text-violet-400 transition-colors">
          {artist.name}
        </p>
        <p className="text-xs text-white/40 mt-0.5">
          {formatLargeNumber(artist.monthlyListeners)} listeners
        </p>
      </div>

      {/* Follow button */}
      <button
        onClick={handleFollow}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm',
          isFollowing
            ? 'bg-white/10 text-violet-300 hover:bg-white/15 border border-violet-500/30'
            : 'bg-violet-600 text-white hover:bg-violet-500 shadow-violet-600/20'
        )}
      >
        {isFollowing ? <UserCheck size={11} className="text-violet-400" /> : <UserPlus size={11} />}
        {isFollowing ? 'Following' : 'Follow'}
      </button>
    </motion.div>
  );
}
