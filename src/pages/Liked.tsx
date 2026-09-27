import { useMemo } from 'react';
import { Heart, Play, Shuffle } from 'lucide-react';
import { MusicCard } from '@/components/ui/MusicCard';
import { tracks as demoTracks } from '@/data/demo';
import { usePlayerStore } from '@/store/playerStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useAdminStore } from '@/store/adminStore';
import { useSettingsStore } from '@/store/settingsStore';
import { cn, formatTotalDuration } from '@/utils/cn';

export default function Liked() {
  const theme = useSettingsStore((s) => s.theme);
  const { playQueue } = usePlayerStore();
  const { likedSongIds } = useLibraryStore();
  const adminSongs = useAdminStore((s) => s.songs);
  const isLightMode =
    theme === 'light' ||
    (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches);

  const likedTracks = useMemo(() => {
    const combined = [...adminSongs, ...demoTracks];
    const seen = new Set<string>();
    const allTracks = combined.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
    return allTracks.filter((t) => likedSongIds.includes(t.id));
  }, [adminSongs, likedSongIds]);

  const totalDuration = useMemo(() => {
    return likedTracks.reduce((acc, t) => acc + t.duration, 0);
  }, [likedTracks]);

  const handleShufflePlay = () => {
    if (likedTracks.length > 0) {
      const shuffled = [...likedTracks].sort(() => Math.random() - 0.5);
      playQueue(shuffled);
    }
  };

  return (
    <div className="px-6 py-6 pb-32 space-y-8 max-w-7xl mx-auto">
      {/* Hero header */}
      <div
        className={cn(
          'flex flex-col sm:flex-row items-center sm:items-end gap-6 p-8 rounded-3xl overflow-hidden relative shadow-2xl border',
          isLightMode ? 'border-violet-200/60' : 'border-white/5'
        )}
        style={{
          background: isLightMode
            ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.14), rgba(255,255,255,0.92), rgba(236, 72, 153, 0.09))'
            : 'linear-gradient(135deg, #3b0764, #0f172a)',
        }}
      >
        <div className="absolute inset-0 opacity-25" style={{ background: 'radial-gradient(circle at 80% 50%, #7c3aed, transparent)' }} />
        <div
          className="relative z-10 w-32 h-32 rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-2xl flex-shrink-0"
          style={{ boxShadow: '0 12px 40px rgba(124,58,237,0.5)' }}
        >
          <Heart size={52} fill="white" className="text-white" />
        </div>
        <div className="relative z-10 text-center sm:text-left">
          <p className={cn('text-xs font-semibold uppercase tracking-widest mb-1', isLightMode ? 'text-slate-600' : 'text-white/60')}>Playlist</p>
          <h1 className={cn('font-display text-4xl sm:text-5xl font-extrabold mb-2 tracking-tight', isLightMode ? 'text-slate-900' : 'text-white')}>Liked Songs</h1>
          <p className={cn('text-sm', isLightMode ? 'text-slate-700' : 'text-white/60')}>
            {likedTracks.length} {likedTracks.length === 1 ? 'song' : 'songs'} • {formatTotalDuration(totalDuration)}
          </p>
          {likedTracks.length > 0 && (
            <div className="flex items-center justify-center sm:justify-start gap-3 mt-5">
              <button
                onClick={() => playQueue(likedTracks)}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-violet-600/30 hover:scale-105 active:scale-95"
              >
                <Play size={16} fill="white" /> Play All
              </button>
              <button
                onClick={handleShufflePlay}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm border transition-all hover:scale-105 active:scale-95',
                  isLightMode
                    ? 'bg-white/80 text-slate-800 border-violet-200 hover:bg-white'
                    : 'bg-white/10 hover:bg-white/15 text-white border-white/10'
                )}
              >
                <Shuffle size={16} /> Shuffle
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Track list */}
      {likedTracks.length > 0 ? (
        <div className={cn('rounded-2xl border divide-y', isLightMode ? 'glass border-violet-100 divide-violet-100/60' : 'glass border-white/5 divide-white/5')}>
          {likedTracks.map((track, i) => (
            <MusicCard key={track.id} track={track} index={i} showIndex />
          ))}
        </div>
      ) : (
        <div className={cn('p-16 rounded-2xl border border-dashed text-center space-y-3', isLightMode ? 'bg-white border-violet-200/60' : 'bg-white/5 border-white/10')}>
          <Heart size={36} className={cn('mx-auto', isLightMode ? 'text-slate-300' : 'text-white/20')} />
          <h3 className={cn('text-lg font-bold', isLightMode ? 'text-slate-900' : 'text-white')}>No liked songs yet</h3>
          <p className={cn('text-xs max-w-sm mx-auto', isLightMode ? 'text-slate-600' : 'text-white/40')}>
            Songs you like with the heart button will be saved here for easy listening.
          </p>
        </div>
      )}
    </div>
  );
}
