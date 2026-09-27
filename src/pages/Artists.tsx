import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck } from 'lucide-react';
import { ArtistCard } from '@/components/ui/ArtistCard';
import { artists as demoArtists } from '@/data/demo';
import { useAdminStore } from '@/store/adminStore';

export default function Artists() {
  const navigate = useNavigate();
  const adminArtists = useAdminStore((s) => s.artists);

  const allArtists = useMemo(() => {
    const combined = [...adminArtists, ...demoArtists];
    const seen = new Set<string>();
    return combined.filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
  }, [adminArtists]);

  return (
    <div className="px-6 md:px-10 py-6 space-y-8 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center gap-2 text-violet-400 mb-1 text-sm font-medium">
          <UserCheck size={16} />
          <span>Artists Directory</span>
        </div>
        <h1 className="font-display text-3xl font-bold text-white tracking-tight">Artists</h1>
        <p className="text-white/50 text-sm mt-1">{allArtists.length} verified creators and performers</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {allArtists.map((artist) => (
          <ArtistCard key={artist.id} artist={artist} />
        ))}
      </div>
    </div>
  );
}
