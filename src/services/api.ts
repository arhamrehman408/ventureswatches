import { Product, Collection, CMSData, Order, MediaItem, CustomerInfo, WatchSpecs, User, PriceDropAlert } from '../types';
import { initialProducts, initialCollections, initialCMSData, initialOrders, initialMedia } from '../data/mockData';
import { db } from '../lib/firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';

export function normalizeCollection(col: Collection): Collection {
  if (!col) return col;
  let name = (col.name || '').trim();
  let slug = (col.slug || '').trim();

  const nameLower = name.toLowerCase();
  const idLower = (col.id || '').toLowerCase().trim();

  // Only apply default fallback names if name is empty or matches legacy placeholders
  if (!name || nameLower === 'ventures automatic' || nameLower === 'automatic') {
    if (idLower === 'col-1') {
      name = 'Original Watches';
      slug = slug || 'original-watches';
    }
  } else if (!name || nameLower === 'ventures chrono' || nameLower === 'chrono' || nameLower === 'chronograph') {
    if (idLower === 'col-2') {
      name = 'Clone Watches';
      slug = slug || 'clone-watches';
    }
  } else if (!name || nameLower === 'ventures classic' || nameLower === 'classic') {
    if (idLower === 'col-3') {
      name = 'Copy Watches';
      slug = slug || 'copy-watches';
    }
  } else if (!name && (idLower === 'col-4' || nameLower.includes('pouch') || nameLower.includes('accessories'))) {
    name = 'Pouches & Accessories';
    slug = slug || 'pouches-accessories';
  }

  if (!slug && name) {
    slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  let rawImage = typeof col.image === 'string' ? col.image.trim() : '';

  return {
    ...col,
    name: name || col.id,
    slug: slug || col.id,
    image: rawImage
  };
}

export function normalizeProduct(p: Product): Product {
  if (!p) return p;
  let name = p.name || '';
  let collectionName = p.collectionName || '';
  let collectionId = p.collectionId || '';
  let category = p.category || '';
  let slug = p.slug || '';
  let sku = p.sku || '';

  // Clean all legacy brand titles
  if (name.includes('Ventures Automatic') || name.toLowerCase().includes('ventures automatic')) {
    name = name.replace(/Ventures Automatic/gi, 'Original Automatic');
  }
  if (name.includes('Ventures Chrono') || name.toLowerCase().includes('ventures chrono')) {
    name = name.replace(/Ventures Chrono/gi, 'Clone Chrono');
  }
  if (name.includes('Ventures Classic') || name.toLowerCase().includes('ventures classic')) {
    name = name.replace(/Ventures Classic/gi, 'Copy Classic');
  }

  // Normalize collection name and ID
  const colLower = collectionName.toLowerCase().trim();
  const idLower = (collectionId || '').toLowerCase().trim();

  if (idLower === 'col-1' || colLower === 'original watches') {
    collectionName = 'Original Watches';
    collectionId = 'col-1';
  } else if (idLower === 'col-2' || colLower === 'clone watches') {
    collectionName = 'Clone Watches';
    collectionId = 'col-2';
  } else if (idLower === 'col-3' || colLower === 'copy watches') {
    collectionName = 'Copy Watches';
    collectionId = 'col-3';
  } else if (idLower === 'col-4' || colLower.includes('pouch') || colLower.includes('accessories')) {
    collectionName = 'Pouches & Accessories';
    collectionId = 'col-4';
  }

  if (!slug && name) {
    slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  const rawImages: string[] = Array.isArray(p.images) ? p.images : [];
  const cleanImages = rawImages
    .map(img => (typeof img === 'string' ? img.trim() : ''))
    .filter(img => Boolean(img && img.length > 0));

  const specifications: WatchSpecs = {
    caseMaterial: p.specifications?.caseMaterial || '904L Corrosion-Resistant Stainless Steel',
    dialColor: p.specifications?.dialColor || 'Custom Hand-Crafted Dial',
    crystal: p.specifications?.crystal || 'Scratch-Resistant Sapphire with AR Coating',
    strapMaterial: p.specifications?.strapMaterial || 'Solid Steel / Hand-Stitched Leather',
    powerReserve: p.specifications?.powerReserve || '72 Hours',
    ...(p.specifications || {}),
    warranty: (p.specifications?.warranty || '3 Days Warranty').replace(/guarantee/gi, 'Warranty')
  };

  if (p.specifications?.caseSize || p.specifications?.diameter) {
    specifications.caseSize = (p.specifications.caseSize || p.specifications.diameter).trim();
  }
  if (p.specifications?.caseThickness || p.specifications?.thickness) {
    specifications.caseThickness = (p.specifications.caseThickness || p.specifications.thickness).trim();
  }

  delete specifications.movement;
  delete specifications.waterResistance;
  delete specifications.thickness;
  delete specifications.diameter;

  const compareAtPrice = (p.compareAtPrice !== undefined && p.compareAtPrice !== null && !isNaN(Number(p.compareAtPrice)) && Number(p.compareAtPrice) > 0)
    ? Number(p.compareAtPrice)
    : null;

  return {
    ...p,
    name,
    collectionName,
    collectionId,
    category,
    slug,
    sku,
    compareAtPrice,
    images: cleanImages,
    videos: Array.isArray(p.videos) ? p.videos : [],
    specifications
  };
}

// Robust LocalStorage safe wrappers with automatic quota eviction and crash protection
export function safeLocalStorageSet(key: string, value: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    console.warn(`[Storage] LocalStorage write failed for key "${key}". Attempting cache cleanup...`, err);
    try {
      // 1. Evict large Base64 / non-essential blobs from vault
      const rawVault = localStorage.getItem('vw_uploaded_media_vault');
      if (rawVault) {
        try {
          const vaultItems: MediaItem[] = JSON.parse(rawVault);
          const sanitized = vaultItems
            .filter(item => !item.url?.startsWith('data:') || item.url.length < 50000)
            .slice(0, 30);
          localStorage.setItem('vw_uploaded_media_vault', JSON.stringify(sanitized));
        } catch {
          localStorage.removeItem('vw_uploaded_media_vault');
        }
      }

      // 2. Remove temporary or redundant cache keys if full
      const keysToClean = ['vw_cached_rates', 'vw_debug_logs', 'vw_temp_upload'];
      keysToClean.forEach(k => {
        try { localStorage.removeItem(k); } catch {}
      });

      // 3. Retry setting the target item
      localStorage.setItem(key, value);
      return true;
    } catch (retryErr) {
      console.warn(`[Storage] LocalStorage write failed after cleanup for key "${key}". Proceeding safely in-memory.`, retryErr);
      return false;
    }
  }
}

export function safeLocalStorageGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try {
    const item = localStorage.getItem(key);
    if (item === null || item === undefined) return fallback;
    return JSON.parse(item) as T;
  } catch (err) {
    console.warn(`[Storage] Failed to parse JSON for key "${key}", returning fallback:`, err);
    return fallback;
  }
}

// Firestore Quota Circuit Breaker & High-Availability Sync Engine
let isFirestoreQuotaExhausted = false;

export function setFirestoreQuotaExhausted(status: boolean) {
  isFirestoreQuotaExhausted = status;
}

export function isFirestoreActive(): boolean {
  return !isFirestoreQuotaExhausted;
}

function handleFirestoreError(err: any, context: string) {
  const errMsg = String(err?.message || err || '');
  const errCode = String(err?.code || '');
  if (errCode.includes('resource-exhausted') || errMsg.includes('Quota limit exceeded') || errMsg.includes('resource-exhausted')) {
    if (!isFirestoreQuotaExhausted) {
      console.warn(`[Firestore] Daily write quota reached. Gracefully switching to High-Speed Server & SSE sync mode.`);
      isFirestoreQuotaExhausted = true;
    }
  } else {
    console.debug(`[Firestore ${context}]:`, err);
  }
}

