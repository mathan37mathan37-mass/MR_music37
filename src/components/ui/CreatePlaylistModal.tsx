import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Music2, Globe, Lock, Image as ImageIcon } from 'lucide-react';
import { useLibraryStore } from '@/store/libraryStore';
import { useUIStore } from '@/store/uiStore';
import { useAnalyticsStore } from '@/store/analyticsStore';
import type { Playlist } from '@/types';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlistToEdit?: Playlist | null;
  onSuccess?: (playlist: Playlist) => void;
}

const PRESET_COVERS = [
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80',
  'https://images.unsplash.com/photo-1446941611757-91d2c3bd3d45?w=600&q=80',
  'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600&q=80',
  'https://images.unsplash.com/photo-1519112232436-9e8442e69960?w=600&q=80',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=80',
  'https://images.unsplash.com/photo-1518972734183-c205f3d6f512?w=600&q=80',
];

export function CreatePlaylistModal({ isOpen, onClose, playlistToEdit, onSuccess }: CreatePlaylistModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState(PRESET_COVERS[0]);
  const [isPublic, setIsPublic] = useState(true);

  const { createPlaylist, updatePlaylist } = useLibraryStore();
  const { addToast } = useUIStore();

  useEffect(() => {
    if (playlistToEdit) {
      setName(playlistToEdit.title);
      setDescription(playlistToEdit.description || '');
      setCoverUrl(playlistToEdit.coverUrl || PRESET_COVERS[0]);
      setIsPublic(playlistToEdit.isPublic ?? true);
    } else {
      setName('');
      setDescription('');
      setCoverUrl(PRESET_COVERS[0]);
      setIsPublic(true);
    }
  }, [playlistToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (playlistToEdit) {
      updatePlaylist(playlistToEdit.id, {
        title: name.trim(),
        description: description.trim(),
        coverUrl,
        isPublic,
      });
      addToast(`Updated playlist "${name}"`, 'success');
      onSuccess?.({ ...playlistToEdit, title: name.trim(), description: description.trim(), coverUrl, isPublic });
    } else {
      const created = createPlaylist(name, description, coverUrl, isPublic);
      useAnalyticsStore.getState().recordPlaylistCreated();
      addToast(`Created playlist "${name}"`, 'success');
      onSuccess?.(created);
    }

    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-[#0e0e1a] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center">
                <Music2 size={20} />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-white">
                  {playlistToEdit ? 'Edit Playlist' : 'Create New Playlist'}
                </h3>
                <p className="text-xs text-white/50">Curate your favorite tracks and collections</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Name input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Playlist Name <span className="text-pink-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Awesome Playlist"
                required
                autoFocus
                className="w-full bg-white/5 border border-white/10 focus:border-violet-500/60 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all focus:ring-2 focus:ring-violet-500/20"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add an optional description..."
                rows={2}
                className="w-full bg-white/5 border border-white/10 focus:border-violet-500/60 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-all resize-none"
              />
            </div>

            {/* Cover image picker */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/60 flex items-center justify-between">
                <span>Cover Artwork</span>
                <span className="text-[11px] text-white/40 normal-case">Pick a preset or enter URL</span>
              </label>

              {/* Presets row */}
              <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1">
                {PRESET_COVERS.map((url, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setCoverUrl(url)}
                    className={`w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                      coverUrl === url ? 'border-violet-500 scale-105 shadow-md shadow-violet-500/30' : 'border-white/10 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt={`Preset ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>

              {/* URL field */}
              <div className="relative">
                <ImageIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="url"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-violet-500/50"
                />
              </div>
            </div>

            {/* Visibility Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-3">
                {isPublic ? <Globe size={16} className="text-violet-400" /> : <Lock size={16} className="text-amber-400" />}
                <div>
                  <p className="text-xs font-semibold text-white">{isPublic ? 'Public Playlist' : 'Private Playlist'}</p>
                  <p className="text-[11px] text-white/40">
                    {isPublic ? 'Anyone can view and save this playlist' : 'Only you can access this playlist'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className={`w-11 h-6 rounded-full transition-colors relative ${isPublic ? 'bg-violet-600' : 'bg-white/20'}`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${isPublic ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </button>
            </div>

            {/* Buttons: Create / Cancel */}
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-colors shadow-lg shadow-violet-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {playlistToEdit ? 'Save Changes' : 'Create Playlist'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
