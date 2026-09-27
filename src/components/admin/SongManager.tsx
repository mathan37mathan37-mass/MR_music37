import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music, Plus, Search, Edit2, Trash2, Play, Pause,
  Calendar, Disc, Mic2, Tag, FileText, Check, X,
  Clock, ExternalLink, Sparkles, UploadCloud, FileAudio,
  Image as ImageIcon, RefreshCw, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { useAdminStore } from '@/store/adminStore';
import { usePlayerStore } from '@/store/playerStore';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { FileUploadZone } from './FileUploadZone';
import { ConfirmDialog } from './ConfirmDialog';
import type { Track } from '@/types';
import type { SongFormData } from '@/types/admin';
import { validateAudioFile, validateImageFile, uploadMediaWithProgress } from '@/services/storageService';
import { formatDuration, cn } from '@/utils/cn';

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
  duplicateAction?: 'skip' | 'replace' | 'new';
  selected: boolean;
}

interface SongManagerProps {
  isCreateOpen?: boolean;
  onCloseCreate?: () => void;
}

export function SongManager({ isCreateOpen = false, onCloseCreate }: SongManagerProps) {
  const { songs, artists, albums, addSong, updateSong, deleteSong } = useAdminStore();
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayerStore();
  const { addToast } = useUIStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [editingSong, setEditingSong] = useState<Track | null>(null);
  const [showAddModal, setShowAddModal] = useState(isCreateOpen);
  const [deletingSong, setDeletingSong] = useState<Track | null>(null);
  const [titleError, setTitleError] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkCancelOpen, setBulkCancelOpen] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<BulkUploadItem[]>([]);
  const [bulkConcurrency, setBulkConcurrency] = useState(3);
  const [bulkIsUploading, setBulkIsUploading] = useState(false);

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

  const filteredSongs = songs.filter((s) => {
    const matchesQuery =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.album.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = selectedGenre === 'all' || s.genre === selectedGenre;
    return matchesQuery && matchesGenre;
  });

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
      const mapped: BulkUploadItem[] = validAudioFiles
        .filter((file) => !seenKeys.has(`${file.name}:${file.size}`))
        .map((file) => {
          const baseTitle = getTrackTitleFromFilename(file.name);
          const duplicate = songs.some((song) => {
            const titleMatch = song.title.toLowerCase() === baseTitle.toLowerCase();
            const audioHint = !!song.audioUrl && (
              song.audioUrl.toLowerCase().includes(baseTitle.toLowerCase()) ||
              song.audioUrl.toLowerCase().includes(file.name.toLowerCase().replace(/\.[^/.]+$/, ''))
            );
            return titleMatch || audioHint;
          });

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
            duplicateAction: 'new' as const,
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
    const updated = (formData.lyrics || []).filter((_, i) => i !== index);
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
          const storagePath = `music/songs/${songId}`;
          const url = await uploadMediaWithProgress(storagePath, current.file, {
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

          const selectedArtist = artists.find((artist) => artist.id === current.artistId) || artists[0];
          const selectedAlbum = albums.find((album) => album.id === current.albumId) || albums[0];
          const titleValue = current.title.trim() || getTrackTitleFromFilename(current.file.name);

          const existingSong = current.duplicate && current.duplicateAction === 'replace'
            ? songs.find((song) => song.title.toLowerCase() === titleValue.toLowerCase() ||
              (!!song.audioUrl && (song.audioUrl.toLowerCase().includes(titleValue.toLowerCase()) ||
                song.audioUrl.toLowerCase().includes(current.file.name.toLowerCase().replace(/\.[^/.]+$/, '')))))
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
              lyrics: current.lyrics || existingSong.lyrics || [],
            } as any;

            updateSong(existingSong.id, updatedSong);
            setBulkFiles((prev) => prev.map((row) => row.id === current.id ? { ...row, status: 'completed', progress: 100, error: undefined } : row));
            addToast(`${titleValue} replaced the duplicate record.`, 'success');
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

          const adminId = useAuthStore.getState().user?.uid || useAuthStore.getState().firebaseUser?.uid || 'admin-user';
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
            onClick={() => {
              setEditingSong(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/20 transition-all cursor-pointer"
          >
            <Plus size={14} /> Add Song
          </button>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setBulkModalOpen(true)}
          className="flex items-center gap-2 rounded-2xl border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 px-4 py-2 text-xs font-semibold text-violet-200 transition-colors"
        >
          <UploadCloud size={14} /> Upload Multiple Songs
        </button>
      </div>

      <div className="glass rounded-3xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[11px] font-semibold text-white/40 uppercase tracking-wider bg-white/[0.01]">
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

                return (
                  <tr key={song.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="py-3 px-4 text-white/30 tabular-nums">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 shadow">
                          <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
                          <button
                            onClick={() => (isCurrent ? togglePlay() : playTrack(song))}
                            className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                          >
                            {isPlayingThis ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" className="ml-0.5" />}
                          </button>
                        </div>
                        <div className="min-w-0">
                          <p className={`font-semibold truncate ${isCurrent ? 'text-violet-400' : 'text-white'}`}>{song.title}</p>
                          <span className="text-[10px] text-white/40 flex items-center gap-1.5">
                            {song.lyrics?.length ? (
                              <span className="text-emerald-400 flex items-center gap-0.5"><Check size={10} /> Lyrics synced</span>
                            ) : 'No lyrics'}
                          </span>
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
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white/40">Audio & Artwork Assets (Firebase Storage)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FileUploadZone
                      type="audio"
                      storagePath="songs/audio"
                      currentUrl={formData.audioUrl}
                      onUploadSuccess={(url) => {
                        setFormData((prev) => ({ ...prev, audioUrl: url }));
                        addToast('Audio master ready', 'success');
                      }}
                      onFileSelect={(selectedFile) => {
                        const file = Array.isArray(selectedFile) ? selectedFile[0] : selectedFile;
                        if (!file || formData.title.trim()) return;
                        const cleaned = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
                        const formatted = cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
                        if (formatted) {
                          setFormData((prev) => ({ ...prev, title: formatted }));
                          setTitleError(false);
                        }
                      }}
                      label="Upload Audio File *"
                      helperText="MP3, WAV, OGG (Max 35MB)"
                    />

                    <FileUploadZone
                      type="image"
                      storagePath="songs/artwork"
                      currentUrl={formData.coverUrl}
                      onUploadSuccess={(url) => {
                        setFormData((prev) => ({ ...prev, coverUrl: url }));
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
                      {formData.lyrics?.map((line, lIdx) => (
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
                                  {item.status === 'waiting' && (item.duplicate ? 'Already exists' : 'Waiting')}
                                </span>
                                <button type="button" onClick={() => setBulkFiles((prev) => prev.filter((row) => row.id !== item.id))} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/70 hover:bg-white/10">Remove</button>
                              </div>
                            </div>

                            {item.duplicate && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button type="button" onClick={() => setBulkFiles((prev) => prev.map((row) => row.id === item.id ? { ...row, duplicateAction: 'skip' } : row))} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/70 hover:bg-white/10">Skip</button>
                                <button type="button" onClick={() => setBulkFiles((prev) => prev.map((row) => row.id === item.id ? { ...row, duplicateAction: 'replace', duplicate: true } : row))} className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200 hover:bg-amber-500/20">Replace</button>
                                <button type="button" onClick={() => setBulkFiles((prev) => prev.map((row) => row.id === item.id ? { ...row, duplicate: false, duplicateAction: 'new' } : row))} className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-2 py-1 text-[10px] text-violet-200 hover:bg-violet-500/20">Upload as new</button>
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
                          const url = await uploadMediaWithProgress('music/covers/bulk', file, { onProgress: () => undefined });
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
        itemName={deletingSong ? `\"${deletingSong.title}\" by ${deletingSong.artist}` : undefined}
        confirmLabel="Yes, Delete Song"
        onConfirm={() => {
          if (deletingSong) {
            deleteSong(deletingSong.id);
            setDeletingSong(null);
          }
        }}
        onClose={() => setDeletingSong(null)}
      />
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