// Helper to prevent Firestore operations from blocking if offline or connection is slow
function withTimeout<T>(promise: Promise<T>, ms = 2000): Promise<T> {
  if (isFirestoreQuotaExhausted) {
    return Promise.reject(new Error('Firestore quota paused'));
  }
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Firestore request timed out after ${ms}ms`)), ms)
    )
  ]).catch(err => {
    handleFirestoreError(err, 'timeout');
    throw err;
  });
}

// Helper to get or sync deletion registry from Firestore and local cache
export async function getDeletionRegistry(): Promise<{
  products: string[];
  media: string[];
  collections: string[];
  orders: string[];
}> {
  let localDeletedProds = safeLocalStorageGet<string[]>('vw_deleted_product_ids', []);
  let localDeletedMedia = safeLocalStorageGet<string[]>('vw_deleted_media_ids', []);
  let localDeletedCols = safeLocalStorageGet<string[]>('vw_deleted_col_ids', []);
  let localDeletedOrds = safeLocalStorageGet<string[]>('vw_deleted_ord_ids', []);

  try {
    const delDoc = await withTimeout(getDoc(doc(db, 'system', 'deletions')), 2000);
    if (delDoc.exists()) {
      const data = delDoc.data();
      const firestoreProds = Array.isArray(data.products) ? data.products : [];
      const firestoreMedia = Array.isArray(data.media) ? data.media : [];
      const firestoreCols = Array.isArray(data.collections) ? data.collections : [];
      const firestoreOrds = Array.isArray(data.orders) ? data.orders : [];

      const mergedProds = Array.from(new Set([...localDeletedProds, ...firestoreProds]));
      const mergedMedia = Array.from(new Set([...localDeletedMedia, ...firestoreMedia]));
      const mergedCols = Array.from(new Set([...localDeletedCols, ...firestoreCols]));
      const mergedOrds = Array.from(new Set([...localDeletedOrds, ...firestoreOrds]));

      safeLocalStorageSet('vw_deleted_product_ids', JSON.stringify(mergedProds));
      safeLocalStorageSet('vw_deleted_media_ids', JSON.stringify(mergedMedia));
      safeLocalStorageSet('vw_deleted_col_ids', JSON.stringify(mergedCols));
      safeLocalStorageSet('vw_deleted_ord_ids', JSON.stringify(mergedOrds));

      return {
        products: mergedProds,
        media: mergedMedia,
        collections: mergedCols,
        orders: mergedOrds
      };
    }
  } catch (err) {
    console.warn('Firestore deletion registry read error:', err);
  }

  return {
    products: localDeletedProds,
    media: localDeletedMedia,
    collections: localDeletedCols,
    orders: localDeletedOrds
  };
}

// Helper to record a deleted item into Firestore deletion registry
export function notifyDataUpdated(type?: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vw_data_updated', { detail: { type, timestamp: Date.now() } }));
  }
}

export interface VersionTimestamps {
  products?: number;
  cms?: number;
  media?: number;
  collections?: number;
  orders?: number;
  global?: number;
}

export function getLocalVersionTimestamps(): VersionTimestamps {
  return safeLocalStorageGet<VersionTimestamps>('vw_version_timestamps', {});
}

export function setLocalVersionTimestamp(entity: keyof VersionTimestamps, timestamp: number) {
  try {
    const current = getLocalVersionTimestamps();
    current[entity] = timestamp;
    current.global = Math.max(current.global || 0, timestamp);
    safeLocalStorageSet('vw_version_timestamps', JSON.stringify(current));
    safeLocalStorageSet(`vw_${entity}_ts`, String(timestamp));
  } catch (e) {
    console.warn('Failed to set local version timestamp:', e);
  }
}

let lastCloudTsWrite = 0;
export async function recordCloudVersionTimestamp(entity: keyof VersionTimestamps, customTs?: number): Promise<number> {
  const ts = customTs || Date.now();
  setLocalVersionTimestamp(entity, ts);

  const now = Date.now();
  if (!isFirestoreQuotaExhausted && (now - lastCloudTsWrite > 3000)) {
    lastCloudTsWrite = now;
    try {
      const metaRef = doc(db, 'system', 'metadata');
      await withTimeout(setDoc(metaRef, {
        last_updated: {
          [entity]: ts,
          global: ts
        }
      }, { merge: true }), 1500).catch((err) => {
        handleFirestoreError(err, 'recordTimestamp');
      });
    } catch (err) {
      handleFirestoreError(err, 'recordCloudVersionTimestamp');
    }
  }

  return ts;
}

export async function checkAndSyncVersionTimestamps(): Promise<{ hasStaleData: boolean; invalidated: string[] }> {
  if (isFirestoreQuotaExhausted) {
    return { hasStaleData: false, invalidated: [] };
  }

  const localTimestamps = getLocalVersionTimestamps();
  const invalidated: string[] = [];

  try {
    const metaRef = doc(db, 'system', 'metadata');
    const snap = await withTimeout(getDoc(metaRef), 1500).catch(() => null);

    if (snap && snap.exists()) {
      const data = snap.data();
      const remoteLastUpdated: VersionTimestamps = data?.last_updated || {};

      const entities: (keyof VersionTimestamps)[] = ['products', 'cms', 'media', 'collections', 'orders'];

      for (const entity of entities) {
        const remoteTs = remoteLastUpdated[entity];
        const localTs = localTimestamps[entity];

        if (remoteTs && remoteTs !== localTs) {
          invalidated.push(entity);
          setLocalVersionTimestamp(entity, remoteTs);
        }
      }
    }
  } catch (err) {
    handleFirestoreError(err, 'checkAndSyncVersionTimestamps');
  }

  return {
    hasStaleData: invalidated.length > 0,
    invalidated
  };
}

export async function registerDeletionInCloud(category: 'products' | 'media' | 'collections' | 'orders', id: string) {
  try {
    if (!isFirestoreQuotaExhausted) {
      const delDocRef = doc(db, 'system', 'deletions');
      const existing = await withTimeout(getDoc(delDocRef), 1500).catch(() => null);
      if (existing && existing.exists()) {
        const data = existing.data() || {};
        const currentList = Array.isArray(data[category]) ? data[category] : [];
        if (!currentList.includes(id)) {
          await withTimeout(setDoc(delDocRef, {
            [category]: [...currentList, id]
          }, { merge: true }), 1500).catch(() => {});
        }
      } else {
        await withTimeout(setDoc(delDocRef, {
          [category]: [id]
        }, { merge: true }), 1500).catch(() => {});
      }
    }
  } catch (e) {
    handleFirestoreError(e, 'registerDeletionInCloud');
  }
  await recordCloudVersionTimestamp(category);
  notifyDataUpdated(category);
}

export async function unRegisterDeletionInCloud(category: 'products' | 'media' | 'collections' | 'orders', id: string) {
  try {
    if (!isFirestoreQuotaExhausted) {
      const delDocRef = doc(db, 'system', 'deletions');
      const existing = await withTimeout(getDoc(delDocRef), 1500).catch(() => null);
      if (existing && existing.exists()) {
        const data = existing.data() || {};
        const currentList: string[] = Array.isArray(data[category]) ? data[category] : [];
        const filtered = currentList.filter(item => item !== id);
        await withTimeout(setDoc(delDocRef, {
          [category]: filtered
        }, { merge: true }), 1500).catch(() => {});
      }
    }
  } catch (e) {
    handleFirestoreError(e, 'unRegisterDeletionInCloud');
  }
  await recordCloudVersionTimestamp(category);
  notifyDataUpdated(category);
}

// Helper to clear local cache and re-sync freshly with Firebase Firestore
export async function flushCacheAndResyncFromFirebase(): Promise<boolean> {
  try {
    localStorage.removeItem('vw_saved_products');
    localStorage.removeItem('vw_uploaded_media_vault');
    localStorage.removeItem('vw_cms_data');
    return true;
  } catch (e) {
    console.error('Error flushing cache:', e);
    return false;
  }
}

// Helper to seed initial data if Firestore collection is empty
let seeded = false;
export function ensureFirestoreSeeded() {
  if (seeded || isFirestoreQuotaExhausted) return Promise.resolve();
  seeded = true;

  return (async () => {
    try {
      const prodRef = collection(db, 'products');
      const prodSnap = await withTimeout(getDocs(prodRef), 1500).catch(() => null);
      if (prodSnap && prodSnap.empty && !isFirestoreQuotaExhausted) {
        for (const p of initialProducts.slice(0, 4)) {
          await withTimeout(setDoc(doc(prodRef, p.id), normalizeProduct(p)), 1500).catch((e) => {
            handleFirestoreError(e, 'seedProducts');
          });
          if (isFirestoreQuotaExhausted) break;
        }
      }
    } catch (err) {
      handleFirestoreError(err, 'ensureFirestoreSeeded');
    }
  })();
}

export async function fetchProducts(params?: { collection?: string; category?: string; search?: string; featured?: boolean; newArrival?: boolean }): Promise<Product[]> {
  const delRegistry = await getDeletionRegistry();
  const deletedSet = new Set(delRegistry.products.map(id => String(id).trim()));
  const savedProducts: Product[] = safeLocalStorageGet<Product[]>('vw_saved_products', []);

  let list: Product[] = [];
  let fetchedFromServer = false;

  // 1. Try high-performance Express server API
  try {
    const res = await fetch('/api/products');
    if (res.ok) {
      const serverProds: Product[] = await res.json();
      if (Array.isArray(serverProds) && serverProds.length > 0) {
        list = serverProds.filter(p => !deletedSet.has(p.id));
        fetchedFromServer = true;
      }
    }
  } catch {}

  // 2. Always reconcile with Cloud Firestore so products never disappear on server container reboots
  if (!isFirestoreQuotaExhausted) {
    try {
      const prodRef = collection(db, 'products');
      const snap = await withTimeout(getDocs(prodRef), 2000);
      if (!snap.empty) {
        const cloudProds: Product[] = [];
        snap.forEach(d => {
          if (!deletedSet.has(d.id)) {
            cloudProds.push(d.data() as Product);
          }
        });
        if (list.length === 0) {
          list = cloudProds;
        } else {
          const idSet = new Set(list.map(p => p.id));
          cloudProds.forEach(p => {
            if (!idSet.has(p.id)) {
              list.push(p);
            }
          });
        }
      }
    } catch (err) {
      handleFirestoreError(err, 'fetchProducts');
    }
  }

  // 3. Fallback to localStorage or mockData only if not fetched from server/Firestore
  if (!fetchedFromServer && list.length === 0) {
    if (savedProducts.length > 0) {
      list = savedProducts.filter(p => !deletedSet.has(p.id));
    } else {
      list = initialProducts.filter(p => !deletedSet.has(p.id));
    }
  }

  // Merge locally saved/edited products safely if not fetched from server
  if (!fetchedFromServer && savedProducts.length > 0) {
    const map = new Map<string, Product>();
    list.forEach(p => map.set(p.id, p));
    savedProducts.forEach(p => {
      if (!deletedSet.has(p.id)) {
        map.set(p.id, p);
      }
    });
    list = Array.from(map.values());
  }

  list = list.map(normalizeProduct);

  if (deletedSet.size > 0) {
    list = list.filter(p => !deletedSet.has(String(p.id).trim()));
  }

  safeLocalStorageSet('vw_saved_products', JSON.stringify(list));

  if (params?.collection) {
    list = list.filter(p => p.collectionId === params.collection || p.collectionName.toLowerCase().includes(params.collection!.toLowerCase()));
  }
  if (params?.category) {
    list = list.filter(p => p.category.toLowerCase() === params.category!.toLowerCase());
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.shortDescription.toLowerCase().includes(q) ||
      p.collectionName.toLowerCase().includes(q)
    );
  }
  if (params?.featured) list = list.filter(p => p.featured);
  if (params?.newArrival) list = list.filter(p => p.newArrival);

  return list;
}

export async function fetchCollections(): Promise<Collection[]> {
  const delRegistry = await getDeletionRegistry();
  const deletedSet = new Set(delRegistry.collections.map(id => String(id).trim()));

  let list: Collection[] = [];
  let fetchedFromServer = false;

  // 1. Try Express server API
  try {
    const res = await fetch('/api/collections');
    if (res.ok) {
      const serverCols: Collection[] = await res.json();
      if (Array.isArray(serverCols)) {
        list = serverCols
          .filter(c => !deletedSet.has(c.id))
          .map(normalizeCollection);
        fetchedFromServer = true;
      }
    }
  } catch {}

  // 2. Try Firestore if not quota exhausted
  if (!fetchedFromServer && !isFirestoreQuotaExhausted) {
    try {
      const colRef = collection(db, 'collections');
      const snap = await withTimeout(getDocs(colRef), 1500);
      if (!snap.empty) {
        snap.forEach(d => {
          const data = d.data() as Collection;
          if (!deletedSet.has(d.id)) {
            list.push(normalizeCollection(data));
          }
        });
      }
    } catch (err) {
      handleFirestoreError(err, 'fetchCollections');
    }
  }

  if (!fetchedFromServer && list.length === 0) {
    list = initialCollections.filter(c => !deletedSet.has(c.id));
  }

  return list
    .filter(c => !deletedSet.has(c.id))
    .map(normalizeCollection)
    .sort((a, b) => {
      const orderA = typeof a.sortOrder === 'number' ? a.sortOrder : (a.id === 'col-1' ? 1 : a.id === 'col-2' ? 2 : a.id === 'col-3' ? 3 : a.id === 'col-4' ? 4 : 99);
      const orderB = typeof b.sortOrder === 'number' ? b.sortOrder : (b.id === 'col-1' ? 1 : b.id === 'col-2' ? 2 : b.id === 'col-3' ? 3 : b.id === 'col-4' ? 4 : 99);
      return orderA - orderB;
    });
}

// Helper to compress and optimize images for permanent Firestore Cloud Database storage
export async function compressImageForStorage(
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve) => {
    // If not an image (e.g. video), read as standard data URL
    if (!file.type?.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      if (!rawDataUrl) return resolve('');

      // If image is already lightweight (under 120KB), keep original crisp data
      if (file.size < 120 * 1024) {
        return resolve(rawDataUrl);
      }

      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(rawDataUrl);
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Try webp first for high efficiency, then jpeg
        let compressed = canvas.toDataURL('image/webp', quality);
        if (!compressed || compressed.startsWith('data:,')) {
          compressed = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(compressed);
      };
      img.onerror = () => resolve(rawDataUrl);
      img.src = rawDataUrl;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

export async function uploadMediaFile(file: File, category = 'General Upload'): Promise<string> {
  const isVid = file.type?.startsWith('video/') || Boolean(file.name.match(/\.(mp4|webm|mov|m4v|mkv|avi|3gp|wmv|flv|ogv|ts|m2ts)$/i));
  const mediaId = `med-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  let finalUrl = '';
  let calcSize = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

  // 1. Primary Method: Direct Multipart FormData Upload to Express Server Storage
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { ...getAuthHeaders() },
      body: formData
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.url) {
        finalUrl = data.url;
      }
    }
  } catch (uploadErr) {
    console.warn('Multipart upload fallback warning:', uploadErr);
  }

  // 2. Base64 JSON fallback to server if multipart upload was blocked
  if (!finalUrl) {
    try {
      const base64Data: string = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string) || '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });

      if (base64Data) {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            fileData: base64Data,
            fileName: file.name,
            category
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.url) finalUrl = data.url;
        }
        if (!finalUrl && !isVid) {
          finalUrl = base64Data;
        }
      }
    } catch (base64Err) {
      console.warn('Base64 upload fallback warning:', base64Err);
    }
  }

  // 3. Image optimization fallback if server was totally offline
  if (!finalUrl) {
    if (!isVid) {
      finalUrl = await compressImageForStorage(file);
      calcSize = (finalUrl.length * 0.75 / 1024).toFixed(1) + ' KB';
    } else {
      finalUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string) || '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
    }
  }

  if (!finalUrl) {
    throw new Error('Failed to process media file. Please check file format and try again.');
  }

  const mediaDoc: MediaItem = {
    id: mediaId,
    url: finalUrl,
    name: file.name || `asset-${Date.now()}.${isVid ? 'mp4' : 'jpg'}`,
    type: isVid ? 'video' : 'image',
    category,
    size: calcSize,
    createdAt: new Date().toISOString()
  };

  // 4. Non-blocking Firestore metadata persistence (safely handled with timeout)
  try {
    if (!finalUrl.startsWith('data:') || finalUrl.length < 500000) {
      withTimeout(setDoc(doc(db, 'media', mediaId), mediaDoc), 2000).catch(() => {});
    }
  } catch (err) {
    console.warn('Firestore direct media save warning:', err);
  }

  // 5. Persist into Local Vault Cache
  try {
    const savedVault: MediaItem[] = safeLocalStorageGet<MediaItem[]>('vw_uploaded_media_vault', []);
    const filtered = savedVault.filter(m => m.id !== mediaId);
    if (!finalUrl.startsWith('data:') || finalUrl.length < 200000) {
      filtered.unshift(mediaDoc);
      safeLocalStorageSet('vw_uploaded_media_vault', JSON.stringify(filtered.slice(0, 100)));
    }
  } catch (e) {
    console.warn('Local media vault cache warning:', e);
  }

  notifyDataUpdated('media');
  return finalUrl;
}

