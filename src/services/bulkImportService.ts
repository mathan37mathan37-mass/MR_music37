/**
 * bulkImportService.ts
 *
 * Controlled batch upload queue with concurrency control,
 * duplicate detection, error boundaries per song, and cancellation support.
 */

import { uploadSingleSong } from './songUploadService';
import type { BulkImportItem, BulkImportItemStatus } from '@/types/admin';
import type { Track } from '@/types';
import type { AnalyzedAudioMetadata } from './musicMetadataService';

import { normalizeIdentityKey } from './musicIdentityService';

/**
 * Checks whether an analyzed song candidate matches any existing songs in catalog.
 */
export function detectDuplicateSong(
  candidate: AnalyzedAudioMetadata,
  catalog: Track[]
): {
  isDuplicate: boolean;
  duplicateSongId?: string;
  reason?: string;
} {
  const normTitle = normalizeIdentityKey(candidate.title);
  const normArtist = normalizeIdentityKey(candidate.artist);
  const normFile = normalizeIdentityKey(candidate.fileName.replace(/\.[^/.]+$/, ''));
  const candidateArtistsKeys = (candidate.artists || [candidate.artist]).map(normalizeIdentityKey);

  for (const song of catalog) {
    const sTitle = normalizeIdentityKey(song.title);
    const sArtist = normalizeIdentityKey(song.artist);
    const sFile = normalizeIdentityKey((song.fileName || song.originalFileName || '').replace(/\.[^/.]+$/, ''));
    const songArtistsKeys = (song.artists || [song.artist]).map(normalizeIdentityKey);

    // 1. Normalized Title + Artist match (or shared collaborating artist)
    const hasArtistOverlap =
      sArtist === normArtist ||
      candidateArtistsKeys.some((ca) => songArtistsKeys.includes(ca));

    if (sTitle === normTitle && hasArtistOverlap) {
      return {
        isDuplicate: true,
        duplicateSongId: song.id,
        reason: `Matched existing song "${song.title}" by ${song.artist}`,
      };
    }

    // 2. Normalized filename match
    if (normFile && sFile && sFile === normFile) {
      return {
        isDuplicate: true,
        duplicateSongId: song.id,
        reason: `Matching file name "${song.fileName || song.title}"`,
      };
    }

    // 3. Exact normalized title match + similar duration (within 3 seconds)
    if (sTitle === normTitle && candidate.duration > 0 && Math.abs(song.duration - candidate.duration) <= 3) {
      return {
        isDuplicate: true,
        duplicateSongId: song.id,
        reason: `Matching title & duration (${candidate.duration}s)`,
      };
    }
  }

  return { isDuplicate: false };
}

export interface QueueProgressCallback {
  (itemId: string, status: BulkImportItemStatus, progress: number, error?: string, trackId?: string): void;
}

export class BulkUploadQueue {
  private isCancelled = false;
  private isPaused = false;
  private activeCount = 0;
  private queue: BulkImportItem[] = [];
  private concurrency: number;
  private onProgress: QueueProgressCallback;
  private onComplete: (summary: { total: number; success: number; failed: number }) => void;

  constructor(options: {
    concurrency?: number;
    onProgress: QueueProgressCallback;
    onComplete: (summary: { total: number; success: number; failed: number }) => void;
  }) {
    this.concurrency = Math.max(1, options.concurrency || 2);
    this.onProgress = options.onProgress;
    this.onComplete = options.onComplete;
  }

  public setConcurrency(c: number) {
    this.concurrency = Math.max(1, c);
  }

  public cancel() {
    this.isCancelled = true;
  }

  public pause() {
    this.isPaused = true;
  }

  public resume() {
    this.isPaused = false;
    this.processNext();
  }

  public async start(items: BulkImportItem[]) {
    this.isCancelled = false;
    this.isPaused = false;
    this.queue = [...items];
    this.activeCount = 0;

    if (this.queue.length === 0) {
      this.onComplete({ total: 0, success: 0, failed: 0 });
      return;
    }

    // Kick off initial batch
    const initialBatch = Math.min(this.concurrency, this.queue.length);
    for (let i = 0; i < initialBatch; i++) {
      this.processNext();
    }
  }

  private async processNext() {
    if (this.isCancelled || this.isPaused) return;
    if (this.queue.length === 0 && this.activeCount === 0) {
      this.onComplete({ total: 0, success: 0, failed: 0 });
      return;
    }

    if (this.queue.length === 0 || this.activeCount >= this.concurrency) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    if (!item.selected || (item.isDuplicate && item.duplicateAction === 'skip')) {
      // Skipped item
      this.processNext();
      return;
    }

    this.activeCount++;

    try {
      this.onProgress(item.id, 'uploading_audio', 10);

      const track = await uploadSingleSong(item, {
        onStageChange: (stage, prog) => {
          this.onProgress(item.id, stage, prog);
        },
      });

      this.onProgress(item.id, 'completed', 100, undefined, track.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.onProgress(item.id, 'failed', 0, msg);
    } finally {
      this.activeCount--;
      this.processNext();
    }
  }
}
