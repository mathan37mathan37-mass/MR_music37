import type { Track, Album, Artist } from './index';

export type AdminTab = 'overview' | 'songs' | 'artists' | 'albums' | 'users' | 'uploads';

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