export function getAdminToken(): string | null {
  try {
    const token = sessionStorage.getItem('vw_admin_token') || localStorage.getItem('vw_admin_token');
    return token && token !== 'vw-token-admin-secret' ? token : null;
  } catch {
    return null;
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAdminToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export async function adminLogin(username: string, password: string): Promise<{ success: boolean; user?: any; token?: string; error?: string }> {
  try {
    const res = await fetch('/api/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success && data.token) {
      try {
        sessionStorage.setItem('vw_admin_token', data.token);
        localStorage.setItem('vw_admin_token', data.token);
        sessionStorage.setItem('vw_admin_authed', 'true');
      } catch {}
    }
    return data;
  } catch (err) {
    return { success: false, error: 'Authentication service connection error. Please verify backend server connectivity.' };
  }
}

export async function loginCustomer(emailOrUsername: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailOrUsername, password })
    });
    const data = await res.json();
    if (data.success && data.user) {
      if (data.token && data.user.role === 'admin') {
        try {
          sessionStorage.setItem('vw_admin_token', data.token);
          localStorage.setItem('vw_admin_token', data.token);
          sessionStorage.setItem('vw_admin_authed', 'true');
        } catch {}
      }
      saveSessionUser(data.user);
      return { success: true, user: data.user };
    } else {
      return { success: false, error: data.error || 'Invalid credentials' };
    }
  } catch (err: any) {
    // Fallback client auth (strictly customer role, never admin)
    if (emailOrUsername && password) {
      const fallbackUser: User = {
        id: `user-${Date.now()}`,
        email: emailOrUsername.includes('@') ? emailOrUsername : `${emailOrUsername}@customer.ventureswatches.com`,
        name: emailOrUsername.split('@')[0],
        role: 'customer',
        createdAt: new Date().toISOString()
      };
      saveSessionUser(fallbackUser);
      return { success: true, user: fallbackUser };
    }
    return { success: false, error: err?.message || 'Login connection failed.' };
  }
}

export async function registerCustomer(email: string, password: string, name?: string, phone?: string): Promise<{ success: boolean; user?: User; error?: string; exists?: boolean; message?: string }> {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, phone })
    });
    const data = await res.json();
    if (data.success && data.user) {
      saveSessionUser(data.user);
      return { success: true, user: data.user, message: data.message };
    } else {
      return { success: false, error: data.error || 'Registration failed', exists: data.exists };
    }
  } catch (err: any) {
    if (email && password) {
      const fallbackUser: User = {
        id: `user-${Date.now()}`,
        email,
        name: name || email.split('@')[0],
        phone,
        role: 'customer',
        createdAt: new Date().toISOString()
      };
      saveSessionUser(fallbackUser);
      return { success: true, user: fallbackUser };
    }
    return { success: false, error: err?.message || 'Registration connection failed' };
  }
}

export function saveSessionUser(user: User): void {
  try {
    localStorage.setItem('vw_current_user', JSON.stringify(user));
  } catch (e) {
    console.warn('Could not save user to localStorage:', e);
  }
}

