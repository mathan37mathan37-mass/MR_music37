import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Shuffle, Bookmark, BookmarkCheck, ChevronLeft,
  Share2, MoreHorizontal, Edit3, Copy, Trash2, GripVertical,
  Plus, X, Music, Globe, Lock, Clock
} from 'lucide-react';
import { usePlayerStore } from '@/store/playerStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useUIStore } from '@/store/uiStore';
import { CreatePlaylistModal } from '@/components/ui/CreatePlaylistModal';
import { tracks as allTracks } from '@/data/demo';
import { fetchPublicPlaylistsFromFirestore } from '@/services/firestoreService';
import { formatDuration, formatTotalDuration } from '@/utils/cn';
import type { Playlist } from '@/types';

export default function PlaylistDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    userPlaylists,
    getPlaylistById,
    isPlaylistSaved,
    toggleSavePlaylist,
    reorderPlaylistSongs,
    removeSongFromPlaylist,
    addSongToPlaylist,
    duplicatePlaylist,
    deletePlaylist,
  } = useLibraryStore();

  const { playTrack, playQueue } = usePlayerStore();
  const { addToast } = useUIStore();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddSongsOpen, setIsAddSongsOpen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [songSearch, setSongSearch] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [resolvedPlaylist, setResolvedPlaylist] = useState<Playlist | null>(null);

  const localPlaylist = useMemo(() => {
    return getPlaylistById(id || '') ?? userPlaylists.find((playlist) => playlist.id === id) ?? null;
  }, [id, userPlaylists, getPlaylistById]);

  useEffect(() => {
    if (id && localPlaylist) {
      setResolvedPlaylist(localPlaylist);
      return;
    }

    if (!id) {
      setResolvedPlaylist(null);
      return;
    }

    let isMounted = true;

    const loadRemotePlaylist = async () => {
      try {
        const publicPlaylists = await fetchPublicPlaylistsFromFirestore();
        const match = publicPlaylists.find((playlist) => playlist.id === id) ?? null;
        if (isMounted) {
          setResolvedPlaylist(match);
        }
      } catch {
        if (isMounted) {
          setResolvedPlaylist(null);
        }
      }
    };

    void loadRemotePlaylist();

    return () => {
      isMounted = false;
    };
  }, [id, localPlaylist]);

  const playlist = resolvedPlaylist ?? localPlaylist ?? null;

  if (!playlist) {
    return (
      <div className="px-6 py-10 max-w-3xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="rounded-3xl border border-white/10 bg-[#111120] p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Playlist not found</h1>
          <p className="text-white/60">This playlist may be private or no longer available.</p>
        </div>
      </div>
    );
  }

  const isSaved = isPlaylistSaved(playlist.id);

  const totalDuration = useMemo(() => {
    return playlist.tracks.reduce((acc, t) => acc + t.duration, 0);
  }, [playlist.tracks]);

  const filteredAvailableTracks = useMemo(() => {
    const query = songSearch.trim().toLowerCase();
    if (!query) return allTracks;

    return allTracks.filter((track) =>
      track.title.toLowerCase().includes(query) ||
      track.artist.toLowerCase().includes(query) ||
      track.genre.toLowerCase().includes(query) ||
      track.album.toLowerCase().includes(query)
    );
  }, [songSearch]);

  // Handle Drag & Drop reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    reorderPlaylistSongs(playlist.id, draggedIndex, targetIndex);
    setDraggedIndex(null);
    addToast('Reordered playlist songs', 'info');
  };

  const handlePlay = () => {
    if (playlist.tracks.length > 0) {
      playQueue(playlist.tracks);
    }
  };

  const handleShuffle = () => {
    if (playlist.tracks.length > 0) {
      const shuffled = [...playlist.tracks].sort(() => Math.random() - 0.5);
      playQueue(shuffled);
    }
  };

  const handleToggleSave = () => {
    const saved = toggleSavePlaylist(playlist.id);
    addToast(
      saved ? `Saved "${playlist.title}" to library` : `Removed "${playlist.title}" from library`,
      'success'
    );
  };

  const handleDuplicate = () => {
    setShowMoreMenu(false);
    const duplicated = duplicatePlaylist(playlist.id);
    if (duplicated) {
      addToast(`Duplicated to "${duplicated.title}"`, 'success');
      navigate(`/playlists/${duplicated.id}`);
    }
  };

  const handleDelete = () => {
    setShowMoreMenu(false);
    deletePlaylist(playlist.id);
    addToast(`Deleted "${playlist.title}"`, 'info');
    navigate('/playlists');
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    addToast('Playlist link copied to clipboard', 'info');
  };

  return (
    <div className="px-6 md:px-10 py-6 space-y-10 max-w-7xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
      >
        <ChevronLeft size={22} />
      </button>

      {/* Playlist Hero Banner */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-8 p-6 md:p-8 rounded-3xl glass border border-white/5 relative overflow-visible">
        {/* Glow */}
        <div
          className="absolute inset-0 opacity-20 filter blur-3xl scale-125 pointer-events-none"
          style={{
            background: playlist.coverUrl
              ? `url(${playlist.coverUrl})`
              : `linear-gradient(135deg, ${playlist.coverColors?.[0] || '#7c3aed'}, ${playlist.coverColors?.[1] || '#ec4899'})`,
            backgroundSize: 'cover',
          }}
        />

        {/* Cover Artwork */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative w-52 h-52 sm:w-60 sm:h-60 rounded-2xl overflow-hidden shadow-2xl ring-2 ring-white/10 flex-shrink-0 z-10 group"
        >
          {playlist.coverUrl ? (
            <img src={playlist.coverUrl} alt={playlist.title} className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-5xl"
              style={{
                background: `linear-gradient(135deg, ${playlist.coverColors?.[0] || '#4c1d95'}, ${playlist.coverColors?.[1] || '#1e1b4b'})`,
              }}
            >
              🎵
            </div>
          )}

          {/* Quick Edit Cover on hover */}
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs font-semibold gap-2 transition-opacity"
          >
            <Edit3 size={20} />
            <span>Change Details</span>
          </button>
        </motion.div>

        {/* Metadata */}
        <div className="relative z-10 space-y-3 text-center md:text-left flex-1 min-w-0">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-pink-400 bg-pink-500/10 px-3 py-1 rounded-full">
              Playlist
            </span>
            {playlist.isPublic ? (
              <span className="flex items-center gap-1 text-xs text-white/50 bg-white/5 px-2.5 py-0.5 rounded-full">
                <Globe size={11} /> Public
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-amber-400/80 bg-amber-500/10 px-2.5 py-0.5 rounded-full">
                <Lock size={11} /> Private
              </span>
            )}
          </div>

          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            {playlist.title}
          </h1>

          <p className="text-sm text-white/60">
            {playlist.description || 'A handpicked mix of energetic & ambient grooves.'}
          </p>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs text-white/50">
            <span className="font-semibold text-white">Created by {playlist.createdBy}</span>
            <span>•</span>
            <span>{playlist.tracks.length} {playlist.tracks.length === 1 ? 'song' : 'songs'}</span>
            <span>•</span>
            <span>{formatTotalDuration(totalDuration)}</span>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-3">
            <button
              onClick={handlePlay}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-2xl font-semibold text-sm shadow-xl shadow-violet-600/30 transition-all hover:scale-105 active:scale-95"
            >
              <Play size={16} fill="white" /> Play
            </button>

            <button
              onClick={handleShuffle}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-5 py-3 rounded-2xl font-semibold text-sm border border-white/10 transition-all hover:scale-105 active:scale-95"
            >
              <Shuffle size={16} /> Shuffle
            </button>

            <button
              onClick={handleToggleSave}
              className={`p-3 rounded-2xl border transition-all hover:scale-105 active:scale-95 ${
                isSaved ? 'bg-violet-600/20 border-violet-500 text-violet-400' : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70'
              }`}
              title={isSaved ? 'Remove from library' : 'Save playlist'}
            >
              {isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
            </button>

            <button
              onClick={handleShare}
              className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all hover:scale-105 active:scale-95"
              title="Share playlist"
            >
              <Share2 size={18} />
            </button>

            <button
              onClick={() => setIsAddSongsOpen(!isAddSongsOpen)}
              className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/80 hover:text-white transition-all"
            >
              <Plus size={15} /> Add Songs
            </button>

            {/* More Options dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all"
              >
                <MoreHorizontal size={18} />
              </button>

              <AnimatePresence>
                {showMoreMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-48 rounded-2xl bg-[#121222] border border-white/10 shadow-2xl p-1.5 z-[60]"
                  >
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        setIsEditModalOpen(true);
                      }}
                      className="w-full text-left px-3.5 py-2 rounded-xl text-xs text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-2.5 transition-colors"
                    >
                      <Edit3 size={14} className="text-violet-400" />
                      Edit Details
                    </button>
                    <button
                      onClick={handleDuplicate}
                      className="w-full text-left px-3.5 py-2 rounded-xl text-xs text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-2.5 transition-colors"
                    >
                      <Copy size={14} className="text-cyan-400" />
                      Duplicate Playlist
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full text-left px-3.5 py-2 rounded-xl text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-2.5 transition-colors border-t border-white/5 mt-1 pt-1.5"
                    >
                      <Trash2 size={14} />
                      Delete Playlist
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Add Songs Quick Drawer Panel */}
      <AnimatePresence>
        {isAddSongsOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-6 rounded-3xl glass border border-violet-500/20 bg-violet-950/20 space-y-4 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-violet-400" />
                <h3 className="text-sm font-bold text-white">Add Songs to "{playlist.title}"</h3>
              </div>
              <button
                onClick={() => setIsAddSongsOpen(false)}
                className="p-1 text-white/40 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={songSearch}
                onChange={(e) => setSongSearch(e.target.value)}
                placeholder="Search songs to add..."
                className="w-full rounded-xl border border-white/10 bg-[#0f1220]/80 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-violet-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1 no-scrollbar">
              {filteredAvailableTracks.map((track) => {
                const inPlaylist = playlist.tracks.some((t) => t.id === track.id);
                return (
                  <div
                    key={track.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img src={track.coverUrl} alt={track.title} className="w-9 h-9 rounded-lg object-cover" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{track.title}</p>
                        <p className="text-[11px] text-white/40 truncate">{track.artist}</p>
                      </div>
                    </div>
                    <button
                      disabled={inPlaylist}
                      onClick={() => {
                        addSongToPlaylist(playlist.id, track);
                        addToast(`Added "${track.title}" to ${playlist.title}`, 'success');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        inPlaylist
                          ? 'bg-white/5 text-white/30 cursor-default'
                          : 'bg-violet-600 hover:bg-violet-500 text-white shadow'
                      }`}
                    >
                      {inPlaylist ? 'Added' : '+ Add'}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Song List with Drag & Drop Reordering */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
            <Music size={20} className="text-violet-400" />
            Playlist Songs
          </h2>
          <span className="text-xs text-white/40">
            Drag items by handle to reorder
          </span>
        </div>

        {playlist.tracks.length > 0 ? (
          <div className="glass rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
            {playlist.tracks.map((track, idx) => (
              <div
                key={`${track.id}-${idx}`}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                className={`group flex items-center gap-3.5 px-4 py-3 hover:bg-white/5 transition-all cursor-pointer ${
                  draggedIndex === idx ? 'opacity-40 bg-violet-600/10' : ''
                }`}
                onClick={() => playTrack(track)}
              >
                {/* Drag Handle */}
                <div
                  className="p-1 text-white/20 group-hover:text-white/60 cursor-grab active:cursor-grabbing hover:bg-white/5 rounded"
                  title="Drag to reorder"
                  onClick={(e) => e.stopPropagation()}
                >
                  <GripVertical size={16} />
                </div>

                {/* Index / Play button */}
                <span className="w-5 text-center text-xs font-semibold text-white/40 group-hover:hidden">
                  {idx + 1}
                </span>
                <div className="w-5 hidden group-hover:flex items-center justify-center">
                  <Play size={13} fill="white" className="text-white" />
                </div>

                {/* Artwork */}
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 shadow">
                  <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                </div>

                {/* Title & Artist */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate group-hover:text-violet-400 transition-colors">
                    {track.title}
                  </p>
                  <p className="text-xs text-white/50 truncate">{track.artist}</p>
                </div>

                {/* Album (hidden on small) */}
                <span className="hidden md:block text-xs text-white/40 truncate w-44">
                  {track.album}
                </span>

                {/* Duration */}
                <span className="text-xs text-white/40 tabular-nums">
                  {formatDuration(track.duration)}
                </span>

                {/* Delete from playlist */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSongFromPlaylist(playlist.id, track.id);
                    addToast(`Removed "${track.title}" from playlist`, 'info');
                  }}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="Remove from playlist"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-16 rounded-2xl bg-white/5 border border-dashed border-white/10 text-center space-y-3">
            <Music size={32} className="mx-auto text-white/20" />
            <h4 className="text-base font-semibold text-white">This playlist has no songs yet</h4>
            <p className="text-xs text-white/40 max-w-sm mx-auto">
              Click the "Add Songs" button above to start curating your tracks.
            </p>
            <button
              onClick={() => setIsAddSongsOpen(true)}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition-colors"
            >
              Add Songs
            </button>
          </div>
        )}
      </section>

      {/* Edit Modal */}
      <CreatePlaylistModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        playlistToEdit={playlist}
      />
    </div>
  );
}
