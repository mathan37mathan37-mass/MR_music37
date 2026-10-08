import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music, Plus, Search, Edit2, Trash2, Play, Pause,
  Calendar, Disc, Mic2, Tag, FileText, Check, X,
  Clock, ExternalLink, Sparkles, UploadCloud, FileAudio,
  Image as ImageIcon, RefreshCw, AlertTriangle, CheckCircle2,
  FolderUp
} from 'lucide-react';
import { useAdminStore } from '@/store/adminStore';
import { usePlayerStore } from '@/store/playerStore';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { FileUploadZone } from './FileUploadZone';
import { ConfirmDialog } from './ConfirmDialog';
import { BulkFolderImport } from './BulkFolderImport';
import type { Track } from '@/types';
import type { SongFormData } from '@/types/admin';
import { validateAudioFile, validateImageFile } from '@/services/storageService';
import { uploadSongAudio, uploadSongCover } from '@/services/supabaseStorageService';
import { formatDuration, cn } from '@/utils/cn';
import { matchSongSearch } from '@/utils/searchUtils';
import { deduplicateCatalog } from '@/services/musicIdentityService';

const GENRES = [
  'Electronic', 'Synthwave', 'Indie Pop', 'Alternative',
  'R&B', 'Hip-Hop', 'Pop', 'Jazz', 'Rock', 'Ambient',
  'Lo-Fi', 'Dance', 'Future Bass', 'Funk'
];

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80';

type BulkUploadStatus = 'waiting' | 'uploading' | 'processing' | 'completed' | 'failed';

interface BulkUploadItem {
  id: string;
  file: File;
  title: string;
  artistId: string;
  albumId: string;
  genre: string;
  year: number;
  duration: number;
  coverUrl: string;
  lyrics: { time: number; text: string }[];
  status: BulkUploadStatus;
  progress: number;
  error?: string;
  duplicate: boolean;
  duplicateSongId?: string;
  duplicateAction?: 'skip' | 'replace' | 'new';
  selected: boolean;
}

interface SongManagerProps {
  isCreateOpen?: boolean;
  onCloseCreate?: () => void;
}

