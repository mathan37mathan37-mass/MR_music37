import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Music, Mic2, Disc, ListMusic, PlayCircle,
  TrendingUp, ArrowUpRight, Plus, Sparkles, Shield, Clock,
  Activity, BarChart3, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useAdminStore } from '@/store/adminStore';
import { formatNumber } from '@/utils/cn';

interface AdminOverviewProps {
  onNavigateTab: (tab: any) => void;
  onOpenCreateSong: () => void;
  onOpenCreateArtist: () => void;
  onOpenCreateAlbum: () => void;
}

export function AdminOverview({
  onNavigateTab,
  onOpenCreateSong,
  onOpenCreateArtist,
  onOpenCreateAlbum,
}: AdminOverviewProps) {
  const { getStats, activityLogs, songs, artists } = useAdminStore();
  const stats = getStats();

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '12m'>('7d');

  // Simulated chart data points for stream trajectory
  const streamDataPoints = [
    { label: 'Mon', plays: 14200, users: 420 },
    { label: 'Tue', plays: 18400, users: 510 },
    { label: 'Wed', plays: 16900, users: 480 },
    { label: 'Thu', plays: 22100, users: 620 },
    { label: 'Fri', plays: 28900, users: 790 },
    { label: 'Sat', plays: 34500, users: 950 },
    { label: 'Sun', plays: 31200, users: 880 },
  ];

  const maxPlays = Math.max(...streamDataPoints.map((d) => d.plays));

  // Top genres calculation from songs
  const genreCounts: Record<string, number> = {};
  songs.forEach((s) => {
    genreCounts[s.genre] = (genreCounts[s.genre] || 0) + 1;
  });
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const statCards = [
    {
      title: 'Total Users',
      value: formatNumber(stats.totalUsers),
      change: '+14% this month',
      icon: Users,
      color: 'from-blue-600/20 to-cyan-500/20 text-cyan-400 border-cyan-500/30',
      tab: 'users',
    },
    {
      title: 'Total Songs',
      value: stats.totalSongs,
      change: '+6 newly added',
      icon: Music,
      color: 'from-violet-600/20 to-purple-500/20 text-violet-400 border-violet-500/30',
      tab: 'songs',
    },
    {
      title: 'Total Artists',
      value: stats.totalArtists,
      change: '100% verified',
      icon: Mic2,
      color: 'from-pink-600/20 to-rose-500/20 text-pink-400 border-pink-500/30',
      tab: 'artists',
    },
    {
      title: 'Total Albums',
      value: stats.totalAlbums,
      change: 'Studio releases',
      icon: Disc,
      color: 'from-amber-600/20 to-orange-500/20 text-amber-400 border-amber-500/30',
      tab: 'albums',
    },
    {
      title: 'Total Playlists',
      value: stats.totalPlaylists,
      change: 'Editorial & User',
      icon: ListMusic,
      color: 'from-emerald-600/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
      tab: 'songs',
    },
    {
      title: 'Total Plays',
      value: formatNumber(stats.totalPlays),
      change: '+28.4k momentum',
      icon: PlayCircle,
      color: 'from-indigo-600/20 to-violet-500/20 text-indigo-300 border-indigo-500/30',
      tab: 'songs',
    },
  ];

  return (
    <div className="space-y-8">
      {/* ── Top Stat Cards Grid (6 Required Metrics) ────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => onNavigateTab(card.tab)}
              className="glass p-4 rounded-3xl border border-white/5 hover:border-white/15 transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                  {card.title}
                </span>
                <div className={`p-2 rounded-xl border bg-gradient-to-br ${card.color} shadow-sm`}>
                  <Icon size={16} />
                </div>
              </div>
              <p className="font-display text-2xl font-extrabold text-white tracking-tight">
                {card.value}
              </p>
              <div className="flex items-center gap-1 mt-2 text-[10px] text-white/40 font-medium">
                <TrendingUp size={11} className="text-emerald-400" />
                <span className="text-emerald-400/90">{card.change}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Quick Admin Actions Banner ───────────────────────────────────────── */}
      <div className="glass p-5 rounded-3xl border border-white/5 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-violet-950/30 via-black/40 to-pink-950/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Catalog Quick Actions</h3>
            <p className="text-xs text-white/40">Instantly deploy new tracks, verified artists, or studio albums</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={onOpenCreateSong}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/20 transition-all cursor-pointer"
          >
            <Plus size={14} /> New Song
          </button>
          <button
            onClick={onOpenCreateArtist}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-all cursor-pointer"
          >
            <Mic2 size={14} className="text-pink-400" /> New Artist
          </button>
          <button
            onClick={onOpenCreateAlbum}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-all cursor-pointer"
          >
            <Disc size={14} className="text-cyan-400" /> New Album
          </button>
        </div>
      </div>

      {/* ── Analytics Charts Section ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Streaming Trajectory Chart */}
        <div className="lg:col-span-2 glass p-6 rounded-3xl border border-white/5 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-violet-400" />
                <h3 className="text-base font-bold text-white">Platform Streams Over Time</h3>
              </div>
              <p className="text-xs text-white/40 mt-0.5">Real-time daily playback volume</p>
            </div>

            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5 text-xs font-medium">
              {(['7d', '30d', '12m'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    timeRange === r ? 'bg-violet-600 text-white shadow' : 'text-white/40 hover:text-white'
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Stream Chart */}
          <div className="h-56 w-full flex items-end justify-between gap-3 pt-6 pb-2 px-2">
            {streamDataPoints.map((d, idx) => {
              const heightPct = Math.round((d.plays / maxPlays) * 100);
              return (
                <div key={d.label} className="flex-1 flex flex-col items-center gap-2 group relative">
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 bg-black/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10 text-[10px] text-white pointer-events-none whitespace-nowrap shadow-xl z-20">
                    <span className="font-bold text-violet-400">{d.plays.toLocaleString()} plays</span>
                    <span className="text-white/40 block">+{d.users} active listeners</span>
                  </div>

                  {/* Bar */}
                  <div className="w-full bg-white/5 rounded-2xl h-44 flex items-end p-1.5 overflow-hidden">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPct}%` }}
                      transition={{ duration: 0.5, delay: idx * 0.05 }}
                      className="w-full rounded-xl bg-gradient-to-t from-violet-600 via-pink-500 to-cyan-400 shadow-md group-hover:brightness-125 transition-all"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-white/40 group-hover:text-white">
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs text-white/40">
            <span>Peak Day: Saturday (34,500 plays)</span>
            <span className="text-emerald-400 font-semibold">+18.5% compared to prior week</span>
          </div>
        </div>

        {/* Right 1 Col: Genre Distribution & Top Metrics */}
        <div className="glass p-6 rounded-3xl border border-white/5 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Genre Breakdown</h3>
              <p className="text-xs text-white/40 mt-0.5">Catalog distribution by genre</p>
            </div>
            <span className="p-2 rounded-xl bg-cyan-600/10 text-cyan-400 border border-cyan-500/20">
              <Disc size={16} />
            </span>
          </div>

          <div className="space-y-4">
            {topGenres.map(([genre, count]) => {
              const pct = Math.round((count / songs.length) * 100);
              return (
                <div key={genre} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-white">{genre}</span>
                    <span className="text-white/40 tabular-nums">{count} tracks ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-white/5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">
              Platform Health
            </h4>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-white/70 flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-400" /> Firebase Auth
                </span>
                <span className="text-emerald-400 font-medium">Operational</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-white/70 flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-400" /> Cloud Firestore
                </span>
                <span className="text-emerald-400 font-medium">Synchronized</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-white/70 flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-400" /> Storage Engine
                </span>
                <span className="text-emerald-400 font-medium">Ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Row: Recent Catalog Additions & Admin Audit Feed ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tracks */}
        <div className="glass p-6 rounded-3xl border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Catalog Highlights</h3>
              <p className="text-xs text-white/40">Latest songs in rotation</p>
            </div>
            <button
              onClick={() => onNavigateTab('songs')}
              className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1"
            >
              View All Songs <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="space-y-2">
            {songs.slice(0, 5).map((song) => (
              <div
                key={song.id}
                className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={song.coverUrl}
                    alt={song.title}
                    className="w-10 h-10 rounded-xl object-cover flex-shrink-0 shadow"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{song.title}</p>
                    <p className="text-xs text-white/40 truncate">{song.artist} • {song.genre}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-xs font-semibold text-violet-400 block">
                    {formatNumber(song.playCount)} plays
                  </span>
                  <span className="text-[11px] text-white/30">{song.year}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit / Activity Logs */}
        <div className="glass p-6 rounded-3xl border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Administrator Audit Trail</h3>
              <p className="text-xs text-white/40">Recent system actions and modifications</p>
            </div>
            <span className="p-2 rounded-xl bg-white/5 text-white/40">
              <Activity size={16} />
            </span>
          </div>

          <div className="space-y-2.5">
            {activityLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        log.action === 'create'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : log.action === 'delete' || log.action === 'block'
                          ? 'bg-rose-500/10 text-rose-400'
                          : 'bg-violet-500/10 text-violet-400'
                      }`}
                    >
                      {log.action}
                    </span>
                    <span className="text-xs font-semibold text-white truncate">
                      {log.entityTitle}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/50 truncate">
                    {log.details || `${log.action} on ${log.entityType}`} • By {log.adminName}
                  </p>
                </div>

                <span className="text-[10px] text-white/30 flex-shrink-0 whitespace-nowrap mt-1">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
