import { motion } from 'framer-motion';
import { Clock, Play, Trash2, Music } from 'lucide-react';
import { useLibraryStore } from '@/store/libraryStore';
import { usePlayerStore } from '@/store/playerStore';
import { useUIStore } from '@/store/uiStore';
import { formatDuration, formatTimeAgo } from '@/utils/cn';

export default function RecentlyPlayed() {
  const { recentlyPlayed, clearRecentlyPlayed } = useLibraryStore();
  const { playTrack, playQueue } = usePlayerStore();
  const { addToast } = useUIStore();

  const handleClear = () => {
    clearRecentlyPlayed();
    addToast('Recently played history cleared', 'info');
  };

  const handlePlayAll = () => {
    if (recentlyPlayed.length > 0) {
      playQueue(recentlyPlayed.map((item) => item.track));
    }
  };

  return (
    <div className="px-6 py-6 pb-32 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-violet-400 mb-1 text-sm font-medium">
            <Clock size={16} />
            <span>Listening History</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-white tracking-tight">Recently Played</h1>
          <p className="text-white/50 text-sm mt-1">
            Pick up right where you left off. Songs are automatically saved here as you play them.
          </p>
        </div>

        {recentlyPlayed.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={handlePlayAll}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-lg shadow-violet-600/30 transition-all"
            >
              <Play size={14} fill="white" />
              Play All
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-white/50 text-xs font-medium border border-white/5 transition-colors"
            >
              <Trash2 size={14} />
              Clear History
            </button>
          </div>
        )}
      </div>

      {/* List of Recently Played */}
      {recentlyPlayed.length > 0 ? (
        <div className="glass rounded-2xl border border-white/5 divide-y divide-white/5">
          {/* Table Header on medium+ screens */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider bg-white/[0.02]">
            <span className="col-span-1 text-center">#</span>
            <span className="col-span-4">Song</span>
            <span className="col-span-3">Album</span>
            <span className="col-span-2">Last Played</span>
            <span className="col-span-2 text-right">Duration</span>
          </div>

          {recentlyPlayed.map((item, idx) => (
            <motion.div
              key={`${item.track.id}-${item.playedAt}`}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="group flex md:grid md:grid-cols-12 items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition-colors cursor-pointer"
              onClick={() => playTrack(item.track)}
            >
              {/* Index & Play Button */}
              <div className="hidden md:flex col-span-1 items-center justify-center">
                <span className="text-xs font-medium text-white/40 group-hover:hidden">{idx + 1}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playTrack(item.track);
                  }}
                  className="hidden group-hover:flex w-7 h-7 rounded-full bg-violet-600 text-white items-center justify-center shadow"
                  title="Play"
                >
                  <Play size={12} fill="white" className="ml-0.5" />
                </button>
              </div>

              {/* Song & Artist (with Artwork) */}
              <div className="col-span-4 flex items-center gap-3.5 min-w-0 flex-1">
                <div className="w-11 h-11 rounded-lg overflow-hidden relative flex-shrink-0 shadow">
                  <img src={item.track.coverUrl} alt={item.track.title} className="w-full h-full object-cover" />
                  <div className="md:hidden absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                    <Play size={16} fill="white" className="text-white ml-0.5" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate group-hover:text-violet-400 transition-colors">
                    {item.track.title}
                  </p>
                  <p className="text-xs text-white/50 truncate mt-0.5">{item.track.artist}</p>
                </div>
              </div>

              {/* Album */}
              <div className="hidden md:block col-span-3 text-xs text-white/50 truncate">
                {item.track.album}
              </div>

              {/* Last Played */}
              <div className="col-span-2 flex items-center">
                <span className="text-xs font-medium text-violet-400/90 bg-violet-500/10 px-2.5 py-1 rounded-full whitespace-nowrap">
                  {formatTimeAgo(item.playedAt)}
                </span>
              </div>

              {/* Duration & Play action */}
              <div className="hidden md:flex col-span-2 items-center justify-end gap-3 text-xs text-white/40 tabular-nums">
                <span>{formatDuration(item.track.duration)}</span>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="p-16 rounded-2xl bg-white/5 border border-dashed border-white/10 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-white/30">
            <Music size={28} />
          </div>
          <h3 className="text-lg font-bold text-white">No recently played songs</h3>
          <p className="text-xs text-white/40 max-w-sm mx-auto">
            Start playing songs anywhere in the app, and they will automatically show up here.
          </p>
        </div>
      )}
    </div>
  );
}
