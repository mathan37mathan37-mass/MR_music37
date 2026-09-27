import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const runtimeConfig = typeof window !== 'undefined'
  ? (window as any).__FIREBASE_CONFIG__ ?? (window as any).__APP_CONFIG__?.firebase
  : null;

const readFirebaseValue = (envKey: string, runtimeKey: string): string | undefined => {
  const envValue = (import.meta as any).env?.[envKey];
  if (typeof envValue === 'string' && envValue.trim() && envValue.trim() !== 'undefined') {
    return envValue.trim();
  }

  if (runtimeConfig && typeof runtimeConfig[runtimeKey] === 'string') {
    const runtimeValue = runtimeConfig[runtimeKey].trim();
    if (runtimeValue && runtimeValue !== 'undefined') {
      return runtimeValue;
    }
  }

  return undefined;
};

const placeholderValuePattern = /^(YOUR_|your_|example|test|dummy|changeme|placeholder)/i;

const firebaseConfig = {
  apiKey: readFirebaseValue('VITE_FIREBASE_API_KEY', 'apiKey'),
  authDomain: readFirebaseValue('VITE_FIREBASE_AUTH_DOMAIN', 'authDomain'),
  projectId: readFirebaseValue('VITE_FIREBASE_PROJECT_ID', 'projectId'),
  storageBucket: readFirebaseValue('VITE_FIREBASE_STORAGE_BUCKET', 'storageBucket'),
  messagingSenderId: readFirebaseValue('VITE_FIREBASE_MESSAGING_SENDER_ID', 'messagingSenderId'),
  appId: readFirebaseValue('VITE_FIREBASE_APP_ID', 'appId'),
};

const hasValidValue = (value?: string): boolean => {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed !== 'undefined' && !placeholderValuePattern.test(trimmed);
};

export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    hasValidValue(firebaseConfig.apiKey) &&
    hasValidValue(firebaseConfig.authDomain) &&
    hasValidValue(firebaseConfig.projectId) &&
    hasValidValue(firebaseConfig.storageBucket) &&
    hasValidValue(firebaseConfig.messagingSenderId) &&
    hasValidValue(firebaseConfig.appId)
  );
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    console.info('🔥 Firebase initialized successfully');
  } catch (error) {
    console.warn('⚠️ Firebase initialization failed, falling back to local demo mode:', error);
  }
} else {
  console.info('ℹ️ Firebase credentials not provided. Running in local simulation demo mode. Add your Firebase config in .env or via window.__FIREBASE_CONFIG__ for live songs.');
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { app, auth, db, storage };
