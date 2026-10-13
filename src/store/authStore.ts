import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  syncUserProfile,
  fetchUserProfile,
  syncUserPreferences,
  fetchUserRole,
} from '@/services/supabaseService';
import { useLibraryStore } from '@/store/libraryStore';
import { useAnalyticsStore } from '@/store/analyticsStore';
import type { UserProfile, UserPreferences, AuthModalTab } from '@/types/auth';

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalTab: AuthModalTab;
  redirectAfterLogin: string | null;

  // Actions
  openAuthModal: (tab?: AuthModalTab, redirect?: string) => void;
  closeAuthModal: () => void;
  signUpWithEmail: (
    name: string,
    username: string,
    email: string,
    pass: string,
    favoriteGenres?: string[]
  ) => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginAsDemoUser: () => void;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
}

const defaultPreferences: UserPreferences = {
  theme: 'dark',
  accentColor: 'violet',
  compactMode: false,
  audioQuality: 'high',
  autoplay: true,
  crossfade: false,
  crossfadeDuration: 4,
  gaplessPlayback: true,
  normalizeVolume: true,
  defaultVisualizer: 'bars',
  notifications: true,
  notifyNewReleases: true,
  notifyRecommendations: true,
  notifyPlaylistUpdates: false,
  publicProfile: true,
  publicPlaylists: true,
  shareListeningActivity: false,
  showRecentlyPlayed: true,
};

const DEMO_USER: UserProfile = {
  uid: 'demo-melodix-user-01',
  email: 'admin@mrmusic.com',
  displayName: 'Admin User',
  username: 'admin',
  photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80',
  favoriteGenres: ['Synthwave', 'Electronic', 'Lo-Fi'],
  favoriteArtists: [],
  preferences: defaultPreferences,
  createdAt: Date.now() - 1000 * 3600 * 24 * 30,
  updatedAt: Date.now(),
  role: 'admin',
};

// ── helpers ──────────────────────────────────────────────────────────────────

