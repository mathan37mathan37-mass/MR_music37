/**
 * useImageWithRetry.ts
 *
 * Handles transient network failures (QUIC protocol errors, connection resets)
 * that are common with Supabase Storage on Vercel deployments.
 *
 * Strategy:
 *   1. On image error, retry by switching between same-origin reverse-proxy (/supabase-storage/)
 *      and direct Supabase storage URL with a cache-busting ?_r=N param.
 *   2. Automatically falls back to fallbackSrc (or DEFAULT_MR_MUSIC_COVER) after exhausting retries.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { DEFAULT_MR_MUSIC_COVER } from '@/services/artworkService';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 600;

const SUPABASE_STORAGE_HOST = 'https://fcxspskofubbmqtyqlrw.supabase.co/storage/v1/object/public';

/** Strips any existing _r= retry param from a URL */
function stripRetryParam(url: string): string {
  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const u = new URL(url);
      u.searchParams.delete('_r');
      return u.toString();
    }
  } catch {
    // ignore
  }
  return url.replace(/[?&]_r=\d+/, '');
}

/** Appends a cache-busting retry counter to a URL */
function addRetryParam(url: string, attempt: number): string {
  const base = stripRetryParam(url);
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}_r=${attempt}`;
}

/** Toggles between reverse-proxied /supabase-storage/ path, /api/proxy, and direct Supabase URL */
function alternateUrl(url: string, attempt: number): string {
  const clean = stripRetryParam(url);
  if (clean.startsWith('/supabase-storage/')) {
    const subPath = clean.replace('/supabase-storage/', '');
    const directUrl = `${SUPABASE_STORAGE_HOST}/${subPath}`;
    if (attempt === 1) {
      return `/api/proxy?url=${encodeURIComponent(directUrl)}`;
    }
    return addRetryParam(directUrl, attempt);
  }
  if (clean.startsWith('/api/proxy')) {
    const directMatch = clean.match(/url=([^&]+)/);
    const directUrl = directMatch ? decodeURIComponent(directMatch[1]) : '';
    if (directUrl) {
      return addRetryParam(directUrl, attempt);
    }
  }
  if (clean.startsWith(SUPABASE_STORAGE_HOST)) {
    const subPath = clean.replace(`${SUPABASE_STORAGE_HOST}/`, '');
    if (attempt === 1) {
      return addRetryParam(`/supabase-storage/${subPath}`, attempt);
    }
    return `/api/proxy?url=${encodeURIComponent(clean)}`;
  }
  return addRetryParam(clean, attempt);
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
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Reset when src prop changes externally
  if (src !== lastSrc.current) {
    lastSrc.current = src;
    retryCount.current = 0;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setCurrentSrc(src);
  }

  const onError = useCallback(
    () => {
      const attempt = retryCount.current;
      if (
        attempt < MAX_RETRIES &&
        currentSrc &&
        !currentSrc.startsWith('blob:') &&
        !currentSrc.startsWith('idb:') &&
        currentSrc !== fallbackSrc
      ) {
        retryCount.current = attempt + 1;
        const nextUrl = alternateUrl(currentSrc, retryCount.current);

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => {
          setCurrentSrc(nextUrl);
        }, RETRY_DELAY_MS);
      } else {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setCurrentSrc(fallbackSrc);
      }
    },
    [currentSrc, fallbackSrc]
  );

  return { src: currentSrc, onError };
}
