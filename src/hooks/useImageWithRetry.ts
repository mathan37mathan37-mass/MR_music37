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

const SUPABASE_BASE = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  'https://fcxspskofubbmqtyqlrw.supabase.co'
).replace(/\/+$/, '');

const SUPABASE_STORAGE_HOST = `${SUPABASE_BASE}/storage/v1/object/public`;

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
  return `${base}${sep}_r=${attempt}_${Date.now()}`;
}

/** Toggles between direct Supabase URL with retry param, and serverless proxy */
function alternateUrl(url: string, attempt: number): string {
  const clean = stripRetryParam(url);

  // If URL was stored as /supabase-storage/... restore to direct Supabase URL first
  if (clean.startsWith('/supabase-storage/')) {
    const subPath = clean.replace(/^\/supabase-storage\//, '');
    const directUrl = `${SUPABASE_STORAGE_HOST}/${subPath}`;
    return attempt === 1
      ? addRetryParam(directUrl, attempt)
      : `/api/proxy?url=${encodeURIComponent(directUrl)}`;
  }

  // If it's a direct Supabase URL or absolute URL
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    if (attempt === 1) {
      // First retry: retry direct with cache-busting timestamp
      return addRetryParam(clean, attempt);
    }
    // Second retry: use proxy
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
