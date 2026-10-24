import { initializeApp, getApps } from "firebase/app";
import {
  initializeFirestore,
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch
} from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import fs from "fs";
import path from "path";

// Read Firebase config safely for Node ESM / CJS / tsx
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);
let isServerAuthenticated = false;

export async function ensureServerAuth() {
  if (isServerAuthenticated && auth.currentUser) return;
  const adminEmail = process.env.ADMIN_EMAIL || "admin@ventureswatches.com";
  const adminPass = process.env.ADMIN_PASSWORD || "TayyabAsghar@262";
  try {
    await signInWithEmailAndPassword(auth, adminEmail, adminPass);
    isServerAuthenticated = true;
  } catch (e: any) {
    // Suppress warning if email/password provider is not yet enabled in Firebase Console
    if (e?.code !== "auth/operation-not-allowed") {
      console.warn(`[SERVER FIREBASE AUTH] Sign-in notice (${e?.code || e?.message})`);
    }
  }
}

const CHUNK_SIZE = 450 * 1024; // 450KB binary = ~600KB Base64 (comfortably under 1MB Firestore document limit)
const uploadsDir = path.join(process.cwd(), "public", "uploads");

export interface MediaBlobMetadata {
  filename: string;
  contentType: string;
  size: number;
  totalChunks: number;
  createdAt: string;
}

/**
 * Persists a media file (video or image) permanently into Firestore in atomic batches
 */
export async function saveMediaBlob(
  filename: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const cleanFilename = path.basename(filename);
  const totalChunks = Math.max(1, Math.ceil(buffer.length / CHUNK_SIZE));

  const meta: MediaBlobMetadata = {
    filename: cleanFilename,
    contentType,
    size: buffer.length,
    totalChunks,
    createdAt: new Date().toISOString()
  };

  // 1. Save metadata document first
  await setDoc(doc(db, "media_files", cleanFilename), meta);

  // 2. Commit chunks in batches of 5 using writeBatch (single network roundtrip per batch)
  const BATCH_CHUNK_COUNT = 5;
  for (let b = 0; b < totalChunks; b += BATCH_CHUNK_COUNT) {
    const endChunk = Math.min(totalChunks, b + BATCH_CHUNK_COUNT);
    let attempts = 0;
    let committed = false;

    while (attempts < 3 && !committed) {
      attempts++;
      try {
        const batch = writeBatch(db);
        for (let i = b; i < endChunk; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(buffer.length, start + CHUNK_SIZE);
          const chunkBuffer = buffer.subarray(start, end);
          const base64Data = chunkBuffer.toString("base64");

          const chunkDocRef = doc(db, "media_chunks", `${cleanFilename}_chunk_${i}`);
          batch.set(chunkDocRef, {
            filename: cleanFilename,
            chunkIndex: i,
            totalChunks,
            data: base64Data
          });
        }
        await batch.commit();
        committed = true;
      } catch (batchErr) {
        console.warn(`[BATCH] Error committing chunks ${b}..${endChunk - 1} for ${cleanFilename} (attempt ${attempts}):`, batchErr);
        if (attempts >= 3) {
          // Fallback to sequential setDoc if batch failed
          for (let i = b; i < endChunk; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(buffer.length, start + CHUNK_SIZE);
            const chunkBuffer = buffer.subarray(start, end);
            const base64Data = chunkBuffer.toString("base64");
            const chunkDocRef = doc(db, "media_chunks", `${cleanFilename}_chunk_${i}`);
            await setDoc(chunkDocRef, {
              filename: cleanFilename,
              chunkIndex: i,
              totalChunks,
              data: base64Data
            });
          }
          committed = true;
        } else {
          await new Promise(r => setTimeout(r, 600 * attempts));
        }
      }
    }
  }

  // Also cache locally on disk
  try {
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, cleanFilename), buffer);
  } catch {}

  return `/uploads/${cleanFilename}`;
}

/**
 * Retrieves a media file from Firestore chunks and writes to local disk cache
 */
