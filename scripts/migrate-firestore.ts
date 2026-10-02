/**
 * scripts/migrate-firestore.ts
 *
 * Migrates Firestore data (songs, artists, albums, users, playlists, likes,
 * recently-played) into Supabase PostgreSQL.
 *
 * ⚠️  SERVER-SIDE ONLY — never import this file into the frontend.
 *
 * Prerequisites:
 *   1. Run:  npm install firebase-admin @supabase/supabase-js
 *   2. Set environment variables (e.g. in a .env.migration file):
 *
 *       FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
 *       SUPABASE_URL=https://your-project.supabase.co
 *       SUPABASE_SERVICE_ROLE_KEY=your_service_role_key   # NEVER expose in frontend
 *
 *   3. Run:  npx ts-node --esm scripts/migrate-firestore.ts
 *
 * The script is idempotent — re-running it is safe; records are upserted.
 */

import * as admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ── Config ────────────────────────────────────────────────────────────────────

const SA_PATH = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? './serviceAccountKey.json';
const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// ── Firebase Admin ────────────────────────────────────────────────────────────

const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(SA_PATH), 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ── Supabase Admin ────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function upsert(table: string, data: any[], conflictCol: string) {
  const { error } = await supabase.from(table).upsert(data, { onConflict: conflictCol });
  if (error) console.error(`  ❌ ${table} upsert error:`, error.message);
  else console.log(`  ✅ ${table}: ${data.length} rows upserted`);
}

// ── Songs ─────────────────────────────────────────────────────────────────────

async function migrateSongs() {
  console.log('\n📀 Migrating songs…');
  const snap = await db.collection('songs').get();

  const rows = snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      title: d.title ?? '',
      artist: d.artist ?? '',
      artist_id: d.artistId ?? null,
      album: d.album ?? 'Singles',
      album_id: d.albumId ?? null,
      duration: Number(d.duration ?? 0),
      cover_url: d.coverUrl ?? null,
      audio_url: d.audioUrl ?? null,
      lyrics: d.lyrics ?? [],
      genre: d.genre ?? 'Electronic',
      play_count: Number(d.playCount ?? 0),
      year: Number(d.year ?? new Date().getFullYear()),
      track_number: d.trackNumber ?? null,
    };
  });

  await upsert('songs', rows, 'id');
}

// ── Artists ───────────────────────────────────────────────────────────────────

async function migrateArtists() {
  console.log('\n🎤 Migrating artists…');
  const snap = await db.collection('artists').get();

  const rows = snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      name: d.name ?? '',
      image_url: d.imageUrl ?? null,
      bio: d.bio ?? null,
      genres: d.genres ?? [],
      verified: Boolean(d.verified),
      monthly_listeners: Number(d.monthlyListeners ?? 0),
      followers: Number(d.followers ?? 0),
    };
  });

  await upsert('artists', rows, 'id');
}

// ── Albums ────────────────────────────────────────────────────────────────────

async function migrateAlbums() {
  console.log('\n💿 Migrating albums…');
  const snap = await db.collection('albums').get();

  const rows = snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      title: d.title ?? '',
      artist_id: d.artistId ?? null,
      artist: d.artist ?? '',
      cover_url: d.coverUrl ?? null,
      year: Number(d.year ?? new Date().getFullYear()),
      genre: d.genre ?? 'Electronic',
      track_count: Number(d.trackCount ?? 0),
      description: d.description ?? null,
    };
  });

  await upsert('albums', rows, 'id');
}

// ── Users / Profiles ─────────────────────────────────────────────────────────

