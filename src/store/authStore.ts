import { create } from 'zustand';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  deleteUser,
  sendPasswordResetEmail,
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '@/services/firebase';
import {
  syncUserProfile,
  fetchUserProfile,
  syncUserPreferences,
  fetchUserLikes,
  fetchUserPlaylistsFromFirestore
} from '@/services/firestoreService';
import { useLibraryStore } from '@/store/libraryStore';
import { useAnalyticsStore } from '@/store/analyticsStore';
import type { UserProfile, UserPreferences, AuthModalTab } from '@/types/auth';

interface AuthState {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
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
  email: 'demo@melodix.music',
  displayName: 'Alex Rivers',
  username: 'alex_rivers',
  photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80',
  favoriteGenres: ['Synthwave', 'Electronic', 'Lo-Fi'],
  favoriteArtists: [],
  preferences: defaultPreferences,
  createdAt: Date.now() - 1000 * 3600 * 24 * 30,
  updatedAt: Date.now(),
};

export const useAuthStore = create<AuthState>((set, get) => {
  const applyUserSession = async (profile: UserProfile | null) => {
    if (!profile) {
      return;
    }

    useLibraryStore.getState().resetUserData(profile.uid);
    useAnalyticsStore.getState().resetUserData(profile.uid);
    await useLibraryStore.getState().loadUserFirestoreData(profile.uid);
  };

  // Listen for live Firebase auth state changes if configured
  if (isFirebaseConfigured() && auth) {
    onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        set({ isLoading: true, firebaseUser: fbUser });
        let profile = await fetchUserProfile(fbUser.uid);

        if (!profile) {
          // Initialize fresh profile
          profile = {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName || 'Music Lover',
            username: (fbUser.displayName || 'user').toLowerCase().replace(/\s+/g, '_'),
            photoURL: fbUser.photoURL || null,
            favoriteGenres: ['Synthwave', 'Lo-Fi'],
            favoriteArtists: [],
            preferences: defaultPreferences,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          await syncUserProfile(profile);
        }

        set({ user: profile, isLoading: false });
        await applyUserSession(profile);
      } else {
        set({ user: null, firebaseUser: null, isLoading: false });
      }
    });
  }

  // Check saved demo user from localStorage if not using live Firebase
  const savedDemo = localStorage.getItem('melodix_demo_auth');
  // When Firebase is configured, start with null user and let onAuthStateChanged fill it in
  // When in local demo mode, use the saved demo user or default DEMO_USER
  const initialUser: UserProfile | null = isFirebaseConfigured()
    ? null
    : (savedDemo ? JSON.parse(savedDemo) : DEMO_USER);
  const initialLoading = isFirebaseConfigured();

  return {
    user: initialUser,
    firebaseUser: null,
    isLoading: initialLoading,
    isAuthModalOpen: false,
    authModalTab: 'login',
    redirectAfterLogin: null,

    openAuthModal: (tab = 'login', redirect) => {
      set({
        isAuthModalOpen: true,
        authModalTab: tab,
        redirectAfterLogin: redirect || null,
      });
    },

    closeAuthModal: () => {
      set({ isAuthModalOpen: false, redirectAfterLogin: null });
    },

    signUpWithEmail: async (name, username, email, pass, favoriteGenres = []) => {
      set({ isLoading: true });

      if (isFirebaseConfigured() && auth) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, pass);
          const newProfile: UserProfile = {
            uid: cred.user.uid,
            email: cred.user.email,
            displayName: name,
            username: username.toLowerCase().trim(),
            photoURL: null,
            favoriteGenres: favoriteGenres.length > 0 ? favoriteGenres : ['Synthwave', 'Electronic'],
            favoriteArtists: [],
            preferences: defaultPreferences,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          await syncUserProfile(newProfile);
          set({ user: newProfile, isLoading: false, isAuthModalOpen: false });
        } catch (err: any) {
          set({ isLoading: false });
          throw new Error(err.message || 'Signup failed');
        }
      } else {
        // Local simulation signup
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
        useAnalyticsStore.getState().resetUserData(newProfile.uid);
      }
    },

    loginWithEmail: async (email, pass) => {
      set({ isLoading: true });

      if (isFirebaseConfigured() && auth) {
        try {
          const cred = await signInWithEmailAndPassword(auth, email, pass);
          const profile = await fetchUserProfile(cred.user.uid);
          set({ user: profile, isLoading: false, isAuthModalOpen: false });
        } catch (err: any) {
          set({ isLoading: false });
          throw new Error(err.message || 'Login failed');
        }
      } else {
        // Local simulation login
        const simulated: UserProfile = {
          ...DEMO_USER,
          email,
          displayName: email.split('@')[0],
          username: email.split('@')[0].toLowerCase(),
        };
        localStorage.setItem('melodix_demo_auth', JSON.stringify(simulated));
        set({ user: simulated, isLoading: false, isAuthModalOpen: false });
        useLibraryStore.getState().resetUserData(simulated.uid);
        useAnalyticsStore.getState().resetUserData(simulated.uid);
      }
    },

    loginWithGoogle: async () => {
      set({ isLoading: true });

      if (isFirebaseConfigured() && auth) {
        try {
          const cred = await signInWithPopup(auth, googleProvider);
          let profile = await fetchUserProfile(cred.user.uid);

          if (!profile) {
            profile = {
              uid: cred.user.uid,
              email: cred.user.email,
              displayName: cred.user.displayName || 'Google User',
              username: (cred.user.displayName || 'user').toLowerCase().replace(/\s+/g, '_'),
              photoURL: cred.user.photoURL || null,
              favoriteGenres: ['Synthwave', 'Electronic'],
              favoriteArtists: [],
              preferences: defaultPreferences,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            await syncUserProfile(profile);
          }

          set({ user: profile, isLoading: false, isAuthModalOpen: false });
          useLibraryStore.getState().resetUserData(profile.uid);
          useAnalyticsStore.getState().resetUserData(profile.uid);
        } catch (err: any) {
          set({ isLoading: false });
          throw new Error(err.message || 'Google sign in failed');
        }
      } else {
        // Local Google sign-in simulation
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
        useAnalyticsStore.getState().resetUserData(googleUser.uid);
      }
    },

    loginAsDemoUser: () => {
      localStorage.setItem('melodix_demo_auth', JSON.stringify(DEMO_USER));
      set({ user: DEMO_USER, isAuthModalOpen: false });
      useLibraryStore.getState().resetUserData(DEMO_USER.uid);
      useAnalyticsStore.getState().resetUserData(DEMO_USER.uid);
    },

    logout: async () => {
      set({ isLoading: true });
      if (isFirebaseConfigured() && auth) {
        try {
          await signOut(auth);
        } catch (err) {
          console.warn('Firebase signOut error:', err);
        }
      }
      localStorage.removeItem('melodix_demo_auth');
      set({ user: null, firebaseUser: null, isLoading: false });
      useLibraryStore.getState().clearRecentlyPlayed();
      useLibraryStore.getState().clearRecentSearches();
    },

    deleteAccount: async () => {
      set({ isLoading: true });
      if (isFirebaseConfigured() && auth && auth.currentUser) {
        try {
          await deleteUser(auth.currentUser);
        } catch (err) {
          console.warn('Firebase deleteUser error:', err);
        }
      }
      localStorage.removeItem('melodix_demo_auth');
      set({ user: null, firebaseUser: null, isLoading: false });
      useLibraryStore.getState().clearRecentlyPlayed();
      useLibraryStore.getState().clearRecentSearches();
    },

    sendPasswordReset: async (email) => {
      if (isFirebaseConfigured() && auth) {
        await sendPasswordResetEmail(auth, email);
      } else {
        // Simulation delay
        await new Promise((res) => setTimeout(res, 600));
      }
    },

    updateProfile: async (updates) => {
      const current = get().user;
      if (!current) return;

      const updated: UserProfile = {
        ...current,
        ...updates,
        updatedAt: Date.now(),
      };

      set({ user: updated });
      await syncUserProfile(updated);
      localStorage.setItem('melodix_demo_auth', JSON.stringify(updated));
    },

    updatePreferences: async (updates) => {
      const current = get().user;
      if (!current) return;

      const updatedPref: UserPreferences = {
        ...current.preferences,
        ...updates,
      };

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
