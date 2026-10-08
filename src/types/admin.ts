import type { Track, Album, Artist } from './index';

export type AdminTab = 'overview' | 'songs' | 'import' | 'artists' | 'albums' | 'users' | 'uploads';

export type MetadataConfidenceSource = 'embedded' | 'online' | 'filename' | 'default' | 'manual';
export type ArtworkSourceType = 'embedded' | 'local' | 'online' | 'default' | 'custom';

export interface ConfidenceMap {
  title: MetadataConfidenceSource;
  artist: MetadataConfidenceSource;
  album: MetadataConfidenceSource;
  year: MetadataConfidenceSource;
  genre: MetadataConfidenceSource;
  composer: MetadataConfidenceSource;
  artwork: ArtworkSourceType;
}

export interface ArtworkCandidate {
  url: string;
  source: ArtworkSourceType;
  title?: string;
  artist?: string;
  album?: string;
  width?: number;
  height?: number;
}

export interface MetadataConflict {
  field: string;
  embeddedValue: string;
  onlineValue: string;
}

export type BulkImportItemStatus =
  | 'idle'
  | 'analyzing'
  | 'ready'
  | 'uploading_audio'
  | 'uploading_cover'
  | 'saving_database'
  | 'completed'
  | 'failed';

export interface BulkImportItem {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  mimeType: string;
  bitrate?: number;

  // Metadata
  title: string;
  artist: string;
  artists: string[];
  album: string;
  albumArtist?: string;
  composer?: string;
  genre: string;
  year: number;
  duration: number; // in seconds
  trackNumber?: number;
  discNumber?: number;

  // Artwork
  coverUrl: string; // Object URL or remote URL
  coverBlob?: Blob; // Raw blob for embedded/custom upload
  coverFile?: File; // Custom uploaded cover file
  artworkSource: ArtworkSourceType;
  artworkCandidates: ArtworkCandidate[];

  // Confidence & Source Tracking
  confidence: ConfidenceMap;
  metadataSource: string;
  conflicts: MetadataConflict[];

  // Duplicate Check
  isDuplicate: boolean;
  duplicateSongId?: string;
  duplicateReason?: string;
  duplicateAction: 'skip' | 'replace' | 'new';

  // State & Progress
  status: BulkImportItemStatus;
  progress: number;
  error?: string;
  selected: boolean;
  importedTrackId?: string;
  previewUrl?: string; // Audio preview object URL
}

export interface BulkImportSummary {
  totalFiles: number;
  supportedFiles: number;
  unsupportedFiles: number;
  newSongs: number;
  duplicateSongs: number;
  metadataFound: number;
  artworkFound: number;
  artworkMissing: number;
  totalSizeBytes: number;
}


export interface AdminStats {
  totalUsers: number;
  totalSongs: number;
  totalArtists: number;
  totalAlbums: number;
  totalPlaylists: number;
  totalPlays: number;
  activeListenersToday: number;
  newUsersThisWeek: number;
}

export interface ManagedUser {
  id: string;
  email: string;
  displayName: string;
  username: string;
  photoURL?: string;
  role: 'admin' | 'creator' | 'listener';
  status: 'active' | 'blocked';
  joinedAt: number;
  lastActive: number;
  playsCount: number;
  likedCount: number;
  playlistsCount: number;
  country?: string;
}

export interface AdminActivityLog {
  id: string;
  action: 'create' | 'update' | 'delete' | 'block' | 'unblock' | 'upload';
  entityType: 'song' | 'artist' | 'album' | 'user' | 'media';
  entityTitle: string;
  adminName: string;
  timestamp: number;
  details?: string;
}

export interface UploadProgressState {
  file: File | null;
  progress: number;
  status: 'idle' | 'validating' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
  downloadUrl?: string;
}

export interface SongFormData {
  title: string;
  artistId: string;
  albumId?: string;
  genre: string;
  duration: number;
  year: number;
  coverUrl: string;
  audioUrl: string;
  lyrics?: { time: number; text: string }[];
}

export interface ArtistFormData {
  name: string;
  genres: string[];
  imageUrl: string;
  bio: string;
  verified: boolean;
  monthlyListeners: number;
  followers: number;
}

export interface AlbumFormData {
  title: string;
  artistId: string;
  genre: string;
  year: number;
  coverUrl: string;
  description: string;
  trackIds: string[];
}