export function SongManager({ isCreateOpen = false, onCloseCreate }: SongManagerProps) {
  const { songs, artists, albums, addSong, updateSong, deleteSong, deleteMultipleSongs } = useAdminStore();
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayerStore();
  const { addToast } = useUIStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [songAgeFilter, setSongAgeFilter] = useState<'all' | 'newly_added' | 'old_songs'>('all');
  const [editingSong, setEditingSong] = useState<Track | null>(null);
  const [showAddModal, setShowAddModal] = useState(isCreateOpen);
  const [showBulkFolderModal, setShowBulkFolderModal] = useState(false);
  const [deletingSong, setDeletingSong] = useState<Track | null>(null);
  const [titleError, setTitleError] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkCancelOpen, setBulkCancelOpen] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<BulkUploadItem[]>([]);
  const [bulkConcurrency, setBulkConcurrency] = useState(3);
  const [bulkIsUploading, setBulkIsUploading] = useState(false);
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const bulkAudioInputRef = useRef<HTMLInputElement>(null);
  const bulkCoverInputRef = useRef<HTMLInputElement>(null);
  const bulkCancelledRef = useRef(false);

  const [formData, setFormData] = useState<SongFormData>({
    title: '',
    artistId: artists[0]?.id || 'a1',
    albumId: albums[0]?.id || 'al1',
    genre: 'Electronic',
    duration: 210,
    year: new Date().getFullYear(),
    coverUrl: '',
    audioUrl: '',
    lyrics: [
      { time: 0, text: '♪ (Intro) ♪' },
      { time: 15, text: 'First verse starts here...' },
    ],
  });

  const [lyricLineText, setLyricLineText] = useState('');
  const [lyricLineTime, setLyricLineTime] = useState<number>(30);

  const [isDeduplicating, setIsDeduplicating] = useState(false);

  const handleRunDeduplication = async () => {
    setIsDeduplicating(true);
    try {
      const res = await deduplicateCatalog();
      if (res.duplicateSongsFound > 0 || res.duplicateArtistsFound > 0 || res.duplicateAlbumsFound > 0) {
        addToast(`Deduplication complete: Removed ${res.duplicateSongsFound} duplicate songs, merged ${res.duplicateArtistsFound} duplicate artists & ${res.duplicateAlbumsFound} duplicate albums across ${res.songsReassigned} songs.`, 'success');
      } else {
        addToast('Catalog is already clean! No duplicate songs, artists, or albums found.', 'info');
      }
    } catch (err) {
      addToast(`Deduplication error: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setIsDeduplicating(false);
    }
  };

  const filteredSongs = useMemo(() => {
    let list = songs.filter((s) => {
      const matchesQuery = matchSongSearch(s, searchQuery);
      const matchesGenre = selectedGenre === 'all' || s.genre === selectedGenre;
      return matchesQuery && matchesGenre;
    });

    if (songAgeFilter === 'newly_added') {
      return [...list].sort((a, b) => {
        const timeA = a.createdAt || (parseInt(a.id.replace(/\D/g, ''), 10) || 0);
        const timeB = b.createdAt || (parseInt(b.id.replace(/\D/g, ''), 10) || 0);
        return timeB - timeA || (b.year || 0) - (a.year || 0);
      });
    }

    if (songAgeFilter === 'old_songs') {
      return [...list].sort((a, b) => {
        const timeA = a.createdAt || (parseInt(a.id.replace(/\D/g, ''), 10) || 0);
        const timeB = b.createdAt || (parseInt(b.id.replace(/\D/g, ''), 10) || 0);
        return timeA - timeB || (a.year || 0) - (b.year || 0);
      });
    }

    return list;
  }, [songs, searchQuery, selectedGenre, songAgeFilter]);

  const totalBulkSize = bulkFiles.reduce((sum, item) => sum + item.file.size, 0);
  const bulkCompleted = bulkFiles.filter((item) => item.status === 'completed').length;
  const bulkOverallProgress = bulkFiles.length
    ? Math.round((bulkCompleted / bulkFiles.length) * 100)
    : 0;

  const addBulkFiles = (incomingFiles: File[]) => {
    const validAudioFiles = incomingFiles.filter((file) => validateAudioFile(file).valid);
    if (!validAudioFiles.length) {
      addToast('Unsupported audio files were filtered out from the batch.', 'error');
      return;
    }

    setBulkFiles((prev) => {
      const seenKeys = new Set(prev.map((item) => `${item.file.name}:${item.file.size}`));
      const currentCatalog = useAdminStore.getState().songs;
      const mapped: BulkUploadItem[] = validAudioFiles
        .filter((file) => !seenKeys.has(`${file.name}:${file.size}`))
        .map((file) => {
          const baseTitle = getTrackTitleFromFilename(file.name);
          const filenameWithoutExt = file.name.toLowerCase().replace(/\.[^/.]+$/, '').trim();
          const matchedSong = currentCatalog.find((song) => {
            const titleMatch = song.title.trim().toLowerCase() === baseTitle.trim().toLowerCase();
            const fileMatch = song.title.trim().toLowerCase() === filenameWithoutExt;
            const audioHint = !!song.audioUrl && (
              song.audioUrl.toLowerCase().includes(baseTitle.toLowerCase()) ||
              song.audioUrl.toLowerCase().includes(filenameWithoutExt)
            );
            return titleMatch || fileMatch || audioHint;
          });
          const duplicate = Boolean(matchedSong);

          return {
            id: `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name}`,
            file,
            title: baseTitle,
            artistId: artists[0]?.id || 'a1',
            albumId: albums[0]?.id || 'al1',
            genre: 'Electronic',
            year: new Date().getFullYear(),
            duration: 180,
            coverUrl: '',
            lyrics: [],
            status: 'waiting' as const,
            progress: 0,
            duplicate,
            duplicateSongId: matchedSong?.id,
            duplicateAction: duplicate ? ('skip' as const) : ('new' as const),
            selected: true,
          };
        });

      return [...prev, ...mapped];
    });
  };

  const handleOpenEdit = (song: Track) => {
    setEditingSong(song);
    setTitleError(false);
    setFormData({
      title: song.title,
      artistId: song.artistId || artists[0]?.id || 'a1',
      albumId: song.albumId || albums[0]?.id || 'al1',
      genre: song.genre,
      duration: song.duration,
      year: song.year,
      coverUrl: song.coverUrl,
      audioUrl: song.audioUrl || '',
      lyrics: song.lyrics || [],
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = formData.title.trim();
    if (!cleanTitle) {
      setTitleError(true);
      addToast('Please provide a Song Title before publishing', 'error');
      return;
    }
    setTitleError(false);

    const defaultAudio = 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3';

    if (editingSong) {
      const artistObj = artists.find((a) => a.id === formData.artistId);
      const albumObj = albums.find((al) => al.id === formData.albumId);

      updateSong(editingSong.id, {
        title: cleanTitle,
        artist: artistObj?.name || editingSong.artist,
        artistId: formData.artistId,
        album: albumObj?.title || editingSong.album,
        albumId: formData.albumId,
        genre: formData.genre,
        duration: Number(formData.duration) || 210,
        year: Number(formData.year) || new Date().getFullYear(),
        coverUrl: formData.coverUrl.trim() || editingSong.coverUrl || DEFAULT_COVER,
        audioUrl: formData.audioUrl.trim() || editingSong.audioUrl || defaultAudio,
        lyrics: formData.lyrics,
      });
      addToast(`Updated song "${cleanTitle}"`, 'success');
      setEditingSong(null);
    } else {
      addSong({
        ...formData,
        title: cleanTitle,
        coverUrl: formData.coverUrl.trim() || DEFAULT_COVER,
        audioUrl: formData.audioUrl.trim() || defaultAudio,
      });
      addToast(`Published "${cleanTitle}" to catalog!`, 'success');
      setShowAddModal(false);
      onCloseCreate?.();
    }

    setFormData({
      title: '',
      artistId: artists[0]?.id || 'a1',
      albumId: albums[0]?.id || 'al1',
      genre: 'Electronic',
      duration: 210,
      year: new Date().getFullYear(),
      coverUrl: '',
      audioUrl: '',
      lyrics: [
        { time: 0, text: '♪ (Intro) ♪' },
        { time: 15, text: 'First verse starts here...' },
      ],
    });
  };

  const handleAddLyricLine = () => {
    if (!lyricLineText.trim()) return;
    const newLine = { time: Number(lyricLineTime) || 0, text: lyricLineText.trim() };
    const updatedLyrics = [...(formData.lyrics || []), newLine].sort((a, b) => a.time - b.time);
    setFormData({ ...formData, lyrics: updatedLyrics });
    setLyricLineText('');
    setLyricLineTime((prev) => prev + 15);
  };

  const handleRemoveLyricLine = (index: number) => {
    const updated = (formData.lyrics || []).filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, lyrics: updated });
  };

  const handleBulkUploadAll = async () => {
    if (!bulkFiles.length) {
      addToast('Select audio files before starting the upload queue.', 'error');
      return;
    }

    const queue = bulkFiles.filter((item) => !(item.duplicate && item.duplicateAction === 'skip'));
    if (!queue.length) {
      addToast('All selected files are currently marked as skipped duplicates.', 'info');
      return;
    }

    bulkCancelledRef.current = false;
    setBulkCancelOpen(false);
    setBulkIsUploading(true);

    let nextIndex = 0;

    const processOne = async () => {
      while (!bulkCancelledRef.current && nextIndex < queue.length) {
        const current = queue[nextIndex++];
        if (!current || current.status === 'completed') continue;

        const validation = validateAudioFile(current.file);
        if (!validation.valid) {
          setBulkFiles((prev) => prev.map((row) => row.id === current.id ? {
            ...row,
            status: 'failed',
            progress: 0,
            error: validation.error || 'Unsupported file format',
          } : row));
          continue;
        }

        setBulkFiles((prev) => prev.map((row) => row.id === current.id ? {
          ...row,
          status: 'uploading',
          progress: 5,
          error: undefined,
        } : row));

        try {
          const songId = `song_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          const url = await uploadSongAudio(songId, current.file, {
            onProgress: (progress) => {
              setBulkFiles((prev) => prev.map((row) => row.id === current.id ? {
                ...row,
                progress,
                status: 'uploading',
              } : row));
            },
            onError: (err) => {
              setBulkFiles((prev) => prev.map((row) => row.id === current.id ? {
                ...row,
                status: 'failed',
                progress: 0,
                error: err.message || 'Upload failed.',
              } : row));
            },
            onSuccess: () => undefined,
          });

          setBulkFiles((prev) => prev.map((row) => row.id === current.id ? { ...row, status: 'processing', progress: 95 } : row));

          const currentCatalog = useAdminStore.getState().songs;
          const selectedArtist = artists.find((artist) => artist.id === current.artistId) || artists[0];
          const selectedAlbum = albums.find((album) => album.id === current.albumId) || albums[0];
          const titleValue = current.title.trim() || getTrackTitleFromFilename(current.file.name);
          const filenameWithoutExt = current.file.name.toLowerCase().replace(/\.[^/.]+$/, '').trim();

          const existingSong = current.duplicateAction === 'replace'
            ? currentCatalog.find((song) => song.id === current.duplicateSongId) ||
              currentCatalog.find((song) =>
                song.title.trim().toLowerCase() === titleValue.toLowerCase() ||
                song.title.trim().toLowerCase() === filenameWithoutExt ||
                (!!song.audioUrl && (
                  song.audioUrl.toLowerCase().includes(titleValue.toLowerCase()) ||
                  song.audioUrl.toLowerCase().includes(filenameWithoutExt)
                ))
              )
            : null;

          const duration = await getAudioDuration(current.file, current.duration || 180);

          if (existingSong) {
            const updatedSong = {
              ...existingSong,
              title: titleValue,
              artist: selectedArtist?.name || existingSong.artist,
              artistId: current.artistId || existingSong.artistId,
              album: selectedAlbum?.title || existingSong.album,
              albumId: current.albumId || existingSong.albumId,
              genre: current.genre || existingSong.genre,
              duration,
              year: current.year || existingSong.year,
              coverUrl: current.coverUrl || existingSong.coverUrl || DEFAULT_COVER,
              audioUrl: url,
              lyrics: current.lyrics?.length ? current.lyrics : (existingSong.lyrics || []),
            } as any;

            updateSong(existingSong.id, updatedSong);
            setBulkFiles((prev) => prev.map((row) => row.id === current.id ? { ...row, status: 'completed', progress: 100, error: undefined } : row));
            addToast(`Successfully replaced "${existingSong.title}" with updated audio.`, 'success');
            continue;
          }

          const created = addSong({
            title: titleValue,
            artistId: current.artistId || selectedArtist?.id || 'a1',
            albumId: current.albumId || selectedAlbum?.id || 'al1',
            genre: current.genre || 'Electronic',
            duration,
            year: current.year || new Date().getFullYear(),
            coverUrl: current.coverUrl || DEFAULT_COVER,
            audioUrl: url,
            lyrics: current.lyrics || [],
          });

          const adminId = useAuthStore.getState().user?.uid || 'admin-user';
          updateSong(created.id, {
            uploadedBy: adminId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          } as any);

          setBulkFiles((prev) => prev.map((row) => row.id === current.id ? { ...row, status: 'completed', progress: 100, error: undefined } : row));
          addToast(`${titleValue} uploaded successfully`, 'success');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown upload error';
          setBulkFiles((prev) => prev.map((row) => row.id === current.id ? {
            ...row,
            status: 'failed',
            progress: 0,
            error: message,
          } : row));
          addToast(`Failed to upload ${current.title}: ${message}`, 'error');
        }
      }
    };

    const workers = Array.from({ length: Math.min(Math.max(bulkConcurrency, 1), queue.length) }, () => processOne());
    await Promise.all(workers);
    setBulkIsUploading(false);
    if (!bulkCancelledRef.current) {
      addToast('Upload queue completed.', 'success');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Music size={20} className="text-violet-400" />
            Song Management
            <span className="text-xs font-normal text-white/40">({filteredSongs.length} tracks)</span>
          </h2>
          <p className="text-xs text-white/50 mt-0.5">
            Add audio files, synchronized lyrics, assign artists & studio albums
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search title, artist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500 w-52 sm:w-64"
            />
          </div>

          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-violet-500 cursor-pointer"
          >
            <option value="all" className="bg-[#14121d] text-white">All Genres</option>
            {GENRES.map((g) => (
              <option key={g} value={g} className="bg-[#14121d] text-white">{g}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowBulkFolderModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
          >
            <FolderUp size={14} /> Import Music Folder
          </button>

          <button
            onClick={() => {
              setEditingSong(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-all cursor-pointer"
          >
            <Plus size={14} /> Add Song
          </button>
        </div>
      </div>

      {/* ── Radio Button Filter for New vs Old Songs ──────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-2xl bg-white/[0.03] border border-white/8">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider pl-1">
            Filter & Sort:
          </span>
          <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5" role="radiogroup" aria-label="Filter songs by age">
            {/* All Songs Radio */}
            <label
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                songAgeFilter === 'all'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <input
                type="radio"
                name="songAgeRadio"
                value="all"
                checked={songAgeFilter === 'all'}
                onChange={() => setSongAgeFilter('all')}
                className="sr-only"
              />
              <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
                songAgeFilter === 'all' ? 'border-white bg-white' : 'border-white/40'
              }`}>
                {songAgeFilter === 'all' && <span className="w-1.5 h-1.5 rounded-full bg-violet-600" />}
              </span>
              <span>All Songs</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                songAgeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40'
              }`}>
                {songs.length}
              </span>
            </label>

            {/* Newly Added Radio */}
            <label
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                songAgeFilter === 'newly_added'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <input
                type="radio"
                name="songAgeRadio"
                value="newly_added"
                checked={songAgeFilter === 'newly_added'}
                onChange={() => setSongAgeFilter('newly_added')}
                className="sr-only"
              />
              <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
                songAgeFilter === 'newly_added' ? 'border-white bg-white' : 'border-white/40'
              }`}>
                {songAgeFilter === 'newly_added' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />}
              </span>
              <Sparkles size={12} className={songAgeFilter === 'newly_added' ? 'text-white' : 'text-emerald-400'} />
              <span>Newly Added Songs</span>
            </label>

            {/* Old Songs Radio */}
            <label
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                songAgeFilter === 'old_songs'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <input
                type="radio"
                name="songAgeRadio"
                value="old_songs"
                checked={songAgeFilter === 'old_songs'}
                onChange={() => setSongAgeFilter('old_songs')}
                className="sr-only"
              />
              <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
                songAgeFilter === 'old_songs' ? 'border-white bg-white' : 'border-white/40'
              }`}>
                {songAgeFilter === 'old_songs' && <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />}
              </span>
              <Clock size={12} className={songAgeFilter === 'old_songs' ? 'text-white' : 'text-amber-400'} />
              <span>Old / Existing Songs</span>
            </label>
          </div>
        </div>

        {/* Right action button */}
        <div className="flex items-center gap-2">
          {/* Bulk delete bar */}
          {selectedSongIds.size > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <span className="text-xs text-rose-300 font-semibold">{selectedSongIds.size} selected</span>
              <button
                type="button"
                onClick={() => setBulkDeleteOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Trash2 size={11} /> Delete
              </button>
              <button
                type="button"
                onClick={() => setSelectedSongIds(new Set())}
                className="p-1 rounded-md hover:bg-white/10 text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                <X size={11} />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleRunDeduplication}
            disabled={isDeduplicating}
            className="flex items-center gap-2 rounded-xl border border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20 px-3.5 py-1.5 text-xs font-semibold text-pink-200 transition-colors cursor-pointer disabled:opacity-50"
            title="Scan & Merge duplicate artist and album identities"
          >
            <Sparkles size={13} className={isDeduplicating ? 'animate-spin text-pink-400' : 'text-pink-400'} />
            <span>{isDeduplicating ? 'Cleaning...' : 'Deduplicate Catalog'}</span>
          </button>

          <button
            type="button"
            onClick={() => setBulkModalOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 px-3.5 py-1.5 text-xs font-semibold text-violet-200 transition-colors cursor-pointer"
          >
            <UploadCloud size={13} /> Upload Multiple
          </button>
        </div>
      </div>

      <div className="glass rounded-3xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[11px] font-semibold text-white/40 uppercase tracking-wider bg-white/[0.01]">
                <th className="py-3.5 px-4 w-10">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-white/20 bg-transparent accent-violet-500 cursor-pointer"
                    checked={filteredSongs.length > 0 && filteredSongs.every((s) => selectedSongIds.has(s.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSongIds(new Set(filteredSongs.map((s) => s.id)));
                      } else {
                        setSelectedSongIds(new Set());
                      }
                    }}
                    title="Select all"
                  />
                </th>
                <th className="py-3.5 px-4">#</th>
                <th className="py-3.5 px-4">Track</th>
                <th className="py-3.5 px-4">Artist</th>
                <th className="py-3.5 px-4">Album</th>
                <th className="py-3.5 px-4">Genre</th>
                <th className="py-3.5 px-4">Year</th>
                <th className="py-3.5 px-4 text-center">Duration</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredSongs.map((song, idx) => {
                const isCurrent = currentTrack?.id === song.id;
                const isPlayingThis = isCurrent && isPlaying;
                const isSelected = selectedSongIds.has(song.id);

                return (
                  <tr key={song.id} className={cn('hover:bg-white/[0.03] transition-colors group', isSelected && 'bg-violet-500/5')}>
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-white/20 bg-transparent accent-violet-500 cursor-pointer"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedSongIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(song.id)) next.delete(song.id);
                            else next.add(song.id);
                            return next;
                          });
                        }}
                      />
                    </td>
                    <td className="py-3 px-4 text-white/30 tabular-nums">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3.5">
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 shadow bg-black/40">
                          <img src={song.coverUrl || DEFAULT_COVER} alt={song.title} className="w-full h-full object-cover" />
                          <button
                            onClick={() => (isCurrent ? togglePlay() : playTrack(song))}
                            className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                          >
                            {isPlayingThis ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" className="ml-0.5" />}
                          </button>
                        </div>
                        <div className="min-w-0 max-w-xs md:max-w-sm">
                          <p className={`font-semibold truncate text-sm ${isCurrent ? 'text-violet-400' : 'text-white'}`}>{song.title}</p>
                          <p className="text-xs text-white/50 truncate">{song.artist}</p>
                          {song.fileName && <p className="text-[10px] text-white/30 truncate font-mono">{song.fileName}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-white/70 font-medium">{song.artist}</td>
                    <td className="py-3 px-4 text-white/50 truncate max-w-[140px]">{song.album}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 font-medium text-[10px] border border-violet-500/20">{song.genre}</span>
                    </td>
                    <td className="py-3 px-4 text-white/40 tabular-nums">{song.year}</td>
                    <td className="py-3 px-4 text-center text-white/40 tabular-nums font-mono">{formatDuration(song.duration)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => handleOpenEdit(song)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors" title="Edit Song">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => setDeletingSong(song)} className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors" title="Delete Song">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {(showAddModal || editingSong) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowAddModal(false); setEditingSong(null); onCloseCreate?.(); }} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }} className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-3xl bg-[#14121d] border border-white/10 p-6 shadow-2xl space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/20"><Music size={18} /></div>
                  <div>
                    <h3 className="text-base font-bold text-white">{editingSong ? `Edit Song: ${editingSong.title}` : 'Add New Track to Catalog'}</h3>
                    <p className="text-xs text-white/40">Provide metadata, audio master, artwork and lyrics</p>
                  </div>
                </div>
                <button onClick={() => { setShowAddModal(false); setEditingSong(null); onCloseCreate?.(); }} className="p-1.5 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors"><X size={18} /></button>
              </div>

              <form onSubmit={handleSave} className="space-y-5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-white/80">Song Title *</label>
                      {titleError && <span className="text-[11px] text-rose-400 font-medium animate-pulse">Title is required</span>}
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Starlight Symphony"
                      value={formData.title}
                      onChange={(e) => { setFormData({ ...formData, title: e.target.value }); if (e.target.value.trim()) setTitleError(false); }}
                      className={cn('w-full px-3.5 py-2.5 rounded-xl bg-white/5 border text-white placeholder:text-white/30 focus:outline-none transition-colors', titleError ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/50' : 'border-white/10 focus:border-violet-500')}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-white/80">Assign Artist *</label>
                    <select value={formData.artistId} onChange={(e) => setFormData({ ...formData, artistId: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl bg-[#181622] border border-white/10 text-white focus:outline-none focus:border-violet-500">
                      {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-white/80">Assign Album</label>
                    <select value={formData.albumId} onChange={(e) => setFormData({ ...formData, albumId: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl bg-[#181622] border border-white/10 text-white focus:outline-none focus:border-violet-500">
                      <option value="">Single (No Album)</option>
                      {albums.map((al) => <option key={al.id} value={al.id}>{al.title} ({al.artist})</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-white/80">Genre</label>
                    <select value={formData.genre} onChange={(e) => setFormData({ ...formData, genre: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl bg-[#181622] border border-white/10 text-white focus:outline-none focus:border-violet-500">
                      {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-white/80">Duration (Seconds)</label>
                    <input type="number" min={10} max={3600} value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })} className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500 tabular-nums" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-white/80">Release Year</label>
                    <input type="number" min={1950} max={2030} value={formData.year} onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })} className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500 tabular-nums" />
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-white/5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white/40">Audio & Artwork Assets (Supabase Storage)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FileUploadZone
                      type="audio"
                      storagePath="songs"
                      storageBackend="supabase"
                      supabaseBucket="songs"
                      currentUrl={formData.audioUrl}
                      onUploadSuccess={(url) => {
                        setFormData((prev: SongFormData) => ({ ...prev, audioUrl: url }));
                        addToast('Audio master ready', 'success');
                      }}
                      onFileSelect={(selectedFile) => {
                        const file = Array.isArray(selectedFile) ? selectedFile[0] : selectedFile;
                        if (!file || formData.title.trim()) return;
                        const cleaned = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
                        const formatted = cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
                        if (formatted) {
                          setFormData((prev: SongFormData) => ({ ...prev, title: formatted }));
                          setTitleError(false);
                        }
                      }}
                      label="Upload Audio File *"
                      helperText="MP3, WAV, OGG (Max 35MB)"
                    />

                    <FileUploadZone
                      type="image"
                      storagePath="songs"
                      storageBackend="supabase"
                      supabaseBucket="covers"
                      currentUrl={formData.coverUrl}
                      onUploadSuccess={(url) => {
                        setFormData((prev: SongFormData) => ({ ...prev, coverUrl: url }));
                        addToast('Artwork attached', 'success');
                      }}
                      label="Upload Album Artwork *"
                      helperText="JPG, PNG, WEBP (Max 6MB)"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5"><FileText size={13} /> Synchronized Lyrics ({formData.lyrics?.length || 0} lines)</h4>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24"><input type="number" placeholder="Time (sec)" value={lyricLineTime} onChange={(e) => setLyricLineTime(Number(e.target.value))} className="w-full px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs tabular-nums focus:outline-none focus:border-violet-500" /></div>
                      <div className="flex-1"><input type="text" placeholder="Lyrics text..." value={lyricLineText} onChange={(e) => setLyricLineText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddLyricLine(); }}} className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500" /></div>
                      <button type="button" onClick={handleAddLyricLine} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-colors">Add Line</button>
                    </div>
                    <div className="max-h-36 overflow-y-auto divide-y divide-white/5 space-y-1 pr-1">
                      {formData.lyrics?.map((line: { time: number; text: string }, lIdx: number) => (
                        <div key={lIdx} className="flex items-center justify-between py-1 text-[11px] text-white/70 group">
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-violet-400 font-mono w-10 tabular-nums">{formatDuration(line.time)}</span>
                            <span className="truncate">{line.text}</span>
                          </div>
                          <button type="button" onClick={() => handleRemoveLyricLine(lIdx)} className="text-white/30 hover:text-rose-400 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                  <button type="button" onClick={() => { setShowAddModal(false); setEditingSong(null); onCloseCreate?.(); }} className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors">Cancel</button>
                  <button type="submit" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold shadow-lg shadow-violet-600/30 transition-all cursor-pointer"><Check size={14} /><span>{editingSong ? 'Save Track Changes' : 'Publish Song to Catalog'}</span></button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bulkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setBulkModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.97, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 20 }} className="relative z-10 w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#14121d] p-4 sm:p-6 shadow-2xl">
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-violet-600/20 p-2 text-violet-300 border border-violet-500/20"><UploadCloud size={18} /></div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Upload Multiple Songs</h3>
                    <p className="text-[11px] text-white/50">Bulk metadata, upload progress, retry support and catalog refresh</p>
                  </div>
                </div>
                <button type="button" onClick={() => setBulkModalOpen(false)} className="p-2 rounded-xl hover:bg-white/5 text-white/50 hover:text-white transition-colors"><X size={17} /></button>
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4">
                  <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const files = Array.from(e.dataTransfer.files || []); if (files.length) addBulkFiles(files); }} className="rounded-3xl border-2 border-dashed border-violet-500/30 bg-violet-500/5 p-5 text-center ring-1 ring-violet-500/10">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300"><UploadCloud size={26} /></div>
                    <p className="text-base font-semibold text-white">Drag and drop your music files here</p>
                    <p className="mt-1 text-xs text-white/45">or Browse Files</p>
                    <div className="mt-4 flex flex-wrap justify-center gap-3">
                      <button type="button" onClick={() => bulkAudioInputRef.current?.click()} className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500">Browse Files</button>
                      <button type="button" onClick={() => setBulkFiles([])} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10">Remove All</button>
                    </div>
                    <input ref={bulkAudioInputRef} type="file" accept=".mp3,.wav,.ogg,.m4a,.aac" multiple className="hidden" onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length) addBulkFiles(files); e.target.value = ''; }} />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                    <div className="mb-3 flex items-center justify-between gap-3 text-[11px] text-white/50"><span>Selected songs</span><span>{bulkFiles.length} files</span></div>
                    <div className="flex flex-wrap gap-3 text-[11px] text-white/65">
                      <div className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5">{bulkFiles.length} files</div>
                      <div className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5">{formatFileSize(totalBulkSize)}</div>
                      <div className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5">MP3, WAV, OGG, M4A, AAC</div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#111218]/80 overflow-hidden">
                    <div className="flex items-center justify-between bg-white/[0.02] px-3 py-2 border-b border-white/5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Queue</span>
                      <span className="text-[11px] text-white/45">{bulkCompleted}/{bulkFiles.length} uploaded</span>
                    </div>
                    {bulkFiles.length === 0 ? <div className="p-6 text-center text-xs text-white/40">No files selected yet.</div> : (
                      <div className="divide-y divide-white/5">
                        {bulkFiles.map((item, idx) => (
                          <div key={item.id} className="p-3">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex min-w-0 items-center gap-3">
                                <input type="checkbox" checked={item.selected} onChange={() => setBulkFiles((prev) => prev.map((row) => row.id === item.id ? { ...row, selected: !row.selected } : row))} className="h-4 w-4 rounded border-white/20 bg-transparent accent-violet-500" />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="truncate text-xs font-semibold text-white">{idx + 1} | {item.title}</span>
                                    {item.duplicate && <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-medium text-amber-300">Already exists</span>}
                                  </div>
                                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-white/45"><span>{formatFileSize(item.file.size)}</span><span>•</span><span>{item.file.name}</span></div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium border', item.status === 'completed' && 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300', item.status === 'uploading' && 'border-violet-500/20 bg-violet-500/10 text-violet-300', item.status === 'processing' && 'border-sky-500/20 bg-sky-500/10 text-sky-300', item.status === 'failed' && 'border-rose-500/20 bg-rose-500/10 text-rose-300', item.status === 'waiting' && 'border-white/10 bg-white/5 text-white/50')}>
                                  {item.status === 'completed' && 'Completed'}
                                  {item.status === 'uploading' && 'Uploading'}
                                  {item.status === 'processing' && 'Processing'}
                                  {item.status === 'failed' && 'Failed'}
                                  {item.status === 'waiting' && (
                                    item.duplicateAction === 'skip'
                                      ? 'Skipped'
                                      : item.duplicateAction === 'replace'
                                      ? 'Will Replace'
                                      : item.duplicate
                                      ? 'Duplicate'
                                      : 'Waiting'
                                  )}
                                </span>
                                <button type="button" onClick={() => setBulkFiles((prev) => prev.filter((row) => row.id !== item.id))} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/70 hover:bg-white/10">Remove</button>
                              </div>
                            </div>

                            {item.duplicate && (
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setBulkFiles((prev) => prev.map((row) => row.id === item.id ? { ...row, duplicateAction: row.duplicateAction === 'skip' ? 'new' : 'skip' } : row))}
                                  className={cn('rounded-lg border px-2.5 py-1 text-[10px] font-medium transition-colors',
                                    item.duplicateAction === 'skip'
                                      ? 'border-amber-400/50 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 ring-1 ring-amber-400/30'
                                      : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                                  )}
                                >
                                  {item.duplicateAction === 'skip' ? '⏭ Skipped (click to unskip)' : 'Skip'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setBulkFiles((prev) => prev.map((row) => row.id === item.id ? { ...row, duplicateAction: row.duplicateAction === 'replace' ? 'new' : 'replace' } : row))}
                                  className={cn('rounded-lg border px-2.5 py-1 text-[10px] font-medium transition-colors',
                                    item.duplicateAction === 'replace'
                                      ? 'border-cyan-400/60 bg-cyan-500/25 text-cyan-100 ring-1 ring-cyan-400/40 hover:bg-cyan-500/35'
                                      : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                                  )}
                                >
                                  {item.duplicateAction === 'replace' ? '✓ Replace (selected)' : 'Replace Existing'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setBulkFiles((prev) => prev.map((row) => row.id === item.id ? { ...row, duplicate: false, duplicateAction: 'new' } : row))}
                                  className={cn('rounded-lg border px-2.5 py-1 text-[10px] font-medium transition-colors',
                                    item.duplicateAction === 'new' && !item.duplicate
                                      ? 'border-violet-400/50 bg-violet-500/25 text-violet-200'
                                      : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                                  )}
                                >
                                  Upload as new
                                </button>
                              </div>
                            )}

                            {item.error && <div className="mt-2 text-[10px] text-rose-300">{item.error}</div>}

                            {(item.status === 'uploading' || item.status === 'failed' || item.status === 'waiting') && (
                              <div className="mt-2 space-y-1">
                                <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className={cn('h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all', item.status === 'failed' && 'bg-gradient-to-r from-rose-500 to-orange-400', item.status === 'waiting' && 'w-0')} style={{ width: `${item.progress}%` }} /></div>
                                <div className="flex items-center justify-between text-[10px] text-white/55"><span>{item.status === 'uploading' ? 'Uploading...' : item.status === 'failed' ? 'Failed' : 'Waiting'}</span><span>{item.progress}%</span></div>
                              </div>
                            )}

                            {item.status === 'failed' && (
                              <div className="mt-2 flex justify-end">
                                <button type="button" onClick={() => setBulkFiles((prev) => prev.map((row) => row.id === item.id ? { ...row, status: 'waiting', progress: 0, error: undefined } : row))} className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-2 py-1 text-[10px] font-medium text-rose-200 hover:bg-rose-500/20">Retry</button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                    <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/50">Upload Summary</h4>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-white/60"><span>Overall Progress</span><span>{bulkOverallProgress}%</span></div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${bulkFiles.length ? (bulkCompleted / bulkFiles.length) * 100 : 0}%` }} /></div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-white/65">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-2"><div className="text-white/40">Completed</div><div className="mt-1 font-semibold text-emerald-300">{bulkCompleted}</div></div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-2"><div className="text-white/40">Failed</div><div className="mt-1 font-semibold text-rose-300">{bulkFiles.filter((item) => item.status === 'failed').length}</div></div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-2"><div className="text-white/40">Queued</div><div className="mt-1 font-semibold text-violet-300">{bulkFiles.filter((item) => item.status === 'waiting').length}</div></div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-2"><div className="text-white/40">Skipped</div><div className="mt-1 font-semibold text-amber-300">{bulkFiles.filter((item) => item.duplicate && item.duplicateAction === 'skip').length}</div></div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                    <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/50">Bulk Metadata</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-[10px] text-white/60">Artist</label>
                        <select defaultValue={artists[0]?.id || 'a1'} className="w-full rounded-xl border border-white/10 bg-[#181622] px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500">
                          {artists.map((artist) => <option key={artist.id} value={artist.id}>{artist.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] text-white/60">Album</label>
                        <select defaultValue={albums[0]?.id || 'al1'} className="w-full rounded-xl border border-white/10 bg-[#181622] px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500">
                          {albums.map((album) => <option key={album.id} value={album.id}>{album.title}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-[10px] text-white/60">Genre</label>
                          <select defaultValue="Electronic" className="w-full rounded-xl border border-white/10 bg-[#181622] px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500">
                            {GENRES.map((genre) => <option key={genre} value={genre}>{genre}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] text-white/60">Release Year</label>
                          <input type="number" defaultValue={new Date().getFullYear()} className="w-full rounded-xl border border-white/10 bg-[#181622] px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500" />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button type="button" onClick={() => {
                          const selectedRows = bulkFiles.filter((item) => item.selected);
                          if (!selectedRows.length) {
                            addToast('Select at least one pending song to apply bulk metadata.', 'error');
                            return;
                          }
                          const artistId = artists[0]?.id || 'a1';
                          const albumId = albums[0]?.id || 'al1';
                          setBulkFiles((prev) => prev.map((row) => row.selected ? { ...row, artistId, albumId, genre: 'Electronic', year: new Date().getFullYear() } : row));
                          addToast('Bulk metadata applied to the selected songs.', 'success');
                        }} className="flex-1 rounded-xl bg-violet-600 px-3 py-2 text-[11px] font-semibold text-white hover:bg-violet-500">Edit Selected</button>
                        <button type="button" onClick={() => bulkCoverInputRef.current?.click()} className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-white/80 hover:bg-white/10">Apply Cover To Selected</button>
                        <input ref={bulkCoverInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.gif" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const validation = validateImageFile(file);
                          if (!validation.valid) {
                            addToast(validation.error || 'Invalid cover image', 'error');
                            e.target.value = '';
                            return;
                          }
                          const selectedRows = bulkFiles.filter((item) => item.selected);
                          if (!selectedRows.length) {
                            addToast('Choose at least one song before applying a cover image.', 'error');
                            e.target.value = '';
                            return;
                          }
                          const url = await uploadSongCover(`bulk_${Date.now()}`, file, { onProgress: () => undefined });
                          setBulkFiles((prev) => prev.map((row) => row.selected ? { ...row, coverUrl: url } : row));
                          addToast('Cover applied to the selected songs.', 'success');
                          e.target.value = '';
                        }} />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                    <div className="mb-2 flex items-center justify-between text-[11px] text-white/55"><span>Upload Queue Concurrency</span><span>{bulkConcurrency} active</span></div>
                    <input type="range" min={1} max={5} step={1} value={bulkConcurrency} onChange={(e) => setBulkConcurrency(Number(e.target.value))} className="w-full accent-violet-500" />
                  </div>

                  <div className="flex gap-2">
                    <button type="button" onClick={() => setBulkCancelOpen(true)} className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-white/80 hover:bg-white/10">Cancel Upload</button>
                    <button type="button" onClick={handleBulkUploadAll} disabled={bulkIsUploading} className="flex-1 rounded-xl bg-violet-600 px-3 py-2 text-[11px] font-semibold text-white hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed">{bulkIsUploading ? 'Uploading...' : 'Upload All Songs'}</button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={bulkCancelOpen}
        title="Cancel Upload"
        description="Uploads are currently in progress. Are you sure you want to cancel?"
        itemName="Current bulk upload"
        confirmLabel="Yes, cancel"
        onConfirm={() => {
          bulkCancelledRef.current = true;
          setBulkCancelOpen(false);
          setBulkIsUploading(false);
          addToast('Active upload queue halted. Completed uploads remain intact.', 'info');
        }}
        onClose={() => setBulkCancelOpen(false)}
      />

      <ConfirmDialog
        isOpen={Boolean(deletingSong)}
        title="Delete Song from Catalog"
        description="Are you sure you want to remove this song from the platform catalog? This will delete the song record and remove it from user playlists and libraries."
        itemName={deletingSong ? `"${deletingSong.title}" by ${deletingSong.artist}` : undefined}
        confirmLabel="Yes, Delete Song"
        onConfirm={() => {
          if (deletingSong) {
            deleteSong(deletingSong.id);
            setDeletingSong(null);
          }
        }}
        onClose={() => setDeletingSong(null)}
      />

      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        title={`Delete ${selectedSongIds.size} Song${selectedSongIds.size !== 1 ? 's' : ''}`}
        description={`This will permanently remove ${selectedSongIds.size} song${selectedSongIds.size !== 1 ? 's' : ''} from the catalog. This action cannot be undone.`}
        confirmLabel={`Delete ${selectedSongIds.size} Song${selectedSongIds.size !== 1 ? 's' : ''}`}
        onConfirm={() => {
          const ids = Array.from(selectedSongIds);
          deleteMultipleSongs(ids);
          addToast(`Deleted ${ids.length} song${ids.length !== 1 ? 's' : ''} from catalog.`, 'success');
          setSelectedSongIds(new Set());
          setBulkDeleteOpen(false);
        }}
        onClose={() => setBulkDeleteOpen(false)}
      />

      {/* ── Smart Bulk Music Folder Import Modal ────────────────────────────── */}
      <AnimatePresence>
        {showBulkFolderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="w-full max-w-6xl bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 my-auto max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-600/30">
                    <FolderUp size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Bulk Music Folder Import & Automatic Metadata
                    </h3>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Scan folders, extract embedded tags & artwork, resolve conflicts, and batch sync
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowBulkFolderModal(false)}
                  className="p-2.5 rounded-2xl bg-[var(--color-bg-overlay)] hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-white transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <BulkFolderImport onFinish={() => setShowBulkFolderModal(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getTrackTitleFromFilename(fileName: string) {
  return fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatFileSize(bytes: number) {
  if (!bytes) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function getAudioDuration(file: File, fallback = 180): Promise<number> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.src = objectUrl;
    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? Math.round(audio.duration) : fallback;
      URL.revokeObjectURL(objectUrl);
      resolve(duration);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(fallback);
    };
  });
}