export async function getMediaBlob(
  filename: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const cleanFilename = path.basename(filename);

  try {
    const metaRef = doc(db, "media_files", cleanFilename);
    const metaSnap = await getDoc(metaRef);

    if (!metaSnap.exists()) {
      return null;
    }

    const meta = metaSnap.data() as MediaBlobMetadata;
    const totalChunks = meta.totalChunks || 1;

    // Fetch all chunks concurrently in parallel for blazing speed
    const chunkPromises: Promise<any>[] = [];
    for (let i = 0; i < totalChunks; i++) {
      const chunkRef = doc(db, "media_chunks", `${cleanFilename}_chunk_${i}`);
      chunkPromises.push(getDoc(chunkRef));
    }

    const chunkSnaps = await Promise.all(chunkPromises);
    const chunkBuffers: (Buffer | null)[] = new Array(totalChunks).fill(null);

    for (let i = 0; i < chunkSnaps.length; i++) {
      const snap = chunkSnaps[i];
      if (snap && snap.exists()) {
        const chunkData = snap.data();
        const idx = typeof chunkData.chunkIndex === 'number' ? chunkData.chunkIndex : i;
        chunkBuffers[idx] = Buffer.from(chunkData.data, "base64");
      } else {
        console.warn(`[HYDRATE] Missing chunk ${i} for ${cleanFilename}`);
      }
    }

    const validBuffers = chunkBuffers.filter((b): b is Buffer => b !== null);
    if (validBuffers.length === 0 || validBuffers.length !== totalChunks) {
      console.warn(`[HYDRATE] Incomplete chunks for ${cleanFilename} (${validBuffers.length}/${totalChunks})`);
      if (validBuffers.length === 0) return null;
    }

    const fullBuffer = Buffer.concat(validBuffers);

    // Save to local disk cache so subsequent requests never need Firestore fetch
    try {
      const filePath = path.join(uploadsDir, cleanFilename);
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      fs.writeFileSync(filePath, fullBuffer);

      // Also cache in dist/uploads if dist exists
      const distUploads = path.join(process.cwd(), "dist", "uploads");
      if (fs.existsSync(distUploads)) {
        fs.writeFileSync(path.join(distUploads, cleanFilename), fullBuffer);
      }
    } catch (diskErr) {
      console.warn("Could not write hydrated file to disk:", diskErr);
    }

    return {
      buffer: fullBuffer,
      contentType: meta.contentType || "application/octet-stream"
    };
  } catch (err) {
    console.error(`Error retrieving media blob ${cleanFilename}:`, err);
    return null;
  }
}

/**
 * Synchronize full dataset from Firestore on server startup
 */
export async function syncAllDataFromFirestore(): Promise<{
  products: any[] | null;
  collections: any[] | null;
  cms: any | null;
  media: any[] | null;
  orders: any[] | null;
  deletions: any | null;
}> {
  try {
    const [prodSnap, colSnap, cmsSnap, medSnap, ordSnap, delSnap] = await Promise.all([
      getDocs(collection(db, "products")).catch(() => null),
      getDocs(collection(db, "collections")).catch(() => null),
      getDoc(doc(db, "cms", "main")).catch(() => null),
      getDocs(collection(db, "media")).catch(() => null),
      getDocs(collection(db, "orders")).catch(() => null),
      getDoc(doc(db, "system", "deletions")).catch(() => null)
    ]);

    const products = prodSnap && !prodSnap.empty
      ? prodSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      : null;

    const collections = colSnap && !colSnap.empty
      ? colSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      : null;

    const cms = cmsSnap && cmsSnap.exists()
      ? cmsSnap.data()
      : null;

    const media = medSnap && !medSnap.empty
      ? medSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      : null;

    const orders = ordSnap && !ordSnap.empty
      ? ordSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      : null;

    const deletions = delSnap && delSnap.exists()
      ? delSnap.data()
      : null;

    return { products, collections, cms, media, orders, deletions };
  } catch (err) {
    console.error("Firestore sync error on boot:", err);
    return { products: null, collections: null, cms: null, media: null, orders: null, deletions: null };
  }
}

// Single-entity persistence helpers
export async function persistProductToCloud(product: any) {
  try {
    await ensureServerAuth().catch(() => {});
    if (product && product.id) {
      const dataToPersist = {
        ...product,
        compareAtPrice: (product.compareAtPrice !== undefined && product.compareAtPrice !== null && !isNaN(Number(product.compareAtPrice)) && Number(product.compareAtPrice) > 0)
          ? Number(product.compareAtPrice)
          : null
      };
      await setDoc(doc(db, "products", product.id), dataToPersist, { merge: true });
    }
  } catch (e) {
    console.warn("persistProductToCloud error:", e);
  }
}

export async function deleteProductFromCloud(productId: string) {
  try {
    await ensureServerAuth().catch(() => {});
    await deleteDoc(doc(db, "products", productId));
    const delDocRef = doc(db, "system", "deletions");
    const snap = await getDoc(delDocRef);
    const existing = snap.exists() ? snap.data() : {};
    const prods = Array.isArray(existing.products) ? existing.products : [];
    if (!prods.includes(productId)) {
      prods.push(productId);
      await setDoc(delDocRef, { products: prods }, { merge: true });
    }
  } catch (e) {
    console.warn("deleteProductFromCloud error:", e);
  }
}

