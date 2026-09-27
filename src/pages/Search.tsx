import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search as SearchIcon, X, Clock, TrendingUp, Filter,
  Sparkles, Music, Disc, User, ListMusic, Compass
} from 'lucide-react';
import { MusicCard } from '@/components/ui/MusicCard';
import { AlbumCard } from '@/components/ui/AlbumCard';
import { ArtistCard } from '@/components/ui/ArtistCard';
import { PlaylistCard } from '@/components/ui/PlaylistCard';
import { tracks as demoTracks, albums, artists, playlists, genres } from '@/data/demo';
import { isFirebaseConfigured } from '@/services/firebase';
import { fetchPublicPlaylistsFromFirestore } from '@/services/firestoreService';
import { useLibraryStore } from '@/store/libraryStore';
import { useAdminStore } from '@/store/adminStore';
import { cn } from '@/utils/cn';
import type { Playlist } from '@/types';

type SearchFilter = 'all' | 'songs' | 'artists' | 'albums' | 'playlists' | 'genres';

const filterTabs: { label: string; value: SearchFilter; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { label: 'All', value: 'all', icon: Filter },
  { label: 'Songs', value: 'songs', icon: Music },
  { label: 'Artists', value: 'artists', icon: User },
  { label: 'Albums', value: 'albums', icon: Disc },
  { label: 'Playlists', value: 'playlists', icon: ListMusic },
  { label: 'Genres', value: 'genres', icon: Compass },
];

