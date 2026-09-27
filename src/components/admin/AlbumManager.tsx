import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Disc, Plus, Search, Edit2, Trash2, Check, X,
  Music, Calendar, Layers
} from 'lucide-react';
import { useAdminStore } from '@/store/adminStore';
import { FileUploadZone } from './FileUploadZone';
import { ConfirmDialog } from './ConfirmDialog';
import type { Album } from '@/types';
import type { AlbumFormData } from '@/types/admin';

interface AlbumManagerProps {
  isCreateOpen?: boolean;
  onCloseCreate?: () => void;
}

export function AlbumManager({ isCreateOpen = false, onCloseCreate }: AlbumManagerProps) {
  const { albums, artists, songs, addAlbum, updateAlbum, deleteAlbum } = useAdminStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [showAddModal, setShowAddModal] = useState(isCreateOpen);
  const [deletingAlbum, setDeletingAlbum] = useState<Album | null>(null);

  const [formData, setFormData] = useState<AlbumFormData>({
    title: '',
    artistId: artists[0]?.id || 'a1',
    genre: 'Electronic',
    year: new Date().getFullYear(),
    coverUrl: '',
    description: '',
    trackIds: [],
  });

  const filteredAlbums = albums.filter((al) =>
    al.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    al.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenEdit = (album: Album) => {
    setEditingAlbum(album);
    setFormData({
      title: album.title,
      artistId: album.artistId,
      genre: album.genre,
      year: album.year,
      coverUrl: album.coverUrl,
      description: album.description || '',
      trackIds: album.tracks.map((t) => t.id),
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    if (editingAlbum) {
      const artistObj = artists.find((a) => a.id === formData.artistId);
      const assignedTracks = songs.filter((s) => formData.trackIds.includes(s.id));

      updateAlbum(editingAlbum.id, {
        title: formData.title,
        artist: artistObj?.name || editingAlbum.artist,
        artistId: formData.artistId,
        genre: formData.genre,
        year: Number(formData.year),
        coverUrl: formData.coverUrl || editingAlbum.coverUrl,
        description: formData.description,
        trackCount: assignedTracks.length,
        tracks: assignedTracks,
      });
      setEditingAlbum(null);
    } else {
      addAlbum(formData);
      setShowAddModal(false);
      onCloseCreate?.();
    }

    setFormData({
      title: '',
      artistId: artists[0]?.id || 'a1',
      genre: 'Electronic',
      year: new Date().getFullYear(),
      coverUrl: '',
      description: '',
      trackIds: [],
    });
  };

  const toggleTrackAssignment = (trackId: string) => {
    if (formData.trackIds.includes(trackId)) {
      setFormData({ ...formData, trackIds: formData.trackIds.filter((id) => id !== trackId) });
    } else {
      setFormData({ ...formData, trackIds: [...formData.trackIds, trackId] });
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Disc size={20} className="text-amber-400" />
            Album Management
            <span className="text-xs font-normal text-white/40">({filteredAlbums.length} albums)</span>
          </h2>
          <p className="text-xs text-white/50 mt-0.5">
            Create studio albums, upload artwork, and curate multi-track tracklists
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search album title, artist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500 w-60"
            />
          </div>

          <button
            onClick={() => {
              setEditingAlbum(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
          >
            <Plus size={14} /> Create Album
          </button>
        </div>
      </div>

      {/* ── Albums Grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {filteredAlbums.map((album) => (
          <div
            key={album.id}
            className="glass p-4 rounded-3xl border border-white/5 hover:border-white/15 transition-all group relative flex flex-col justify-between"
          >
            <div>
              <div className="relative aspect-square rounded-2xl overflow-hidden mb-3 shadow-lg">
                <img
                  src={album.coverUrl}
                  alt={album.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-semibold text-white/90">
                  {album.year}
                </span>
              </div>

              <h3 className="font-bold text-sm text-white truncate">{album.title}</h3>
              <p className="text-xs text-white/50 truncate mt-0.5">{album.artist}</p>

              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  {album.genre}
                </span>
                <span className="text-[11px] text-white/40 flex items-center gap-1">
                  <Music size={11} /> {album.trackCount || album.tracks.length} tracks
                </span>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-end gap-1.5">
              <button
                onClick={() => handleOpenEdit(album)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                title="Edit Album"
              >
                <Edit2 size={13} />
              </button>
              <button
                onClick={() => setDeletingAlbum(album)}
                className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors"
                title="Delete Album"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Add / Edit Album Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {(showAddModal || editingAlbum) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowAddModal(false);
                setEditingAlbum(null);
                onCloseCreate?.();
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-3xl bg-[#14121d] border border-white/10 p-6 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/20">
                    <Disc size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {editingAlbum ? `Edit Album: ${editingAlbum.title}` : 'Publish Studio Album'}
                    </h3>
                    <p className="text-xs text-white/40">Set album release info, cover artwork and assigned tracklist</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingAlbum(null);
                    onCloseCreate?.();
                  }}
                  className="p-1.5 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-white/80">Album Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Northern Lights"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-white/80">Lead Artist *</label>
                    <select
                      value={formData.artistId}
                      onChange={(e) => setFormData({ ...formData, artistId: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#181622] border border-white/10 text-white focus:outline-none focus:border-amber-500"
                    >
                      {artists.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-white/80">Genre</label>
                    <input
                      type="text"
                      value={formData.genre}
                      onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-white/80">Release Year</label>
                    <input
                      type="number"
                      min={1950}
                      max={2030}
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-amber-500 tabular-nums"
                    />
                  </div>
                </div>

                <FileUploadZone
                  type="image"
                  storagePath="albums/covers"
                  currentUrl={formData.coverUrl}
                  onUploadSuccess={(url) => setFormData((prev) => ({ ...prev, coverUrl: url }))}
                  label="Album Artwork *"
                  helperText="High-res square artwork (Max 6MB)"
                />

                <div className="space-y-1.5">
                  <label className="font-semibold text-white/80">Album Description</label>
                  <textarea
                    rows={2}
                    placeholder="Concept notes, production credits..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                {/* Assign Songs Tracklist */}
                <div className="space-y-2 pt-3 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-white/80 flex items-center gap-1.5">
                      <Layers size={13} /> Select Album Tracks ({formData.trackIds.length} selected)
                    </label>
                    <span className="text-[11px] text-white/40">Select from song catalog</span>
                  </div>

                  <div className="max-h-48 overflow-y-auto rounded-2xl bg-white/[0.02] border border-white/5 p-2 space-y-1">
                    {songs.map((track) => {
                      const isSelected = formData.trackIds.includes(track.id);
                      return (
                        <div
                          key={track.id}
                          onClick={() => toggleTrackAssignment(track.id)}
                          className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
                            isSelected ? 'bg-amber-500/15 border border-amber-500/30' : 'hover:bg-white/5 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img src={track.coverUrl} alt="" className="w-7 h-7 rounded-lg object-cover" />
                            <div className="truncate">
                              <p className={`font-semibold truncate ${isSelected ? 'text-amber-300' : 'text-white'}`}>
                                {track.title}
                              </p>
                              <p className="text-[10px] text-white/40 truncate">{track.artist}</p>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${
                            isSelected ? 'bg-amber-500 border-amber-400 text-black' : 'border-white/20'
                          }`}>
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingAlbum(null);
                      onCloseCreate?.();
                    }}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold shadow-lg shadow-amber-600/30 transition-all cursor-pointer"
                  >
                    <Check size={14} />
                    <span>{editingAlbum ? 'Save Album' : 'Publish Album'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Confirm Delete Dialog ────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={Boolean(deletingAlbum)}
        title="Delete Album Release"
        description="Are you sure you want to remove this album? Tracks inside this album will remain in the catalog as singles."
        itemName={deletingAlbum?.title}
        confirmLabel="Yes, Delete Album"
        onConfirm={() => {
          if (deletingAlbum) {
            deleteAlbum(deletingAlbum.id);
            setDeletingAlbum(null);
          }
        }}
        onClose={() => setDeletingAlbum(null)}
      />
    </div>
  );
}
