"use client";

import { useEffect, useState } from 'react';

const CACHE_NAME = 'msgapp-media-cache-v1';

/**
 * Retrieves a cached Blob URL for any remote image or audio file.
 * If not cached, fetches it once from the network and saves it locally in CacheStorage.
 */
import { getOrCacheMediaUrl } from './indexeddb-cache';

export async function getCachedMediaUrl(url: string): Promise<string> {
  if (typeof window === 'undefined' || !url) return url;
  return getOrCacheMediaUrl(url);
}

/**
 * Custom React Hook to load and cache any media URL (Image, Audio, Document).
 * Returns the local cached blob URL for instant 0ms rendering.
 */
export function useCachedMedia(srcUrl: string | undefined): { src: string; isCached: boolean } {
  const [cachedSrc, setCachedSrc] = useState<string>(srcUrl || '');
  const [isCached, setIsCached] = useState<boolean>(false);

  useEffect(() => {
    if (!srcUrl) return;

    let isMounted = true;
    let createdBlobUrl = '';

    getCachedMediaUrl(srcUrl).then((cachedUrl) => {
      if (isMounted) {
        setCachedSrc(cachedUrl);
        if (cachedUrl.startsWith('blob:')) {
          createdBlobUrl = cachedUrl;
          setIsCached(true);
        }
      }
    });

    return () => {
      isMounted = false;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [srcUrl]);

  return { src: cachedSrc, isCached };
}