export async function persistCMSToCloud(cms: any) {
  try {
    await ensureServerAuth().catch(() => {});
    await setDoc(doc(db, "cms", "main"), cms, { merge: true });
  } catch (e) {
    console.warn("persistCMSToCloud error:", e);
  }
}

export async function persistCollectionToCloud(collectionItem: any) {
  try {
    await ensureServerAuth().catch(() => {});
    if (collectionItem && collectionItem.id) {
      await setDoc(doc(db, "collections", collectionItem.id), collectionItem, { merge: true });
    }
  } catch (e) {
    console.warn("persistCollectionToCloud error:", e);
  }
}

export async function deleteCollectionFromCloud(id: string) {
  try {
    await ensureServerAuth().catch(() => {});
    if (id) {
      await deleteDoc(doc(db, "collections", id));
    }
  } catch (e) {
    console.warn("deleteCollectionFromCloud error:", e);
  }
}

export async function persistOrderToCloud(order: any) {
  try {
    await ensureServerAuth().catch(() => {});
    if (order && order.id) {
      await setDoc(doc(db, "orders", order.id), order, { merge: true });
    }
  } catch (e) {
    console.warn("persistOrderToCloud error:", e);
  }
}

export async function persistMediaItemToCloud(mediaItem: any) {
  try {
    await ensureServerAuth().catch(() => {});
    if (mediaItem && mediaItem.id) {
      await setDoc(doc(db, "media", mediaItem.id), mediaItem, { merge: true });
    }
  } catch (e) {
    console.warn("persistMediaItemToCloud error:", e);
  }
}

export async function deleteMediaItemFromCloud(mediaId: string) {
  try {
    await ensureServerAuth().catch(() => {});
    await deleteDoc(doc(db, "media", mediaId));
    const delDocRef = doc(db, "system", "deletions");
    const snap = await getDoc(delDocRef);
    const existing = snap.exists() ? snap.data() : {};
    const media = Array.isArray(existing.media) ? existing.media : [];
    if (!media.includes(mediaId)) {
      media.push(mediaId);
      await setDoc(delDocRef, { media }, { merge: true });
    }
  } catch (e) {
    console.warn("deleteMediaItemFromCloud error:", e);
  }
}

export async function deleteOrderFromCloud(orderId: string) {
  try {
    await ensureServerAuth().catch(() => {});
    await deleteDoc(doc(db, "orders", orderId));
    const delDocRef = doc(db, "system", "deletions");
    const snap = await getDoc(delDocRef);
    const existing = snap.exists() ? snap.data() : {};
    const orders = Array.isArray(existing.orders) ? existing.orders : [];
    if (!orders.includes(orderId)) {
      orders.push(orderId);
      await setDoc(delDocRef, { orders }, { merge: true });
    }
  } catch (e) {
    console.warn("deleteOrderFromCloud error:", e);
  }
}

export async function persistDeletionsToCloud(deletions: any) {
  try {
    await ensureServerAuth().catch(() => {});
    await setDoc(doc(db, "system", "deletions"), deletions, { merge: true });
  } catch (e) {
    console.warn("persistDeletionsToCloud error:", e);
  }
}

/**
 * Ensures any uploaded file present on disk is also backed up in Firestore chunks
 */
export async function syncMissingDiskFilesToFirestore(): Promise<void> {
  try {
    if (!fs.existsSync(uploadsDir)) return;
    const files = fs.readdirSync(uploadsDir);
    for (const f of files) {
      if (f.endsWith(".json") || f.startsWith(".")) continue;
      const metaRef = doc(db, "media_files", f);
      const metaSnap = await getDoc(metaRef);
      if (!metaSnap.exists()) {
        const fullPath = path.join(uploadsDir, f);
        const buf = fs.readFileSync(fullPath);
        const ext = path.extname(f).toLowerCase();
        const isVid = ext === ".mp4" || ext === ".webm" || ext === ".mov";
        const mime = isVid ? "video/mp4" : ext === ".png" ? "image/png" : "image/jpeg";
        console.log(`[SYNC-DISK] Persisting missing media file ${f} (${buf.length} bytes) to Firestore...`);
        await saveMediaBlob(f, buf, mime);
      }
    }
  } catch (err) {
    console.warn("[SYNC-DISK] Disk files sync warning:", err);
  }
}

export { db };
