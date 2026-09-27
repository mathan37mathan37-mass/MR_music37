import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Globe, Music2 } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { AlbumCard } from '@/components/ui/AlbumCard';
import { MusicCard } from '@/components/ui/MusicCard';
import { PlaylistCard } from '@/components/ui/PlaylistCard';
import { albums, playlists, tracks, genres } from '@/data/demo';
import { useAdminStore } from '@/store/adminStore';
import { isFirebaseConfigured } from '@/services/firebase';

const featured = [
  { id: 'f1', title: 'Summer Hits 2024', subtitle: 'The hottest tracks of the season', gradient: ['#f59e0b', '#ef4444'], image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&q=80' },
  { id: 'f2', title: 'Electronic Frontier', subtitle: 'Pushing the boundaries of sound', gradient: ['#7c3aed', '#3b82f6'], image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=800&q=80' },
  { id: 'f3', title: 'Indie Spotlight', subtitle: 'Rising artists you need to hear', gradient: ['#22c55e', '#06b6d4'], image: 'https://images.unsplash.com/photo-1494232410401-ad00d5433cfa?w=800&q=80' },
];

export default function Explore() {
  const { songs: adminSongs } = useAdminStore();

  const chartTracks = useMemo(() => {
    const catalog = isFirebaseConfigured() ? adminSongs : tracks;

    if (catalog.length === 0) return [];

    const shuffled = [...catalog]
      .map((track) => ({ track, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ track }) => track)
      .slice(0, 8);

    return shuffled.length > 0 ? shuffled : catalog.slice(0, 8);
  }, [adminSongs]);

  return (
    <div className="px-6 py-6 space-y-10">
      <div>
        <h1 className="font-display text-3xl font-bold text-white mb-1">Explore</h1>
        <p className="text-white/50">Discover new music tailored for you</p>
      </div>

      {/* Featured Banner */}
      <section>
        <SectionHeader title="Featured" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {featured.map((f, i) => (
            <motion.div
              key={f.id}
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={`relative rounded-2xl overflow-hidden cursor-pointer ${i === 0 ? 'md:col-span-2' : ''}`}
              style={{ height: i === 0 ? 220 : 160 }}
            >
              <img src={f.image} alt={f.title} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${f.gradient[0]}cc, ${f.gradient[1]}66)` }} />
              <div className="absolute bottom-5 left-5">
                <h3 className="font-display font-bold text-white text-xl">{f.title}</h3>
                <p className="text-white/70 text-sm mt-1">{f.subtitle}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Charts */}
      <section>
        <SectionHeader title="🏆 Global Charts" description="Fresh tracks from the live catalog" />
        <div className="glass rounded-2xl border border-white/5 overflow-hidden">
          {chartTracks.length > 0 ? (
            chartTracks.map((track, i) => (
              <MusicCard key={track.id} track={track} index={i} showIndex />
            ))
          ) : (
            <div className="p-6 text-sm text-white/50">No tracks available yet.</div>
          )}
        </div>
      </section>

      {/* Editor's Picks */}
      <section>
        <SectionHeader title="Editor's Picks" seeAllHref="/playlists" />
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {playlists.slice(0, 5).map((pl) => (
            <PlaylistCard key={pl.id} playlist={pl} size="lg" />
          ))}
        </div>
      </section>

      {/* New Albums */}
      <section>
        <SectionHeader title="New Albums" seeAllHref="/albums" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {albums.map((album) => (
            <AlbumCard key={album.id} album={album} size="md" className="w-full" />
          ))}
        </div>
      </section>

      {/* Categories */}
      <section>
        <SectionHeader title="Browse Categories" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {genres.map((genre) => (
            <motion.button
              key={genre.id}
              whileHover={{ scale: 1.03 }}
              className="relative rounded-xl overflow-hidden h-24 text-left border border-white/5"
              style={{ background: `linear-gradient(135deg, ${genre.color}40, ${genre.color}15)` }}
            >
              <span className="absolute left-4 bottom-4 font-display font-bold text-white">{genre.name}</span>
            </motion.button>
          ))}
        </div>
      </section>
    </div>
  );
}