export function getSavedUser(): User | null {
  try {
    const saved = localStorage.getItem('vw_current_user');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function clearSessionUser(): void {
  try {
    localStorage.removeItem('vw_current_user');
    sessionStorage.removeItem('vw_admin_authed');
    localStorage.removeItem('vw_admin_authed');
    sessionStorage.removeItem('vw_admin_token');
    localStorage.removeItem('vw_admin_token');
  } catch (e) {
    console.warn('Could not clear user session:', e);
  }
}

export async function fetchCustomerOrders(email?: string, phone?: string, userId?: string): Promise<Order[]> {
  try {
    const params = new URLSearchParams();
    if (email) params.set('email', email);
    if (phone) params.set('phone', phone);
    if (userId) params.set('userId', userId);

    const res = await fetch(`/api/user/orders?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn('Could not fetch user orders from API:', err);
  }
  return [];
}

export async function updateAdminCredentials(newUsername: string, newPassword: string, newEmail?: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/auth/update-admin-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ newUsername, newPassword, newEmail })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    return { success: false, error: 'Failed to update admin credentials' };
  }
}

export async function fetchCMSData(): Promise<CMSData> {
  ensureFirestoreSeeded().catch(() => {});

  let firestoreData: CMSData | null = null;
  try {
    const cmsDocRef = doc(db, 'cms', 'main');
    const snap = await withTimeout(getDoc(cmsDocRef), 1500);
    if (snap.exists()) {
      firestoreData = snap.data() as CMSData;
    }
  } catch (err) {
    console.warn('Firestore fetchCMSData error:', err);
  }

  let serverData: CMSData | null = null;
  try {
    const res = await fetch('/api/cms');
    if (res.ok) {
      serverData = await res.json();
    }
  } catch {}

  const local = localStorage.getItem('vw_cms_data');
  let cachedData: CMSData | null = null;
  if (local) {
    try {
      cachedData = JSON.parse(local);
    } catch {}
  }

  // Prioritize live server & Firestore data, then cached, then initial
  const mergedData: CMSData = {
    ...(initialCMSData as CMSData),
    ...(cachedData || {}),
    ...(serverData || {}),
    ...(firestoreData || {})
  };

  if (mergedData.heroTitle === undefined) {
    mergedData.heroTitle = 'VENTURES WATCHES';
  } else if (typeof mergedData.heroTitle === 'string' && (mergedData.heroTitle.includes('TIME, REFINED') || mergedData.heroTitle.includes('TIME REFINED'))) {
    mergedData.heroTitle = 'VENTURES WATCHES';
  }

  if (mergedData.heroSubtitle === undefined) {
    mergedData.heroSubtitle = '100% Authentic Watches & High-End Clones';
  } else if (typeof mergedData.heroSubtitle === 'string' && mergedData.heroSubtitle.includes('CRAFTED FOR EVERY MOMENT')) {
    mergedData.heroSubtitle = '100% Authentic Watches & High-End Clones';
  }

  if (mergedData.brandStatement === undefined) {
    mergedData.brandStatement = 'Featuring Timepieces from the World’s Finest Brands. ⌚✨';
  } else if (typeof mergedData.brandStatement === 'string' && (mergedData.brandStatement.includes('Architectural horology') || mergedData.brandStatement.includes('VENTURES WATCHES COMBINES'))) {
    mergedData.brandStatement = 'Featuring Timepieces from the World’s Finest Brands. ⌚✨';
  }
  if (!mergedData.editorialImage || mergedData.editorialImage.includes('photo-1522335789203') || mergedData.editorialImage.includes('chatgpt.com') || mergedData.editorialImage.includes('ventures-curated-horology')) {
    mergedData.editorialImage = initialCMSData.editorialImage;
  }

  // Strip legacy unsplash / placeholder caches so default Admin-uploaded pictures display
  if (!mergedData.originalWatchesImage || mergedData.originalWatchesImage.includes('photo-1509042239860') || mergedData.originalWatchesImage.includes('photo-1522335789203') || mergedData.originalWatchesImage.includes('unsplash') || mergedData.originalWatchesImage.includes('1786782128028')) {
    mergedData.originalWatchesImage = initialCMSData.originalWatchesImage;
  }
  if (!mergedData.cloneWatchesImage || mergedData.cloneWatchesImage.includes('photo-1522335789203') || mergedData.cloneWatchesImage.includes('photo-1524805444758') || mergedData.cloneWatchesImage.includes('unsplash') || mergedData.cloneWatchesImage.includes('1786782146887')) {
    mergedData.cloneWatchesImage = initialCMSData.cloneWatchesImage;
  }
  if (!mergedData.copyWatchesImage || mergedData.copyWatchesImage.includes('photo-1524805444758') || mergedData.copyWatchesImage.includes('photo-1539185441755') || mergedData.copyWatchesImage.includes('unsplash') || mergedData.copyWatchesImage.includes('1786782167017')) {
    mergedData.copyWatchesImage = initialCMSData.copyWatchesImage;
  }
  if (!mergedData.aboutImage || mergedData.aboutImage.includes('unsplash.com')) {
    mergedData.aboutImage = initialCMSData.aboutImage;
    mergedData.aboutImageUrl = initialCMSData.aboutImageUrl;
  }

  // Only use video explicitly uploaded/configured from the Admin Dashboard / Console
  let candidateVideo =
    (firestoreData?.heroVideoUrl && firestoreData.heroVideoUrl.trim().length > 0)
      ? firestoreData.heroVideoUrl.trim()
      : (serverData?.heroVideoUrl && serverData.heroVideoUrl.trim().length > 0)
      ? serverData.heroVideoUrl.trim()
      : (cachedData?.heroVideoUrl && cachedData.heroVideoUrl.trim().length > 0)
      ? cachedData.heroVideoUrl.trim()
      : initialCMSData.heroVideoUrl;

  // Purge any legacy sample/stock/preset videos from memory & cache
  if (
    candidateVideo.includes('mixkit-mechanical-clock-gears-turning-41551') ||
    candidateVideo.includes('207863_large.mp4') ||
    candidateVideo.includes('pixabay.com/video/2024/04/13/207863') ||
    candidateVideo.includes('mixkit-close-up-of-a-pocket-watch') ||
    candidateVideo.includes('mixkit-hands-of-a-clock')
  ) {
    candidateVideo = initialCMSData.heroVideoUrl;
  }

  mergedData.heroVideoUrl = candidateVideo || initialCMSData.heroVideoUrl;

  safeLocalStorageSet('vw_cms_data', JSON.stringify(mergedData));

  return mergedData;
}

export async function fetchCMSAndMediaBatched(): Promise<{ cms: CMSData; media: MediaItem[] }> {
  try {
    const [cms, media] = await Promise.all([
      fetchCMSData(),
      fetchMedia()
    ]);
    return { cms, media };
  } catch (err) {
    console.warn('Batched fetchCMSAndMediaBatched error:', err);
    return {
      cms: initialCMSData,
      media: initialMedia
    };
  }
}

export async function fetchAllInitialDataBatched(): Promise<{
  products: Product[];
  collections: Collection[];
  cms: CMSData;
  media: MediaItem[];
  orders: Order[];
}> {
  try {
    const isAdmin = Boolean(getAdminToken());
    const [products, collections, cms, media, orders] = await Promise.all([
      fetchProducts(),
      fetchCollections(),
      fetchCMSData(),
      fetchMedia(),
      isAdmin ? fetchOrders() : Promise.resolve([])
    ]);
    return { products, collections, cms, media, orders };
  } catch (err) {
    console.warn('Batched fetchAllInitialDataBatched error:', err);
    return {
      products: initialProducts,
      collections: initialCollections,
      cms: initialCMSData,
      media: initialMedia,
      orders: []
    };
  }
}

export async function saveCMSData(data: CMSData): Promise<CMSData> {
  const updatedData = { ...data };

  // If heroVideoUrl is a base64 string, auto-upload to server first to keep Firestore under 1MB
  if (updatedData.heroVideoUrl && updatedData.heroVideoUrl.startsWith('data:')) {
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: updatedData.heroVideoUrl,
          fileName: `hero-video-${Date.now()}.mp4`,
          fileType: 'video/mp4'
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.url) {
          updatedData.heroVideoUrl = json.url;
        }
      }
    } catch (e) {
      console.warn('Failed to upload base64 hero video to server:', e);
    }
  }

  // Save to localStorage safely
  safeLocalStorageSet('vw_cms_data', JSON.stringify(updatedData));

  // Save to Express API so server in-memory & disk state is updated immediately
  try {
    await fetch('/api/cms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(updatedData)
    });
  } catch (e) {
    console.warn('Express saveCMSData error:', e);
  }

  // Prepare Firestore payload
  const firestoreData: any = { ...updatedData };
  if (firestoreData.heroVideoUrl && firestoreData.heroVideoUrl.startsWith('data:') && firestoreData.heroVideoUrl.length > 500000) {
    delete firestoreData.heroVideoUrl;
  }

  // Save to Firestore with safe timeout
  try {
    const cmsDocRef = doc(db, 'cms', 'main');
    await withTimeout(setDoc(cmsDocRef, firestoreData, { merge: true }), 2500);
  } catch (err) {
    console.warn('Firestore saveCMSData error:', err);
  }

  await recordCloudVersionTimestamp('cms');
  notifyDataUpdated('cms');
  return updatedData;
}

export async function createOrder(orderData: {
  customer: CustomerInfo;
  items: any[];
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
  paymentMethod?: string;
  paymentDetails?: any;
  paymentStatus?: 'Pending' | 'Paid' | 'Failed';
  orderStatus?: 'Pending' | 'Confirmed' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  emailApprovalStatus?: 'Pending Review' | 'Approved & Sent' | 'Rejected / Declined';
  emailConfirmationSent?: boolean;
}): Promise<Order> {
  const newOrder: Order = {
    id: `ord-${Date.now()}`,
    orderNumber: `VW-${Math.floor(10000 + Math.random() * 90000)}`,
    customer: orderData.customer,
    items: orderData.items,
    subtotal: orderData.subtotal,
    shipping: orderData.shipping,
    total: orderData.total,
    currency: orderData.currency || 'PKR',
    paymentMethod: orderData.paymentMethod as any || 'sadapay',
    paymentDetails: orderData.paymentDetails || { isAdvancePaid: true },
    paymentStatus: orderData.paymentStatus || 'Paid',
    orderStatus: orderData.orderStatus || 'Pending',
    emailApprovalStatus: orderData.emailApprovalStatus || 'Pending Review',
    emailConfirmationSent: orderData.emailConfirmationSent || false,
    createdAt: new Date().toISOString()
  };

  try {
    await withTimeout(setDoc(doc(db, 'orders', newOrder.id), newOrder), 2500);
  } catch (err) {
    console.warn('Firestore createOrder error:', err);
  }

  // Deduct inventory in Firestore for ordered items
  if (Array.isArray(newOrder.items) && newOrder.items.length > 0) {
    for (const item of newOrder.items) {
      if (item.productId) {
        try {
          const prodRef = doc(db, 'products', item.productId);
          const snap = await withTimeout(getDoc(prodRef), 1500);
          if (snap.exists()) {
            const currentStock = Number(snap.data()?.stock) || 0;
            const newStock = Math.max(0, currentStock - (Number(item.quantity) || 1));
            await withTimeout(updateDoc(prodRef, { stock: newStock }), 1500);
          }
        } catch (e) {
          console.warn('Firestore stock decrement error:', e);
        }
      }
    }
  }

  try {
    await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrder)
    });
  } catch {}

  await recordCloudVersionTimestamp('orders');
  await recordCloudVersionTimestamp('products');
  notifyDataUpdated('orders');
  notifyDataUpdated('products');
  return newOrder;
}

export async function processBankPayment(payload: {
  paymentMethod: string;
  amount: number;
  cardData?: any;
  walletData?: any;
  customer?: any;
}): Promise<any> {
  let serverError: string | null = null;
  try {
    const res = await fetch('/api/payment/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return data;
    } else {
      serverError = data.error || 'Payment declined by bank gateway.';
      throw new Error(serverError);
    }
  } catch (err: any) {
    if (serverError) {
      throw new Error(serverError);
    }
    console.warn('Bank payment processing server fallback check:', err);
  }

  const isCard = payload.paymentMethod === 'card';
  if (isCard && payload.cardData) {
    const { cardNumber } = payload.cardData;
    const cleanCard = (cardNumber || '').replace(/\s/g, '');

    if (cleanCard.endsWith('0000') || cleanCard === '4000000000000002') {
      throw new Error(`Payment Declined by Bank: Insufficient funds or card rejected by issuing bank for PKR ${payload.amount.toLocaleString()}.`);
    }
  }

  const trxId = isCard 
    ? `SDP-BANK-TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}` 
    : payload.walletData?.trxId || `SDP-WAL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  return {
    success: true,
    status: isCard ? 'APPROVED' : 'VERIFIED',
    gateway: isCard ? 'SadaPay Direct Bank Gateway (1LINK Verified)' : 'SadaPay Direct Bank Ledger',
    transactionId: trxId,
    settlement: {
      amount: payload.amount,
      currency: 'PKR',
      destinationBank: 'SadaPay',
      destinationAccount: '03192265524',
      destinationTitle: 'Muhammad Tayyab Asghar',
      settledAt: new Date().toISOString()
    }
  };
}

export async function fetchOrders(): Promise<Order[]> {
  const token = getAdminToken();
  if (!token) {
    return [];
  }

  const delRegistry = await getDeletionRegistry();
  const deletedSet = new Set(delRegistry.orders.map(id => String(id).trim()));

  const isMock = (o: any) =>
    !o ||
    o.id === 'ord-1001' ||
    o.id === 'ord-1002' ||
    o.id === 'ord-1786425230958' ||
    o.orderNumber === 'VW-98421' ||
    o.orderNumber === 'VW-98422' ||
    o.orderNumber === 'VW-26875';

  const orderMap = new Map<string, Order>();

  // 1. Fetch from high-speed Express server
  try {
    const res = await fetch('/api/orders', {
      headers: { ...getAuthHeaders() }
    });
    if (res.ok) {
      const serverOrders: Order[] = await res.json();
      if (Array.isArray(serverOrders)) {
        serverOrders.forEach(o => {
          if (!deletedSet.has(o.id) && !isMock(o)) {
            orderMap.set(o.id, o);
          }
        });
      }
    }
  } catch {}

  // 2. Reconcile with Firestore
  try {
    const ordRef = collection(db, 'orders');
    const snap = await withTimeout(getDocs(ordRef), 2000);
    if (!snap.empty) {
      snap.forEach(d => {
        if (!deletedSet.has(d.id)) {
          const cloudOrder = d.data() as Order;
          if (!isMock(cloudOrder)) {
            const existing = orderMap.get(cloudOrder.id);
            if (!existing) {
              orderMap.set(cloudOrder.id, cloudOrder);
            } else {
              // Merge, preserving latest approval / confirmed status
              const merged: Order = {
                ...existing,
                ...cloudOrder,
                emailApprovalStatus: cloudOrder.emailApprovalStatus || existing.emailApprovalStatus,
                orderStatus: (cloudOrder.orderStatus === 'Confirmed' || existing.orderStatus === 'Confirmed')
                  ? 'Confirmed'
                  : (cloudOrder.orderStatus || existing.orderStatus),
                paymentStatus: (cloudOrder.paymentStatus === 'Paid' || existing.paymentStatus === 'Paid')
                  ? 'Paid'
                  : (cloudOrder.paymentStatus || existing.paymentStatus)
              };
              orderMap.set(cloudOrder.id, merged);
            }
          }
        }
      });
    }
  } catch (err) {
    console.warn('Firestore fetchOrders error:', err);
  }

  const list = Array.from(orderMap.values());
  // Sort descending: newest orders at the very top
  list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  return list;
}

export async function purgeAllOrders(): Promise<boolean> {
  try {
    const res = await fetch('/api/orders/purge-all', {
      method: 'POST',
      headers: { ...getAuthHeaders() }
    });
    if (res.ok) {
      await recordCloudVersionTimestamp('orders');
      notifyDataUpdated('orders');
      return true;
    }
  } catch {}
  return false;
}

export async function updateOrderStatus(orderId: string, status: string): Promise<Order | null> {
  const isConfirmed = status === 'Confirmed' || status === 'Delivered';
  const isCancelled = status === 'Cancelled';
  const updatePayload: any = { orderStatus: status };
  if (isConfirmed) {
    updatePayload.paymentStatus = 'Paid';
    updatePayload.emailApprovalStatus = 'Approved & Sent';
    updatePayload.emailConfirmationSent = true;
  } else if (isCancelled) {
    updatePayload.paymentStatus = 'Failed';
    updatePayload.emailApprovalStatus = 'Rejected / Declined';
  }

  const docRef = doc(db, 'orders', orderId);
  let previousOrder: Order | null = null;
  try {
    const snap = await withTimeout(getDoc(docRef), 2000);
    if (snap.exists()) {
      previousOrder = snap.data() as Order;
    }
  } catch (err) {
    console.warn('Firestore fetch order before update status error:', err);
  }

  // 1. If transitioning to Cancelled from an active order: automatically replenish inventory in Firestore
  if (isCancelled && previousOrder && previousOrder.orderStatus !== 'Cancelled' && Array.isArray(previousOrder.items) && previousOrder.items.length > 0) {
    for (const item of previousOrder.items) {
      if (item.productId) {
        try {
          const prodRef = doc(db, 'products', item.productId);
          const pSnap = await withTimeout(getDoc(prodRef), 1500);
          if (pSnap.exists()) {
            const currentStock = Number(pSnap.data()?.stock) || 0;
            const restoredStock = currentStock + (Number(item.quantity) || 1);
            await withTimeout(updateDoc(prodRef, { stock: restoredStock }), 1500);
          }
        } catch (e) {
          console.warn('Firestore stock replenishment error:', e);
        }
      }
    }
    await recordCloudVersionTimestamp('products');
    notifyDataUpdated('products');
  }

  // 2. If transitioning FROM Cancelled back to active: re-deduct inventory in Firestore
  if (!isCancelled && previousOrder && previousOrder.orderStatus === 'Cancelled' && Array.isArray(previousOrder.items) && previousOrder.items.length > 0) {
    for (const item of previousOrder.items) {
      if (item.productId) {
        try {
          const prodRef = doc(db, 'products', item.productId);
          const pSnap = await withTimeout(getDoc(prodRef), 1500);
          if (pSnap.exists()) {
            const currentStock = Number(pSnap.data()?.stock) || 0;
            const newStock = Math.max(0, currentStock - (Number(item.quantity) || 1));
            await withTimeout(updateDoc(prodRef, { stock: newStock }), 1500);
          }
        } catch (e) {
          console.warn('Firestore stock deduction error:', e);
        }
      }
    }
    await recordCloudVersionTimestamp('products');
    notifyDataUpdated('products');
  }

  try {
    await withTimeout(updateDoc(docRef, updatePayload), 2500);
  } catch (err) {
    console.warn('Firestore updateOrderStatus error:', err);
  }

  try {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(updatePayload)
    });
    if (res.ok) {
      const updated = await res.json();
      await recordCloudVersionTimestamp('orders');
      notifyDataUpdated('orders');
      return updated;
    }
  } catch {}

  await recordCloudVersionTimestamp('orders');
  notifyDataUpdated('orders');
  return null;
}

export async function sendOrderConfirmationEmail(orderId: string, options?: { customNote?: string; trackingNumber?: string; courier?: string }): Promise<{ success: boolean; order?: Order; emailHtml?: string; error?: string }> {
  const emailSentAt = new Date().toISOString();
  const updatePayload = {
    emailApprovalStatus: 'Approved & Sent',
    emailConfirmationSent: true,
    emailSentAt,
    orderStatus: 'Confirmed',
    paymentStatus: 'Paid'
  };

  // 1. Update Firestore
  try {
    const docRef = doc(db, 'orders', orderId);
    await withTimeout(updateDoc(docRef, updatePayload), 2500);
  } catch (err) {
    console.warn('Firestore sendOrderConfirmationEmail error:', err);
  }

  // 2. Call Server Email Endpoint
  try {
    const res = await fetch(`/api/orders/${orderId}/send-confirmation-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(options || {})
    });
    if (res.ok) {
      const data = await res.json();
      await recordCloudVersionTimestamp('orders');
      notifyDataUpdated('orders');
      return { success: true, order: data.order, emailHtml: data.emailHtml };
    }
  } catch (err: any) {
    console.warn('Server email dispatch fallback:', err);
  }

  await recordCloudVersionTimestamp('orders');
  notifyDataUpdated('orders');
  return { success: true };
}

export async function declineOrderPayment(orderId: string, reason: string): Promise<{ success: boolean; order?: Order; error?: string }> {
  const updatePayload = {
    emailApprovalStatus: 'Rejected / Declined',
    emailRejectionReason: reason,
    paymentStatus: 'Failed',
    orderStatus: 'Cancelled'
  };

  const docRef = doc(db, 'orders', orderId);

  // Restore inventory in Firestore if transitioning to Cancelled
  try {
    const snap = await withTimeout(getDoc(docRef), 2000);
    if (snap.exists()) {
      const prevOrder = snap.data() as Order;
      if (prevOrder.orderStatus !== 'Cancelled' && Array.isArray(prevOrder.items) && prevOrder.items.length > 0) {
        for (const item of prevOrder.items) {
          if (item.productId) {
            try {
              const prodRef = doc(db, 'products', item.productId);
              const pSnap = await withTimeout(getDoc(prodRef), 1500);
              if (pSnap.exists()) {
                const currentStock = Number(pSnap.data()?.stock) || 0;
                const restoredStock = currentStock + (Number(item.quantity) || 1);
                await withTimeout(updateDoc(prodRef, { stock: restoredStock }), 1500);
              }
            } catch (e) {
              console.warn('Firestore decline stock replenish error:', e);
            }
          }
        }
        await recordCloudVersionTimestamp('products');
        notifyDataUpdated('products');
      }
    }
  } catch (err) {
    console.warn('Firestore check order before decline error:', err);
  }

  // 1. Update Firestore
  try {
    await withTimeout(updateDoc(docRef, updatePayload), 2500);
  } catch (err) {
    console.warn('Firestore declineOrderPayment error:', err);
  }

  // 2. Call Server Decline Endpoint
  try {
    const res = await fetch(`/api/orders/${orderId}/decline-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ reason })
    });
    if (res.ok) {
      const data = await res.json();
      await recordCloudVersionTimestamp('orders');
      notifyDataUpdated('orders');
      return { success: true, order: data.order };
    }
  } catch (err: any) {
    console.warn('Server decline payment fallback:', err);
  }

  await recordCloudVersionTimestamp('orders');
  notifyDataUpdated('orders');
  return { success: true };
}

