-- ═══════════════════════════════════════════════════════════════════════════
-- MR Music — Supabase PostgreSQL Schema + Row Level Security
-- Run this entire file in the Supabase SQL Editor (project → SQL Editor → New query)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ═══════════════════════════════════════════════════════════════════════════
-- TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. profiles (extends auth.users) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        TEXT        UNIQUE,
  display_name    TEXT,
  bio             TEXT,
  avatar_url      TEXT,
  role            TEXT        NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'creator')),
  status          TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  favorite_genres TEXT[]      DEFAULT '{}',
  favorite_artists TEXT[]     DEFAULT '{}',
  preferences     JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. songs ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.songs (
  id           TEXT        PRIMARY KEY,
  title        TEXT        NOT NULL,
  artist       TEXT        NOT NULL DEFAULT '',
  artist_id    TEXT,
  album        TEXT        DEFAULT 'Singles',
  album_id     TEXT        DEFAULT 'al_single',
  duration     INTEGER     DEFAULT 0,
  cover_url    TEXT,
  audio_url    TEXT,
  lyrics       JSONB       DEFAULT '[]',
  genre        TEXT        DEFAULT 'Electronic',
  play_count   INTEGER     DEFAULT 0,
  year         INTEGER,
  track_number INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. artists ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.artists (
  id                TEXT        PRIMARY KEY,
  name              TEXT        NOT NULL,
  image_url         TEXT,
  bio               TEXT,
  genres            TEXT[]      DEFAULT '{}',
  verified          BOOLEAN     DEFAULT false,
  monthly_listeners INTEGER     DEFAULT 0,
  followers         INTEGER     DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. albums ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.albums (
  id          TEXT        PRIMARY KEY,
  title       TEXT        NOT NULL,
  artist_id   TEXT        REFERENCES public.artists(id) ON DELETE SET NULL,
  artist      TEXT        NOT NULL DEFAULT '',
  cover_url   TEXT,
  year        INTEGER,
  genre       TEXT        DEFAULT 'Electronic',
  track_count INTEGER     DEFAULT 0,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. liked_songs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.liked_songs (
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, song_id)
);

-- 6. saved_albums ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.saved_albums (
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  album_id   TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, album_id)
);

-- 7. followed_artists ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.followed_artists (
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_id  TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, artist_id)
);

-- 8. follows (user → user) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

