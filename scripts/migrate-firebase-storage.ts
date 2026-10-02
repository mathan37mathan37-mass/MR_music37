/**
 * scripts/migrate-firebase-storage.ts
 *
 * Copies all files from Firebase Storage to Supabase Storage.
 *
 * ⚠️  SERVER-SIDE ONLY — never import this file into the frontend.
 *
 * Prerequisites:
 *   1. npm install firebase-admin @supabase/supabase-js node-fetch
 *   2. Set environment variables:
 *
 *       FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
 *       FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
 *       SUPABASE_URL=https://your-project.supabase.co
 *       SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
 *
 *   3. Run:  npx ts-node --esm scripts/migrate-firebase-storage.ts
 *
 * Folder mapping:
 *   Firebase  songs/...  → Supabase bucket "songs"
 *   Firebase  covers/... → Supabase bucket "covers"
 *   Firebase  avatars/...→ Supabase bucket "avatars"
 *   (everything else)    → Supabase bucket "covers"  (fallback)
 */

import * as admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// @ts-ignore — node-fetch v3 is ESM-only; use `npm install node-fetch`
const fetch = globalThis.fetch ?? (await import('node-fetch')).default;

// ── Config ────────────────────────────────────────────────────────────────────

const SA_PATH = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? './serviceAccountKey.json';
const FB_BUCKET = process.env.FIREBASE_STORAGE_BUCKET ?? '';
const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!FB_BUCKET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required env vars');
  process.exit(1);
}

// ── Clients ───────────────────────────────────────────────────────────────────

const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(SA_PATH), 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount), storageBucket: FB_BUCKET });
const bucket = admin.storage().bucket();

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSupabaseBucket(firebasePath: string): 'songs' | 'covers' | 'avatars' {
  if (firebasePath.startsWith('songs/') || firebasePath.includes('/audio/')) return 'songs';
  if (firebasePath.startsWith('avatars/') || firebasePath.includes('/avatar')) return 'avatars';
  return 'covers';  // covers + everything else
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  console.log('🚀 Starting Firebase Storage → Supabase Storage migration…\n');

  const [files] = await bucket.getFiles();
  console.log(`📁 Found ${files.length} file(s) in Firebase Storage\n`);

  let ok = 0;
  let failed = 0;

  for (const file of files) {
    const firebasePath = file.name;

    try {
      // Generate a short-lived signed URL
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000, // 1 hour
      });

      // Download the file
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());

      // Determine content type
      const [metadata] = await file.getMetadata();
      const contentType = (metadata.contentType as string) || 'application/octet-stream';

      // Upload to Supabase
      const sbBucket = getSupabaseBucket(firebasePath);
      const { error } = await supabase.storage
        .from(sbBucket)
        .upload(firebasePath, buffer, { contentType, upsert: true });

      if (error) {
        console.error(`  ❌ ${firebasePath}: ${error.message}`);
        failed++;
      } else {
        console.log(`  ✅ ${firebasePath} → ${sbBucket}`);
        ok++;
      }
    } catch (err: any) {
      console.error(`  ❌ ${firebasePath}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n🎉 Done. ${ok} succeeded, ${failed} failed.`);
  if (failed > 0) process.exit(1);
})();