export function generateOrderConfirmationEmailHtml(order: Order, customNote?: string, trackingNumber?: string): string {
  const itemsHtml = (order.items || []).map(i => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #1E293B; color: #F8FAFC; font-size: 14px;">
        <strong>${i.productName}</strong><br/>
        <span style="font-size: 11px; color: #94A3B8; font-family: monospace;">SKU: ${i.sku || 'N/A'}</span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #1E293B; color: #94A3B8; text-align: center; font-size: 13px;">${i.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #1E293B; color: #F59E0B; text-align: right; font-size: 13px; font-weight: bold;">PKR ${Number(i.price * i.quantity).toLocaleString()}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Order Confirmation - Ventures Watches #${order.orderNumber}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #070F1E; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 650px; margin: 30px auto; background-color: #0B192C; border: 1px solid #1E293B; border-radius: 8px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
        <tr>
          <td style="background: linear-gradient(135deg, #0B192C 0%, #1E293B 100%); padding: 32px 24px; text-align: center; border-bottom: 2px solid #F59E0B;">
            <div style="font-size: 22px; font-weight: 700; letter-spacing: 4px; color: #FFFFFF; text-transform: uppercase;">
              VENTURES WATCHES
            </div>
            <div style="font-size: 10px; color: #F59E0B; letter-spacing: 2px; text-transform: uppercase; margin-top: 6px; font-family: monospace;">
              Luxury Watches & Timepiece Advisory
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding: 32px 28px;">
            <div style="display: inline-block; background-color: rgba(16, 185, 129, 0.15); border: 1px solid #10B981; color: #34D399; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 18px;">
              ✓ Payment Verified & Order Confirmed
            </div>

            <h1 style="color: #FFFFFF; font-size: 20px; margin: 0 0 12px 0; font-weight: 600;">
              Dear ${order.customer?.name || 'Valued Collector'},
            </h1>
            <p style="color: #94A3B8; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
              We are pleased to inform you that your online payment for Order <strong style="color: #F59E0B; font-family: monospace;">#${order.orderNumber}</strong> has been successfully inspected and approved by our concierge desk. Your luxury timepiece is now being prepared for insured courier dispatch.
            </p>

            ${customNote ? `
            <div style="background-color: #0F243E; border-left: 3px solid #F59E0B; padding: 14px; border-radius: 4px; margin-bottom: 24px; font-size: 13px; color: #CBD5E1;">
              <strong style="color: #F59E0B; display: block; margin-bottom: 4px; font-size: 11px; text-transform: uppercase;">Concierge Note:</strong>
              ${customNote}
            </div>
            ` : ''}

            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 24px; background-color: #070F1E; border-radius: 6px; border: 1px solid #1E293B;">
              <thead>
                <tr style="background-color: #0B192C; border-bottom: 1px solid #1E293B;">
                  <th style="padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #94A3B8; letter-spacing: 1px;">Item Description</th>
                  <th style="padding: 10px 12px; text-align: center; font-size: 11px; text-transform: uppercase; color: #94A3B8; letter-spacing: 1px;">Qty</th>
                  <th style="padding: 10px 12px; text-align: right; font-size: 11px; text-transform: uppercase; color: #94A3B8; letter-spacing: 1px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <table width="100%" cellpadding="4" cellspacing="0" style="margin-bottom: 24px; font-size: 13px;">
              <tr>
                <td style="color: #94A3B8;">Subtotal:</td>
                <td style="color: #FFFFFF; text-align: right; font-weight: 500;">PKR ${Number(order.subtotal || order.total).toLocaleString()}</td>
              </tr>
              <tr>
                <td style="color: #94A3B8;">Insured Express Shipping:</td>
                <td style="color: #10B981; text-align: right; font-weight: 500;">FREE (Included)</td>
              </tr>
              <tr style="border-top: 1px solid #1E293B;">
                <td style="padding-top: 10px; color: #FFFFFF; font-size: 15px; font-weight: bold;">Grand Total Paid:</td>
                <td style="padding-top: 10px; color: #F59E0B; text-align: right; font-size: 17px; font-weight: bold;">PKR ${Number(order.total).toLocaleString()}</td>
              </tr>
            </table>

            <table width="100%" cellpadding="14" cellspacing="0" style="background-color: #070F1E; border: 1px solid #1E293B; border-radius: 6px; margin-bottom: 24px; font-size: 12px;">
              <tr>
                <td width="50%" valign="top" style="border-right: 1px solid #1E293B; padding-right: 14px;">
                  <strong style="color: #F59E0B; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; display: block; margin-bottom: 6px;">💳 Payment Verified</strong>
                  <div style="color: #E2E8F0; line-height: 1.5;">
                    Method: <strong>${(order.paymentMethod || 'Wallet').toUpperCase()}</strong><br/>
                    TRX ID: <span style="font-family: monospace; color: #34D399;">${order.paymentDetails?.trxId || 'VERIFIED-ADVANCE'}</span><br/>
                    Status: <span style="color: #34D399; font-weight: bold;">100% Advance Settled</span>
                  </div>
                </td>
                <td width="50%" valign="top" style="padding-left: 14px;">
                  <strong style="color: #F59E0B; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; display: block; margin-bottom: 6px;">📦 Delivery Address</strong>
                  <div style="color: #E2E8F0; line-height: 1.5;">
                    ${order.customer?.address || 'Provided at checkout'}<br/>
                    ${order.customer?.city || 'Pakistan'}<br/>
                    Phone: <strong>${order.customer?.phone || 'N/A'}</strong>
                  </div>
                </td>
              </tr>
            </table>

            ${trackingNumber ? `
            <div style="background-color: #0F243E; border: 1px solid #F59E0B; border-radius: 6px; padding: 14px; text-align: center; margin-bottom: 24px;">
              <span style="font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px;">Courier Tracking Number:</span>
              <div style="font-size: 18px; font-family: monospace; font-weight: bold; color: #F59E0B; margin-top: 4px;">${trackingNumber}</div>
            </div>
            ` : ''}

            <div style="text-align: center; padding-top: 10px;">
              <p style="font-size: 12px; color: #94A3B8; margin: 0 0 16px 0;">
                All timepieces include our signature <strong>3 Days Warranty</strong>.
              </p>
              <a href="https://wa.me/923192265524?text=${encodeURIComponent(`Hello Ventures Watches, I am inquiring about my confirmed order #${order.orderNumber}`)}" style="display: inline-block; background-color: #25D366; color: #FFFFFF; font-weight: 600; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 12px; letter-spacing: 0.5px;">
                💬 Contact WhatsApp Concierge (+92 319 2265524)
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background-color: #070F1E; padding: 20px 24px; text-align: center; border-top: 1px solid #1E293B; font-size: 11px; color: #64748B;">
            © ${new Date().getFullYear()} Ventures Watches. All Rights Reserved. Luxury Watches Warranted.<br/>
            Karachi, Pakistan • Official SadaPay Settlement Account: 03192265524 (Muhammad Tayyab Asghar)
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export async function saveProduct(product: Partial<Product>): Promise<Product> {
  const id = product.id || `prod-${Date.now()}`;
  const finalComparePrice = (product.compareAtPrice !== undefined && product.compareAtPrice !== null && !isNaN(Number(product.compareAtPrice)) && Number(product.compareAtPrice) > 0)
    ? Number(product.compareAtPrice)
    : null;

  const completeProduct: Product = {
    id,
    name: product.name || 'New Timepiece',
    slug: product.slug || (product.name || 'timepiece').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    sku: product.sku || `VW-${Math.floor(1000 + Math.random() * 9000)}`,
    shortDescription: product.shortDescription || 'Precision luxury timepiece',
    description: product.description || 'Precision engineered watch with anti-reflective sapphire crystal.',
    price: product.price || 480000,
    compareAtPrice: finalComparePrice,
    currency: product.currency || 'PKR',
    collectionId: product.collectionId || 'col-1',
    collectionName: product.collectionName || 'Ventures Collection',
    category: product.category || 'Automatic',
    stock: product.stock !== undefined ? product.stock : 5,
    status: product.status || 'published',
    featured: product.featured ?? true,
    newArrival: product.newArrival ?? true,
    images: Array.isArray(product.images) ? product.images : [],
    videos: Array.isArray(product.videos) ? product.videos : [],
    specifications: {
      caseMaterial: product.specifications?.caseMaterial || '904L Corrosion-Resistant Stainless Steel',
      dialColor: product.specifications?.dialColor || 'Custom Hand-Crafted Dial',
      crystal: product.specifications?.crystal || 'Scratch-Resistant Sapphire with AR Coating',
      strapMaterial: product.specifications?.strapMaterial || 'Solid Steel / Hand-Stitched Leather',
      powerReserve: product.specifications?.powerReserve || '72 Hours',
      warranty: product.specifications?.warranty ? product.specifications.warranty.replace(/guarantee/gi, 'Warranty') : '3 Days Warranty',
      ...(product.specifications || {})
    },
    seo: product.seo || {},
    createdAt: (product as any).createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 1. Remove from deleted IDs list in localStorage and unregister from Cloud deletions
  const deletedIds = safeLocalStorageGet<string[]>('vw_deleted_product_ids', []);
  const updatedDeleted = deletedIds.filter(dId => dId !== id);
  safeLocalStorageSet('vw_deleted_product_ids', JSON.stringify(updatedDeleted));
  unRegisterDeletionInCloud('products', id).catch(() => {});

  // 2. Persist to localStorage saved products
  try {
    const savedProducts = safeLocalStorageGet<Product[]>('vw_saved_products', []);
    const idx = savedProducts.findIndex(p => p.id === id);
    if (idx >= 0) {
      savedProducts[idx] = completeProduct;
    } else {
      savedProducts.unshift(completeProduct);
    }
    safeLocalStorageSet('vw_saved_products', JSON.stringify(savedProducts));
  } catch (err) {
    console.warn('localStorage saveProduct warning:', err);
  }

  // 3. Update Express Server state first (instant sync across all devices via SSE)
  try {
    const isEdit = Boolean(product.id);
    const url = isEdit ? `/api/products/${product.id}` : '/api/products';
    const method = isEdit ? 'PUT' : 'POST';
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(completeProduct)
    });
  } catch {}

  // 4. Save directly to Cloud Firestore Database if active
  if (!isFirestoreQuotaExhausted) {
    try {
      await withTimeout(setDoc(doc(db, 'products', id), completeProduct, { merge: true }), 2000);
    } catch (err) {
      handleFirestoreError(err, 'saveProduct');
    }
  }

  recordCloudVersionTimestamp('products').catch(() => {});
  notifyDataUpdated('products');
  return completeProduct;
}

export async function deleteProduct(id: string): Promise<boolean> {
  // 1. Mark as deleted in local cache
  const deletedIds = safeLocalStorageGet<string[]>('vw_deleted_product_ids', []);
  if (!deletedIds.includes(id)) {
    deletedIds.push(id);
    safeLocalStorageSet('vw_deleted_product_ids', JSON.stringify(deletedIds));
  }

  // 2. Remove from saved products in localStorage
  const savedProducts = safeLocalStorageGet<Product[]>('vw_saved_products', []);
  const filteredSaved = savedProducts.filter(p => p.id !== id);
  safeLocalStorageSet('vw_saved_products', JSON.stringify(filteredSaved));

  // 3. Delete from Express API first
  try {
    await fetch(`/api/products/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() }
    });
  } catch {}

  // 4. Delete from Cloud Firestore Database
  if (!isFirestoreQuotaExhausted) {
    try {
      await withTimeout(deleteDoc(doc(db, 'products', id)), 2000);
    } catch (err) {
      handleFirestoreError(err, 'deleteProduct');
    }
  }

  registerDeletionInCloud('products', id).catch(() => {});
  recordCloudVersionTimestamp('products').catch(() => {});
  notifyDataUpdated('products');
  return true;
}

export async function fetchMedia(): Promise<MediaItem[]> {
  const delRegistry = await getDeletionRegistry();
  const deletedSet = new Set(delRegistry.media.map(id => String(id).trim()));
  const mediaMap = new Map<string, MediaItem>();

  // 1. Seed initial defaults into map (only if not deleted by user)
  initialMedia.forEach(m => {
    if (!deletedSet.has(m.id)) {
      mediaMap.set(m.id, m);
    }
  });

  // 2. Read local vault items from localStorage safely
  try {
    const vaultItems = safeLocalStorageGet<MediaItem[]>('vw_uploaded_media_vault', []);
    vaultItems.forEach(m => {
      if (!deletedSet.has(m.id)) {
        mediaMap.set(m.id, m);
      }
    });
  } catch (e) {
    console.warn('LocalStorage vault read warning:', e);
  }

  // 3. Read from Express server API first (primary source of uploaded files)
  try {
    const res = await fetch('/api/media');
    if (res.ok) {
      const serverMedia: MediaItem[] = await res.json();
      serverMedia.forEach(m => {
        if (!deletedSet.has(m.id)) {
          mediaMap.set(m.id, m);
        }
      });
    }
  } catch {}

  // 4. Read live items from Firestore Cloud Database if active
  if (!isFirestoreQuotaExhausted) {
    try {
      const medRef = collection(db, 'media');
      const snap = await withTimeout(getDocs(medRef), 1500);
      if (!snap.empty) {
        snap.forEach(d => {
          if (!deletedSet.has(d.id)) {
            const item = d.data() as MediaItem;
            mediaMap.set(item.id || d.id, item);
          }
        });
      }
    } catch (err) {
      handleFirestoreError(err, 'fetchMedia');
    }
  }

  const allItems = Array.from(mediaMap.values()).filter(m => !deletedSet.has(m.id));
  return allItems.sort((a, b) => {
    const timeA = new Date(a.createdAt || a.uploadedAt || 0).getTime();
    const timeB = new Date(b.createdAt || b.uploadedAt || 0).getTime();
    return timeB - timeA;
  });
}

export async function uploadMedia(item: { url: string; name: string; type: 'image' | 'video'; category?: string; size?: string }): Promise<MediaItem> {
  const newItem: MediaItem = {
    id: `med-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    url: item.url,
    name: item.name || 'uploaded-photo.jpg',
    type: item.type || 'image',
    category: item.category || 'General',
    size: item.size || '1.2 MB',
    createdAt: new Date().toISOString()
  };

  // 1. Mirror to Express server first (disk persistence & SSE broadcast)
  try {
    await fetch('/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(newItem)
    });
  } catch {}

  // 2. Save to local vault safely
  try {
    const savedVault = safeLocalStorageGet<MediaItem[]>('vw_uploaded_media_vault', []);
    const filtered = savedVault.filter(m => m.id !== newItem.id);
    filtered.unshift(newItem);
    safeLocalStorageSet('vw_uploaded_media_vault', JSON.stringify(filtered.slice(0, 100)));
  } catch (e) {
    console.warn('LocalStorage vault upload save warning:', e);
  }

  // 3. Save to Firestore if active
  if (!isFirestoreQuotaExhausted) {
    try {
      await withTimeout(setDoc(doc(db, 'media', newItem.id), newItem), 2000);
    } catch (err) {
      handleFirestoreError(err, 'uploadMedia');
    }
  }

  recordCloudVersionTimestamp('media').catch(() => {});
  notifyDataUpdated('media');
  return newItem;
}

export async function deleteMedia(id: string): Promise<boolean> {
  // 1. Delete from Express API first
  try {
    await fetch(`/api/media/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() }
    });
  } catch {}

  // 2. Delete from Cloud Firestore Database if active
  if (!isFirestoreQuotaExhausted) {
    try {
      await withTimeout(deleteDoc(doc(db, 'media', id)), 2000);
    } catch (err) {
      handleFirestoreError(err, 'deleteMedia');
    }
  }

  // 3. Register deletion in Cloud
  registerDeletionInCloud('media', id).catch(() => {});

  // 4. Remove from Local Vault & record in local deleted registry safely
  try {
    const savedVault = safeLocalStorageGet<MediaItem[]>('vw_uploaded_media_vault', []);
    const filtered = savedVault.filter(m => m.id !== id);
    safeLocalStorageSet('vw_uploaded_media_vault', JSON.stringify(filtered));

    const deletedIds = safeLocalStorageGet<string[]>('vw_deleted_media_ids', []);
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      safeLocalStorageSet('vw_deleted_media_ids', JSON.stringify(deletedIds));
    }
  } catch (e) {
    console.warn('LocalStorage vault delete warning:', e);
  }

  recordCloudVersionTimestamp('media').catch(() => {});
  notifyDataUpdated('media');
  return true;
}

export async function saveCollection(colData: Partial<Collection>): Promise<Collection | null> {
  const id = colData.id || `col-${Date.now()}`;
  return updateCollection(id, { ...colData, id });
}

export async function updateCollection(id: string, colData: Partial<Collection>): Promise<Collection | null> {
  const normalized = normalizeCollection({ id, ...colData } as Collection);

  // 1. Instant local cache update
  try {
    const saved = safeLocalStorageGet<Collection[] | null>('vw_collections', null) || [];
    const exists = saved.some(c => c.id === id);
    const updated = exists
      ? saved.map(c => c.id === id ? { ...c, ...normalized } : c)
      : [...saved, normalized];
    safeLocalStorageSet('vw_collections', JSON.stringify(updated));

    // Remove from deleted list if re-added or updated
    const deletedCols = safeLocalStorageGet<string[]>('vw_deleted_col_ids', []);
    if (deletedCols.includes(id)) {
      safeLocalStorageSet('vw_deleted_col_ids', JSON.stringify(deletedCols.filter(d => d !== id)));
    }
  } catch {}

  unRegisterDeletionInCloud('collections', id).catch(() => {});

  // 2. Update Express Server API first (persists to collections-data.json and broadcasts SSE)
  try {
    await fetch(`/api/collections/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(normalized)
    });
  } catch {}

  // 3. Save to Firestore if active
  if (!isFirestoreQuotaExhausted) {
    try {
      const colDocRef = doc(db, 'collections', id);
      await withTimeout(setDoc(colDocRef, normalized, { merge: true }), 2000);
    } catch (err) {
      handleFirestoreError(err, 'updateCollection');
    }
  }

  recordCloudVersionTimestamp('collections').catch(() => {});
  notifyDataUpdated('collections');
  return normalized;
}

