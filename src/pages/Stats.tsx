import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Play, Music, Flame, Award, Calendar, BarChart3,
  TrendingUp, Sparkles, CheckCircle2, Lock, ArrowUpRight,
  Heart, Disc, Radio, Compass, ListPlus, Repeat, Activity,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAnalyticsStore } from '@/store/analyticsStore';
import { usePlayerStore } from '@/store/playerStore';
import { useLibraryStore } from '@/store/libraryStore';
import { tracks as allTracks, artists as allArtists } from '@/data/demo';
import { formatDuration } from '@/utils/cn';
import { cn } from '@/utils/cn';

export default function Stats() {
  const {
    totalListeningSeconds,
    songsPlayedCount,
    currentStreakDays,
    achievements,
    getTopSong,
    getTopArtist,
    getTopGenre,
    getWeeklyListening,
    getMonthlyTotalHours,
    playCounts,
    genrePlayCounts,
    artistPlayCounts,
  } = useAnalyticsStore();

  const { playTrack, currentTrack, isPlaying } = usePlayerStore();
  const { likedSongIds, isSongLiked, toggleLikeSong } = useLibraryStore();

  const [hoveredDay, setHoveredDay] = useState<{ day: string; minutes: number; date: string } | null>(null);
  const [achievementFilter, setAchievementFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const topSongData = getTopSong();
  const topArtistData = getTopArtist();
  const topGenreData = getTopGenre();
  const weeklyListening = getWeeklyListening();
  const monthlyHours = getMonthlyTotalHours();

  // Calculate formatted total hours and minutes
  const totalMinutes = Math.floor(totalListeningSeconds / 60);
  const displayHours = Math.floor(totalMinutes / 60);
  const displayRemainingMins = totalMinutes % 60;

  // Most played songs list (Top 5)
  const rankedSongs = Object.entries(playCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([trackId, plays]) => {
      const track = allTracks.find((t) => t.id === trackId || t.id === `t${trackId}`);
      return track ? { track, plays } : null;
    })
    .filter((item): item is { track: (typeof allTracks)[0]; plays: number } => Boolean(item))
    .filter((item, idx, arr) => arr.findIndex((x) => x.track.id === item.track.id) === idx)
    .slice(0, 5);

  // Top artists distribution (Top 4)
  const rankedArtists = Object.entries(artistPlayCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([artistName, plays]) => {
      const artistObj = allArtists.find((a) => a.name === artistName);
      return {
        name: artistName,
        plays,
        imageUrl: artistObj?.imageUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80',
        id: artistObj?.id || '1',
      };
    });

  // Total genre plays for percentage calculation
  const totalGenrePlays = Object.values(genrePlayCounts).reduce((acc, val) => acc + val, 0) || 1;
  const topGenresRanked = Object.entries(genrePlayCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre, count]) => ({
      genre,
      count,
      percentage: Math.round((count / totalGenrePlays) * 100),
    }));

  // Max weekly minutes for scaling chart bars
  const maxWeeklyMins = Math.max(...weeklyListening.map((d) => d.minutes), 80);
  const totalWeeklyMinutes = weeklyListening.reduce((acc, curr) => acc + curr.minutes, 0);

  // Filtered achievements
  const filteredAchievements = achievements.filter((ach) => {
    if (achievementFilter === 'unlocked') return ach.unlocked;
    if (achievementFilter === 'locked') return !ach.unlocked;
    return true;
  });

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const renderAchievementIcon = (iconName: string) => {
    switch (iconName) {
      case 'Music': return <Music size={20} />;
      case 'Award': return <Award size={20} />;
      case 'Clock': return <Clock size={20} />;
      case 'ListPlus': return <ListPlus size={20} />;
      case 'Compass': return <Compass size={20} />;
      case 'Flame': return <Flame size={20} />;
      case 'Repeat': return <Repeat size={20} />;
      case 'Activity': return <Activity size={20} />;
      default: return <Sparkles size={20} />;
    }
  };

  return (
    <div className="px-6 py-8 space-y-10 max-w-7xl mx-auto">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/20">
              <BarChart3 size={20} />
            </span>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Music Analytics
            </h1>
          </div>
          <p className="text-sm text-white/50 mt-1.5 ml-11">
            Personalized listening statistics, taste profiles, and milestone achievements.
          </p>
        </div>

        {/* Streak & Status Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-orange-500/20 via-amber-500/15 to-orange-500/20 border border-orange-500/30 text-orange-300 shadow-lg shadow-orange-500/10">
            <Flame size={18} className="text-orange-400 animate-pulse fill-orange-400" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {currentStreakDays} Day Streak
            </span>
          </div>

          <Link
            to="/"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5 text-xs font-semibold transition-all"
          >
            <span>Home</span>
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {/* ── Top Metric Highlights Grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Listening Time */}
        <div className="glass p-5 rounded-3xl border border-white/5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-white/40 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Listening</span>
            <span className="p-2 rounded-xl bg-violet-600/10 text-violet-400">
              <Clock size={16} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-extrabold text-white tracking-tight">
              {displayHours}h {displayRemainingMins}m
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-emerald-400 font-medium">
            <TrendingUp size={14} />
            <span>+18% from last week</span>
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-violet-600/10 filter blur-xl group-hover:bg-violet-600/20 transition-all pointer-events-none" />
        </div>

        {/* 2. Songs Played */}
        <div className="glass p-5 rounded-3xl border border-white/5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-white/40 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Songs Played</span>
            <span className="p-2 rounded-xl bg-pink-600/10 text-pink-400">
              <Music size={16} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-extrabold text-white tracking-tight">
              {songsPlayedCount}
            </span>
            <span className="text-xs text-white/40">tracks</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-white/50">
            <span>Monthly Total: {monthlyHours} hours</span>
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-pink-600/10 filter blur-xl group-hover:bg-pink-600/20 transition-all pointer-events-none" />
        </div>

        {/* 3. Favorite Genre */}
        <div className="glass p-5 rounded-3xl border border-white/5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-white/40 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Top Genre</span>
            <span className="p-2 rounded-xl bg-cyan-600/10 text-cyan-400">
              <Disc size={16} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-white tracking-tight truncate">
              {topGenreData?.genre || 'Synthwave'}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2.5">
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-400 rounded-full"
                style={{ width: `${topGenreData?.percentage || 35}%` }}
              />
            </div>
            <span className="text-xs text-cyan-300 font-semibold tabular-nums">
              {topGenreData?.percentage || 35}%
            </span>
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-cyan-600/10 filter blur-xl group-hover:bg-cyan-600/20 transition-all pointer-events-none" />
        </div>

        {/* 4. Active Listening Streak */}
        <div className="glass p-5 rounded-3xl border border-white/5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-white/40 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Consistency</span>
            <span className="p-2 rounded-xl bg-orange-600/10 text-orange-400">
              <Flame size={16} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-extrabold text-orange-300 tracking-tight">
              {currentStreakDays} Days
            </span>
          </div>
          <p className="text-xs text-white/50 mt-2.5">
            Personal record: 14 days
          </p>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-orange-600/10 filter blur-xl group-hover:bg-orange-600/20 transition-all pointer-events-none" />
        </div>
      </div>

      {/* ── Row: Charts Section (Weekly Listening & Top Genres) ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Weekly Listening Bar Chart */}
        <div className="lg:col-span-2 glass p-6 rounded-3xl border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">Daily Listening Activity</h2>
              <p className="text-xs text-white/40">Minutes listened per day over the past 7 days</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-white/40 uppercase tracking-wider block">7-Day Total</span>
              <span className="text-base font-bold text-violet-400 tabular-nums">
                {Math.round(totalWeeklyMinutes / 60 * 10) / 10} hrs
              </span>
            </div>
          </div>

          {/* SVG Interactive Bar Chart */}
          <div className="relative pt-6 pb-2">
            {/* Tooltip Hover Overlay */}
            {hoveredDay && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-semibold shadow-xl pointer-events-none flex items-center gap-2">
                <span>{hoveredDay.day} ({hoveredDay.date}):</span>
                <span className="font-bold">{hoveredDay.minutes} mins</span>
              </div>
            )}

            <div className="grid grid-cols-7 gap-3 sm:gap-6 items-end h-48 sm:h-56 px-2">
              {weeklyListening.map((item, idx) => {
                const heightPercent = Math.min(100, Math.max(8, (item.minutes / maxWeeklyMins) * 100));
                const isToday = idx === 6;

                return (
                  <div
                    key={item.date}
                    onMouseEnter={() => setHoveredDay(item)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className="flex flex-col items-center gap-2.5 group cursor-pointer h-full justify-end"
                  >
                    <span className="text-[11px] font-mono text-white/40 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
                      {item.minutes}m
                    </span>

                    {/* Bar Pillar */}
                    <div className="w-full max-w-[42px] bg-white/5 rounded-2xl overflow-hidden p-1 flex items-end h-full">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPercent}%` }}
                        transition={{ duration: 0.6, delay: idx * 0.08, ease: 'easeOut' }}
                        className={cn(
                          'w-full rounded-xl transition-all',
                          isToday
                            ? 'bg-gradient-to-t from-violet-600 via-pink-500 to-rose-400 shadow-lg shadow-pink-500/25'
                            : 'bg-gradient-to-t from-violet-800 to-violet-500 group-hover:brightness-125'
                        )}
                      />
                    </div>

                    {/* Day Label */}
                    <span
                      className={cn(
                        'text-xs font-semibold transition-colors',
                        isToday ? 'text-violet-400 font-bold' : 'text-white/40 group-hover:text-white'
                      )}
                    >
                      {item.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Top Genres Breakdown */}
        <div className="glass p-6 rounded-3xl border border-white/5 flex flex-col justify-between">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white">Genre Distribution</h2>
            <p className="text-xs text-white/40">Affinity calculated from plays and likes</p>
          </div>

          <div className="space-y-4 my-auto">
            {topGenresRanked.map((item, index) => {
              const colors = [
                'from-violet-500 to-indigo-500',
                'from-pink-500 to-rose-500',
                'from-cyan-500 to-blue-500',
                'from-amber-500 to-orange-500',
                'from-emerald-500 to-teal-500',
              ];
              const gradient = colors[index % colors.length];

              return (
                <div key={item.genre} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white/90">{item.genre}</span>
                    <span className="text-white/40 tabular-nums font-mono">{item.percentage}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percentage}%` }}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                      className={cn('h-full rounded-full bg-gradient-to-r', gradient)}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-white/5 text-[11px] text-white/40 flex items-center justify-between">
            <span>Data updated dynamically</span>
            <span className="text-violet-400 font-medium">Deterministic Taste Index</span>
          </div>
        </div>
      </div>

      {/* ── Row: Most Played Songs & Top Artists ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Played Songs */}
        <div className="glass p-6 rounded-3xl border border-white/5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-white">Most Played Tracks</h2>
              <p className="text-xs text-white/40">Your all-time on-repeat anthems</p>
            </div>
            <span className="text-xs font-semibold text-violet-400 bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/20">
              Leaderboard
            </span>
          </div>

          <div className="space-y-2">
            {rankedSongs.map(({ track, plays }, index) => {
              const isCurrent = currentTrack?.id === track.id;
              const medals = ['🥇', '🥈', '🥉'];

              return (
                <div
                  key={`${track.id}-${index}`}
                  className={cn(
                    'group flex items-center gap-3.5 p-2.5 rounded-2xl transition-all border border-transparent',
                    isCurrent ? 'bg-violet-600/15 border-violet-500/30' : 'hover:bg-white/5 hover:border-white/5'
                  )}
                >
                  <span className="w-6 text-center font-bold text-xs text-white/40 group-hover:text-white">
                    {medals[index] || `#${index + 1}`}
                  </span>

                  <div className="relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 shadow">
                    <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                    <button
                      onClick={() => playTrack(track)}
                      className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                    >
                      <Play size={16} fill="white" className="ml-0.5" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-semibold truncate', isCurrent ? 'text-violet-300' : 'text-white')}>
                      {track.title}
                    </p>
                    <p className="text-xs text-white/50 truncate">{track.artist}</p>
                  </div>

                  <div className="text-right flex items-center gap-3">
                    <div className="hidden sm:block">
                      <span className="text-xs font-bold text-white tabular-nums block">{plays}</span>
                      <span className="text-[10px] text-white/40 uppercase">plays</span>
                    </div>

                    <button
                      onClick={() => toggleLikeSong(track)}
                      className="p-2 text-white/40 hover:text-white transition-colors"
                      title={isSongLiked(track.id) ? 'Liked' : 'Like'}
                    >
                      <Heart
                        size={15}
                        className={cn(isSongLiked(track.id) && 'fill-pink-500 text-pink-500')}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Artists Distribution */}
        <div className="glass p-6 rounded-3xl border border-white/5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-white">Top Artists</h2>
              <p className="text-xs text-white/40">Musicians you listen to the most</p>
            </div>
            <Link
              to="/artists"
              className="text-xs font-semibold text-white/50 hover:text-white flex items-center gap-1 transition-colors"
            >
              <span>View All</span>
              <ArrowUpRight size={13} />
            </Link>
          </div>

          <div className="space-y-3">
            {rankedArtists.map((artist, idx) => (
              <Link
                key={artist.name}
                to={`/artists/${artist.id}`}
                className="flex items-center gap-3.5 p-2.5 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all group"
              >
                <span className="w-5 text-center font-bold text-xs text-white/40">
                  {idx + 1}
                </span>

                <img
                  src={artist.imageUrl}
                  alt={artist.name}
                  className="w-11 h-11 rounded-full object-cover shadow ring-1 ring-white/10 group-hover:ring-violet-500/50 transition-all"
                />

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-white group-hover:text-violet-300 transition-colors truncate">
                    {artist.name}
                  </h4>
                  <p className="text-xs text-white/40">Verified Artist</p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-violet-400 tabular-nums block">{artist.plays}</span>
                  <span className="text-[10px] text-white/40">streams</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Achievements Section ──────────────────────────────────────────────── */}
      <div className="space-y-5 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Award size={22} className="text-amber-400" />
              <h2 className="text-2xl font-display font-extrabold text-white">
                Milestones & Achievements
              </h2>
            </div>
            <p className="text-xs text-white/50 mt-1">
              Unlock badges by playing music, exploring genres, and curating playlists.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center bg-white/5 p-1 rounded-2xl border border-white/5 text-xs font-semibold">
            <button
              onClick={() => setAchievementFilter('all')}
              className={cn(
                'px-3 py-1.5 rounded-xl transition-all',
                achievementFilter === 'all'
                  ? 'bg-violet-600 text-white shadow'
                  : 'text-white/50 hover:text-white'
              )}
            >
              All ({achievements.length})
            </button>
            <button
              onClick={() => setAchievementFilter('unlocked')}
              className={cn(
                'px-3 py-1.5 rounded-xl transition-all',
                achievementFilter === 'unlocked'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-white/50 hover:text-white'
              )}
            >
              Unlocked ({unlockedCount})
            </button>
            <button
              onClick={() => setAchievementFilter('locked')}
              className={cn(
                'px-3 py-1.5 rounded-xl transition-all',
                achievementFilter === 'locked'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-white/50 hover:text-white'
              )}
            >
              In Progress ({achievements.length - unlockedCount})
            </button>
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredAchievements.map((ach) => {
            const percent = Math.min(100, Math.round((ach.current / ach.target) * 100));

            return (
              <motion.div
                key={ach.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  'p-5 rounded-3xl border transition-all flex flex-col justify-between relative overflow-hidden',
                  ach.unlocked
                    ? 'glass border-amber-500/20 shadow-lg shadow-amber-500/5'
                    : 'bg-white/[0.02] border-white/5 opacity-75'
                )}
              >
                {/* Header Icon + Status Badge */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-2xl flex items-center justify-center shadow-md',
                        ach.unlocked
                          ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-black font-bold'
                          : 'bg-white/5 text-white/40'
                      )}
                    >
                      {renderAchievementIcon(ach.icon)}
                    </div>

                    {ach.unlocked ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                        <CheckCircle2 size={12} />
                        Unlocked
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
                        <Lock size={11} />
                        In Progress
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-white text-base leading-snug">{ach.title}</h3>
                  <p className="text-xs text-white/50 mt-1 leading-relaxed">{ach.description}</p>
                </div>

                {/* Progress bar and milestone stats */}
                <div className="mt-5 pt-3 border-t border-white/5">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-white/40 capitalize">{ach.category}</span>
                    <span className="font-semibold text-white/80 tabular-nums">
                      {ach.current} / {ach.target} {ach.unit}
                    </span>
                  </div>

                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-700',
                        ach.unlocked ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-violet-500'
                      )}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  {ach.unlockedAt && (
                    <span className="text-[10px] text-white/30 mt-2 block">
                      Earned: {ach.unlockedAt}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
