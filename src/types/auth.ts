export interface UserPreferences {
  // Appearance
  theme: 'dark' | 'light' | 'system';
  accentColor: 'violet' | 'pink' | 'cyan' | 'green' | 'orange';
  compactMode: boolean;

  // Playback
  audioQuality: 'low' | 'normal' | 'high' | 'lossless';
  autoplay: boolean;
  crossfade: boolean;
  crossfadeDuration: number; // seconds 1-12
  gaplessPlayback: boolean;
  normalizeVolume: boolean;
  defaultVisualizer: 'bars' | 'waveform' | 'spectrum' | 'off';

  // Notifications
  notifications: boolean;
  notifyNewReleases: boolean;
  notifyRecommendations: boolean;
  notifyPlaylistUpdates: boolean;

  // Privacy
  publicProfile: boolean;
  publicPlaylists: boolean;
  shareListeningActivity: boolean;
  showRecentlyPlayed: boolean;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  username: string;
  photoURL: string | null;
  favoriteGenres: string[];
  favoriteArtists: string[];
  preferences: UserPreferences;
  createdAt: number;
  updatedAt: number;
}

export type AuthModalTab = 'login' | 'signup' | 'forgot_password';