async function migrateUsers() {
  console.log('\n👥 Migrating user profiles…');
  const snap = await db.collection('users').get();

  for (const doc of snap.docs) {
    const d = doc.data();
    const uid = doc.id;

    // Check if this uid exists in Supabase auth.users (we can't create auth users here
    // — that requires user migration tooling). We upsert the profile row only.
    const { error } = await supabase.from('profiles').upsert({
      id: uid,
      username: d.username ?? uid.slice(0, 12),
      display_name: d.displayName ?? d.username ?? 'User',
      avatar_url: d.photoURL ?? null,
      role: d.role === 'admin' ? 'admin' : d.role === 'creator' ? 'creator' : 'user',
      status: d.status === 'blocked' ? 'blocked' : 'active',
      favorite_genres: d.favoriteGenres ?? [],
      favorite_artists: d.favoriteArtists ?? [],
      preferences: d.preferences ?? {},
    }, { onConflict: 'id', ignoreDuplicates: false });

    if (error) {
      // uid doesn't exist in auth.users yet — skip silently (will be created on first login)
      if (error.code !== '23503') console.error(`  ⚠️  Profile ${uid}: ${error.message}`);
      continue;
    }

    // Migrate liked songs
    const likesSnap = await db.collection('users').doc(uid).collection('likes').get();
    if (!likesSnap.empty) {
      const likeRows = likesSnap.docs.map((ld) => ({ user_id: uid, song_id: ld.id }));
      await upsert('liked_songs', likeRows, 'user_id,song_id');
    }

    // Migrate saved albums
    const savedSnap = await db.collection('users').doc(uid).collection('savedAlbums').get();
    if (!savedSnap.empty) {
      const savedRows = savedSnap.docs.map((sd) => ({ user_id: uid, album_id: sd.id }));
      await upsert('saved_albums', savedRows, 'user_id,album_id');
    }

    // Migrate followed artists
    const followedSnap = await db.collection('users').doc(uid).collection('followedArtists').get();
    if (!followedSnap.empty) {
      const followedRows = followedSnap.docs.map((fd) => ({ user_id: uid, artist_id: fd.id }));
      await upsert('followed_artists', followedRows, 'user_id,artist_id');
    }

    // Migrate downloads
    const dlSnap = await db.collection('users').doc(uid).collection('downloads').get();
    if (!dlSnap.empty) {
      const dlRows = dlSnap.docs.map((dd) => ({ user_id: uid, song_id: dd.id }));
      await upsert('downloads', dlRows, 'user_id,song_id');
    }

    // Migrate playlists
    const plSnap = await db.collection('users').doc(uid).collection('playlists').get();
    for (const plDoc of plSnap.docs) {
      const pl = plDoc.data();
      const { error: plErr } = await supabase.from('playlists').upsert({
        id: plDoc.id,
        user_id: uid,
        title: pl.title ?? 'Untitled Playlist',
        description: pl.description ?? '',
        cover_url: pl.coverUrl ?? null,
        cover_colors: pl.coverColors ?? [],
        is_public: Boolean(pl.isPublic),
        followers: Number(pl.followers ?? 0),
        created_by: pl.createdBy ?? 'User',
      }, { onConflict: 'id' });

      if (plErr) { console.error('  ⚠️  Playlist error:', plErr.message); continue; }

      // Migrate songs in playlist
      if (Array.isArray(pl.tracks)) {
        const songRows = pl.tracks.map((t: any, idx: number) => ({
          playlist_id: plDoc.id,
          song_id: t.id,
          position: idx,
        }));
        if (songRows.length > 0) await upsert('playlist_songs', songRows, 'playlist_id,song_id');
      }
    }

    // Migrate recently played (top 30)
    const recSnap = await db.collection('users').doc(uid).collection('recentlyPlayed').get();
    if (!recSnap.empty) {
      const entries = recSnap.docs
        .map((rd) => rd.data())
        .sort((a, b) => (b.playedAt ?? 0) - (a.playedAt ?? 0))
        .slice(0, 30);

      const histRows = entries.map((e) => ({
        user_id: uid,
        song_id: e.trackId ?? e.track?.id ?? 'unknown',
        track_data: e.track ?? null,
        played_at: e.playedAt ? new Date(e.playedAt).toISOString() : new Date().toISOString(),
      }));

      if (histRows.length > 0) {
        const { error: histErr } = await supabase.from('listening_history').insert(histRows);
        if (histErr) console.error('  ⚠️  Listening history error:', histErr.message);
        else console.log(`  ✅ listening_history: ${histRows.length} entries for ${uid}`);
      }
    }

    console.log(`  ✅ User ${uid} migrated`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  try {
    console.log('🚀 Starting Firestore → Supabase migration…\n');
    await migrateSongs();
    await migrateArtists();
    await migrateAlbums();
    await migrateUsers();
    console.log('\n🎉 Migration complete!');
  } catch (err) {
    console.error('\n💥 Migration failed:', err);
    process.exit(1);
  }
})();
