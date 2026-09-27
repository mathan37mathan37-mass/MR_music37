import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Shuffle, Sparkles, BarChart3, ArrowRight, Flame, Compass, Info } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { AlbumCard } from '@/components/ui/AlbumCard';
import { ArtistCard } from '@/components/ui/ArtistCard';
import { PlaylistCard } from '@/components/ui/PlaylistCard';
import { MusicCard } from '@/components/ui/MusicCard';
import { tracks, albums, artists, genres, moodPlaylists, quickPlayItems, playlists } from '@/data/demo';
import { isFirebaseConfigured } from '@/services/firebase';
import { usePlayerStore } from '@/store/playerStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useAnalyticsStore } from '@/store/analyticsStore';
import { useAdminStore } from '@/store/adminStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import { getRecommendations } from '@/utils/recommendations';
import { getTimeOfDay } from '@/utils/cn';
import { cn } from '@/utils/cn';
import type { Track } from '@/types';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export default function Home() {
  const navigate = useNavigate();
  const [quickPlayVisibleCount, setQuickPlayVisibleCount] = useState(5);
  const [quickPlayQueue, setQuickPlayQueue] = useState<Track[] | null>(null);
  const theme = useSettingsStore((s) => s.theme);
  const { playQueue, playTrack, currentTrack, isPlaying, togglePlay } = usePlayerStore();
  const isLightMode =
    theme === 'light' ||
    (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches);

  const dedupeTracks = <T extends { id: string }>(items: T[]) => {
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  };
  const { likedSongIds, recentlyPlayed, followedArtistIds, userPlaylists } = useLibraryStore();
  const currentUser = useAuthStore((s) => s.user);
  const { songs: adminSongs, albums: adminAlbums } = useAdminStore();
  const {
    playCounts,
    genrePlayCounts,
    artistPlayCounts,
    currentStreakDays,
    totalListeningSeconds,
  } = useAnalyticsStore();

  // Compute transparent rule-based recommendations
  const recentTracks = recentlyPlayed.map((item) => item.track);
  const recommendations = getRecommendations(
    likedSongIds,
    recentTracks,
    followedArtistIds,
    playCounts,
    genrePlayCounts,
    artistPlayCounts,
    userPlaylists,
    currentUser?.favoriteGenres || [],
    currentUser?.favoriteArtists || []
  );

  const totalHours = Math.round((totalListeningSeconds / 3600) * 10) / 10;

  const baseFallbackTracks = isFirebaseConfigured() ? [] : tracks;
  const allTracks = dedupeTracks([...adminSongs, ...baseFallbackTracks]);
  const recentlyAddedTracks = [...allTracks]
    .sort((a, b) => (b.year || 0) - (a.year || 0))
    .slice(0, 15);

  const userTrendingTracks = [...allTracks]
    .map((track) => ({
      ...track,
      userPlays: playCounts[track.id] || 0,
    }))
    .sort((a, b) => b.userPlays - a.userPlays || b.playCount - a.playCount)
    .slice(0, 6);

  const newestReleaseTracks = dedupeTracks(recentlyAddedTracks).slice(0, 8);

  const personalizedQuickPlayTracks = dedupeTracks([
    ...recommendations.madeForYou,
    ...(currentUser?.favoriteGenres?.length
      ? allTracks.filter((track) => currentUser.favoriteGenres.some((genre) => genre.toLowerCase() === track.genre.toLowerCase()))
      : []),
    ...(currentUser?.favoriteArtists?.length
      ? allTracks.filter((track) => currentUser.favoriteArtists.some((artist) => artist.toLowerCase() === track.artist.toLowerCase()))
      : []),
    ...recommendations.trendingForYou,
  ]).slice(0, 12);

  const baseQuickPlayEntries = dedupeTracks([
    ...personalizedQuickPlayTracks,
    ...quickPlayItems.slice(0, 6).map((item) => ({
      id: item.id,
      title: item.title,
      coverUrl: item.coverUrl,
      artist: 'MR music',
      album: item.title,
      artistId: 'a1',
      albumId: 'al1',
      duration: 180,
      playCount: 0,
      liked: false,
      genre: 'Featured',
      year: new Date().getFullYear(),
    }))
  ]).slice(0, 12);

  const quickPlayEntries = quickPlayQueue ?? baseQuickPlayEntries;

  useEffect(() => {
    if (!quickPlayQueue && baseQuickPlayEntries.length > 0) {
      setQuickPlayQueue([...baseQuickPlayEntries]);
    }
  }, [baseQuickPlayEntries, quickPlayQueue]);

  const trendingTracks = dedupeTracks(userTrendingTracks.length > 0 ? userTrendingTracks : recommendations.trendingForYou);
  const madeForYouTracks = dedupeTracks([
    ...recommendations.madeForYou,
    ...personalizedQuickPlayTracks,
  ]).slice(0, 6);
  const visibleQuickPlayEntries = quickPlayEntries.slice(0, quickPlayVisibleCount);
  const remainingQuickPlayCount = Math.max(0, quickPlayEntries.length - quickPlayVisibleCount);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="px-6 py-6 space-y-10"
    >
      {/* ── Hero Greeting ─────────────────────────────────────────────────── */}
      <motion.section
        variants={item}
        className="relative rounded-3xl overflow-hidden p-8 min-h-[220px] flex flex-col justify-between border"
        style={{
          background: isLightMode
            ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(255, 255, 255, 0.8) 45%, rgba(236, 72, 153, 0.12) 100%)'
            : 'linear-gradient(135deg, #180730 0%, #0d1326 45%, #180929 100%)',
          borderColor: isLightMode ? 'rgba(124, 58, 237, 0.18)' : 'rgba(255,255,255,0.08)',
        }}
      >
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-25 filter blur-2xl" style={{ background: 'radial-gradient(circle, #7c3aed, transparent)', transform: 'translate(25%, -25%)' }} />
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full opacity-20 filter blur-2xl" style={{ background: 'radial-gradient(circle, #ec4899, transparent)', transform: 'translate(-20%, 20%)' }} />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <p className={cn('text-sm font-medium', isLightMode ? 'text-slate-600' : 'text-white/50')}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>

            {/* Quick Analytics Teaser Badge */}
            <Link
              to="/stats"
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all shadow',
                isLightMode
                  ? 'bg-white/80 hover:bg-white border-violet-200 text-slate-700 hover:text-slate-900'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80 hover:text-white'
              )}
            >
              <Flame size={14} className="text-orange-400 fill-orange-400 animate-pulse" />
              <span>{currentStreakDays}d streak</span>
              <span className={cn(isLightMode ? 'text-slate-400' : 'text-white/30')}>•</span>
              <span className="text-violet-500">{totalHours}h listened</span>
              <ArrowRight size={13} className={cn(isLightMode ? 'text-slate-500' : 'text-white/40')} />
            </Link>
          </div>

          <h1 className={cn('font-display text-4xl font-extrabold tracking-tight mb-2', isLightMode ? 'text-slate-900' : 'text-white')}>
            {getTimeOfDay()} 👋
          </h1>
          <p className={cn('text-base mb-6 max-w-xl', isLightMode ? 'text-slate-700' : 'text-white/60')}>
            Personalized music tailored to your listening habits, liked tracks, and favorite genres.
          </p>

          <div className="flex flex-wrap gap-3">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => playQueue(recommendations.madeForYou)}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-violet-600/30"
            >
              <Play size={16} fill="white" /> Play Your Mix
            </motion.button>
            <Link
              to="/stats"
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-5 py-2.5 rounded-xl font-semibold text-sm border border-white/10 transition-colors"
            >
              <BarChart3 size={16} className="text-violet-400" /> View Analytics
            </Link>
          </div>
        </div>
      </motion.section>

      {/* ── Quick Play ────────────────────────────────────────────────────── */}
      <motion.section variants={item}>
        <SectionHeader title="Quick Play" description="Recently added songs" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {visibleQuickPlayEntries.map((track, idx) => {
            const isThisPlaying = currentTrack?.id === track.id && isPlaying;

            const handleCardClick = () => {
              if (isThisPlaying) {
                togglePlay();
              } else {
                const snapshotQueue = (quickPlayQueue ?? quickPlayEntries).map((entry) => ({ ...entry }));
                const targetIndex = snapshotQueue.findIndex((item) => item.id === track.id);
                setQuickPlayQueue(snapshotQueue);
                playQueue(snapshotQueue, targetIndex >= 0 ? targetIndex : 0);
              }
            };

            return (
              <motion.button
                key={`${track.id || track.title}-${idx}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCardClick}
                className={cn(
                  "group flex items-center gap-3 border rounded-xl overflow-hidden transition-all text-left",
                  isThisPlaying
                    ? "bg-violet-600/20 border-violet-500/40 shadow-lg shadow-violet-600/10"
                    : "bg-white/5 hover:bg-white/10 border-white/5"
                )}
              >
                <div className="relative w-14 h-14 flex-shrink-0">
                  <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                  {isThisPlaying && (
                    <div className="absolute inset-0 bg-violet-950/60 flex items-center justify-center">
                      <div className="flex items-end gap-0.5 h-3.5">
                        <span className="w-0.5 h-3.5 bg-violet-300 animate-pulse" />
                        <span className="w-0.5 h-2 bg-violet-300 animate-pulse delay-75" />
                        <span className="w-0.5 h-3 bg-violet-300 animate-pulse delay-150" />
                      </div>
                    </div>
                  )}
                </div>
                <span className={cn("text-sm font-semibold truncate pr-3 flex-1", isThisPlaying ? "text-violet-300" : "text-white")}>
                  {track.title}
                </span>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardClick();
                  }}
                  className={cn(
                    "mr-3 w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 shadow",
                    isThisPlaying
                      ? "bg-violet-500 opacity-100"
                      : "bg-violet-600 opacity-0 group-hover:opacity-100"
                  )}
                >
                  {isThisPlaying ? (
                    <Pause size={12} fill="white" className="text-white" />
                  ) : (
                    <Play size={12} fill="white" className="text-white ml-0.5" />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {remainingQuickPlayCount > 0 && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setQuickPlayVisibleCount((count) => Math.min(count + 5, quickPlayEntries.length))}
              className="text-xs font-medium text-violet-300 hover:text-violet-200 border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/15 rounded-full px-3 py-1.5 transition-colors"
            >
              {remainingQuickPlayCount >= 5 ? 'Show 5 more' : `Show ${remainingQuickPlayCount} more`}
            </button>
          </div>
        )}
      </motion.section>

      {/* ── SECTION 1: Made For You ────────────────────────────────────────── */}
      <motion.section variants={item}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-violet-400" />
              <h2 className="text-xl font-bold text-white">Made For You</h2>
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              Personalized selection scored using your genre affinity, liked songs, and play counts
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-white/40 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
            <Info size={12} />
            <span>Deterministic Scoring</span>
          </div>
        </div>
        <div className="glass rounded-2xl border border-white/5 overflow-visible">
          {madeForYouTracks.map((track, i) => (
            <MusicCard key={`${track.id}-${i}`} track={track} index={i} showIndex queue={madeForYouTracks} />
          ))}
        </div>
      </motion.section>

      {/* ── SECTION 2: New Releases ─────────────────────────────────────────── */}
      <motion.section variants={item}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-cyan-400" />
              <h2 className="text-xl font-bold text-white">New Releases</h2>
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              Fresh tracks and recent drops chosen for your tastes
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {newestReleaseTracks.slice(0, 5).map((track) => (
            <div
              key={track.id}
              onClick={() => playTrack(track)}
              className="group p-3 rounded-2xl bg-white/[0.02] hover:bg-white/5 border border-white/5 transition-all cursor-pointer"
            >
              <div className="relative aspect-square rounded-xl overflow-hidden mb-2.5 shadow">
                <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center text-white shadow-lg">
                    <Play size={16} fill="white" className="ml-0.5" />
                  </div>
                </div>
              </div>
              <h4 className="text-sm font-semibold text-white truncate">{track.title}</h4>
              <p className="text-xs text-white/50 truncate mt-0.5">{track.artist}</p>
              <span className="text-[10px] text-cyan-400 font-medium mt-1 inline-block bg-cyan-500/10 px-2 py-0.5 rounded-full">
                {track.genre}
              </span>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── SECTION 3: Because You Listened To ─────────────────────────────── */}
      {recommendations.becauseYouListenedTo && (
        <motion.section variants={item}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Compass size={18} className="text-pink-400" />
                <h2 className="text-xl font-bold text-white">
                  Because You Listened To{' '}
                  <span className="text-pink-400 underline decoration-pink-500/30">
                    "{recommendations.becauseYouListenedTo.seedTrack.title}"
                  </span>
                </h2>
              </div>
              <p className="text-xs text-white/50 mt-0.5">
                {recommendations.becauseYouListenedTo.seedReason} by{' '}
                {recommendations.becauseYouListenedTo.seedTrack.artist}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {recommendations.becauseYouListenedTo.tracks.map((track) => (
              <div
                key={track.id}
                onClick={() => playTrack(track)}
                className="group p-3 rounded-2xl bg-white/[0.02] hover:bg-white/5 border border-white/5 transition-all cursor-pointer"
              >
                <div className="relative aspect-square rounded-xl overflow-hidden mb-2.5 shadow">
                  <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center text-white shadow-lg">
                      <Play size={16} fill="white" className="ml-0.5" />
                    </div>
                  </div>
                </div>
                <h4 className="text-sm font-semibold text-white truncate">{track.title}</h4>
                <p className="text-xs text-white/50 truncate mt-0.5">{track.artist}</p>
                <span className="text-[10px] text-pink-400 font-medium mt-1 inline-block bg-pink-500/10 px-2 py-0.5 rounded-full">
                  {track.genre}
                </span>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* ── SECTION 4: Trending For You ────────────────────────────────────── */}
      <motion.section variants={item}>
        <SectionHeader title="Trending For You" description="Your most-played songs right now" seeAllHref="/explore" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {trendingTracks.map((track) => (
            <div
              key={track.id}
              onClick={() => playTrack(track)}
              className="group p-3 rounded-2xl bg-white/[0.02] hover:bg-white/5 border border-white/5 transition-all cursor-pointer"
            >
              <div className="relative aspect-square rounded-xl overflow-hidden mb-2.5 shadow">
                <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center text-white shadow-lg">
                    <Play size={16} fill="white" className="ml-0.5" />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold text-white truncate">{track.title}</h4>
                  <p className="text-xs text-white/50 truncate mt-0.5">{track.artist}</p>
                </div>
                {playCounts[track.id] ? (
                  <span className="text-[10px] font-semibold text-violet-300 bg-violet-500/10 px-2 py-1 rounded-full whitespace-nowrap">
                    {playCounts[track.id]} plays
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── SECTION 4: You May Also Like ──────────────────────────────────── */}
      <motion.section variants={item}>
        <SectionHeader title="You May Also Like" description="Fresh discoveries outside your standard rotation" />
        <div className="glass rounded-2xl border border-white/5 overflow-hidden">
          {recommendations.youMayAlsoLike.slice(0, 5).map((track, i) => (
            <MusicCard key={track.id} track={track} index={i} showIndex />
          ))}
        </div>
      </motion.section>

      {/* ── SECTION 5: Recommended Playlists ───────────────────────────────── */}
      <motion.section variants={item}>
        <SectionHeader title="Recommended Playlists" description="Curated collections aligned with your favorite genres" seeAllHref="/playlists" />
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {recommendations.recommendedPlaylists.map((pl) => (
            <PlaylistCard key={pl.id} playlist={pl} />
          ))}
        </div>
      </motion.section>

      {/* ── Genres ───────────────────────────────────────────────────────── */}
      <motion.section variants={item}>
        <SectionHeader title="Browse by Genre" seeAllHref="/search" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {genres.map((genre) => (
            <motion.button
              key={genre.id}
              onClick={() => navigate(`/search?q=${encodeURIComponent(genre.name)}`)}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="relative rounded-xl overflow-hidden h-20 text-left"
              style={{ background: `linear-gradient(135deg, ${genre.color}33, ${genre.color}11)`, border: `1px solid ${genre.color}22` }}
            >
              <img src={genre.imageUrl} alt={genre.name} className="absolute right-0 top-0 w-1/2 h-full object-cover opacity-30 rounded-r-xl" />
              <span className="absolute left-4 bottom-4 font-display font-bold text-white text-base">{genre.name}</span>
              <div className="absolute inset-0 rounded-xl" style={{ background: `linear-gradient(to right, ${genre.color}40, transparent)` }} />
            </motion.button>
          ))}
        </div>
      </motion.section>

      {/* ── Mood ─────────────────────────────────────────────────────────── */}
      <motion.section variants={item}>
        <SectionHeader title="Music for Every Mood" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {moodPlaylists.map((mood) => (
            <motion.button
              key={mood.id}
              onClick={() => navigate(`/search?q=${encodeURIComponent(mood.mood)}`)}
              whileHover={{ scale: 1.03, y: -3 }}
              whileTap={{ scale: 0.97 }}
              className="relative rounded-2xl overflow-hidden h-28 text-left border border-white/5"
              style={{ background: `linear-gradient(135deg, ${mood.gradient[0]}, ${mood.gradient[1]})` }}
            >
              <div className="absolute inset-0 opacity-10 bg-white" style={{ borderRadius: 'inherit' }} />
              <div className="absolute top-4 right-4 text-3xl">{mood.emoji}</div>
              <div className="absolute bottom-4 left-4">
                <p className="font-display font-bold text-white text-base">{mood.title}</p>
                <p className="text-white/60 text-xs mt-0.5">{mood.trackCount} tracks</p>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.section>
    </motion.div>
  );
}