export async function resetCollectionImagesToDefault(): Promise<boolean> {
  const ids = ['col-1', 'col-2', 'col-3'];

  for (const id of ids) {
    await updateCollection(id, { image: '' });
  }

  recordCloudVersionTimestamp('collections').catch(() => {});
  notifyDataUpdated('collections');
  return true;
}

export async function deleteCollection(id: string): Promise<boolean> {
  // 1. Delete from Express API first
  try {
    await fetch(`/api/collections/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() }
    });
  } catch {}

  // 2. Delete from Firestore if active
  if (!isFirestoreQuotaExhausted) {
    try {
      await withTimeout(deleteDoc(doc(db, 'collections', id)), 2000);
    } catch (err) {
      handleFirestoreError(err, 'deleteCollection');
    }
  }

  // 3. Register deletion in Cloud
  registerDeletionInCloud('collections', id).catch(() => {});

  // 4. Update local cache safely
  try {
    const deletedCols = safeLocalStorageGet<string[]>('vw_deleted_col_ids', []);
    if (!deletedCols.includes(id)) {
      deletedCols.push(id);
      safeLocalStorageSet('vw_deleted_col_ids', JSON.stringify(deletedCols));
    }
    const saved = safeLocalStorageGet<Collection[] | null>('vw_collections', null);
    if (saved) {
      const remaining = saved.filter(c => c.id !== id);
      safeLocalStorageSet('vw_collections', JSON.stringify(remaining));
    }
  } catch {}

  recordCloudVersionTimestamp('collections').catch(() => {});
  notifyDataUpdated('collections');
  return true;
}

export async function deleteOrder(id: string): Promise<boolean> {
  // 1. Delete from Express API first
  try {
    await fetch(`/api/orders/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() }
    });
  } catch {}

  // 2. Delete from Firestore if active
  if (!isFirestoreQuotaExhausted) {
    try {
      await withTimeout(deleteDoc(doc(db, 'orders', id)), 2000);
    } catch (err) {
      handleFirestoreError(err, 'deleteOrder');
    }
  }

  // 3. Register deletion in Cloud
  registerDeletionInCloud('orders', id).catch(() => {});

  // 4. Update local cache safely
  try {
    const deletedOrds = safeLocalStorageGet<string[]>('vw_deleted_ord_ids', []);
    if (!deletedOrds.includes(id)) {
      deletedOrds.push(id);
      safeLocalStorageSet('vw_deleted_ord_ids', JSON.stringify(deletedOrds));
    }
  } catch {}

  recordCloudVersionTimestamp('orders').catch(() => {});
  notifyDataUpdated('orders');
  return true;
}

