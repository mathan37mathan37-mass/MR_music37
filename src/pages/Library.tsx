import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, List, Search as SearchIcon, ArrowUpDown,
  Heart, Clock, Disc, User, ListMusic, DownloadCloud,
  Trash2, Play, Sparkles, X
} from 'lucide-react';
import { AlbumCard } from '@/components/ui/AlbumCard';
import { ArtistCard } from '@/components/ui/ArtistCard';
import { PlaylistCard } from '@/components/ui/PlaylistCard';
import { MusicCard } from '@/components/ui/MusicCard';
import { albums as demoAlbums, artists as demoArtists, playlists as demoPlaylists, tracks as demoTracks } from '@/data/demo';
import { useLibraryStore } from '@/store/libraryStore';
import { useAdminStore } from '@/store/adminStore';
import { usePlayerStore } from '@/store/playerStore';
import { useUIStore } from '@/store/uiStore';
import { cn, formatDuration, formatTimeAgo, formatLargeNumber } from '@/utils/cn';
import type { ViewMode, Track } from '@/types';

interface SongGridCardProps {
  track: Track;
  onRemove?: () => void;
  removeTooltip?: string;
  badge?: string;
}

function SongGridCard({ track, onRemove, removeTooltip, badge }: SongGridCardProps) {
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayerStore();
  const { toggleLikeSong, isSongLiked } = useLibraryStore();
  const { addToast } = useUIStore();
  const isCurrent = currentTrack?.id === track.id;
  const isCurrentPlaying = isCurrent && isPlaying;
  const isLiked = isSongLiked(track.id);

  const handleCardClick = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track);
    }
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    const liked = toggleLikeSong(track);
    addToast(liked ? 'Added to favorites' : 'Removed from favorites', 'success');
  };

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        "group flex flex-col gap-2.5 p-3 rounded-2xl border transition-all relative cursor-pointer",
        isCurrent
          ? "bg-violet-600/15 border-violet-500/40 shadow-lg shadow-violet-600/10"
          : "bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/10 hover:-translate-y-1"
      )}
    >
      <div className="relative aspect-square rounded-xl overflow-hidden shadow">
        <img
          src={track.coverUrl}
          alt={track.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80';
          }}
        />

        {/* Playing EQ or Play Hover */}
        {isCurrentPlaying ? (
          <div className="absolute inset-0 bg-violet-950/60 backdrop-blur-[2px] flex items-center justify-center">
            <div className="flex items-end gap-[3px] h-5">
              <span className="w-[3px] bg-violet-300 animate-pulse h-3" />
              <span className="w-[3px] bg-violet-300 animate-pulse delay-75 h-5" />
              <span className="w-[3px] bg-violet-300 animate-pulse delay-150 h-2" />
              <span className="w-[3px] bg-violet-300 animate-pulse delay-300 h-4" />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center shadow-lg transform transition-transform hover:scale-110">
              <Play size={16} fill="white" className="ml-0.5" />
            </div>
          </div>
        )}

        {/* Top actions: Like and Remove */}
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleLike}
            className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white transition-colors"
            title={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart size={12} className={isLiked ? 'fill-violet-400 text-violet-400' : ''} />
          </button>
          {onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-rose-400 hover:bg-rose-500/20 transition-colors"
              title={removeTooltip || "Remove from library"}
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>

        {badge && (
          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-medium text-white/80">
            {badge}
          </span>
        )}
      </div>

      <div className="min-w-0">
        <p className={cn("text-sm font-semibold truncate transition-colors", isCurrent ? "text-violet-300" : "text-white group-hover:text-violet-400")}>
          {track.title}
        </p>
        <p className="text-xs text-white/50 truncate mt-0.5">{track.artist}</p>
      </div>
    </div>
  );
}

type LibraryCategory = 'all' | 'liked' | 'recent' | 'albums' | 'artists' | 'playlists' | 'downloads';
type SortOption = 'recent' | 'alphabetical' | 'artist';