-- 9. playlists ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.playlists (
  id           TEXT        PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  description  TEXT        DEFAULT '',
  cover_url    TEXT,
  cover_colors TEXT[]      DEFAULT '{}',
  is_public    BOOLEAN     DEFAULT true,
  followers    INTEGER     DEFAULT 0,
  created_by   TEXT        DEFAULT 'You',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. playlist_songs ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.playlist_songs (
  playlist_id TEXT        NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  song_id     TEXT        NOT NULL,
  position    INTEGER     DEFAULT 0,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (playlist_id, song_id)
);

-- 11. listening_history ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.listening_history (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id    TEXT        NOT NULL,
  track_data JSONB,
  played_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. downloads ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.downloads (
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, song_id)
);


-- ═══════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_liked_songs_user ON public.liked_songs(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_user   ON public.playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_history_user     ON public.listening_history(user_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_songs_artist     ON public.songs(artist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_songs   ON public.playlist_songs(playlist_id, position);


-- ═══════════════════════════════════════════════════════════════════════════
-- AUTO-CREATE PROFILE TRIGGER
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _name     TEXT;
  _username TEXT;
BEGIN
  _name     := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'Music Lover');
  _username := COALESCE(
    NEW.raw_user_meta_data->>'user_name',
    NEW.raw_user_meta_data->>'preferred_username',
    lower(regexp_replace(_name, '[^a-zA-Z0-9]', '_', 'g'))
  );

  -- Ensure username is unique if taken by another user
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = _username AND id <> NEW.id) THEN
    _username := _username || '_' || substr(replace(NEW.id::text, '-', ''), 1, 6);
  END IF;

  INSERT INTO public.profiles (id, username, display_name, avatar_url, role, created_at, updated_at)
  VALUES (
    NEW.id,
    _username,
    _name,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    'user',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
    updated_at = NOW();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Prevent aborting auth.users transaction
  RAISE WARNING 'handle_new_user failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════

-- Helper: check if the calling user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;


-- ── profiles ─────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  USING (true);                          -- all users and visitors can view profiles

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_delete_admin"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_admin());


-- ── songs ────────────────────────────────────────────────────────────────────
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "songs_select_authenticated"
  ON public.songs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "songs_insert_admin"
  ON public.songs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "songs_update_admin"
  ON public.songs FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "songs_delete_admin"
  ON public.songs FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Allow public (anon) read so the player works without login
CREATE POLICY "songs_select_anon"
  ON public.songs FOR SELECT
  TO anon
  USING (true);


-- ── artists ──────────────────────────────────────────────────────────────────
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "artists_select_all"   ON public.artists FOR SELECT  USING (true);
CREATE POLICY "artists_insert_admin" ON public.artists FOR INSERT  TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "artists_update_admin" ON public.artists FOR UPDATE  TO authenticated USING (public.is_admin());
CREATE POLICY "artists_delete_admin" ON public.artists FOR DELETE  TO authenticated USING (public.is_admin());


-- ── albums ───────────────────────────────────────────────────────────────────
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "albums_select_all"   ON public.albums FOR SELECT  USING (true);
CREATE POLICY "albums_insert_admin" ON public.albums FOR INSERT  TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "albums_update_admin" ON public.albums FOR UPDATE  TO authenticated USING (public.is_admin());
CREATE POLICY "albums_delete_admin" ON public.albums FOR DELETE  TO authenticated USING (public.is_admin());


-- ── liked_songs ──────────────────────────────────────────────────────────────
ALTER TABLE public.liked_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "liked_songs_select_own" ON public.liked_songs FOR SELECT  TO authenticated USING (user_id = auth.uid());
CREATE POLICY "liked_songs_insert_own" ON public.liked_songs FOR INSERT  TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "liked_songs_delete_own" ON public.liked_songs FOR DELETE  TO authenticated USING (user_id = auth.uid());


-- ── saved_albums ─────────────────────────────────────────────────────────────
ALTER TABLE public.saved_albums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_albums_select_own" ON public.saved_albums FOR SELECT  TO authenticated USING (user_id = auth.uid());
CREATE POLICY "saved_albums_insert_own" ON public.saved_albums FOR INSERT  TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "saved_albums_delete_own" ON public.saved_albums FOR DELETE  TO authenticated USING (user_id = auth.uid());


-- ── followed_artists ─────────────────────────────────────────────────────────
ALTER TABLE public.followed_artists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "followed_artists_select_own" ON public.followed_artists FOR SELECT  TO authenticated USING (user_id = auth.uid());
CREATE POLICY "followed_artists_insert_own" ON public.followed_artists FOR INSERT  TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "followed_artists_delete_own" ON public.followed_artists FOR DELETE  TO authenticated USING (user_id = auth.uid());


-- ── follows ──────────────────────────────────────────────────────────────────
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follows_select_authenticated" ON public.follows FOR SELECT  TO authenticated USING (true);
CREATE POLICY "follows_insert_own"           ON public.follows FOR INSERT  TO authenticated WITH CHECK (follower_id = auth.uid());
CREATE POLICY "follows_delete_own"           ON public.follows FOR DELETE  TO authenticated USING (follower_id = auth.uid());


-- ── playlists ────────────────────────────────────────────────────────────────
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

-- Owners see all their playlists; others see only public ones
CREATE POLICY "playlists_select_own_or_public"
  ON public.playlists FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_public = true);

CREATE POLICY "playlists_insert_own"
  ON public.playlists FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "playlists_update_own"
  ON public.playlists FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "playlists_delete_own"
  ON public.playlists FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


-- ── playlist_songs ───────────────────────────────────────────────────────────
ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;

-- Readable if the parent playlist is readable
CREATE POLICY "playlist_songs_select"
  ON public.playlist_songs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = playlist_id
        AND (p.user_id = auth.uid() OR p.is_public = true)
    )
  );

-- Only playlist owner can modify songs
CREATE POLICY "playlist_songs_insert_owner"
  ON public.playlist_songs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.user_id = auth.uid())
  );

CREATE POLICY "playlist_songs_delete_owner"
  ON public.playlist_songs FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.user_id = auth.uid())
  );


-- ── listening_history ────────────────────────────────────────────────────────
ALTER TABLE public.listening_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "history_select_own" ON public.listening_history FOR SELECT  TO authenticated USING (user_id = auth.uid());
CREATE POLICY "history_insert_own" ON public.listening_history FOR INSERT  TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "history_delete_own" ON public.listening_history FOR DELETE  TO authenticated USING (user_id = auth.uid());


-- ── downloads ────────────────────────────────────────────────────────────────
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "downloads_select_own" ON public.downloads FOR SELECT  TO authenticated USING (user_id = auth.uid());
CREATE POLICY "downloads_insert_own" ON public.downloads FOR INSERT  TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "downloads_delete_own" ON public.downloads FOR DELETE  TO authenticated USING (user_id = auth.uid());


-- ═══════════════════════════════════════════════════════════════════════════
-- STORAGE BUCKETS  (run these too or create via the Supabase dashboard)
-- ═══════════════════════════════════════════════════════════════════════════

-- Note: bucket creation via SQL requires the storage extension.
-- Alternatively, create them in Dashboard → Storage.

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('songs',   'songs',   true),
  ('covers',  'covers',  true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- songs bucket: only admins upload, anyone can stream/read
CREATE POLICY "songs_bucket_upload_admin"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'songs' AND public.is_admin());

CREATE POLICY "songs_bucket_read_all"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'songs');

CREATE POLICY "songs_bucket_delete_admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'songs' AND public.is_admin());

-- covers bucket: admins upload, anyone can read (public bucket)
CREATE POLICY "covers_bucket_upload_admin"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'covers' AND public.is_admin());

CREATE POLICY "covers_bucket_read_all"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'covers');

CREATE POLICY "covers_bucket_delete_admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'covers' AND public.is_admin());

-- avatars bucket: authenticated users manage their own avatars
CREATE POLICY "avatars_bucket_upload_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_bucket_read_all"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_bucket_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
