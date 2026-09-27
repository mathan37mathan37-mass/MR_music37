import { useMemo } from 'react';
import { DownloadCloud, Play, Trash2, HardDrive } from 'lucide-react';
import { MusicCard } from '@/components/ui/MusicCard';
import { tracks } from '@/data/demo';
import { useLibraryStore } from '@/store/libraryStore';
import { usePlayerStore } from '@/store/playerStore';
import { useUIStore } from '@/store/uiStore';
import { useAdminStore } from '@/store/adminStore';
import { formatTotalDuration } from '@/utils/cn';

export default function Downloads() {
  const { downloadedTrackIds, toggleDownload } = useLibraryStore();
  const { songs: adminSongs } = useAdminStore();
  const { playQueue } = usePlayerStore();
  const { addToast } = useUIStore();

  const downloadedTracks = useMemo(() => {
    const allTracks = [...adminSongs, ...tracks];
    const seen = new Set<string>();
    return allTracks.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return downloadedTrackIds.includes(t.id);
    });
  }, [adminSongs, downloadedTrackIds]);

  const totalDuration = useMemo(() => {
    return downloadedTracks.reduce((acc, t) => acc + t.duration, 0);
  }, [downloadedTracks]);

  // Rough estimation of offline storage used: ~3.5MB per track
  const estimatedSizeMb = (downloadedTracks.length * 3.6).toFixed(1);

  return (
    <div className="px-6 py-6 pb-32 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 mb-1 text-sm font-medium">
            <DownloadCloud size={16} />
            <span>Offline Playback</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-white tracking-tight">Downloads</h1>
          <p className="text-white/50 text-sm mt-1">
            {downloadedTracks.length} tracks • {formatTotalDuration(totalDuration)} • {estimatedSizeMb} MB stored locally
          </p>
        </div>

        {downloadedTracks.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => playQueue(downloadedTracks)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold text-xs shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95"
            >
              <Play size={14} fill="white" /> Play All Offline
            </button>
          </div>
        )}
      </div>

      {/* Track List */}
      {downloadedTracks.length > 0 ? (
        <div className="glass rounded-2xl border border-white/5 divide-y divide-white/5">
          {downloadedTracks.map((track, i) => (
            <div key={track.id} className="relative group">
              <MusicCard track={track} index={i} showIndex />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDownload(track.id);
                  addToast(`Removed "${track.title}" from downloads`, 'info');
                }}
                className="absolute right-16 top-1/2 -translate-y-1/2 p-2 rounded-lg opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Remove download"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-16 rounded-2xl bg-white/5 border border-dashed border-white/10 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-white/30">
            <HardDrive size={28} />
          </div>
          <h3 className="text-lg font-bold text-white">No downloaded songs yet</h3>
          <p className="text-xs text-white/40 max-w-sm mx-auto">
            Save your favorite tracks for offline listening without relying on internet data.
          </p>
        </div>
      )}
    </div>
  );
}