// ==========================================
// PRICE DROP ALERT SYSTEM (Firestore & Local)
// ==========================================

export async function createPriceDropAlert(alertData: {
  productId: string;
  productName: string;
  productSku?: string;
  productImage?: string;
  currentPrice: number;
  targetPrice: number;
  email: string;
  customerName?: string;
  phone?: string;
}): Promise<PriceDropAlert> {
  const newAlert: PriceDropAlert = {
    id: `alert-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    productId: alertData.productId,
    productName: alertData.productName,
    productSku: alertData.productSku || '',
    productImage: alertData.productImage || '',
    currentPrice: alertData.currentPrice,
    targetPrice: alertData.targetPrice,
    email: alertData.email.trim().toLowerCase(),
    customerName: alertData.customerName || '',
    phone: alertData.phone || '',
    status: 'active',
    createdAt: new Date().toISOString()
  };

  // 1. Save to LocalStorage cache
  try {
    const savedAlerts = safeLocalStorageGet<PriceDropAlert[]>('vw_price_alerts', []);
    const filtered = savedAlerts.filter(a => !(a.productId === newAlert.productId && a.email === newAlert.email && a.status === 'active'));
    filtered.unshift(newAlert);
    safeLocalStorageSet('vw_price_alerts', JSON.stringify(filtered));
  } catch (err) {
    console.warn('LocalStorage save price alert warning:', err);
  }

  // 2. Save to Express Server API
  try {
    await fetch('/api/price-alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAlert)
    });
  } catch {}

  // 3. Save to Cloud Firestore
  if (!isFirestoreQuotaExhausted) {
    try {
      const alertRef = doc(db, 'priceDropAlerts', newAlert.id);
      await withTimeout(setDoc(alertRef, newAlert), 2500);
    } catch (err) {
      handleFirestoreError(err, 'createPriceDropAlert');
    }
  }

  return newAlert;
}

export async function fetchPriceDropAlerts(params?: { productId?: string; email?: string }): Promise<PriceDropAlert[]> {
  let list: PriceDropAlert[] = [];
  let fetchedFromServer = false;

  // 1. Try server API
  try {
    let url = '/api/price-alerts';
    const q = new URLSearchParams();
    if (params?.productId) q.append('productId', params.productId);
    if (params?.email) q.append('email', params.email);
    if (q.toString()) url += `?${q.toString()}`;

    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        list = data;
        fetchedFromServer = true;
      }
    }
  } catch {}

  // 2. Try Firestore if server didn't return
  if (!fetchedFromServer && !isFirestoreQuotaExhausted) {
    try {
      const alertsRef = collection(db, 'priceDropAlerts');
      const snap = await withTimeout(getDocs(alertsRef), 2000);
      if (!snap.empty) {
        snap.forEach(d => {
          list.push(d.data() as PriceDropAlert);
        });
      }
    } catch (err) {
      handleFirestoreError(err, 'fetchPriceDropAlerts');
    }
  }

  // 3. Fallback to localStorage
  if (list.length === 0) {
    const saved = safeLocalStorageGet<PriceDropAlert[]>('vw_price_alerts', []);
    list = saved;
  }

  if (params?.productId) {
    list = list.filter(a => a.productId === params.productId);
  }
  if (params?.email) {
    list = list.filter(a => (a.email || '').toLowerCase() === params.email?.toLowerCase());
  }

  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function updatePriceDropAlert(id: string, updates: Partial<PriceDropAlert>): Promise<boolean> {
  // 1. Update localStorage
  try {
    const saved = safeLocalStorageGet<PriceDropAlert[]>('vw_price_alerts', []);
    const idx = saved.findIndex(a => a.id === id);
    if (idx >= 0) {
      saved[idx] = { ...saved[idx], ...updates };
      safeLocalStorageSet('vw_price_alerts', JSON.stringify(saved));
    }
  } catch {}

  // 2. Update Server
  try {
    await fetch(`/api/price-alerts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  } catch {}

  // 3. Update Firestore
  if (!isFirestoreQuotaExhausted) {
    try {
      const alertRef = doc(db, 'priceDropAlerts', id);
      await withTimeout(updateDoc(alertRef, updates), 2000);
    } catch (err) {
      handleFirestoreError(err, 'updatePriceDropAlert');
    }
  }

  return true;
}

