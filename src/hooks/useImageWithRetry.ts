/**
 * useImageWithRetry.ts
 *
 * Handles transient network failures (QUIC protocol errors, connection resets)
 * that are common with Supabase Storage on Vercel deployments.
 *
 * Strategy:
 *   - On image error, wait a short delay then retry with ?_r=N appended
 *   - This forces the browser to open a fresh TCP connection instead of
 *     reusing a broken QUIC session
 *   - After MAX_RETRIES, falls back to the provided fallback URL
 */

import { useState, useCallback, useRef } from 'react';
import { DEFAULT_MR_MUSIC_COVER } from '@/services/artworkService';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 800;

/** Strips any existing _r= retry param from a URL so we can add a fresh one */
function stripRetryParam(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete('_r');
    return u.toString();
  } catch {
    // Not a full URL (e.g. unsplash with ?w= params — just return as-is)
    return url.replace(/[?&]_r=\d+/, '');
  }
}

/** Appends a cache-busting retry counter to a URL */
function addRetryParam(url: string, attempt: number): string {
  const base = stripRetryParam(url);
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}_r=${attempt}`;
}

interface UseImageWithRetryOptions {
  src: string;
  fallbackSrc?: string;
}

interface UseImageWithRetryResult {
  src: string;
  onError: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

export function useImageWithRetry({
  src,
  fallbackSrc = DEFAULT_MR_MUSIC_COVER,
}: UseImageWithRetryOptions): UseImageWithRetryResult {
  const [currentSrc, setCurrentSrc] = useState(src);
  const retryCount = useRef(0);
  const lastSrc = useRef(src);

  // Reset when the source prop changes externally
  if (src !== lastSrc.current) {
    lastSrc.current = src;
    retryCount.current = 0;
    setCurrentSrc(src);
  }

  const onError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const target = e.currentTarget;
      // Prevent infinite loop
      target.onerror = null;

      const attempt = retryCount.current;

      if (attempt < MAX_RETRIES && src && src.startsWith('http') && !src.startsWith('blob:')) {
        retryCount.current = attempt + 1;
        const retryUrl = addRetryParam(stripRetryParam(src), retryCount.current);

        setTimeout(() => {
          // Re-attach error handler before setting src
          target.onerror = () => {
            target.onerror = null;
            if (retryCount.current < MAX_RETRIES) {
              retryCount.current += 1;
              const nextUrl = addRetryParam(stripRetryParam(src), retryCount.current);
              setTimeout(() => {
                target.onerror = () => {
                  target.onerror = null;
                  setCurrentSrc(fallbackSrc);
                };
                setCurrentSrc(nextUrl);
              }, RETRY_DELAY_MS * 2);
            } else {
              setCurrentSrc(fallbackSrc);
            }
          };
          setCurrentSrc(retryUrl);
        }, RETRY_DELAY_MS);
      } else {
        // Use fallback for blob:, idb:, or after exhausting retries
        setCurrentSrc(fallbackSrc);
      }
    },
    [src, fallbackSrc]
  );

  return { src: currentSrc, onError };
}
