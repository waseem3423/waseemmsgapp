"use client";

const DB_NAME = 'WaseemMsgAppMediaDB';
const DB_VERSION = 1;
const STORE_NAME = 'media_blobs';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a media Blob (image, video, audio) directly into browser IndexedDB.
 */
export async function saveMediaBlob(key: string, blob: Blob): Promise<void> {
  if (!key) return;
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(blob, key);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB saveMediaBlob error:', err);
  }
}

/**
 * Retrieves a Blob from IndexedDB and creates a local blob: URL.
 */
export async function getMediaBlobUrl(key: string): Promise<string | null> {
  if (!key) return null;
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const blob = request.result as Blob | undefined;
        if (blob) {
          resolve(URL.createObjectURL(blob));
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('IndexedDB getMediaBlobUrl error:', err);
    return null;
  }
}

/**
 * Gets local cached URL or fetches once from CDN and saves to IndexedDB.
 */
export async function getOrCacheMediaUrl(url: string): Promise<string> {
  if (!url || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }

  // 1. Try local IndexedDB first (0ms load from local disk!)
  const localBlobUrl = await getMediaBlobUrl(url);
  if (localBlobUrl) {
    return localBlobUrl;
  }

  // 2. Fetch once from remote CDN and store in IndexedDB
  try {
    const response = await fetch(url);
    if (response.ok) {
      const blob = await response.blob();
      await saveMediaBlob(url, blob);
      return URL.createObjectURL(blob);
    }
  } catch (err) {
    console.warn('Network fetch fallback for media URL:', err);
  }

  return url;
}
