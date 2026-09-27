import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Play, Shuffle, CheckCircle2, UserCheck, UserPlus,
  Disc3, Music, Sparkles, ChevronLeft
} from 'lucide-react';
import { MusicCard } from '@/components/ui/MusicCard';
import { AlbumCard } from '@/components/ui/AlbumCard';
import { ArtistCard } from '@/components/ui/ArtistCard';
import { artists, albums, tracks } from '@/data/demo';
import { usePlayerStore } from '@/store/playerStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useAdminStore } from '@/store/adminStore';
import { useUIStore } from '@/store/uiStore';
import { formatLargeNumber } from '@/utils/cn';

export default function ArtistDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { playQueue } = usePlayerStore();
  const { toggleFollowArtist } = useLibraryStore();
  const { addToast } = useUIStore();
  const { artists: adminArtists, songs: adminSongs, albums: adminAlbums } = useAdminStore();

  const allArtists = useMemo(() => {
    const combined = [...adminArtists, ...artists];
    const seen = new Set<string>();
    return combined.filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
  }, [adminArtists]);

  const allTracks = useMemo(() => {
    const combined = [...adminSongs, ...tracks];
    const seen = new Set<string>();
    return combined.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [adminSongs]);

  const allAlbums = useMemo(() => {
    const combined = [...adminAlbums, ...albums];
    const seen = new Set<string>();
    return combined.filter((al) => {
      if (seen.has(al.id)) return false;
      seen.add(al.id);
      return true;
    });
  }, [adminAlbums]);

  const artist = useMemo(() => {
    return allArtists.find((a) => a.id === id) || allArtists[0] || artists[0];
  }, [id, allArtists]);

  const isFollowing = useLibraryStore((s) => s.followedArtistIds.includes(artist.id));

  // Artist's tracks
  const artistTracks = useMemo(() => {
    return allTracks.filter((t) => t.artistId === artist.id);
  }, [artist.id, allTracks]);

  // Artist's albums
  const artistAlbums = useMemo(() => {
    return allAlbums.filter((al) => al.artistId === artist.id);
  }, [artist.id, allAlbums]);

  // Related artists (artists sharing genre)
  const relatedArtists = useMemo(() => {
    return allArtists
      .filter((a) => a.id !== artist.id && a.genres?.some((g) => artist.genres?.includes(g)))
      .slice(0, 5);
  }, [artist, allArtists]);

  const handlePlayAll = () => {
    if (artistTracks.length > 0) {
      playQueue(artistTracks);
    }
  };

  const handleShufflePlay = () => {
    if (artistTracks.length > 0) {
      const shuffled = [...artistTracks].sort(() => Math.random() - 0.5);
      playQueue(shuffled);
    }
  };

  const handleToggleFollow = () => {
    const following = toggleFollowArtist(artist.id);
    addToast(
      following ? `Now following ${artist.name}` : `Unfollowed ${artist.name}`,
      'info'
    );
  };

  return (
    <div className="pb-16 space-y-10">
      {/* Artist Hero Banner & Cover */}
      <div className="relative min-h-[360px] md:min-h-[420px] flex flex-col justify-end p-6 md:p-10 overflow-hidden">
        {/* Background Artwork Banner */}
        <div
          className="absolute inset-0 bg-cover bg-center filter brightness-50 scale-105 transition-transform duration-1000"
          style={{ backgroundImage: `url(${artist.imageUrl})` }}
        />
        {/* Ambient Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080810] via-[#080810]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080810]/90 via-transparent to-transparent" />

        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white transition-all shadow"
        >
          <ChevronLeft size={22} />
        </button>

        {/* Artist Profile Header Content */}
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 text-center md:text-left">
          {/* Circular Avatar */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden shadow-2xl ring-4 ring-violet-500/30 flex-shrink-0"
            style={{ boxShadow: '0 16px 50px rgba(0,0,0,0.8)' }}
          >
            <img src={artist.imageUrl} alt={artist.name} className="w-full h-full object-cover" />
          </motion.div>

          <div className="space-y-2 max-w-2xl">
            {/* Verified badge */}
            <div className="flex items-center justify-center md:justify-start gap-2">
              {artist.verified && (
                <span className="flex items-center gap-1 text-xs font-semibold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-full">
                  <CheckCircle2 size={13} className="text-violet-400" />
                  Verified Artist
                </span>
              )}
              <span className="text-xs text-white/50">
                {artist.genres.join(' • ')}
              </span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight">
              {artist.name}
            </h1>

            <p className="text-sm text-white/60">
              {formatLargeNumber(artist.monthlyListeners)} monthly listeners • {formatLargeNumber(artist.followers)} followers
            </p>

            {artist.bio && (
              <p className="text-xs text-white/40 line-clamp-2 max-w-xl">
                {artist.bio}
              </p>
            )}

            {/* Buttons: Play, Follow, Shuffle */}
            <div className="flex items-center justify-center md:justify-start gap-3 pt-3">
              <button
                onClick={handlePlayAll}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-2xl font-semibold text-sm shadow-xl shadow-violet-600/30 transition-all hover:scale-105 active:scale-95"
              >
                <Play size={16} fill="white" /> Play
              </button>

              <button
                onClick={handleShufflePlay}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-5 py-3 rounded-2xl font-semibold text-sm border border-white/10 transition-all hover:scale-105 active:scale-95"
              >
                <Shuffle size={16} /> Shuffle
              </button>

              <button
                onClick={handleToggleFollow}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm border transition-all hover:scale-105 active:scale-95 ${
                  isFollowing
                    ? 'bg-white/10 border-violet-500/50 text-violet-300'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck size={16} className="text-violet-400" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    <span>Follow</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="px-6 md:px-10 space-y-12 max-w-7xl mx-auto">
        {/* Popular Songs Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
              <Music size={20} className="text-violet-400" />
              Popular Songs
            </h2>
          </div>

          <div className="glass rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
            {artistTracks.map((track, idx) => (
              <MusicCard key={track.id} track={track} index={idx} showIndex />
            ))}
          </div>
        </section>

        {/* Discography / Albums Section */}
        {artistAlbums.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
              <Disc3 size={20} className="text-pink-400" />
              Albums & Releases
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {artistAlbums.map((album) => (
                <AlbumCard key={album.id} album={album} />
              ))}
            </div>
          </section>
        )}

        {/* Singles & Featured Tracks */}
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
            <Sparkles size={20} className="text-amber-400" />
            Singles & Highlights
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {artistTracks.slice(0, 3).map((track, i) => (
              <div
                key={track.id}
                onClick={() => playQueue([track])}
                className="flex items-center gap-3 p-3 rounded-xl glass border border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
              >
                <img src={track.coverUrl} alt={track.title} className="w-12 h-12 rounded-lg object-cover shadow" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate group-hover:text-violet-400 transition-colors">
                    {track.title}
                  </p>
                  <p className="text-xs text-white/50">{track.year} • Single</p>
                </div>
                <Play size={14} className="text-white/40 group-hover:text-white mr-1" />
              </div>
            ))}
          </div>
        </section>

        {/* Related Artists Section */}
        {relatedArtists.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-display text-xl font-bold text-white">Fans Also Like</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
              {relatedArtists.map((related) => (
                <ArtistCard key={related.id} artist={related} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
