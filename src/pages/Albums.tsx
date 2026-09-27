import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Disc3 } from 'lucide-react';
import { AlbumCard } from '@/components/ui/AlbumCard';
import { albums as demoAlbums } from '@/data/demo';
import { useAdminStore } from '@/store/adminStore';

export default function Albums() {
  const navigate = useNavigate();
  const adminAlbums = useAdminStore((s) => s.albums);

  const allAlbums = useMemo(() => {
    const combined = [...adminAlbums, ...demoAlbums];
    const seen = new Set<string>();
    return combined.filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
  }, [adminAlbums]);

  return (
    <div className="px-6 md:px-10 py-6 space-y-8 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center gap-2 text-pink-400 mb-1 text-sm font-medium">
          <Disc3 size={16} />
          <span>Discography</span>
        </div>
        <h1 className="font-display text-3xl font-bold text-white tracking-tight">Albums</h1>
        <p className="text-white/50 text-sm mt-1">{allAlbums.length} featured studio albums</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
        {allAlbums.map((album) => (
          <AlbumCard key={album.id} album={album} className="w-full" />
        ))}
      </div>
    </div>
  );
}
