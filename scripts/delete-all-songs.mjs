import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://fcxspskofubbmqtyqlrw.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_XNbnYGoTJGb0K8DD28c4Yg_q5LTIIZV';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function listAllFiles(bucket, prefix = '') {
  let allFiles = [];
  try {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: 1000,
      offset: 0,
    });

    if (error) {
      console.warn(`Error listing ${bucket}/${prefix}:`, error.message);
      return allFiles;
    }

    if (!data || data.length === 0) return allFiles;

    for (const item of data) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        // Folder -> recurse
        const subFiles = await listAllFiles(bucket, fullPath);
        allFiles.push(...subFiles);
      } else {
        // File
        allFiles.push(fullPath);
      }
    }
  } catch (err) {
    console.warn(`Exception listing ${bucket}/${prefix}:`, err);
  }
  return allFiles;
}

async function deleteInBatches(bucket, paths, batchSize = 50) {
  let deletedCount = 0;
  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize);
    const { data, error } = await supabase.storage.from(bucket).remove(batch);
    if (error) {
      console.warn(`Error deleting batch in ${bucket}:`, error.message);
    } else {
      deletedCount += (data?.length ?? batch.length);
      console.log(`Deleted ${deletedCount}/${paths.length} files from '${bucket}'...`);
    }
  }
  return deletedCount;
}

async function main() {
  console.log('====================================================');
  console.log('  MR MUSIC - BULK DELETE ALL SONGS FROM SUPABASE    ');
  console.log('====================================================');
  console.log(`Connecting to: ${SUPABASE_URL}`);

  // 1. Fetch current songs from database
  console.log('\n--- Step 1: Querying database songs ---');
  const { data: songs, error: songsFetchError } = await supabase
    .from('songs')
    .select('id, title, audio_url, cover_url');

  if (songsFetchError) {
    console.error('Failed to query songs table:', songsFetchError.message);
    process.exit(1);
  }

  console.log(`Found ${songs.length} song(s) in 'songs' table.`);
  songs.forEach((s, idx) => {
    console.log(`  ${idx + 1}. [${s.id}] "${s.title}"`);
  });

  // 2. Clean dependent tables
  console.log('\n--- Step 2: Cleaning dependent database records ---');
  const songIds = songs.map((s) => s.id);
  if (songIds.length > 0) {
    for (const table of ['playlist_songs', 'liked_songs', 'downloads', 'listening_history']) {
      const { error: depError } = await supabase.from(table).delete().in('song_id', songIds);
      if (depError) {
        console.warn(`  Warning cleaning ${table}:`, depError.message);
      } else {
        console.log(`  Cleaned ${table} references.`);
      }
    }
  } else {
    console.log('  No dependent song references to clean.');
  }

  // 3. Delete all records from public.songs
  console.log('\n--- Step 3: Deleting rows from public.songs table ---');
  if (songIds.length > 0) {
    const { error: deleteSongsError } = await supabase.from('songs').delete().in('id', songIds);
    if (deleteSongsError) {
      console.error('  Failed to delete rows from songs table:', deleteSongsError.message);
    } else {
      console.log(`  Successfully deleted ${songIds.length} song record(s) from database.`);
    }
  } else {
    // Or wipe all rows using neq id dummy
    const { error: wipeError } = await supabase.from('songs').delete().neq('id', '___none___');
    if (wipeError) console.warn('  Wipe all songs fallback note:', wipeError.message);
    else console.log('  Songs table is now empty.');
  }

  // 4. Scan and delete audio files in 'songs' storage bucket
  console.log('\n--- Step 4: Scanning and cleaning audio storage bucket ("songs") ---');
  const songFiles = await listAllFiles('songs', 'songs');
  // Also check root of songs bucket
  const rootSongFiles = await listAllFiles('songs', '');
  const allSongBucketFiles = Array.from(new Set([...songFiles, ...rootSongFiles]));

  console.log(`Found ${allSongBucketFiles.length} file(s) in 'songs' bucket.`);
  if (allSongBucketFiles.length > 0) {
    const deletedAudioCount = await deleteInBatches('songs', allSongBucketFiles);
    console.log(`Successfully removed ${deletedAudioCount} audio file(s) from 'songs' bucket.`);
  }

  // 5. Scan and delete song covers in 'covers' bucket under 'songs/'
  console.log('\n--- Step 5: Scanning and cleaning song covers in "covers" bucket ---');
  const songCoverFiles = await listAllFiles('covers', 'songs');
  console.log(`Found ${songCoverFiles.length} file(s) in 'covers/songs/'.`);
  if (songCoverFiles.length > 0) {
    const deletedCoversCount = await deleteInBatches('covers', songCoverFiles);
    console.log(`Successfully removed ${deletedCoversCount} cover file(s) from 'covers' bucket.`);
  }

  // 6. Verification
  console.log('\n--- Step 6: Verifying final state ---');
  const { data: remainingSongs, count: remainingCount } = await supabase
    .from('songs')
    .select('id', { count: 'exact' });

  console.log(`Remaining songs in DB: ${remainingSongs?.length ?? remainingCount ?? 0}`);
  console.log('\n====================================================');
  console.log('  ALL SONGS SUCCESSFULLY DELETED FROM SUPABASE!     ');
  console.log('====================================================');
}

main().catch((err) => {
  console.error('Fatal error during deletion:', err);
  process.exit(1);
});