const trendingSearches = [
  'Celestial Drift',
  'Synthwave',
  'Late Night Drives',
  'Aurora Nights',
  'Northern Lights',
  'Ambient Electronic',
  'Focus Mode',
];

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(urlQuery);
  const [selectedFilter, setSelectedFilter] = useState<SearchFilter>('all');
  const [isFocused, setIsFocused] = useState(false);
  const [firestorePublicPlaylists, setFirestorePublicPlaylists] = useState<Playlist[]>([]);

  const adminSongs = useAdminStore((s) => s.songs);

  // Merge admin-uploaded songs with demo tracks, deduplicated by id
  const tracks = useMemo(() => {
    const seen = new Set<string>();
    return [...adminSongs, ...demoTracks].filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [adminSongs]);

  const {
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
    userPlaylists,
  } = useLibraryStore();

  useEffect(() => {
    let isMounted = true;

    const loadPublicPlaylists = async () => {
      if (!isFirebaseConfigured()) {
        if (isMounted) setFirestorePublicPlaylists([]);
        return;
      }

      try {
        const publicPlaylists = await fetchPublicPlaylistsFromFirestore();
        if (isMounted) setFirestorePublicPlaylists(publicPlaylists);
      } catch {
        if (isMounted) setFirestorePublicPlaylists([]);
      }
    };

    void loadPublicPlaylists();
    return () => {
      isMounted = false;
    };
  }, []);

  // Public playlists should be searchable across demo and user-created content.
  const publicPlaylists = useMemo(() => {
    const seen = new Set<string>();
    return [...playlists, ...userPlaylists, ...firestorePublicPlaylists].filter((playlist) => {
      if (!playlist.isPublic) return false;
      if (seen.has(playlist.id)) return false;
      seen.add(playlist.id);
      return true;
    });
  }, [userPlaylists, firestorePublicPlaylists]);

  // Keep query in sync with URL param if it changes
  useEffect(() => {
    if (urlQuery !== query) {
      setQuery(urlQuery);
    }
  }, [urlQuery]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (val) {
      setSearchParams({ q: val }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const handleExecuteSearch = (searchTerm: string) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    setSearchParams({ q: trimmed }, { replace: true });
    addRecentSearch(trimmed);
    setIsFocused(false);
  };

  // Autocomplete suggestions based on query
  const suggestions = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    const q = query.toLowerCase();
    const results: string[] = [];

    tracks.forEach((t) => {
      if (t.title.toLowerCase().includes(q) && !results.includes(t.title)) results.push(t.title);
      if (t.artist.toLowerCase().includes(q) && !results.includes(t.artist)) results.push(t.artist);
    });
    albums.forEach((a) => {
      if (a.title.toLowerCase().includes(q) && !results.includes(a.title)) results.push(a.title);
    });
    publicPlaylists.forEach((p) => {
      if (p.title.toLowerCase().includes(q) && !results.includes(p.title)) results.push(p.title);
    });

    return results.slice(0, 6);
  }, [query, tracks, publicPlaylists]);

  // Filtered search items across all collections
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;

    const matchedTracks = tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q) ||
        t.genre.toLowerCase().includes(q)
    );

    const matchedArtists = artists.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.genres.some((g) => g.toLowerCase().includes(q))
    );

    const matchedAlbums = albums.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.artist.toLowerCase().includes(q) ||
        a.genre.toLowerCase().includes(q)
    );

    const matchedPlaylists = publicPlaylists.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
    );

    const matchedGenres = genres.filter((g) => g.name.toLowerCase().includes(q));

    const totalMatches =
      matchedTracks.length +
      matchedArtists.length +
      matchedAlbums.length +
      matchedPlaylists.length +
      matchedGenres.length;

    return {
      tracks: matchedTracks,
      artists: matchedArtists,
      albums: matchedAlbums,
      playlists: matchedPlaylists,
      genres: matchedGenres,
      totalMatches,
    };
  }, [query, tracks, publicPlaylists]);

  return (
    <div className="px-6 py-6 space-y-8 max-w-7xl mx-auto">
      {/* Search Input Bar & Autocomplete */}
      <div className="relative max-w-2xl">
        <div className="relative">
          <SearchIcon
            size={20}
            className={cn(
              'absolute left-4 top-1/2 -translate-y-1/2 transition-colors',
              query ? 'text-violet-400' : 'text-white/40'
            )}
          />
          <input
            type="text"
            value={query}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleExecuteSearch(query);
              }
            }}
            placeholder="Search songs, artists, albums, playlists, or genres..."
            autoFocus
            className="w-full bg-[#111120] border border-white/10 focus:border-violet-500/60 rounded-2xl pl-12 pr-12 py-4 text-white text-base placeholder:text-white/30 outline-none transition-all shadow-xl shadow-black/40 focus:ring-2 focus:ring-violet-500/20"
          />
          {query && (
            <button
              onClick={() => handleQueryChange('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Live Search Suggestions Dropdown */}
        <AnimatePresence>
          {isFocused && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute top-full left-0 right-0 mt-2 bg-[#121222] border border-white/10 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-xl overflow-hidden"
            >
              <div className="text-[11px] font-semibold text-white/40 uppercase tracking-wider px-3 py-1.5 flex items-center gap-1.5">
                <Sparkles size={12} className="text-violet-400" />
                Suggestions
              </div>
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onMouseDown={() => handleExecuteSearch(s)}
                  className="w-full text-left px-3.5 py-2 rounded-xl text-sm text-white/80 hover:text-white hover:bg-violet-600/20 flex items-center gap-2.5 transition-colors"
                >
                  <SearchIcon size={14} className="text-white/40" />
                  <span>{s}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Filter Tabs when query exists */}
      {query.trim().length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {filterTabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = selectedFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setSelectedFilter(tab.value)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 border',
                  isSelected
                    ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-600/30'
                    : 'bg-white/5 border-white/8 text-white/60 hover:text-white hover:bg-white/10'
                )}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Area */}
      <AnimatePresence mode="wait">
        {!searchResults ? (
          /* Default State: Recent Searches, Trending, and Browse Genres */
          <motion.div
            key="browse"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-10"
          >
            {/* 1. Recent Searches with clear / remove actions */}
            {recentSearches.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-violet-400" />
                    <h2 className="font-display text-lg font-bold text-white">Recent Searches</h2>
                  </div>
                  <button
                    onClick={clearRecentSearches}
                    className="text-xs text-white/40 hover:text-red-400 transition-colors"
                  >
                    Clear history
                  </button>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {recentSearches.map((term) => (
                    <div
                      key={term}
                      className="group flex items-center bg-white/5 hover:bg-white/10 border border-white/8 rounded-xl pl-3.5 pr-2 py-2 text-sm text-white/80 hover:text-white transition-all shadow-sm"
                    >
                      <button
                        onClick={() => handleExecuteSearch(term)}
                        className="flex items-center gap-2 mr-2"
                      >
                        <Clock size={13} className="text-white/40 group-hover:text-violet-400 transition-colors" />
                        <span>{term}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRecentSearch(term);
                        }}
                        className="p-1 rounded-md text-white/30 hover:text-red-400 hover:bg-white/10 transition-colors"
                        title="Remove"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 2. Trending Searches */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-pink-400" />
                <h2 className="font-display text-lg font-bold text-white">Trending Searches</h2>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {trendingSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => handleExecuteSearch(term)}
                    className="flex items-center gap-2 bg-gradient-to-r from-violet-900/30 to-pink-900/20 hover:from-violet-800/40 hover:to-pink-800/30 border border-violet-500/20 hover:border-violet-500/40 rounded-xl px-4 py-2 text-sm text-white/80 hover:text-white transition-all shadow-sm"
                  >
                    <Sparkles size={13} className="text-pink-400" />
                    <span>{term}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* 3. Browse All Genres */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Compass size={16} className="text-violet-400" />
                <h2 className="font-display text-lg font-bold text-white">Browse Genres & Moods</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {genres.map((genre) => (
                  <motion.button
                    key={genre.id}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleExecuteSearch(genre.name)}
                    className="relative rounded-2xl overflow-hidden h-28 text-left border border-white/10 shadow-lg group cursor-pointer"
                    style={{
                      background: `linear-gradient(135deg, ${genre.color}66, #0d0d18)`,
                    }}
                  >
                    <img
                      src={genre.imageUrl}
                      alt={genre.name}
                      className="absolute right-0 top-0 w-3/5 h-full object-cover opacity-25 group-hover:opacity-40 group-hover:scale-105 transition-all duration-300"
                    />
                    <div className="relative z-10 p-4 h-full flex flex-col justify-end">
                      <span className="font-display text-base font-bold text-white group-hover:text-glow">
                        {genre.name}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </section>
          </motion.div>
        ) : searchResults.totalMatches === 0 ? (
          /* No Results State */
          <motion.div
            key="no-results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center py-20 px-4 max-w-md mx-auto"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 text-white/30 shadow-inner">
              <SearchIcon size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No results for "{query}"</h3>
            <p className="text-sm text-white/50 leading-relaxed mb-6">
              Please check your spelling, try shorter keywords, or search for an artist, album, or genre like "Electronic" or "Aurora".
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Aurora Nights', 'Neon Horizon', 'Pop', 'Alternative'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleExecuteSearch(suggestion)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-violet-600/30 text-xs font-medium text-white/70 hover:text-violet-300 border border-white/10 transition-all"
                >
                  Try "{suggestion}"
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          /* Search Results Layout */
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-10"
          >
            {/* Top Song / Songs Section */}
            {(selectedFilter === 'all' || selectedFilter === 'songs') && searchResults.tracks.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                    <Music size={18} className="text-violet-400" />
                    Songs
                    <span className="text-xs font-normal text-white/40">({searchResults.tracks.length})</span>
                  </h2>
                </div>
                <div className="glass rounded-2xl border border-white/5 overflow-visible divide-y divide-white/5">
                  {searchResults.tracks.map((track, i) => (
                    <MusicCard key={track.id} track={track} index={i} showIndex />
                  ))}
                </div>
              </section>
            )}

            {/* Artists Section */}
            {(selectedFilter === 'all' || selectedFilter === 'artists') && searchResults.artists.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <User size={18} className="text-pink-400" />
                  Artists
                  <span className="text-xs font-normal text-white/40">({searchResults.artists.length})</span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {searchResults.artists.map((artist) => (
                    <ArtistCard key={artist.id} artist={artist} />
                  ))}
                </div>
              </section>
            )}

            {/* Albums Section */}
            {(selectedFilter === 'all' || selectedFilter === 'albums') && searchResults.albums.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Disc size={18} className="text-violet-400" />
                  Albums
                  <span className="text-xs font-normal text-white/40">({searchResults.albums.length})</span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                  {searchResults.albums.map((album) => (
                    <AlbumCard key={album.id} album={album} />
                  ))}
                </div>
              </section>
            )}

            {/* Playlists Section */}
            {(selectedFilter === 'all' || selectedFilter === 'playlists') && searchResults.playlists.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <ListMusic size={18} className="text-cyan-400" />
                  Playlists
                  <span className="text-xs font-normal text-white/40">({searchResults.playlists.length})</span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
                  {searchResults.playlists.map((playlist) => (
                    <PlaylistCard key={playlist.id} playlist={playlist} />
                  ))}
                </div>
              </section>
            )}

            {/* Genres Section */}
            {(selectedFilter === 'all' || selectedFilter === 'genres') && searchResults.genres.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Compass size={18} className="text-amber-400" />
                  Genres
                  <span className="text-xs font-normal text-white/40">({searchResults.genres.length})</span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {searchResults.genres.map((genre) => (
                    <motion.button
                      key={genre.id}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => handleExecuteSearch(genre.name)}
                      className="relative rounded-xl overflow-hidden h-24 text-left border border-white/10 p-4 flex flex-col justify-end"
                      style={{ background: `linear-gradient(135deg, ${genre.color}77, #121222)` }}
                    >
                      <span className="font-bold text-white">{genre.name}</span>
                    </motion.button>
                  ))}
                </div>
              </section>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
