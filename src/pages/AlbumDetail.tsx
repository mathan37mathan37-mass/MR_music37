import { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Play, Shuffle, Bookmark, BookmarkCheck, ChevronLeft,
  Clock, Disc, Share2
} from 'lucide-react';
import { MusicCard } from '@/components/ui/MusicCard';
import { albums } from '@/data/demo';
import { usePlayerStore } from '@/store/playerStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useAdminStore } from '@/store/adminStore';
import { useUIStore } from '@/store/uiStore';
import { formatTotalDuration } from '@/utils/cn';

export default function AlbumDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { playQueue } = usePlayerStore();
  const { toggleSaveAlbum } = useLibraryStore();
  const { addToast } = useUIStore();
  const adminAlbums = useAdminStore((s) => s.albums);

  const album = useMemo(() => {
    const all = [...adminAlbums, ...albums];
    return all.find((a) => a.id === id) || all[0] || albums[0];
  }, [id, adminAlbums]);

  const isSaved = useLibraryStore((s) => s.savedAlbumIds.includes(album.id));

  const totalDuration = useMemo(() => {
    return album.tracks.reduce((acc, t) => acc + t.duration, 0);
  }, [album.tracks]);

  const handlePlayAlbum = () => {
    if (album.tracks.length > 0) {
      playQueue(album.tracks);
    }
  };

  const handleShuffleAlbum = () => {
    if (album.tracks.length > 0) {
      const shuffled = [...album.tracks].sort(() => Math.random() - 0.5);
      playQueue(shuffled);
    }
  };

  const handleToggleSave = () => {
    const saved = toggleSaveAlbum(album.id);
    addToast(
      saved ? `Saved "${album.title}" to library` : `Removed "${album.title}" from library`,
      'success'
    );
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    addToast('Album link copied to clipboard', 'info');
  };

  return (
    <div className="px-6 md:px-10 py-6 pb-32 space-y-10 max-w-7xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
      >
        <ChevronLeft size={22} />
      </button>

      {/* Album Header Hero */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-8 p-6 md:p-8 rounded-3xl glass border border-white/5 relative overflow-hidden">
        {/* Blurred background glow */}
        <div
          className="absolute inset-0 opacity-20 filter blur-3xl scale-125"
          style={{ backgroundImage: `url(${album.coverUrl})`, backgroundSize: 'cover' }}
        />

        {/* Album Cover */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative w-52 h-52 sm:w-60 sm:h-60 rounded-2xl overflow-hidden shadow-2xl ring-2 ring-white/10 flex-shrink-0 z-10"
        >
          <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover" />
        </motion.div>

        {/* Album Meta */}
        <div className="relative z-10 space-y-3 text-center md:text-left flex-1 min-w-0">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-violet-400 bg-violet-500/10 px-3 py-1 rounded-full">
              Album
            </span>
            <span className="text-xs text-white/50">{album.genre}</span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            {album.title}
          </h1>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm text-white/70">
            <Link
              to={`/artists/${album.artistId}`}
              className="font-semibold text-white hover:text-violet-400 transition-colors"
            >
              {album.artist}
            </Link>
            <span>•</span>
            <span>{album.year}</span>
            <span>•</span>
            <span>{album.tracks.length} songs, {formatTotalDuration(totalDuration)}</span>
          </div>

          {album.description && (
            <p className="text-xs text-white/50 max-w-xl line-clamp-2">
              {album.description}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-3">
            <button
              onClick={handlePlayAlbum}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-2xl font-semibold text-sm shadow-xl shadow-violet-600/30 transition-all hover:scale-105 active:scale-95"
            >
              <Play size={16} fill="white" /> Play Album
            </button>

            <button
              onClick={handleShuffleAlbum}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-5 py-3 rounded-2xl font-semibold text-sm border border-white/10 transition-all hover:scale-105 active:scale-95"
            >
              <Shuffle size={16} /> Shuffle
            </button>

            <button
              onClick={handleToggleSave}
              className={`p-3 rounded-2xl border transition-all hover:scale-105 active:scale-95 ${
                isSaved ? 'bg-violet-600/20 border-violet-500 text-violet-400' : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70'
              }`}
              title={isSaved ? 'Remove from library' : 'Save album'}
            >
              {isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
            </button>

            <button
              onClick={handleShare}
              className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all hover:scale-105 active:scale-95"
              title="Share album"
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Song list section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
            <Disc size={20} className="text-violet-400" />
            Tracklist
          </h2>
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <Clock size={13} />
            <span>{formatTotalDuration(totalDuration)}</span>
          </div>
        </div>

        <div className="glass rounded-2xl border border-white/5 divide-y divide-white/5">
          {album.tracks.map((track, idx) => (
            <MusicCard key={track.id} track={track} index={idx} showIndex />
          ))}
        </div>
      </section>
    </div>
  );
}