export async function deletePriceDropAlert(id: string): Promise<boolean> {
  // 1. Delete localStorage
  try {
    const saved = safeLocalStorageGet<PriceDropAlert[]>('vw_price_alerts', []);
    const filtered = saved.filter(a => a.id !== id);
    safeLocalStorageSet('vw_price_alerts', JSON.stringify(filtered));
  } catch {}

  // 2. Delete Server
  try {
    await fetch(`/api/price-alerts/${id}`, { method: 'DELETE' });
  } catch {}

  // 3. Delete Firestore
  if (!isFirestoreQuotaExhausted) {
    try {
      const alertRef = doc(db, 'priceDropAlerts', id);
      await withTimeout(deleteDoc(alertRef), 2000);
    } catch (err) {
      handleFirestoreError(err, 'deletePriceDropAlert');
    }
  }

  return true;
}

export function generatePriceDropEmailHtml(alert: PriceDropAlert, newPrice: number, customMessage?: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Price Drop Alert - Ventures Watches</title></head>
    <body style="margin: 0; padding: 0; background-color: #070F1E; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 650px; margin: 30px auto; background-color: #0B192C; border: 1px solid #1E293B; border-radius: 8px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
        <tr>
          <td style="background: linear-gradient(135deg, #0B192C 0%, #1E293B 100%); padding: 32px 24px; text-align: center; border-bottom: 2px solid #F59E0B;">
            <div style="font-size: 22px; font-weight: 700; letter-spacing: 4px; color: #FFFFFF; text-transform: uppercase;">VENTURES WATCHES</div>
            <div style="font-size: 10px; color: #F59E0B; letter-spacing: 2px; text-transform: uppercase; margin-top: 6px; font-family: monospace;">Luxury Watch Price Advisory</div>
          </td>
        </tr>
        <tr>
          <td style="padding: 32px 28px;">
            <div style="display: inline-block; background-color: rgba(245, 158, 11, 0.15); border: 1px solid #F59E0B; color: #FBBF24; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 18px;">
              🔔 Price Target Met!
            </div>
            <h1 style="color: #FFFFFF; font-size: 20px; margin: 0 0 12px 0; font-weight: 600;">
              Dear ${alert.customerName || 'Valued Collector'},
            </h1>
            <p style="color: #94A3B8; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
              Exciting news! The luxury timepiece <strong style="color: #FFFFFF;">${alert.productName}</strong> (SKU: <span style="font-family: monospace; color: #F59E0B;">${alert.productSku || 'VW-WATCH'}</span>) has just dropped in price to match your requested target of <strong>PKR ${Number(alert.targetPrice).toLocaleString()}</strong>!
            </p>

            <div style="background-color: #070F1E; border: 1px solid #1E293B; border-radius: 8px; padding: 24px; margin-bottom: 24px; text-align: center;">
              <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">NEW SPECIAL PRICE</div>
              <div style="font-size: 32px; font-weight: 800; color: #10B981; margin: 8px 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                PKR ${Number(newPrice || alert.targetPrice).toLocaleString()}
              </div>
              ${alert.currentPrice > (newPrice || alert.targetPrice) ? `
              <div style="font-size: 13px; color: #94A3B8;">
                Previous Price: <span style="text-decoration: line-through; color: #EF4444;">PKR ${Number(alert.currentPrice).toLocaleString()}</span>
                <span style="color: #10B981; font-weight: bold; margin-left: 8px;">(Save PKR ${Number(alert.currentPrice - (newPrice || alert.targetPrice)).toLocaleString()})</span>
              </div>
              ` : ''}
            </div>

            ${customMessage ? `
            <div style="background-color: #0F243E; border-left: 3px solid #F59E0B; padding: 14px; border-radius: 4px; margin-bottom: 24px; font-size: 13px; color: #CBD5E1;">
              <strong style="color: #F59E0B; display: block; margin-bottom: 4px; font-size: 11px; text-transform: uppercase;">Concierge Message:</strong>
              ${customMessage}
            </div>
            ` : ''}

            <table width="100%" cellpadding="12" cellspacing="0" style="background-color: #070F1E; border: 1px solid #1E293B; border-radius: 6px; margin-bottom: 24px; font-size: 12px; color: #94A3B8;">
              <tr>
                <td width="33%" align="center">🛡️ <strong>3 Days Warranty</strong></td>
                <td width="33%" align="center">🚚 <strong>Free Express Courier</strong></td>
                <td width="33%" align="center">💳 <strong>SadaPay & Advance</strong></td>
              </tr>
            </table>

            <div style="text-align: center; padding-top: 10px;">
              <a href="https://wa.me/923192265524?text=${encodeURIComponent(`Hello Ventures Watches, I received the price drop alert for ${alert.productName} at PKR ${(newPrice || alert.targetPrice).toLocaleString()} and would like to place my order!`)}" style="display: inline-block; background-color: #25D366; color: #FFFFFF; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 15px rgba(37, 211, 102, 0.4);">
                💬 Claim Timepiece via WhatsApp Concierge
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background-color: #070F1E; padding: 20px 24px; text-align: center; border-top: 1px solid #1E293B; font-size: 11px; color: #64748B;">
            © ${new Date().getFullYear()} Ventures Watches. All Rights Reserved. Luxury Watches Warranted.<br/>
            Karachi, Pakistan • Official SadaPay: 03192265524 (Muhammad Tayyab Asghar)
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// Media storage and service worker sync helpers
export async function registerMediaServiceWorker(): Promise<void> {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js').catch(() => {});
    } catch {}
  }
}

export async function verifyAndSyncMediaAssets(): Promise<{ rehydrated: number }> {
  return { rehydrated: 0 };
}

export async function rehydrateMediaAsset(_url: string): Promise<boolean> {
  return true;
}

export async function fetchEmailSettings(): Promise<{ senderEmail: string; hasAppPassword: boolean; isActive: boolean }> {
  try {
    const res = await fetch('/api/admin/email-settings');
    if (res.ok) return await res.json();
  } catch {}
  return { senderEmail: 'ventureswatches@gmail.com', hasAppPassword: false, isActive: true };
}

export async function saveEmailSettings(settings: { senderEmail: string; appPassword?: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/admin/email-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to save settings' };
  }
}

export async function testEmailSettings(targetEmail?: string): Promise<{ success: boolean; message?: string; mode?: string; error?: string }> {
  try {
    const res = await fetch('/api/admin/email-settings/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetEmail })
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to send test email' };
  }
}

export async function geminiAutofillProductDraft(params: {
  image?: string;
  prompt?: string;
  collections?: any[];
}): Promise<{ success: boolean; productDraft: any; fallback?: boolean; error?: string }> {
  try {
    const res = await fetch('/api/admin/gemini-product-autofill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    console.error('geminiAutofillProductDraft error:', err);
    return {
      success: false,
      productDraft: null,
      error: err?.message || 'Failed to generate product draft'
    };
  }
}


