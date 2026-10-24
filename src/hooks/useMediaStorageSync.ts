import { useEffect, useState, useCallback, useRef } from 'react';
import {
  registerMediaServiceWorker,
  verifyAndSyncMediaAssets,
  rehydrateMediaAsset,
  notifyDataUpdated
} from '../services/api';

export interface MediaStorageStatus {
  isSyncing: boolean;
  lastVerifiedAt: number | null;
  syncError: string | null;
  verifyNow: () => Promise<void>;
  rehydrateUrl: (url: string) => Promise<boolean>;
}

export function useMediaStorageSync(): MediaStorageStatus {
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastVerifiedAt, setLastVerifiedAt] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const pendingRehydratesRef = useRef<Set<string>>(new Set());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const performVerification = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      const res = await verifyAndSyncMediaAssets();
      setLastVerifiedAt(Date.now());
      if (res.rehydrated > 0) {
        console.info(`[Storage] Auto-repaired & rehydrated ${res.rehydrated} media assets from Cloud Firestore.`);
      }
    } catch (err: any) {
      console.warn('[Storage] Media sync error:', err);
      setSyncError(err?.message || 'Media verification failed');
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  const handleRehydrate = useCallback(async (url: string): Promise<boolean> => {
    if (!url || pendingRehydratesRef.current.has(url)) return false;
    pendingRehydratesRef.current.add(url);
    try {
      const success = await rehydrateMediaAsset(url);
      if (success) {
        notifyDataUpdated('media');
        notifyDataUpdated('products');
        notifyDataUpdated('cms');
        notifyDataUpdated('collections');
      }
      return success;
    } finally {
      pendingRehydratesRef.current.delete(url);
    }
  }, []);

  useEffect(() => {
    // 1. Register Service Worker on client startup
    registerMediaServiceWorker();

    // 2. Listen for 404 notifications from Service Worker and DOM error events
    const onMedia404Detected = (event: Event) => {
      const customEvent = event as CustomEvent<{ url?: string }>;
      const detectedUrl = customEvent?.detail?.url;
      if (detectedUrl) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          handleRehydrate(detectedUrl);
        }, 300);
      }
    };

    window.addEventListener('media-404-detected', onMedia404Detected);

    // 3. Delayed initial asset verification check (runs 2.5s after load to preserve initial render speed)
    const initialTimer = setTimeout(() => {
      performVerification();
    }, 2500);

    // 4. Periodic background verification every 10 minutes
    const intervalTimer = setInterval(() => {
      performVerification();
    }, 10 * 60 * 1000);

    // 5. Re-check on network reconnection
    const onOnline = () => {
      performVerification();
    };
    window.addEventListener('online', onOnline);

    return () => {
      window.removeEventListener('media-404-detected', onMedia404Detected);
      window.removeEventListener('online', onOnline);
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [handleRehydrate, performVerification]);

  return {
    isSyncing,
    lastVerifiedAt,
    syncError,
    verifyNow: performVerification,
    rehydrateUrl: handleRehydrate
  };
}