export default function Library() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<LibraryCategory>('all');
  const [view, setView] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  const { songs: adminSongs, albums: adminAlbums, artists: adminArtists } = useAdminStore();

  const {
    likedSongIds,
    savedAlbumIds,
    savedPlaylistIds,
    downloadedTrackIds,
    recentlyPlayed,
    removeSongFromLibrary,
    followedArtistIds,
    userPlaylists,
    toggleDownload,
    toggleFollowArtist,
  } = useLibraryStore();

  const { playTrack, playQueue } = usePlayerStore();
  const { addToast } = useUIStore();

  // Combine demo and admin items deduplicated by id
  const allTracks = useMemo(() => {
    const combined = [...adminSongs, ...demoTracks];
    const seen = new Set<string>();
    return combined.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [adminSongs]);

  const allAlbums = useMemo(() => {
    const combined = [...adminAlbums, ...demoAlbums];
    const seen = new Set<string>();
    return combined.filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
  }, [adminAlbums]);

  const allPlaylists = useMemo(() => {
    const combined = [...userPlaylists, ...demoPlaylists];
    const seen = new Set<string>();
    return combined.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [userPlaylists]);

  const allArtists = useMemo(() => {
    const combined = [...adminArtists, ...demoArtists];
    const seen = new Set<string>();
    return combined.filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
  }, [adminArtists]);

  // Hydrate items from store IDs
  const likedTracks = useMemo(() => {
    return allTracks.filter((t) => likedSongIds.includes(t.id));
  }, [allTracks, likedSongIds]);

  const userSavedAlbums = useMemo(() => {
    return allAlbums.filter((a) => savedAlbumIds.includes(a.id));
  }, [allAlbums, savedAlbumIds]);

  const userSavedPlaylists = useMemo(() => {
    return allPlaylists.filter((p) => savedPlaylistIds.includes(p.id));
  }, [allPlaylists, savedPlaylistIds]);

  const downloadedTracks = useMemo(() => {
    return allTracks.filter((t) => downloadedTrackIds.includes(t.id));
  }, [allTracks, downloadedTrackIds]);

  const followedArtists = useMemo(() => {
    return allArtists.filter((a) => followedArtistIds.includes(a.id));
  }, [allArtists, followedArtistIds]);

  // Category counts
  const categoryTabs: { label: string; value: LibraryCategory; count: number; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { label: 'All', value: 'all', count: likedTracks.length + userSavedAlbums.length + userSavedPlaylists.length + followedArtists.length, icon: Sparkles },
    { label: 'Liked Songs', value: 'liked', count: likedTracks.length, icon: Heart },
    { label: 'Recently Played', value: 'recent', count: recentlyPlayed.length, icon: Clock },
    { label: 'Albums', value: 'albums', count: userSavedAlbums.length, icon: Disc },
    { label: 'Artists', value: 'artists', count: followedArtists.length, icon: User },
    { label: 'Playlists', value: 'playlists', count: userSavedPlaylists.length, icon: ListMusic },
    { label: 'Downloads', value: 'downloads', count: downloadedTracks.length, icon: DownloadCloud },
  ];

  // Filtering & Sorting function for tracks
  const processTracks = (items: typeof allTracks) => {
    let filtered = items;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q)
      );
    }

    return [...filtered].sort((a, b) => {
      if (sortBy === 'alphabetical') return a.title.localeCompare(b.title);
      if (sortBy === 'artist') return a.artist.localeCompare(b.artist);
      return 0; // default recent
    });
  };

  // Process albums
  const processedAlbums = useMemo(() => {
    let filtered = userSavedAlbums;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((a) =>
        a.title.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q)
      );
    }
    return [...filtered].sort((a, b) => {
      if (sortBy === 'alphabetical') return a.title.localeCompare(b.title);
      if (sortBy === 'artist') return a.artist.localeCompare(b.artist);
      return 0;
    });
  }, [userSavedAlbums, searchQuery, sortBy]);

  // Process playlists
  const processedPlaylists = useMemo(() => {
    let filtered = userSavedPlaylists;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((p) =>
        p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }
    return [...filtered].sort((a, b) => {
      if (sortBy === 'alphabetical') return a.title.localeCompare(b.title);
      return 0;
    });
  }, [userSavedPlaylists, searchQuery, sortBy]);

  return (
    <div className="px-6 py-6 space-y-8 max-w-7xl mx-auto">
      {/* Header with Title & Quick Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white tracking-tight">Your Library</h1>
          <p className="text-white/50 text-sm mt-1">
            Manage your saved songs, playlists, albums, and offline downloads
          </p>
        </div>

        {/* Search within library and sort selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <SearchIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter library..."
              className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-violet-500/50 w-48 sm:w-60 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/70">
            <ArrowUpDown size={13} className="text-violet-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-white text-xs outline-none cursor-pointer"
            >
              <option value="recent" className="bg-[#121220] text-white">Recently Added</option>
              <option value="alphabetical" className="bg-[#121220] text-white">Alphabetical (A-Z)</option>
              <option value="artist" className="bg-[#121220] text-white">By Artist</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 shadow-inner">
            <button
              type="button"
              onClick={() => setView('grid')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                view === 'grid'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              )}
              title="Switch to Grid View"
            >
              <LayoutGrid size={15} />
              <span>Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                view === 'list'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              )}
              title="Switch to List View"
            >
              <List size={15} />
              <span>List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {categoryTabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeCategory === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveCategory(tab.value)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 border',
                isSelected
                  ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-600/30'
                  : 'bg-white/5 border-white/8 text-white/60 hover:text-white hover:bg-white/10'
              )}
            >
              <Icon size={14} className={isSelected ? 'text-white' : 'text-white/40'} />
              <span>{tab.label}</span>
              <span className={cn('px-1.5 py-0.5 rounded-full text-[10px]', isSelected ? 'bg-black/20 text-white' : 'bg-white/10 text-white/50')}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.2 }}
          className="space-y-10"
        >
          {/* 1. LIKED SONGS CATEGORY */}
          {(activeCategory === 'all' || activeCategory === 'liked') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <Heart size={18} className="fill-violet-400 text-violet-400" />
                Liked Songs
                <span className="text-xs font-normal text-white/40">({likedTracks.length})</span>
              </h2>
              {likedTracks.length > 0 && (
                <button
                  onClick={() => playQueue(likedTracks)}
                  className="text-xs text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1.5"
                >
                  <Play size={13} fill="currentColor" /> Play All
                </button>
              )}
            </div>

            {likedTracks.length > 0 ? (
              view === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                  {processTracks(likedTracks).map((track) => (
                    <SongGridCard
                      key={track.id}
                      track={track}
                      onRemove={() => {
                        removeSongFromLibrary(track.id);
                        addToast(`Removed "${track.title}" from library`, 'info');
                      }}
                      removeTooltip="Remove from Liked Songs"
                    />
                  ))}
                </div>
              ) : (
                <div className="glass rounded-2xl border border-white/5 divide-y divide-white/5">
                  {processTracks(likedTracks).map((track, i) => (
                    <MusicCard
                      key={track.id}
                      track={track}
                      index={i}
                      showIndex
                      onRemove={() => {
                        removeSongFromLibrary(track.id);
                        addToast(`Removed "${track.title}" from library`, 'info');
                      }}
                      removeTooltip="Remove from Liked Songs"
                    />
                  ))}
                </div>
              )
            ) : (
              <div className="p-8 rounded-2xl bg-white/5 border border-dashed border-white/10 text-center space-y-3">
                <Heart size={32} className="mx-auto text-white/20" />
                <h4 className="text-base font-semibold text-white">No liked songs yet</h4>
                <p className="text-xs text-white/40 max-w-sm mx-auto">
                  Click the heart icon on any song while listening to save it to your library.
                </p>
                <button
                  onClick={() => navigate('/explore')}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition-colors"
                >
                  Discover Music
                </button>
              </div>
            )}
          </section>
        )}

        {/* 2. RECENTLY PLAYED CATEGORY */}
        {(activeCategory === 'recent') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <Clock size={18} className="text-violet-400" />
                Recently Played History
                <span className="text-xs font-normal text-white/40">({recentlyPlayed.length})</span>
              </h2>
              {recentlyPlayed.length > 0 && (
                <button
                  onClick={() => useLibraryStore.getState().clearRecentlyPlayed()}
                  className="text-xs text-white/40 hover:text-red-400 transition-colors"
                >
                  Clear history
                </button>
              )}
            </div>

            {recentlyPlayed.length > 0 ? (
              view === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                  {recentlyPlayed.map((item) => (
                    <SongGridCard
                      key={`${item.track.id}-${item.playedAt}`}
                      track={item.track}
                      badge={formatTimeAgo(item.playedAt)}
                    />
                  ))}
                </div>
              ) : (
                <div className="glass rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
                  {recentlyPlayed.map((item) => (
                    <div
                      key={`${item.track.id}-${item.playedAt}`}
                      className="flex items-center justify-between p-3.5 hover:bg-white/5 transition-colors group cursor-pointer"
                      onClick={() => playTrack(item.track)}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-lg overflow-hidden relative flex-shrink-0">
                          <img src={item.track.coverUrl} alt={item.track.title} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Play size={16} fill="white" className="text-white ml-0.5" />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate group-hover:text-violet-400 transition-colors">
                            {item.track.title}
                          </p>
                          <p className="text-xs text-white/50 truncate">{item.track.artist} • {item.track.album}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-right flex-shrink-0">
                        <span className="text-xs font-medium text-violet-400/80 bg-violet-500/10 px-2.5 py-1 rounded-full">
                          {formatTimeAgo(item.playedAt)}
                        </span>
                        <span className="text-xs text-white/40 tabular-nums hidden sm:inline">
                          {formatDuration(item.track.duration)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="p-8 rounded-2xl bg-white/5 border border-dashed border-white/10 text-center space-y-2">
                <Clock size={32} className="mx-auto text-white/20" />
                <p className="text-sm text-white/50">Your playback history is clear</p>
              </div>
            )}
          </section>
        )}

        {/* 3. ALBUMS CATEGORY */}
        {(activeCategory === 'all' || activeCategory === 'albums') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <Disc size={18} className="text-pink-400" />
                Saved Albums
                <span className="text-xs font-normal text-white/40">({processedAlbums.length})</span>
              </h2>
            </div>

            {processedAlbums.length > 0 ? (
              <div className={view === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5' : 'space-y-2.5'}>
                {processedAlbums.map((album) =>
                  view === 'grid' ? (
                    <AlbumCard key={album.id} album={album} className="w-full" />
                  ) : (
                    <div
                      key={album.id}
                      onClick={() => playQueue(album.tracks)}
                      className="flex items-center justify-between p-3 glass rounded-xl border border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img src={album.coverUrl} alt={album.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0 shadow" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate group-hover:text-violet-400 transition-colors">{album.title}</p>
                          <p className="text-xs text-white/50 truncate">{album.artist} • {album.year}</p>
                        </div>
                      </div>
                      <span className="text-xs text-white/40">{album.trackCount} tracks</span>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-white/5 border border-dashed border-white/10 text-center space-y-2">
                <Disc size={32} className="mx-auto text-white/20" />
                <p className="text-sm text-white/50">No albums saved to your library yet</p>
              </div>
            )}
          </section>
        )}

        {/* 4. PLAYLISTS CATEGORY */}
        {(activeCategory === 'all' || activeCategory === 'playlists') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <ListMusic size={18} className="text-cyan-400" />
                Saved Playlists
                <span className="text-xs font-normal text-white/40">({processedPlaylists.length})</span>
              </h2>
            </div>

            {processedPlaylists.length > 0 ? (
              <div className={view === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5' : 'space-y-2.5'}>
                {processedPlaylists.map((pl) =>
                  view === 'grid' ? (
                    <PlaylistCard key={pl.id} playlist={pl} className="w-full" />
                  ) : (
                    <div
                      key={pl.id}
                      onClick={() => playQueue(pl.tracks)}
                      className="flex items-center justify-between p-3 glass rounded-xl border border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0" style={{ background: `linear-gradient(135deg, ${pl.coverColors?.[0]}, ${pl.coverColors?.[1]})` }}>
                          <div className="w-full h-full grid grid-cols-2">
                            {pl.tracks.slice(0, 4).map((t, i) => <img key={i} src={t.coverUrl} alt="" className="w-full h-full object-cover" />)}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate group-hover:text-violet-400 transition-colors">{pl.title}</p>
                          <p className="text-xs text-white/50 truncate">{pl.tracks.length} tracks • By {pl.createdBy}</p>
                        </div>
                      </div>
                      <span className="text-xs text-white/40">{pl.tracks.length} tracks</span>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-white/5 border border-dashed border-white/10 text-center space-y-2">
                <ListMusic size={32} className="mx-auto text-white/20" />
                <p className="text-sm text-white/50">No playlists saved yet</p>
              </div>
            )}
          </section>
        )}

        {/* 5. ARTISTS CATEGORY */}
        {(activeCategory === 'all' || activeCategory === 'artists') && (
          <section className="space-y-4">
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <User size={18} className="text-amber-400" />
              Followed Artists
              <span className="text-xs font-normal text-white/40">({followedArtists.length})</span>
            </h2>
            {followedArtists.length > 0 ? (
              view === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {followedArtists.map((artist) => (
                    <ArtistCard key={artist.id} artist={artist} />
                  ))}
                </div>
              ) : (
                <div className="glass rounded-2xl border border-white/5 divide-y divide-white/5">
                  {followedArtists.map((artist) => (
                    <div
                      key={artist.id}
                      onClick={() => navigate(`/artists/${artist.id}`)}
                      className="flex items-center justify-between p-3.5 hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img src={artist.imageUrl} alt={artist.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0 shadow" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate group-hover:text-violet-400 transition-colors">{artist.name}</p>
                          <p className="text-xs text-white/50 truncate">{formatLargeNumber(artist.followers)} followers</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFollowArtist(artist.id);
                          addToast(`Unfollowed ${artist.name}`, 'info');
                        }}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-white/80 transition-colors"
                      >
                        Following
                      </button>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="p-8 rounded-2xl bg-white/5 border border-dashed border-white/10 text-center space-y-2">
                <User size={32} className="mx-auto text-white/20" />
                <p className="text-sm text-white/50">No followed artists yet</p>
              </div>
            )}
          </section>
        )}

        {/* 6. DOWNLOADS CATEGORY */}
        {(activeCategory === 'downloads') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <DownloadCloud size={18} className="text-emerald-400" />
                Offline Downloads
                <span className="text-xs font-normal text-white/40">({downloadedTracks.length})</span>
              </h2>
              {downloadedTracks.length > 0 && (
                <button
                  onClick={() => playQueue(downloadedTracks)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1.5"
                >
                  <Play size={13} fill="currentColor" /> Play Offline Tracks
                </button>
              )}
            </div>

            {downloadedTracks.length > 0 ? (
              view === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                  {processTracks(downloadedTracks).map((track) => (
                    <SongGridCard
                      key={track.id}
                      track={track}
                      badge="Offline"
                      onRemove={() => {
                        toggleDownload(track.id);
                        addToast(`Removed download "${track.title}"`, 'info');
                      }}
                      removeTooltip="Remove download"
                    />
                  ))}
                </div>
              ) : (
                <div className="glass rounded-2xl border border-white/5 divide-y divide-white/5">
                  {processTracks(downloadedTracks).map((track, i) => (
                    <MusicCard
                      key={track.id}
                      track={track}
                      index={i}
                      showIndex
                      onRemove={() => {
                        toggleDownload(track.id);
                        addToast(`Removed download "${track.title}"`, 'info');
                      }}
                      removeTooltip="Remove download"
                    />
                  ))}
                </div>
              )
            ) : (
              <div className="p-8 rounded-2xl bg-white/5 border border-dashed border-white/10 text-center space-y-2">
                <DownloadCloud size={32} className="mx-auto text-white/20" />
                <h4 className="text-base font-semibold text-white">No downloaded songs</h4>
                <p className="text-xs text-white/40 max-w-sm mx-auto">
                  Download your favorite tracks to listen offline anytime.
                </p>
              </div>
            )}
          </section>
        )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