async function buildProfileFromSupabaseUser(
  sbUser: { id: string; email?: string | null; user_metadata?: any },
  favoriteGenres?: string[],
  displayName?: string,
  username?: string
): Promise<UserProfile> {
  const meta = sbUser.user_metadata ?? {};
  const existing = await fetchUserProfile(sbUser.id);

  if (existing) {
    return { ...existing, email: sbUser.email ?? existing.email };
  }

  const name = displayName || meta.full_name || meta.name || 'Music Lover';
  const uname =
    username ||
    meta.user_name ||
    meta.preferred_username ||
    name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

  const newProfile: UserProfile = {
    uid: sbUser.id,
    email: sbUser.email ?? null,
    displayName: name,
    username: uname,
    photoURL: meta.avatar_url ?? meta.picture ?? null,
    favoriteGenres: favoriteGenres ?? ['Synthwave', 'Lo-Fi'],
    favoriteArtists: [],
    preferences: defaultPreferences,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await syncUserProfile(newProfile);
  return newProfile;
}

const applyUserSession = async (profile: UserProfile | null) => {
  if (!profile) return;
  useLibraryStore.getState().resetUserData(profile.uid);
  await useAnalyticsStore.getState().loadUserData(profile.uid);
  await useLibraryStore.getState().loadUserFirestoreData(profile.uid);
};

// ── Store ─────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => {
  // ── Supabase Auth listener ────────────────────────────────────────────────
  if (isSupabaseConfigured() && supabase) {
    const handleSessionUser = (sbUser: any, event?: string) => {
      const meta = sbUser.user_metadata ?? {};
      const fallbackName =
        meta.full_name || meta.name || sbUser.email?.split('@')[0] || 'Music Lover';
      const fallbackUsername = meta.user_name || sbUser.email?.split('@')[0] || 'user';
      const fallbackPhoto = meta.avatar_url ?? meta.picture ?? null;

      // 1. Immediately mark user as logged in with session metadata
      const immediateProfile: UserProfile = {
        uid: sbUser.id,
        email: sbUser.email ?? null,
        displayName: fallbackName,
        username: fallbackUsername,
        photoURL: fallbackPhoto,
        favoriteGenres: ['Synthwave', 'Electronic'],
        favoriteArtists: [],
        preferences: defaultPreferences,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        role: 'user',
      } as any;

      set({ user: immediateProfile, isLoading: false, isAuthModalOpen: false });

      // 2. Fetch full profile and role asynchronously
      setTimeout(async () => {
        try {
          const profile = await buildProfileFromSupabaseUser(sbUser);
          const role = await fetchUserRole(sbUser.id);
          const fullProfile = { ...profile, role } as any;
          set({ user: fullProfile });
          if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || !event) {
            await applyUserSession(fullProfile);
          }
        } catch (err) {
          console.warn('[Supabase Auth] Background profile sync notice:', err);
        }
      }, 0);
    };

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          handleSessionUser(session.user);
        } else {
          set({ isLoading: false });
        }
      })
      .catch(() => set({ isLoading: false }));

    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        handleSessionUser(session.user, event);
      } else if (event === 'SIGNED_OUT') {
        set({ user: null, isLoading: false });
        useAnalyticsStore.getState().onLogout();
      }
    });
  }

  // ── Demo mode initial state ────────────────────────────────────────────────
  const savedDemo = localStorage.getItem('melodix_demo_auth');
  const isLive = isSupabaseConfigured();
  const initialUser: UserProfile | null = isLive
    ? null
    : savedDemo
    ? JSON.parse(savedDemo)
    : DEMO_USER;
  const initialLoading = isLive;

  return {
    user: initialUser,
    isLoading: initialLoading,
    isAuthModalOpen: false,
    authModalTab: 'login',
    redirectAfterLogin: null,

    openAuthModal: (tab = 'login', redirect) => {
      set({ isAuthModalOpen: true, authModalTab: tab, redirectAfterLogin: redirect || null });
    },

    closeAuthModal: () => {
      set({ isAuthModalOpen: false, redirectAfterLogin: null });
    },

    // ── Sign Up with Email & Password ──────────────────────────────────────
    signUpWithEmail: async (name, username, email, pass, favoriteGenres = []) => {
      set({ isLoading: true });

      if (isSupabaseConfigured() && supabase) {
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password: pass,
            options: {
              data: { full_name: name, user_name: username },
            },
          });

          if (error) throw new Error(error.message);

          if (data.user) {
            const genres = favoriteGenres.length > 0 ? favoriteGenres : ['Synthwave', 'Electronic'];
            const profile = await buildProfileFromSupabaseUser(data.user, genres, name, username);
            const role = await fetchUserRole(data.user.id);
            const profileWithRole = { ...profile, role } as any;
            set({ user: profileWithRole, isLoading: false, isAuthModalOpen: false });
            if (data.session) {
              await applyUserSession(profileWithRole);
            }
          } else {
            set({ isLoading: false, isAuthModalOpen: false });
          }
        } catch (err: any) {
          set({ isLoading: false });
          const raw = err.message || '';
          if (raw.toLowerCase().includes('failed to fetch') || raw.toLowerCase().includes('network')) {
            throw new Error(
              'Cannot connect to Supabase server (Failed to fetch). If your Supabase project is paused, please resume it in your Supabase dashboard or continue using Demo Mode.'
            );
          }
          throw new Error(err.message || 'Signup failed');
        }
        return;
      }

      // Local offline/demo fallback
      const simulatedUid = `sim-${Date.now()}`;
      const newProfile: UserProfile = {
        uid: simulatedUid,
        email,
        displayName: name,
        username: username.toLowerCase().trim(),
        photoURL: null,
        favoriteGenres: favoriteGenres.length > 0 ? favoriteGenres : ['Synthwave', 'Electronic'],
        favoriteArtists: [],
        preferences: defaultPreferences,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      localStorage.setItem('melodix_demo_auth', JSON.stringify(newProfile));
      set({ user: newProfile, isLoading: false, isAuthModalOpen: false });
      useLibraryStore.getState().resetUserData(newProfile.uid);
      void useAnalyticsStore.getState().loadUserData(newProfile.uid);
    },

    // ── Login with Email & Password ────────────────────────────────────────
    loginWithEmail: async (email, pass) => {
      set({ isLoading: true });

      if (isSupabaseConfigured() && supabase) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
          if (error) throw new Error(error.message);
          if (data.user) {
            const profile = await buildProfileFromSupabaseUser(data.user);
            const role = await fetchUserRole(data.user.id);
            const profileWithRole = { ...profile, role } as any;
            set({ user: profileWithRole, isLoading: false, isAuthModalOpen: false });
            await applyUserSession(profileWithRole);
          } else {
            set({ isLoading: false, isAuthModalOpen: false });
          }
        } catch (err: any) {
          set({ isLoading: false });
          const raw = err.message || '';
          if (raw.toLowerCase().includes('failed to fetch') || raw.toLowerCase().includes('network')) {
            throw new Error(
              'Cannot connect to Supabase server (Failed to fetch). If your Supabase project is paused, please resume it in your Supabase dashboard or continue using Demo Mode.'
            );
          }
          throw new Error(err.message || 'Login failed');
        }
        return;
      }

      // Demo simulation
      const simulated: UserProfile = {
        ...DEMO_USER,
        email,
        displayName: email.split('@')[0],
        username: email.split('@')[0].toLowerCase(),
      };
      localStorage.setItem('melodix_demo_auth', JSON.stringify(simulated));
      set({ user: simulated, isLoading: false, isAuthModalOpen: false });
      useLibraryStore.getState().resetUserData(simulated.uid);
      void useAnalyticsStore.getState().loadUserData(simulated.uid);
    },

    // ── Google OAuth Login ─────────────────────────────────────────────────
    loginWithGoogle: async () => {
      set({ isLoading: true });

      if (isSupabaseConfigured() && supabase) {
        try {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}/auth/callback`,
              queryParams: {
                prompt: 'select_account',
                access_type: 'offline',
              },
            },
          });
          if (error) {
            set({ isLoading: false });
            throw new Error(error.message);
          }
        } catch (err: any) {
          set({ isLoading: false });
          const raw = err.message || '';
          if (raw.toLowerCase().includes('failed to fetch') || raw.toLowerCase().includes('network')) {
            throw new Error(
              'Cannot connect to Supabase server (Failed to fetch). If your Supabase project is paused, please resume it in your Supabase dashboard or continue using Demo Mode.'
            );
          }
          throw new Error(err.message || 'Google sign in failed');
        }
        return;
      }

      // Demo simulation
      const googleUser: UserProfile = {
        uid: 'google-sim-user',
        email: 'google.user@gmail.com',
        displayName: 'Jordan Vance',
        username: 'jordan_vance',
        photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&q=80',
        favoriteGenres: ['Synthwave', 'Electronic', 'Pop'],
        favoriteArtists: ['Solaris'],
        preferences: defaultPreferences,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      localStorage.setItem('melodix_demo_auth', JSON.stringify(googleUser));
      set({ user: googleUser, isLoading: false, isAuthModalOpen: false });
      useLibraryStore.getState().resetUserData(googleUser.uid);
      void useAnalyticsStore.getState().loadUserData(googleUser.uid);
    },

    loginAsDemoUser: () => {
      localStorage.setItem('melodix_demo_auth', JSON.stringify(DEMO_USER));
      set({ user: DEMO_USER, isAuthModalOpen: false });
      useLibraryStore.getState().resetUserData(DEMO_USER.uid);
      void useAnalyticsStore.getState().loadUserData(DEMO_USER.uid);
    },

    // ── Logout ─────────────────────────────────────────────────────────────
    logout: async () => {
      set({ isLoading: true });

      if (isSupabaseConfigured() && supabase) {
        try {
          await supabase.auth.signOut();
        } catch (err) {
          console.warn('Supabase signOut error:', err);
        }
      }

      localStorage.removeItem('melodix_demo_auth');
      set({ user: null, isLoading: false });
      useLibraryStore.getState().clearRecentlyPlayed();
      useLibraryStore.getState().clearRecentSearches();
      useAnalyticsStore.getState().onLogout();
    },

    // ── Delete Account ─────────────────────────────────────────────────────
    deleteAccount: async () => {
      set({ isLoading: true });

      if (isSupabaseConfigured() && supabase) {
        await supabase.auth.signOut();
      }

      localStorage.removeItem('melodix_demo_auth');
      set({ user: null, isLoading: false });
      useLibraryStore.getState().clearRecentlyPlayed();
      useLibraryStore.getState().clearRecentSearches();
      useAnalyticsStore.getState().onLogout();
    },

    // ── Password Reset ─────────────────────────────────────────────────────
    sendPasswordReset: async (email) => {
      if (isSupabaseConfigured() && supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw new Error(error.message);
      } else {
        await new Promise((res) => setTimeout(res, 600));
      }
    },

    // ── Update Profile ─────────────────────────────────────────────────────
    updateProfile: async (updates) => {
      const current = get().user;
      if (!current) return;

      const updated: UserProfile = { ...current, ...updates, updatedAt: Date.now() };
      set({ user: updated });
      await syncUserProfile(updated);
      localStorage.setItem('melodix_demo_auth', JSON.stringify(updated));
    },

    // ── Update Preferences ─────────────────────────────────────────────────
    updatePreferences: async (updates) => {
      const current = get().user;
      if (!current) return;

      const updatedPref: UserPreferences = { ...current.preferences, ...updates };
      const updatedProfile: UserProfile = {
        ...current,
        preferences: updatedPref,
        updatedAt: Date.now(),
      };

      set({ user: updatedProfile });
      await syncUserPreferences(current.uid, updatedPref);
      await syncUserProfile(updatedProfile);
      localStorage.setItem('melodix_demo_auth', JSON.stringify(updatedProfile));
    },
  };
});
