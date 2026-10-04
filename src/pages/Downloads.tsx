import { useMemo } from 'react';
import { DownloadCloud, Play, Trash2, HardDrive, HardDriveDownload, Wifi, WifiOff } from 'lucide-react';
import { MusicCard } from '@/components/ui/MusicCard';
import { tracks } from '@/data/demo';
import { useLibraryStore } from '@/store/libraryStore';
import { usePlayerStore } from '@/store/playerStore';
import { useUIStore } from '@/store/uiStore';
import { useAdminStore } from '@/store/adminStore';
import { formatTotalDuration } from '@/utils/cn';

export default function Downloads() {
  const { downloadedTrackIds, toggleDownload, downloadTrackFile } = useLibraryStore();
  const { songs: adminSongs } = useAdminStore();
  const { playQueue } = usePlayerStore();
  const { addToast } = useUIStore();

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

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
            <span className={`flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              isOnline
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              {isOnline ? <Wifi size={9} /> : <WifiOff size={9} />}
              {isOnline ? 'Online' : 'Offline Mode'}
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold text-white tracking-tight">Downloads</h1>
          <p className="text-white/50 text-sm mt-1">
            {downloadedTracks.length} tracks • {formatTotalDuration(totalDuration)} • ~{estimatedSizeMb} MB cached
          </p>
        </div>

        {downloadedTracks.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => playQueue(downloadedTracks)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold text-xs shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95"
            >
              <Play size={14} fill="white" /> Play All Offline
            </button>
            <button
              onClick={() => {
                downloadedTracks.forEach((t) => downloadTrackFile(t));
                addToast(`Saving ${downloadedTracks.length} tracks to your device…`, 'success');
              }}
              className="flex items-center gap-2 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 hover:text-cyan-200 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all hover:scale-105 active:scale-95"
            >
              <HardDriveDownload size={14} /> Save All to Device
            </button>
          </div>
        )}
      </div>

      {/* Info banner if offline */}
      {!isOnline && downloadedTracks.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
          <WifiOff size={18} className="flex-shrink-0" />
          <span>You're offline. Playing from your local cache — {downloadedTracks.length} tracks available.</span>
        </div>
      )}

      {/* Track List */}
      {downloadedTracks.length > 0 ? (
        <div className="glass rounded-2xl border border-white/5 divide-y divide-white/5">
          {downloadedTracks.map((track, i) => (
            <div key={track.id} className="relative group">
              <MusicCard track={track} index={i} showIndex queue={downloadedTracks} />
              {/* Save to device button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  downloadTrackFile(track);
                  addToast(`Saving "${track.title}" to your device…`, 'success');
                }}
                className="absolute right-24 top-1/2 -translate-y-1/2 p-2 rounded-lg opacity-0 group-hover:opacity-100 text-white/30 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
                title="Save to device"
              >
                <HardDriveDownload size={14} />
              </button>
              {/* Remove download button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDownload(track);
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
            Tap the <strong>⋯ menu</strong> on any track and choose{' '}
            <strong>Download Offline</strong> to cache it locally, or{' '}
            <strong>Save to Device</strong> to download the audio file directly.
          </p>
        </div>
      )}
    </div>
  );
}
