import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, ListMusic } from 'lucide-react';
import { PlaylistCard } from '@/components/ui/PlaylistCard';
import { CreatePlaylistModal } from '@/components/ui/CreatePlaylistModal';
import { playlists as initialPlaylists } from '@/data/demo';
import { useLibraryStore } from '@/store/libraryStore';

export default function Playlists() {
  const navigate = useNavigate();
  const { userPlaylists } = useLibraryStore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const allPlaylists = [
    ...userPlaylists,
    ...initialPlaylists.filter((playlist) => !userPlaylists.some((p) => p.id === playlist.id)),
  ];

  return (
    <div className="px-6 md:px-10 py-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-violet-400 mb-1 text-sm font-medium">
            <ListMusic size={16} />
            <span>Collections</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-white tracking-tight">Playlists</h1>
          <p className="text-white/50 text-sm mt-1">{allPlaylists.length} playlists curated for you</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-2xl font-semibold text-sm shadow-xl shadow-violet-600/30 transition-all cursor-pointer"
        >
          <Plus size={16} /> Create Playlist
        </motion.button>
      </div>

      {/* Grid of Playlists */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
        {allPlaylists.map((pl) => (
          <div key={pl.id} onClick={() => navigate(`/playlists/${pl.id}`)}>
            <PlaylistCard playlist={pl} className="w-full" />
          </div>
        ))}
      </div>

      {/* Create Modal */}
      <CreatePlaylistModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={(created) => navigate(`/playlists/${created.id}`)}
      />
    </div>
  );
}
