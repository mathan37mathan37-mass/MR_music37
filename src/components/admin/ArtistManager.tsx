import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic2, Plus, Search, Edit2, Trash2, CheckCircle2,
  Users, Music, X, Check, Globe
} from 'lucide-react';
import { useAdminStore } from '@/store/adminStore';
import { FileUploadZone } from './FileUploadZone';
import { ConfirmDialog } from './ConfirmDialog';
import type { Artist } from '@/types';
import type { ArtistFormData } from '@/types/admin';
import { formatNumber } from '@/utils/cn';

interface ArtistManagerProps {
  isCreateOpen?: boolean;
  onCloseCreate?: () => void;
}

export function ArtistManager({ isCreateOpen = false, onCloseCreate }: ArtistManagerProps) {
  const { artists, songs, addArtist, updateArtist, deleteArtist } = useAdminStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
  const [showAddModal, setShowAddModal] = useState(isCreateOpen);
  const [deletingArtist, setDeletingArtist] = useState<Artist | null>(null);

  const [formData, setFormData] = useState<ArtistFormData>({
    name: '',
    genres: ['Electronic'],
    imageUrl: '',
    bio: '',
    verified: true,
    monthlyListeners: 1500000,
    followers: 420000,
  });

  const [genreInput, setGenreInput] = useState('');

  const filteredArtists = artists.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.genres.some((g) => g.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleOpenEdit = (artist: Artist) => {
    setEditingArtist(artist);
    setFormData({
      name: artist.name,
      genres: artist.genres,
      imageUrl: artist.imageUrl,
      bio: artist.bio || '',
      verified: artist.verified,
      monthlyListeners: artist.monthlyListeners,
      followers: artist.followers,
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingArtist) {
      updateArtist(editingArtist.id, {
        name: formData.name,
        genres: formData.genres,
        imageUrl: formData.imageUrl || editingArtist.imageUrl,
        bio: formData.bio,
        verified: formData.verified,
        monthlyListeners: Number(formData.monthlyListeners),
        followers: Number(formData.followers),
      });
      setEditingArtist(null);
    } else {
      addArtist(formData);
      setShowAddModal(false);
      onCloseCreate?.();
    }

    setFormData({
      name: '',
      genres: ['Electronic'],
      imageUrl: '',
      bio: '',
      verified: true,
      monthlyListeners: 1500000,
      followers: 420000,
    });
  };

  const handleAddGenre = () => {
    if (!genreInput.trim()) return;
    if (!formData.genres.includes(genreInput.trim())) {
      setFormData({ ...formData, genres: [...formData.genres, genreInput.trim()] });
    }
    setGenreInput('');
  };

  const handleRemoveGenre = (genre: string) => {
    setFormData({ ...formData, genres: formData.genres.filter((g) => g !== genre) });
  };

  return (
    <div className="space-y-6">
      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Mic2 size={20} className="text-pink-400" />
            Artist Management
            <span className="text-xs font-normal text-white/40">({filteredArtists.length} registered)</span>
          </h2>
          <p className="text-xs text-white/50 mt-0.5">
            Manage official artist profiles, biographies, verification badges and follower counts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search artist name, genre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500 w-60"
            />
          </div>

          <button
            onClick={() => {
              setEditingArtist(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold shadow-lg shadow-pink-600/20 transition-all cursor-pointer"
          >
            <Plus size={14} /> Add Artist
          </button>
        </div>
      </div>

      {/* ── Artists Grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {filteredArtists.map((artist) => {
          const trackCount = songs.filter((s) => s.artistId === artist.id || s.artist === artist.name).length;

          return (
            <div
              key={artist.id}
              className="glass p-4 rounded-3xl border border-white/5 hover:border-white/15 transition-all group relative overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-square rounded-2xl overflow-hidden mb-3 shadow-lg">
                  <img
                    src={artist.imageUrl}
                    alt={artist.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {artist.verified && (
                    <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 backdrop-blur-md text-cyan-400 shadow">
                      <CheckCircle2 size={15} />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-sm text-white truncate">{artist.name}</h3>
                  <span className="text-[11px] text-white/40 tabular-nums flex items-center gap-1 flex-shrink-0">
                    <Music size={11} /> {trackCount} tracks
                  </span>
                </div>

                <p className="text-[11px] text-white/50 line-clamp-2 mt-1 min-h-[32px]">
                  {artist.bio || 'No artist biography provided.'}
                </p>

                <div className="flex flex-wrap gap-1 mt-2.5">
                  {artist.genres.map((g) => (
                    <span key={g} className="text-[9px] font-semibold bg-white/5 text-white/70 px-2 py-0.5 rounded-full border border-white/5">
                      {g}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-[11px] text-pink-400 font-semibold tabular-nums">
                  {formatNumber(artist.monthlyListeners)} monthly
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(artist)}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                    title="Edit Artist"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => setDeletingArtist(artist)}
                    className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors"
                    title="Delete Artist"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Add / Edit Artist Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {(showAddModal || editingArtist) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowAddModal(false);
                setEditingArtist(null);
                onCloseCreate?.();
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-3xl bg-[#14121d] border border-white/10 p-6 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-pink-600/20 text-pink-400 border border-pink-500/20">
                    <Mic2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {editingArtist ? `Edit Artist: ${editingArtist.name}` : 'Register New Official Artist'}
                    </h3>
                    <p className="text-xs text-white/40">Artist profile image, biography and streaming metrics</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingArtist(null);
                    onCloseCreate?.();
                  }}
                  className="p-1.5 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-white/80">Artist Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Luna Eclipse"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500"
                  />
                </div>

                {/* Artist Photo Upload */}
                <FileUploadZone
                  type="image"
                  storagePath="artists/avatars"
                  currentUrl={formData.imageUrl}
                  onUploadSuccess={(url) => setFormData((prev) => ({ ...prev, imageUrl: url }))}
                  label="Artist Profile Image *"
                  helperText="Square 1:1 image recommended (Max 6MB)"
                />

                <div className="space-y-1.5">
                  <label className="font-semibold text-white/80">Biography</label>
                  <textarea
                    rows={3}
                    placeholder="Write artist background story, musical influences..."
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500 resize-none"
                  />
                </div>

                {/* Genres Tag Selector */}
                <div className="space-y-2">
                  <label className="font-semibold text-white/80">Genres</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add genre tag..."
                      value={genreInput}
                      onChange={(e) => setGenreInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddGenre();
                        }
                      }}
                      className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-pink-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddGenre}
                      className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {formData.genres.map((g) => (
                      <span key={g} className="flex items-center gap-1.5 bg-pink-500/15 text-pink-300 border border-pink-500/30 px-2.5 py-1 rounded-full text-[11px] font-medium">
                        {g}
                        <button type="button" onClick={() => handleRemoveGenre(g)} className="hover:text-white">
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Metrics & Verification */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-white/80">Monthly Listeners</label>
                    <input
                      type="number"
                      value={formData.monthlyListeners}
                      onChange={(e) => setFormData({ ...formData, monthlyListeners: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-pink-500 tabular-nums"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-white/80">Followers</label>
                    <input
                      type="number"
                      value={formData.followers}
                      onChange={(e) => setFormData({ ...formData, followers: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-pink-500 tabular-nums"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="verifiedToggle"
                    checked={formData.verified}
                    onChange={(e) => setFormData({ ...formData, verified: e.target.checked })}
                    className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 cursor-pointer"
                  />
                  <label htmlFor="verifiedToggle" className="font-semibold text-white cursor-pointer select-none">
                    Verified Artist Badge (Displays blue checkmark on profile & tracks)
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingArtist(null);
                      onCloseCreate?.();
                    }}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-semibold shadow-lg shadow-pink-600/30 transition-all cursor-pointer"
                  >
                    <Check size={14} />
                    <span>{editingArtist ? 'Save Artist Profile' : 'Register Artist'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Confirm Delete Dialog ────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={Boolean(deletingArtist)}
        title="Delete Artist Profile"
        description="Are you sure you want to remove this artist from the platform? Their catalog entries and statistics will be unlinked."
        itemName={deletingArtist?.name}
        confirmLabel="Yes, Delete Artist"
        onConfirm={() => {
          if (deletingArtist) {
            deleteArtist(deletingArtist.id);
            setDeletingArtist(null);
          }
        }}
        onClose={() => setDeletingArtist(null)}
      />
    </div>
  );
}
