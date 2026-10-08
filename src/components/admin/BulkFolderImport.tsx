import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderUp, Music, Image as ImageIcon, Sparkles, CheckCircle2,
  AlertTriangle, XCircle, Play, Pause, RefreshCw, Edit3, Trash2,
  Filter, Search, Check, X, ArrowRight, Shield, Layers, UploadCloud,
  Sliders, ChevronDown, ChevronRight, ExternalLink, HelpCircle, HardDrive,
  Globe, Info, Table as TableIcon, LayoutGrid
} from 'lucide-react';
import { useAdminStore } from '@/store/adminStore';
import { useUIStore } from '@/store/uiStore';
import { analyzeAudioFile, parseMultipleArtists } from '@/services/musicMetadataService';
import { searchOnlineArtwork, validateCoverImage, DEFAULT_MR_MUSIC_COVER } from '@/services/artworkService';
import { detectDuplicateSong, BulkUploadQueue } from '@/services/bulkImportService';
import { uploadSingleSong } from '@/services/songUploadService';
import { matchSongSearch } from '@/utils/searchUtils';
import { formatDuration, cn } from '@/utils/cn';
import type {
  BulkImportItem,
  BulkImportSummary,
  ArtworkCandidate,
  ArtworkSourceType,
  BulkImportItemStatus
} from '@/types/admin';
import type { Track } from '@/types';

const SUPPORTED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];

const GENRE_OPTIONS = [
  'Tamil', 'Soundtrack', 'Film Score', 'Electronic', 'Pop',
  'Hip-Hop', 'R&B', 'Rock', 'Indie', 'Classical', 'Carnatic',
  'Folk', 'Melody', 'Dance', 'Devotional'
];

interface BulkFolderImportProps {
  onFinish?: () => void;
}

