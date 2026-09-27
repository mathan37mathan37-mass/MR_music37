export interface Track {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  album: string;
  albumId: string;
  duration: number; // seconds
  coverUrl: string;
  audioUrl?: string;
  lyrics?: { time: number; text: string }[];
  playCount: number;
  liked: boolean;
  genre: string;
  year: number;
  trackNumber?: number;
}

export interface Album {
  id: string;
  title: string;
  artistId: string;
  artist: string;
  coverUrl: string;
  year: number;
  genre: string;
  trackCount: number;
  tracks: Track[];
  description?: string;
}

export interface Artist {
  id: string;
  name: string;
  imageUrl: string;
  followers: number;
  monthlyListeners: number;
  genres: string[];
  verified: boolean;
  bio?: string;
  following: boolean;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  coverUrl?: string;
  coverColors?: string[];
  tracks: Track[];
  createdBy: string;
  isPublic: boolean;
  followers: number;
  createdAt?: number;
  updatedAt?: number;
  creatorId?: string;
  userId?: string;
}

export interface Genre {
  id: string;
  name: string;
  color: string;
  imageUrl: string;
}

export interface MoodPlaylist {
  id: string;
  mood: string;
  title: string;
  gradient: string[];
  emoji: string;
  trackCount: number;
}

export type RepeatMode = 'none' | 'one' | 'all';
export type ViewMode = 'grid' | 'list';
export type LibraryFilter = 'all' | 'playlists' | 'albums' | 'artists' | 'downloads';