export function BulkFolderImport({ onFinish }: BulkFolderImportProps) {
  const { songs: catalogSongs, setActiveTab } = useAdminStore();
  const { addToast } = useUIStore();

  // ── States ─────────────────────────────────────────────────────────────────
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanCurrentFile, setScanCurrentFile] = useState('');
  const [items, setItems] = useState<BulkImportItem[]>([]);
  const [folderName, setFolderName] = useState('');

  // Queue & Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadConcurrency, setUploadConcurrency] = useState(3);
  const [uploadCompleteSummary, setUploadCompleteSummary] = useState<{
    total: number;
    success: number;
    failed: number;
  } | null>(null);

  // Filters & Search
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'new' | 'duplicates' | 'missing_art' | 'completed' | 'failed'
  >('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Preview player
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const [previewIsPlaying, setPreviewIsPlaying] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Modals
  const [editingItem, setEditingItem] = useState<BulkImportItem | null>(null);
  const [coverPickerItem, setCoverPickerItem] = useState<BulkImportItem | null>(null);

  // Track created object URLs for cleanup
  const createdObjectUrlsRef = useRef<Set<string>>(new Set());
  const queueRef = useRef<BulkUploadQueue | null>(null);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const registerObjectUrl = useCallback((url: string) => {
    if (url.startsWith('blob:')) {
      createdObjectUrlsRef.current.add(url);
    }
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      createdObjectUrlsRef.current.forEach((url) => {
        try { URL.revokeObjectURL(url); } catch { /* ignore */ }
      });
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  // ── 1. FOLDER / FILES SCANNING ──────────────────────────────────────────────

  const handleFilesSelected = async (fileList: FileList | File[]) => {
    const rawFiles = Array.from(fileList);
    if (!rawFiles.length) return;

    // Detect folder name if available
    const firstRelative = (rawFiles[0] as any).webkitRelativePath;
    if (firstRelative) {
      const parts = firstRelative.split('/');
      if (parts.length > 1) {
        setFolderName(parts[0]);
      }
    } else {
      setFolderName(`Batch (${rawFiles.length} files)`);
    }

    // Separate audio files and companion cover images
    const audioFiles: File[] = [];
    const companionImages = new Map<string, File>();

    rawFiles.forEach((f) => {
      const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        audioFiles.push(f);
      } else if (IMAGE_EXTENSIONS.includes(ext)) {
        const base = f.name.replace(/\.[^/.]+$/, '').toLowerCase();
        companionImages.set(base, f);
      }
    });

    if (!audioFiles.length) {
      addToast('No supported audio files (.mp3, .wav, .m4a, .aac, .ogg, .flac) found.', 'error');
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    setItems([]);

    const analyzedItems: BulkImportItem[] = [];
    const catalog = useAdminStore.getState().songs;

    for (let i = 0; i < audioFiles.length; i++) {
      const file = audioFiles[i];
      setScanCurrentFile(file.name);
      setScanProgress(Math.round(((i + 1) / audioFiles.length) * 100));

      try {
        const metadata = await analyzeAudioFile(file, companionImages);
        const dupCheck = detectDuplicateSong(metadata, catalog);

        // Track artwork blob URL
        if (metadata.artwork?.url) {
          registerObjectUrl(metadata.artwork.url);
        }

        // Online candidate search if artwork missing
        let onlineCandidates: ArtworkCandidate[] = [];
        let artworkSource = metadata.confidence.artwork;
        let coverUrl = metadata.artwork?.url || '';

        if (!coverUrl) {
          try {
            onlineCandidates = await searchOnlineArtwork({
              title: metadata.title,
              artist: metadata.artist,
              album: metadata.album,
            });

            if (onlineCandidates.length > 0) {
              coverUrl = onlineCandidates[0].url;
              artworkSource = 'online';
            } else {
              coverUrl = DEFAULT_MR_MUSIC_COVER;
              artworkSource = 'default';
            }
          } catch {
            coverUrl = DEFAULT_MR_MUSIC_COVER;
            artworkSource = 'default';
          }
        }

        const previewUrl = URL.createObjectURL(file);
        registerObjectUrl(previewUrl);

        // Discovered artist/album fallback from online match
        const discoveredCandidate = onlineCandidates[0];
        const isUnknownArtist = !metadata.artist || /^unknown(?:\s+artist)?$/i.test(metadata.artist);
        const resolvedArtist = (isUnknownArtist && discoveredCandidate?.artist) ? discoveredCandidate.artist : metadata.artist;
        const resolvedArtists = (isUnknownArtist && discoveredCandidate?.artist) ? parseMultipleArtists(discoveredCandidate.artist) : metadata.artists;
        const isGenericAlbum = !metadata.album || metadata.album === 'Singles' || metadata.album.endsWith(' - Single');
        const resolvedAlbum = (isGenericAlbum && discoveredCandidate?.album) ? discoveredCandidate.album : metadata.album;

        const item: BulkImportItem = {
          id: `item-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          file,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'audio/mpeg',
          bitrate: metadata.bitrate,
          title: metadata.title,
          artist: resolvedArtist,
          artists: resolvedArtists,
          album: resolvedAlbum,
          albumArtist: metadata.albumArtist,
          composer: metadata.composer,
          genre: metadata.genre,
          year: metadata.year,
          duration: metadata.duration,
          trackNumber: metadata.trackNumber,
          discNumber: metadata.discNumber,
          coverUrl,
          coverBlob: metadata.artwork?.blob,
          artworkSource,
          artworkCandidates: onlineCandidates,
          confidence: {
            ...metadata.confidence,
            artist: (isUnknownArtist && discoveredCandidate?.artist) ? 'online' : metadata.confidence.artist,
            album: (isGenericAlbum && discoveredCandidate?.album) ? 'online' : metadata.confidence.album,
            artwork: artworkSource,
          },
          metadataSource: metadata.metadataSource,
          conflicts: [],
          isDuplicate: dupCheck.isDuplicate,
          duplicateSongId: dupCheck.duplicateSongId,
          duplicateReason: dupCheck.reason,
          duplicateAction: dupCheck.isDuplicate ? 'skip' : 'new',
          status: 'idle',
          progress: 0,
          selected: !dupCheck.isDuplicate,
          previewUrl,
        };

        analyzedItems.push(item);
      } catch (err) {
        console.error(`Failed to analyze ${file.name}:`, err);
      }
    }

    setItems(analyzedItems);
    setIsScanning(false);
    setScanCurrentFile('');
    addToast(`Successfully analyzed ${analyzedItems.length} audio tracks!`, 'success');
  };

  // ── 2. SUMMARY COMPUTATION ─────────────────────────────────────────────────

  const summary: BulkImportSummary = useMemo(() => {
    const totalFiles = items.length;
    const supportedFiles = items.length;
    const unsupportedFiles = 0;
    const newSongs = items.filter((i) => !i.isDuplicate).length;
    const duplicateSongs = items.filter((i) => i.isDuplicate).length;
    const metadataFound = items.filter((i) => i.confidence.title === 'embedded').length;
    const artworkFound = items.filter((i) => i.artworkSource === 'embedded' || i.artworkSource === 'local').length;
    const artworkMissing = items.filter((i) => i.artworkSource === 'default' || !i.coverUrl).length;
    const totalSizeBytes = items.reduce((acc, i) => acc + i.fileSize, 0);

    return {
      totalFiles,
      supportedFiles,
      unsupportedFiles,
      newSongs,
      duplicateSongs,
      metadataFound,
      artworkFound,
      artworkMissing,
      totalSizeBytes,
    };
  }, [items]);

  // ── 3. FILTERED ITEMS ──────────────────────────────────────────────────────

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search across multi-field metadata
      const matchesSearch = matchSongSearch({
        title: item.title,
        artist: item.artist,
        artists: item.artists,
        album: item.album,
        albumArtist: item.albumArtist,
        composer: item.composer,
        genre: item.genre,
        fileName: item.fileName,
        trackNumber: item.trackNumber,
        year: item.year,
      }, searchFilter);

      if (!matchesSearch) return false;

      // Status Filter
      if (statusFilter === 'new') return !item.isDuplicate;
      if (statusFilter === 'duplicates') return item.isDuplicate;
      if (statusFilter === 'missing_art') return item.artworkSource === 'default' || !item.coverUrl;
      if (statusFilter === 'completed') return item.status === 'completed';
      if (statusFilter === 'failed') return item.status === 'failed';

      return true;
    });
  }, [items, searchFilter, statusFilter]);

  // ── 4. AUDIO PREVIEW PLAYER ────────────────────────────────────────────────

  const handleTogglePreview = (item: BulkImportItem) => {
    if (previewTrackId === item.id && previewIsPlaying) {
      previewAudioRef.current?.pause();
      setPreviewIsPlaying(false);
      return;
    }

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }

    if (!item.previewUrl) return;

    const audio = new Audio(item.previewUrl);
    previewAudioRef.current = audio;
    setPreviewTrackId(item.id);
    setPreviewIsPlaying(true);
    setPreviewProgress(0);

    audio.ontimeupdate = () => {
      if (audio.duration) {
        setPreviewProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    audio.onended = () => {
      setPreviewIsPlaying(false);
      setPreviewProgress(0);
    };

    audio.onerror = () => {
      setPreviewIsPlaying(false);
      addToast('Could not play audio preview for this file.', 'error');
    };

    audio.play().catch(() => {
      setPreviewIsPlaying(false);
    });
  };

  // ── 5. UPLOAD EXECUTION ────────────────────────────────────────────────────

  const handleStartImport = async (onlySelected: boolean = true) => {
    const targets = items.filter((i) =>
      i.status !== 'completed' &&
      (onlySelected ? i.selected : true) &&
      (!i.isDuplicate || i.duplicateAction !== 'skip')
    );

    if (!targets.length) {
      addToast('No eligible songs selected for import.', 'error');
      return;
    }

    setIsUploading(true);

    const queue = new BulkUploadQueue({
      concurrency: uploadConcurrency,
      onProgress: (itemId, status, progress, error, trackId) => {
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, status, progress, error, importedTrackId: trackId || item.importedTrackId }
              : item
          )
        );
      },
      onComplete: (summaryResult) => {
        setIsUploading(false);
        setUploadCompleteSummary(summaryResult);
        addToast('Bulk import finished!', 'success');
      },
    });

    queueRef.current = queue;
    queue.start(targets);
  };

  // ── 6. INDIVIDUAL ACTIONS ──────────────────────────────────────────────────

  const handleRetrySingle = async (item: BulkImportItem) => {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: 'uploading_audio', progress: 10, error: undefined } : i))
    );

    try {
      const track = await uploadSingleSong(item, {
        onStageChange: (stage, prog) => {
          setItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, status: stage, progress: prog } : i))
          );
        },
      });

      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, status: 'completed', progress: 100, error: undefined, importedTrackId: track.id }
            : i
        )
      );
      addToast(`Imported "${item.title}" successfully!`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'failed', progress: 0, error: msg } : i))
      );
      addToast(`Failed to upload ${item.title}: ${msg}`, 'error');
    }
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSelectAll = (select: boolean) => {
    setItems((prev) => prev.map((i) => ({ ...i, selected: select })));
  };

  const handleAutoFetchAllMissingArtwork = async () => {
    const missing = items.filter((i) => i.artworkSource === 'default' || !i.coverUrl);
    if (!missing.length) {
      addToast('All songs already have embedded or discovered artwork!', 'info');
      return;
    }

    addToast(`Searching online artwork for ${missing.length} songs...`, 'info');

    for (const item of missing) {
      try {
        const candidates = await searchOnlineArtwork({
          title: item.title,
          artist: item.artist,
          album: item.album,
        });

        if (candidates.length > 0) {
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? {
                    ...i,
                    coverUrl: candidates[0].url,
                    artworkSource: 'online',
                    artworkCandidates: candidates,
                    confidence: { ...i.confidence, artwork: 'online' },
                  }
                : i
            )
          );
        }
      } catch {
        /* ignore individual failures */
      }
    }

    addToast('Online artwork search completed.', 'success');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={folderInputRef}
        onChange={(e) => {
          if (e.target.files) handleFilesSelected(e.target.files);
          e.target.value = '';
        }}
        // @ts-ignore
        webkitdirectory="true"
        directory="true"
        multiple
        className="hidden"
      />

      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files) handleFilesSelected(e.target.files);
          e.target.value = '';
        }}
        multiple
        accept=".mp3,.wav,.m4a,.aac,.ogg,.flac,audio/*,image/*"
        className="hidden"
      />

      {/* ── Top Header & Folder Action ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[var(--color-bg-card)] border border-[var(--color-border)] shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center text-white shadow-lg shadow-violet-600/30">
            <FolderUp size={24} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Bulk Song Import & Metadata Engine
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Select an entire music folder to automatically extract ID3 tags, detect duplicates, and link artists & albums.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            disabled={isScanning || isUploading}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-violet-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <FolderUp size={16} />
            <span>Select Music Folder</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning || isUploading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--color-bg-overlay)] hover:bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-white font-semibold text-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <UploadCloud size={15} />
            <span>Files</span>
          </button>
        </div>
      </div>

      {/* ── Scanning Progress Bar ──────────────────────────────────────────── */}
      {isScanning && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-3xl bg-[var(--color-bg-card)] border border-violet-500/30 shadow-2xl space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-violet-600/20 flex items-center justify-center text-violet-400 animate-spin">
                <RefreshCw size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">
                  Analyzing Audio Metadata & Companion Artwork...
                </h4>
                <p className="text-[11px] text-[var(--color-text-secondary)] truncate max-w-md font-mono">
                  {scanCurrentFile}
                </p>
              </div>
            </div>
            <span className="text-base font-extrabold text-violet-400 font-mono">
              {scanProgress}%
            </span>
          </div>

          <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-600 via-indigo-500 to-pink-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${scanProgress}%` }}
              transition={{ ease: 'easeOut' }}
            />
          </div>
        </motion.div>
      )}

      {/* ── Empty Drag & Drop Zone ─────────────────────────────────────────── */}
      {!isScanning && items.length === 0 && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files) {
              handleFilesSelected(e.dataTransfer.files);
            }
          }}
          onClick={() => folderInputRef.current?.click()}
          className="p-12 md:p-16 rounded-3xl border-2 border-dashed border-violet-500/30 hover:border-violet-500/60 bg-[var(--color-bg-card)]/50 hover:bg-violet-950/10 transition-all cursor-pointer text-center space-y-4 group"
        >
          <div className="w-16 h-16 rounded-3xl bg-violet-600/10 group-hover:bg-violet-600/20 border border-violet-500/20 text-violet-400 mx-auto flex items-center justify-center transition-all group-hover:scale-110 shadow-lg">
            <FolderUp size={32} />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">
              Drag & Drop a Music Folder Here
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              or click anywhere to browse your local folder (e.g. C:\Downloads\Tamil Songs)
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-[var(--color-text-muted)]">
            <span className="font-semibold text-violet-300">Supported:</span>
            <span>MP3 • WAV • M4A • AAC • OGG • FLAC</span>
          </div>
        </div>
      )}

      {/* ── Analyzed Batch Workspace ────────────────────────────────────────── */}
      {items.length > 0 && (
        <div className="space-y-5">
          {/* ── Summary Statistics Cards ────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            <div className="p-3 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)]">
              <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] block">Total Files</span>
              <span className="text-base font-extrabold text-white">{summary.totalFiles}</span>
            </div>

            <div className="p-3 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)]">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block">Supported</span>
              <span className="text-base font-extrabold text-emerald-400">{summary.supportedFiles}</span>
            </div>

            <div className="p-3 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)]">
              <span className="text-[10px] uppercase font-bold text-violet-400 block">New Songs</span>
              <span className="text-base font-extrabold text-violet-400">{summary.newSongs}</span>
            </div>

            <div className="p-3 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)]">
              <span className="text-[10px] uppercase font-bold text-amber-400 block">Duplicates</span>
              <span className="text-base font-extrabold text-amber-400">{summary.duplicateSongs}</span>
            </div>

            <div className="p-3 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)]">
              <span className="text-[10px] uppercase font-bold text-sky-400 block">ID3 Tags</span>
              <span className="text-base font-extrabold text-sky-400">{summary.metadataFound}</span>
            </div>

            <div className="p-3 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)]">
              <span className="text-[10px] uppercase font-bold text-pink-400 block">Artwork Found</span>
              <span className="text-base font-extrabold text-pink-400">{summary.artworkFound}</span>
            </div>

            <div className="p-3 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)]">
              <span className="text-[10px] uppercase font-bold text-yellow-400 block">Missing Art</span>
              <span className="text-base font-extrabold text-yellow-400">{summary.artworkMissing}</span>
            </div>

            <div className="p-3 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)]">
              <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] block">Total Size</span>
              <span className="text-base font-extrabold text-white">
                {(summary.totalSizeBytes / (1024 * 1024)).toFixed(1)} MB
              </span>
            </div>
          </div>

          {/* ── Toolbar: Search, Filters & Actions ────────────────────────────── */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5 p-3.5 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)]">
            {/* Search and Status Pills */}
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative min-w-[200px] flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  placeholder="Search batch by title, artist, album, file..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500"
                />
                {searchFilter && (
                  <button
                    onClick={() => setSearchFilter('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 flex-wrap">
                {(
                  [
                    { key: 'all', label: 'All', count: items.length },
                    { key: 'new', label: 'New', count: summary.newSongs },
                    { key: 'duplicates', label: 'Duplicates', count: summary.duplicateSongs },
                    { key: 'missing_art', label: 'Missing Art', count: summary.artworkMissing },
                    { key: 'completed', label: 'Completed', count: items.filter((i) => i.status === 'completed').length },
                    { key: 'failed', label: 'Failed', count: items.filter((i) => i.status === 'failed').length },
                  ] as const
                ).map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setStatusFilter(key)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
                      statusFilter === key
                        ? 'bg-violet-600 text-white shadow'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    )}
                  >
                    <span>{label}</span>
                    <span className={cn('text-[10px] px-1 rounded-full font-mono', statusFilter === key ? 'bg-white/20' : 'bg-white/5')}>
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* View Mode & Import Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {summary.artworkMissing > 0 && (
                <button
                  type="button"
                  onClick={handleAutoFetchAllMissingArtwork}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-600/20 hover:bg-pink-600/30 text-pink-300 border border-pink-500/30 text-xs font-semibold transition-all cursor-pointer"
                >
                  <Globe size={13} />
                  <span>Fetch Missing Artwork</span>
                </button>
              )}

              {/* View Toggle */}
              <div className="flex items-center p-0.5 bg-black/40 rounded-xl border border-white/5">
                <button
                  onClick={() => setViewMode('table')}
                  className={cn(
                    'p-1.5 rounded-lg transition-colors cursor-pointer',
                    viewMode === 'table' ? 'bg-violet-600 text-white' : 'text-white/40 hover:text-white'
                  )}
                  title="Table View"
                >
                  <TableIcon size={14} />
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={cn(
                    'p-1.5 rounded-lg transition-colors cursor-pointer',
                    viewMode === 'cards' ? 'bg-violet-600 text-white' : 'text-white/40 hover:text-white'
                  )}
                  title="Card View"
                >
                  <LayoutGrid size={14} />
                </button>
              </div>

              {/* Concurrency Selector */}
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60">
                <Sliders size={12} />
                <span>Threads:</span>
                <select
                  value={uploadConcurrency}
                  onChange={(e) => setUploadConcurrency(Number(e.target.value))}
                  className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
                >
                  <option value={1} className="bg-neutral-900 text-white">1x</option>
                  <option value={2} className="bg-neutral-900 text-white">2x</option>
                  <option value={3} className="bg-neutral-900 text-white">3x</option>
                  <option value={5} className="bg-neutral-900 text-white">5x</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => handleSelectAll(items.some((i) => !i.selected))}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                {items.every((i) => i.selected) ? 'Deselect All' : 'Select All'}
              </button>

              {/* Primary Import Button */}
              <button
                type="button"
                onClick={() => handleStartImport(true)}
                disabled={isUploading || !items.some((i) => i.selected && i.status !== 'completed')}
                className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-violet-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={13} />
                    <span>Import Selected ({items.filter((i) => i.selected && i.status !== 'completed').length})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ── Results Container: Table View or Card View ───────────────────── */}
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white/[0.02] border border-white/5 space-y-2">
              <Search size={28} className="mx-auto text-white/20" />
              <h4 className="text-sm font-bold text-white">No matching tracks in batch</h4>
              <p className="text-xs text-white/40">Try adjusting your search query or status filter.</p>
            </div>
          ) : viewMode === 'table' ? (
            /* ── Responsive Table View ───────────────────────────────────────── */
            <div className="rounded-3xl border border-white/10 bg-[#12111d] overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[11px] font-semibold text-white/40 uppercase tracking-wider bg-white/[0.02]">
                      <th className="py-3 px-3.5 w-10">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-white/20 bg-transparent accent-violet-500 cursor-pointer"
                          checked={filteredItems.length > 0 && filteredItems.every((i) => i.selected)}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          title="Select all visible"
                        />
                      </th>
                      <th className="py-3 px-3 w-16">Cover</th>
                      <th className="py-3 px-4 min-w-[220px]">Song / Artist</th>
                      <th className="py-3 px-4 min-w-[160px]">Album</th>
                      <th className="py-3 px-3 w-16">Year</th>
                      <th className="py-3 px-3 w-20 text-center">Duration</th>
                      <th className="py-3 px-4 min-w-[200px]">Status & Duplicates</th>
                      <th className="py-3 px-4 text-right w-36">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {filteredItems.map((item) => {
                      const isItemPreviewing = previewTrackId === item.id && previewIsPlaying;

                      return (
                        <tr
                          key={item.id}
                          className={cn(
                            'hover:bg-white/[0.03] transition-colors group',
                            item.status === 'completed' && 'bg-emerald-950/10',
                            item.status === 'failed' && 'bg-red-950/10',
                            item.isDuplicate && item.status === 'idle' && 'bg-amber-950/10'
                          )}
                        >
                          {/* Selection Checkbox */}
                          <td className="py-3 px-3.5 align-middle">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={(e) => {
                                setItems((prev) =>
                                  prev.map((i) => (i.id === item.id ? { ...i, selected: e.target.checked } : i))
                                );
                              }}
                              disabled={item.status === 'completed'}
                              className="w-4 h-4 rounded border-white/20 bg-transparent accent-violet-500 cursor-pointer"
                            />
                          </td>

                          {/* Fixed 56x56 px Cover Thumbnail */}
                          <td className="py-3 px-3 align-middle">
                            <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-black/40 shadow flex-shrink-0 group/cover">
                              <img
                                src={item.coverUrl || DEFAULT_MR_MUSIC_COVER}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => handleTogglePreview(item)}
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover/cover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                                title="Play preview"
                              >
                                {isItemPreviewing ? <Pause size={16} /> : <Play size={16} className="translate-x-0.5" />}
                              </button>

                              {/* Source badge on cover corner */}
                              <span
                                className={cn(
                                  'absolute bottom-0.5 right-0.5 px-1 rounded text-[8px] font-extrabold uppercase',
                                  item.artworkSource === 'embedded'
                                    ? 'bg-violet-600 text-white'
                                    : item.artworkSource === 'local'
                                    ? 'bg-emerald-600 text-white'
                                    : item.artworkSource === 'online'
                                    ? 'bg-sky-600 text-white'
                                    : 'bg-neutral-700 text-neutral-300'
                                )}
                              >
                                {item.artworkSource}
                              </span>
                            </div>
                          </td>

                          {/* Song Title & Artists */}
                          <td className="py-3 px-4 align-middle">
                            <div className="space-y-0.5 min-w-0 max-w-sm">
                              <p className="font-semibold text-white truncate text-sm" title={item.title}>
                                {item.title}
                              </p>
                              <p className="text-xs text-violet-300 font-medium truncate" title={item.artist}>
                                {item.artist}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-white/40 font-mono truncate">
                                <span>{item.fileName}</span>
                                {item.bitrate && <span className="text-violet-400">({item.bitrate} kbps)</span>}
                              </div>
                            </div>
                          </td>

                          {/* Album */}
                          <td className="py-3 px-4 align-middle">
                            <div className="min-w-0 max-w-[180px]">
                              <p className="text-white/80 font-medium truncate" title={item.album}>
                                {item.album}
                              </p>
                              <span className="text-[10px] text-white/40">
                                {item.genre} {item.trackNumber ? `• Track ${item.trackNumber}` : ''}
                              </span>
                            </div>
                          </td>

                          {/* Year */}
                          <td className="py-3 px-3 align-middle text-white/50 tabular-nums">
                            {item.year || '—'}
                          </td>

                          {/* Duration */}
                          <td className="py-3 px-3 align-middle text-center text-white/50 font-mono tabular-nums">
                            {formatDuration(item.duration)}
                          </td>

                          {/* Status & Duplicates */}
                          <td className="py-3 px-4 align-middle">
                            <div className="space-y-1.5">
                              {/* Duplicate banner & dropdown */}
                              {item.isDuplicate && (
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                                    <AlertTriangle size={10} /> Duplicate
                                  </span>
                                  {item.status !== 'completed' && (
                                    <select
                                      value={item.duplicateAction}
                                      onChange={(e) => {
                                        const act = e.target.value as 'skip' | 'replace' | 'new';
                                        setItems((prev) =>
                                          prev.map((i) =>
                                            i.id === item.id ? { ...i, duplicateAction: act, selected: act !== 'skip' } : i
                                          )
                                        );
                                      }}
                                      className="bg-black/60 border border-amber-500/40 text-amber-300 text-[11px] rounded-lg px-1.5 py-0.5 font-semibold focus:outline-none cursor-pointer"
                                    >
                                      <option value="skip" className="bg-neutral-900 text-white">Skip</option>
                                      <option value="replace" className="bg-neutral-900 text-white">Replace</option>
                                      <option value="new" className="bg-neutral-900 text-white">Import As New</option>
                                    </select>
                                  )}
                                </div>
                              )}

                              {/* Uploading progress indicator */}
                              {item.status === 'uploading_audio' && (
                                <div className="flex items-center gap-1.5 text-violet-400 text-xs font-semibold">
                                  <RefreshCw size={12} className="animate-spin" />
                                  <span>Audio ({item.progress}%)</span>
                                </div>
                              )}

                              {item.status === 'uploading_cover' && (
                                <div className="flex items-center gap-1.5 text-pink-400 text-xs font-semibold">
                                  <RefreshCw size={12} className="animate-spin" />
                                  <span>Cover ({item.progress}%)</span>
                                </div>
                              )}

                              {item.status === 'saving_database' && (
                                <div className="flex items-center gap-1.5 text-sky-400 text-xs font-semibold">
                                  <RefreshCw size={12} className="animate-spin" />
                                  <span>Saving...</span>
                                </div>
                              )}

                              {item.status === 'completed' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                                  <CheckCircle2 size={12} /> Imported
                                </span>
                              )}

                              {item.status === 'failed' && (
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1 text-red-400 text-xs font-semibold" title={item.error}>
                                    <AlertTriangle size={12} /> Failed
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRetrySingle(item)}
                                    className="px-2 py-0.5 rounded bg-red-600/20 text-red-300 text-[10px] font-bold hover:bg-red-600/30 cursor-pointer"
                                  >
                                    Retry
                                  </button>
                                </div>
                              )}

                              {/* ID3 tag confidence */}
                              <div className="text-[10px] text-white/40">
                                {item.confidence.title === 'embedded' ? '✓ ID3 Metadata' : 'ℹ Filename heuristic'}
                              </div>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 align-middle text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {item.status !== 'completed' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setCoverPickerItem(item)}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                                    title="Choose Album Artwork"
                                  >
                                    <ImageIcon size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingItem(item)}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                                    title="Edit Metadata"
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItem(item.id)}
                                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                                    title="Remove from batch"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ── Compact Cards View ───────────────────────────────────────────── */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredItems.map((item) => {
                const isItemPreviewing = previewTrackId === item.id && previewIsPlaying;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'p-3.5 rounded-2xl bg-[#12111d] border border-white/10 flex items-center justify-between gap-3.5 transition-all',
                      item.status === 'completed' && 'border-emerald-500/30 bg-emerald-950/10',
                      item.status === 'failed' && 'border-red-500/30 bg-red-950/10',
                      item.isDuplicate && 'border-amber-500/30 bg-amber-950/5'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={(e) => {
                          setItems((prev) =>
                            prev.map((i) => (i.id === item.id ? { ...i, selected: e.target.checked } : i))
                          );
                        }}
                        disabled={item.status === 'completed'}
                        className="w-4 h-4 rounded border-white/20 bg-transparent accent-violet-500 cursor-pointer"
                      />

                      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-black/40 shadow flex-shrink-0 group/cover">
                        <img
                          src={item.coverUrl || DEFAULT_MR_MUSIC_COVER}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleTogglePreview(item)}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover/cover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                        >
                          {isItemPreviewing ? <Pause size={16} /> : <Play size={16} className="translate-x-0.5" />}
                        </button>
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <h4 className="text-sm font-bold text-white truncate" title={item.title}>
                          {item.title}
                        </h4>
                        <p className="text-xs text-violet-300 font-medium truncate">{item.artist}</p>
                        <p className="text-[10px] text-white/40 truncate">{item.album} • {formatDuration(item.duration)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {item.isDuplicate && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                          Dup
                        </span>
                      )}
                      {item.status !== 'completed' && (
                        <>
                          <button
                            type="button"
                            onClick={() => setCoverPickerItem(item)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
                          >
                            <ImageIcon size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingItem(item)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Metadata Edit Modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingItem(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg rounded-3xl bg-[#151322] border border-white/10 p-6 shadow-2xl space-y-4 text-xs"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400">
                    <Edit3 size={16} />
                  </div>
                  <h3 className="text-base font-bold text-white">Edit Track Metadata</h3>
                </div>
                <button
                  onClick={() => setEditingItem(null)}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-white/40 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-white/70 block mb-1">Song Title</label>
                  <input
                    type="text"
                    value={editingItem.title}
                    onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-white/70 block mb-1">Primary Artist</label>
                    <input
                      type="text"
                      value={editingItem.artist}
                      onChange={(e) => {
                        const newName = e.target.value;
                        setEditingItem({
                          ...editingItem,
                          artist: newName,
                          artists: parseMultipleArtists(newName),
                        });
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-white/70 block mb-1">Album Title</label>
                    <input
                      type="text"
                      value={editingItem.album}
                      onChange={(e) => setEditingItem({ ...editingItem, album: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-white/70 block mb-1">Genre</label>
                    <select
                      value={editingItem.genre}
                      onChange={(e) => setEditingItem({ ...editingItem, genre: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#1a1828] border border-white/10 text-white focus:outline-none focus:border-violet-500"
                    >
                      {GENRE_OPTIONS.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-white/70 block mb-1">Year</label>
                    <input
                      type="number"
                      value={editingItem.year}
                      onChange={(e) => setEditingItem({ ...editingItem, year: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-white/70 block mb-1">Track #</label>
                    <input
                      type="number"
                      value={editingItem.trackNumber || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, trackNumber: Number(e.target.value) || undefined })}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setItems((prev) =>
                      prev.map((i) => (i.id === editingItem.id ? editingItem : i))
                    );
                    setEditingItem(null);
                    addToast('Updated metadata', 'success');
                  }}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Cover Picker Modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {coverPickerItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCoverPickerItem(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl rounded-3xl bg-[#151322] border border-white/10 p-6 shadow-2xl space-y-4 text-xs"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-pink-600/20 text-pink-400">
                    <ImageIcon size={16} />
                  </div>
                  <h3 className="text-base font-bold text-white">Choose Cover Artwork</h3>
                </div>
                <button
                  onClick={() => setCoverPickerItem(null)}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-white/40 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-white/60">
                  Select discovered high-resolution artwork for <span className="text-white font-bold">"{coverPickerItem.title}"</span>:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-64 overflow-y-auto p-1">
                  {coverPickerItem.artworkCandidates.map((cand, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setItems((prev) =>
                          prev.map((i) =>
                            i.id === coverPickerItem.id
                              ? {
                                  ...i,
                                  coverUrl: cand.url,
                                  artworkSource: 'online',
                                }
                              : i
                          )
                        );
                        setCoverPickerItem(null);
                        addToast('Updated album cover art', 'success');
                      }}
                      className="relative rounded-2xl overflow-hidden border-2 border-white/10 hover:border-violet-500 transition-all group/cand aspect-square bg-black/40"
                    >
                      <img src={cand.url} alt={cand.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/cand:opacity-100 flex flex-col justify-end p-2 text-left transition-opacity">
                        <span className="text-[10px] text-white font-bold truncate">{cand.album || cand.title}</span>
                        <span className="text-[8px] text-white/60">{cand.width ? `${cand.width}x${cand.height}` : 'iTunes HQ'}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setCoverPickerItem(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
