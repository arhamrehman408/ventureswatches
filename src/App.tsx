import React, { useState, useEffect } from 'react';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { db, auth } from './lib/firebase';
import { Product, Collection, CartItem, Order, CMSData, MediaItem, User } from './types';
import { initialProducts, initialCollections, initialCMSData, initialMedia } from './data/mockData';
import {
  fetchProducts,
  fetchCollections,
  fetchCMSData,
  fetchOrders,
  fetchMedia,
  fetchCMSAndMediaBatched,
  fetchAllInitialDataBatched,
  getDeletionRegistry,
  normalizeProduct,
  normalizeCollection,
  checkAndSyncVersionTimestamps,
  getLocalVersionTimestamps,
  setLocalVersionTimestamp,
  setFirestoreQuotaExhausted,
  isFirestoreActive,
  notifyDataUpdated,
  getAdminToken
} from './services/api';

export function formatCollectionTitle(nameOrId: string): string {
  if (!nameOrId) return nameOrId;
  const lower = nameOrId.toLowerCase().trim();
  if (lower === 'col-1' || lower === 'ventures automatic' || lower === 'ventures signature') {
    return 'Original Watches';
  }
  if (lower === 'col-2' || lower === 'ventures chrono' || lower === 'ventures sport') {
    return 'Clone Watches';
  }
  if (lower === 'col-3' || lower === 'ventures classic') {
    return 'Copy Watches';
  }
  if (lower === 'col-4') {
    return 'Pouches & Accessories';
  }
  return nameOrId;
}
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { SearchOverlay } from './components/SearchOverlay';
import { CheckoutModal } from './components/CheckoutModal';
import { EditorialStory } from './components/EditorialStory';
import { CraftsmanshipSection } from './components/CraftsmanshipSection';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { Chatbot } from './components/Chatbot';
import { SEO } from './components/SEO';
import {
  Filter, Sparkles, Shield, Mail, Phone, MapPin, CheckCircle, ArrowRight, Clock, Award, MessageCircle, Instagram, Facebook, ExternalLink, CheckCircle2, AlertTriangle, X
} from 'lucide-react';

export default function App() {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const deletedIds: string[] = JSON.parse(localStorage.getItem('vw_deleted_product_ids') || '[]');
      const delSet = new Set(deletedIds.map(id => String(id).trim()));
      const saved = localStorage.getItem('vw_saved_products');
      if (saved !== null) {
        const parsed: Product[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(p => !delSet.has(String(p.id).trim())).map(normalizeProduct);
        }
      }
      return initialProducts.filter(p => !delSet.has(String(p.id).trim())).map(normalizeProduct);
    } catch {
      return initialProducts.map(normalizeProduct);
    }
  });

  const [collections, setCollections] = useState<Collection[]>(() => {
    try {
      const deletedIds: string[] = JSON.parse(localStorage.getItem('vw_deleted_col_ids') || '[]');
      const delSet = new Set(deletedIds.map(id => String(id).trim()));
      const saved = localStorage.getItem('vw_collections');
      if (saved !== null) {
        const parsed: Collection[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
            .filter(c => !delSet.has(String(c.id).trim()))
            .map(normalizeCollection)
            .sort((a, b) => {
              const orderA = a.id === 'col-1' ? 1 : a.id === 'col-2' ? 2 : a.id === 'col-3' ? 3 : a.id === 'col-4' ? 4 : 99;
              const orderB = b.id === 'col-1' ? 1 : b.id === 'col-2' ? 2 : b.id === 'col-3' ? 3 : b.id === 'col-4' ? 4 : 99;
              return orderA - orderB;
            });
        }
      }
      return initialCollections
        .filter(c => !delSet.has(String(c.id).trim()))
        .map(normalizeCollection)
        .sort((a, b) => {
          const orderA = a.id === 'col-1' ? 1 : a.id === 'col-2' ? 2 : a.id === 'col-3' ? 3 : a.id === 'col-4' ? 4 : 99;
          const orderB = b.id === 'col-1' ? 1 : b.id === 'col-2' ? 2 : b.id === 'col-3' ? 3 : b.id === 'col-4' ? 4 : 99;
          return orderA - orderB;
        });
    } catch {
      return initialCollections.map(normalizeCollection);
    }
  });

  const [cmsData, setCmsData] = useState<CMSData>(() => {
    try {
      const saved = localStorage.getItem('vw_cms_data');
      const customVideo = localStorage.getItem('vw_custom_hero_video_url');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (customVideo && customVideo.trim().length > 0) {
          parsed.heroVideoUrl = customVideo.trim();
        }
        return { ...initialCMSData, ...parsed };
      }
      if (customVideo && customVideo.trim().length > 0) {
        return { ...initialCMSData, heroVideoUrl: customVideo.trim() };
      }
    } catch {}
    return initialCMSData;
  });

  const [orders, setOrders] = useState<Order[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(() => {
    try {
      const saved = localStorage.getItem('vw_uploaded_media_vault');
      const deletedIds: string[] = JSON.parse(localStorage.getItem('vw_deleted_media_ids') || '[]');
      const delSet = new Set(deletedIds.map(id => String(id).trim()));
      if (saved) {
        const parsed: MediaItem[] = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          return parsed.filter(m => !delSet.has(String(m.id).trim()));
        }
      }
    } catch {}
    return initialMedia;
  });
  const [customers, setCustomers] = useState<any[]>([]);

  // Local storage persisted state
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('vw_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('vw_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Navigation and UI state
  const [activeSection, setActiveSection] = useState<string>('home');
  const [selectedCollectionFilter, setSelectedCollectionFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'featured' | 'low-to-high' | 'high-to-low'>('featured');

  // Modal controls
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [chatbotInitialMode, setChatbotInitialMode] = useState<'chat' | 'call'>('chat');

  // Stock Toast Notification State
  const [stockNotification, setStockNotification] = useState<{ message: string; title?: string } | null>(null);

  const triggerStockNotification = (message: string, title: string = 'Stock Limit Reached') => {
    setStockNotification({ message, title });
    setTimeout(() => {
      setStockNotification(null);
    }, 4500);
  };

  const [contactSubmitted, setContactSubmitted] = useState(false);

  // Load initial data from API and Cloud Database with a single batched query to prevent race conditions
  const loadInitialData = async () => {
    try {
      const { products: prods, collections: cols, cms, media: med, orders: ords } = await fetchAllInitialDataBatched();

      // Apply simultaneous atomic state updates across all data stores
      if (Array.isArray(prods)) {
        setProducts(prods);
        try { localStorage.setItem('vw_saved_products', JSON.stringify(prods)); } catch {}
      }
      if (Array.isArray(cols) && cols.length > 0) {
        setCollections(cols);
        try { localStorage.setItem('vw_collections', JSON.stringify(cols)); } catch {}
      }
      if (cms) {
        setCmsData(cms);
        try { localStorage.setItem('vw_cms_data', JSON.stringify(cms)); } catch {}
      }
      if (Array.isArray(med)) {
        setMediaItems(med);
        try { localStorage.setItem('vw_uploaded_media_vault', JSON.stringify(med)); } catch {}
      }
      if (ords) {
        setOrders(ords);
      }
    } catch (err) {
      console.warn('Batched loadInitialData error:', err);
    }
  };

  useEffect(() => {
    // 1. Initial version-timestamp check against Firebase to invalidate stale cache immediately with batched resolution
    checkAndSyncVersionTimestamps().then(async ({ hasStaleData, invalidated }) => {
      if (hasStaleData) {
        console.log('⚡ Stale cache invalidated during initialization:', invalidated);
        if (invalidated.includes('cms') || invalidated.includes('media')) {
          const { cms, media } = await fetchCMSAndMediaBatched();
          setCmsData(cms);
          setMediaItems(media);
        }
        if (invalidated.includes('products')) fetchProducts().then(setProducts);
        if (invalidated.includes('collections')) fetchCollections().then(setCollections);
        if (invalidated.includes('orders')) fetchOrders().then(setOrders);
      }
    }).catch(() => {});

    // 2. Immediate batched initial load when opening the website
    loadInitialData();

    // 3. Set up real-time Firebase Firestore subscriptions for automatic instant sync
    const unsubscribers: (() => void)[] = [];

    const handleQuotaExhausted = () => {
      setFirestoreQuotaExhausted(true);
      // Cleanly unsubscribe all active snapshot listeners to stop further quota errors
      unsubscribers.forEach(u => {
        try { u(); } catch {}
      });
      unsubscribers.length = 0;
    };

    if (isFirestoreActive()) {
      try {
        // (a) System Metadata & Version-Timestamp real-time sync with batched resolution
        const metaDocRef = doc(db, 'system', 'metadata');
        const unsubMeta = onSnapshot(metaDocRef, async (snap) => {
          if (snap.exists()) {
            const remoteLastUpdated = snap.data()?.last_updated || {};
            const localTs = getLocalVersionTimestamps();

            let needsProductRefresh = false;
            let needsCmsMediaRefresh = false;
            let needsColRefresh = false;
            let needsOrderRefresh = false;

            if (remoteLastUpdated.products && remoteLastUpdated.products !== localTs.products) {
              localStorage.removeItem('vw_saved_products');
              setLocalVersionTimestamp('products', remoteLastUpdated.products);
              needsProductRefresh = true;
            }
            if (remoteLastUpdated.cms && remoteLastUpdated.cms !== localTs.cms) {
              localStorage.removeItem('vw_cms_data');
              setLocalVersionTimestamp('cms', remoteLastUpdated.cms);
              needsCmsMediaRefresh = true;
            }
            if (remoteLastUpdated.media && remoteLastUpdated.media !== localTs.media) {
              localStorage.removeItem('vw_uploaded_media_vault');
              setLocalVersionTimestamp('media', remoteLastUpdated.media);
              needsCmsMediaRefresh = true;
            }
            if (remoteLastUpdated.collections && remoteLastUpdated.collections !== localTs.collections) {
              localStorage.removeItem('vw_collections');
              setLocalVersionTimestamp('collections', remoteLastUpdated.collections);
              needsColRefresh = true;
            }
            if (remoteLastUpdated.orders && remoteLastUpdated.orders !== localTs.orders) {
              localStorage.removeItem('vw_orders');
              setLocalVersionTimestamp('orders', remoteLastUpdated.orders);
              needsOrderRefresh = true;
            }

            if (needsCmsMediaRefresh) {
              const { cms, media } = await fetchCMSAndMediaBatched();
              setCmsData(cms);
              setMediaItems(media);
            }
            if (needsProductRefresh) fetchProducts().then(setProducts);
            if (needsColRefresh) fetchCollections().then(setCollections);
            if (needsOrderRefresh) fetchOrders().then(setOrders);
          }
        }, (err) => {
          const msg = String(err?.message || err?.code || '');
          if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded')) {
            handleQuotaExhausted();
          }
        });
        unsubscribers.push(unsubMeta);

        // (b) CMS real-time sync (hero video, hero banner, craftsman, category showcases, editorial, etc.)
        const cmsDocRef = doc(db, 'cms', 'main');
        const unsubCMS = onSnapshot(cmsDocRef, (snap) => {
          if (snap.exists()) {
            const liveCms = snap.data() as CMSData;
            setCmsData(prev => {
              const nextVideo = (liveCms.heroVideoUrl && liveCms.heroVideoUrl.trim().length > 0)
                ? liveCms.heroVideoUrl.trim()
                : (liveCms.heroVideoUrl === '' ? '' : prev.heroVideoUrl);

              const updated = {
                ...prev,
                ...liveCms,
                heroVideoUrl: nextVideo
              };
              try { localStorage.setItem('vw_cms_data', JSON.stringify(updated)); } catch {}
              return updated;
            });
          }
        }, (err) => {
          const msg = String(err?.message || err?.code || '');
          if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded')) {
            handleQuotaExhausted();
          }
        });
        unsubscribers.push(unsubCMS);

        // (c) Products real-time sync
        const prodRef = collection(db, 'products');
        const unsubProds = onSnapshot(prodRef, async (snap) => {
          const delRegistry = await getDeletionRegistry();
          const deletedSet = new Set(delRegistry.products.map(id => String(id).trim()));
          const prods: Product[] = [];
          snap.forEach(d => {
            if (!deletedSet.has(d.id)) {
              prods.push(normalizeProduct({ id: d.id, ...(d.data() as Product) }));
            }
          });
          setProducts(prods);
          try { localStorage.setItem('vw_saved_products', JSON.stringify(prods)); } catch {}
        }, (err) => {
          const msg = String(err?.message || err?.code || '');
          if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded')) {
            handleQuotaExhausted();
          }
        });
        unsubscribers.push(unsubProds);

        // (d) Collections real-time sync
        const colRef = collection(db, 'collections');
        const unsubCols = onSnapshot(colRef, async (snap) => {
          const delRegistry = await getDeletionRegistry();
          const deletedSet = new Set(delRegistry.collections.map(id => String(id).trim()));
          let cols: Collection[] = [];
          snap.forEach(d => {
            if (!deletedSet.has(d.id)) {
              cols.push(normalizeCollection({ id: d.id, ...(d.data() as Collection) }));
            }
          });
          if (cols.length === 0) {
            cols = initialCollections.filter(c => !deletedSet.has(c.id)).map(normalizeCollection);
          }
          cols.sort((a, b) => {
            const orderA = a.id === 'col-1' ? 1 : a.id === 'col-2' ? 2 : a.id === 'col-3' ? 3 : a.id === 'col-4' ? 4 : 99;
            const orderB = b.id === 'col-1' ? 1 : b.id === 'col-2' ? 2 : b.id === 'col-3' ? 3 : b.id === 'col-4' ? 4 : 99;
            return orderA - orderB;
          });
          setCollections(cols);
          try { localStorage.setItem('vw_collections', JSON.stringify(cols)); } catch {}
        }, (err) => {
          const msg = String(err?.message || err?.code || '');
          if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded')) {
            handleQuotaExhausted();
          }
        });
        unsubscribers.push(unsubCols);

        // (e) Media Vault real-time sync (strictly mirror admin console media & purge stale cache)
        const medRef = collection(db, 'media');
        const unsubMed = onSnapshot(medRef, async (snap) => {
          const delRegistry = await getDeletionRegistry();
          const deletedSet = new Set(delRegistry.media.map(id => String(id).trim()));
          const media: MediaItem[] = [];
          snap.forEach(d => {
            if (!deletedSet.has(d.id)) {
              const item = { id: d.id, ...(d.data() as MediaItem) };
              if (item.url && !item.url.includes('unsplash.com') && !item.url.includes('photo-1522335789203') && !item.url.includes('photo-1524805444758') && !item.url.includes('photo-1509042239860')) {
                media.push(item);
              }
            }
          });
          media.sort((a, b) => new Date(b.createdAt || b.uploadedAt || 0).getTime() - new Date(a.createdAt || a.uploadedAt || 0).getTime());
          setMediaItems(media);
          try {
            localStorage.setItem('vw_uploaded_media_vault', JSON.stringify(media));
          } catch {}
        }, (err) => {
          const msg = String(err?.message || err?.code || '');
          if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded')) {
            handleQuotaExhausted();
          }
        });
        unsubscribers.push(unsubMed);

        // (f) Orders real-time sync (Restricted to authenticated admin to protect customer privacy)
        if (auth.currentUser && getAdminToken()) {
          const ordRef = collection(db, 'orders');
          const unsubOrd = onSnapshot(ordRef, () => {
            fetchOrders().then(ords => {
              if (Array.isArray(ords)) setOrders(ords);
            }).catch(() => {});
          }, (err) => {
            const msg = String(err?.message || '') + ' ' + String(err?.code || '');
            if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded')) {
              handleQuotaExhausted();
            } else if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
              console.debug('[Firestore onSnapshot orders] Permission denied. Falling back to Express API.');
            }
          });
          unsubscribers.push(unsubOrd);
        }

        // (g) System Deletions real-time sync
        const delDocRef = doc(db, 'system', 'deletions');
        const unsubDel = onSnapshot(delDocRef, () => {
          loadInitialData();
        }, (err) => {
          const msg = String(err?.message || '') + ' ' + String(err?.code || '');
          if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded')) {
            handleQuotaExhausted();
          } else if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
            console.debug('[Firestore onSnapshot deletions] Detached.');
          }
        });
        unsubscribers.push(unsubDel);

      } catch (e) {
        console.warn('Real-time Firebase sync setup warning:', e);
      }
    }

    // 4. Real-time Server-Sent Events (SSE) stream for instant cross-device push updates
    let eventSource: EventSource | null = null;
    let sseRetryTimeout: any = null;
    let lastSeenServerVersion = 0;

    const handleSyncPayload = async (raw: string) => {
      try {
        const data = JSON.parse(raw);
        if (!data) return;
        if (data.version) {
          lastSeenServerVersion = Math.max(lastSeenServerVersion, data.version);
        }
        const type = data.type || '';
        if (type.includes('cms') || type.includes('media')) {
          if (type.includes('cms') && data.payload) {
            setCmsData(prev => ({ ...prev, ...data.payload }));
            try {
              const current = JSON.parse(localStorage.getItem('vw_cms_data') || '{}');
              localStorage.setItem('vw_cms_data', JSON.stringify({ ...current, ...data.payload }));
            } catch {}
          }
          if (type.includes('media') && data.payload && Array.isArray(data.payload)) {
            setMediaItems(data.payload);
            try {
              localStorage.setItem('vw_uploaded_media_vault', JSON.stringify(data.payload));
            } catch {}
          }
          // Perform batched fetch to ensure complete state consistency between CMS and Media items
          const { cms, media } = await fetchCMSAndMediaBatched();
          setCmsData(cms);
          setMediaItems(media);
        } else if (type.includes('product')) {
          fetchProducts().then(setProducts);
        } else if (type.includes('collection')) {
          fetchCollections().then(setCollections);
        } else if (type.includes('order')) {
          fetchOrders().then(setOrders);
        } else {
          loadInitialData();
        }
      } catch (err) {
        console.debug('SSE parse error:', err);
      }
    };

    const connectSSEStream = () => {
      try {
        if (typeof EventSource !== 'undefined') {
          eventSource = new EventSource('/api/sync/stream');

          eventSource.addEventListener('sync', (event: any) => {
            if (event.data) handleSyncPayload(event.data);
          });

          eventSource.addEventListener('connected', (event: any) => {
            try {
              const data = JSON.parse(event.data);
              if (data?.version) lastSeenServerVersion = data.version;
            } catch {}
          });

          eventSource.onmessage = (event) => {
            if (event.data) handleSyncPayload(event.data);
          };

          eventSource.onerror = () => {
            if (eventSource) {
              eventSource.close();
              eventSource = null;
            }
            clearTimeout(sseRetryTimeout);
            sseRetryTimeout = setTimeout(connectSSEStream, 3000);
          };
        }
      } catch (err) {
        console.debug('SSE initialization error:', err);
      }
    };

    connectSSEStream();

    // 5. Cross-tab real-time BroadcastChannel
    let broadcastChannel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        broadcastChannel = new BroadcastChannel('vw_sync_channel');
        broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'sync') {
            loadInitialData();
          }
        };
      }
    } catch {}

    // 6. Resilient 5-second polling of server sync status (Zero quota cost, high performance)
    const syncInterval = setInterval(() => {
      fetch('/api/sync/status')
        .then(res => res.json())
        .then(status => {
          if (status?.version && lastSeenServerVersion !== 0 && status.version > lastSeenServerVersion) {
            lastSeenServerVersion = status.version;
            loadInitialData();
          } else if (status?.version && lastSeenServerVersion === 0) {
            lastSeenServerVersion = status.version;
          }
        })
        .catch(() => {});
    }, 5000);

    // 7. Check if URL has ?admin=true
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('admin') === 'true' || urlParams.get('admin') === '1') {
        setIsAdminOpen(true);
      }
    } catch {}

    // 8. Secret hotkey: Ctrl+Shift+A or Alt+Shift+A
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey || e.altKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setIsAdminOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // 9. Auto-sync on window focus, visibility change, or storage/custom event
    const handleAutoSync = () => {
      loadInitialData();
    };

    window.addEventListener('focus', handleAutoSync);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        loadInitialData();
      }
    });
    window.addEventListener('vw_data_updated', handleAutoSync as EventListener);
    window.addEventListener('storage', handleAutoSync);

    return () => {
      if (eventSource) {
        try { eventSource.close(); } catch {}
      }
      clearTimeout(sseRetryTimeout);
      if (broadcastChannel) {
        try { broadcastChannel.close(); } catch {}
      }
      clearInterval(syncInterval);
      unsubscribers.forEach(unsub => {
        try { unsub(); } catch {}
      });
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('focus', handleAutoSync);
      window.removeEventListener('vw_data_updated', handleAutoSync as EventListener);
      window.removeEventListener('storage', handleAutoSync);
    };
  }, []);

  // Deep-linking & SEO URL synchronizer for products and collections
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const prodParam = urlParams.get('product');
      if (prodParam && products.length > 0) {
        const found = products.find(p => p.slug === prodParam || p.id === prodParam);
        if (found) {
          setSelectedProductForModal(found);
        }
      }
      const colParam = urlParams.get('collection');
      if (colParam) {
        setSelectedCollectionFilter(colParam);
        setActiveSection('watches');
      }
    } catch {}
  }, [products]);

  // Sync browser URL with currently viewed product modal without page reload
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      if (selectedProductForModal) {
        url.searchParams.set('product', selectedProductForModal.slug || selectedProductForModal.id);
        window.history.replaceState({}, '', url.toString());
      } else if (url.searchParams.has('product')) {
        url.searchParams.delete('product');
        window.history.replaceState({}, '', url.toString());
      }
    } catch {}
  }, [selectedProductForModal]);

  // Sync cart items with fresh product stock limits
  useEffect(() => {
    if (products.length > 0) {
      setCart(prev =>
        prev.map(item => {
          const matched = products.find(p => p.id === item.product.id);
          if (matched && typeof matched.stock === 'number') {
            const maxStock = Math.max(0, matched.stock);
            const clamped = Math.min(item.quantity, maxStock);
            return { ...item, product: matched, quantity: clamped };
          }
          return item;
        }).filter(item => typeof item.product.stock !== 'number' || item.product.stock > 0 || item.quantity > 0)
      );
    }
  }, [products]);

  // Save cart & wishlist changes to local storage
  useEffect(() => {
    try {
      localStorage.setItem('vw_cart', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem('vw_wishlist', JSON.stringify(wishlist));
    } catch {}
  }, [wishlist]);

  // Cart operations with strict stock inventory validation
  const handleAddToCart = (product: Product, quantityToAdd: number = 1) => {
    const latestProduct = products.find(p => p.id === product.id) || product;
    const maxStock = typeof latestProduct.stock === 'number' ? Math.max(0, latestProduct.stock) : 99;

    if (maxStock <= 0) {
      triggerStockNotification(`"${latestProduct.name}" is currently out of stock.`, 'Out of Stock');
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === latestProduct.id);
      const currentQty = existing ? existing.quantity : 0;
      const availableToAdd = maxStock - currentQty;

      if (availableToAdd <= 0) {
        triggerStockNotification(
          `You already have the maximum available stock (${maxStock} unit${maxStock > 1 ? 's' : ''}) of "${latestProduct.name}" in your bag.`,
          'Inventory Limit Reached'
        );
        setIsCartDrawerOpen(true);
        return prev;
      }

      const actualQtyToAdd = Math.min(quantityToAdd, availableToAdd);
      const newTotalQty = currentQty + actualQtyToAdd;

      if (actualQtyToAdd < quantityToAdd) {
        triggerStockNotification(
          `Added ${actualQtyToAdd} unit(s). Maximum available stock is ${maxStock} unit(s).`,
          'Partial Stock Added'
        );
      }

      if (existing) {
        return prev.map(item =>
          item.product.id === latestProduct.id
            ? { ...item, product: latestProduct, quantity: newTotalQty }
            : item
        );
      }

      return [...prev, { product: latestProduct, quantity: newTotalQty }];
    });
  };

  const handleUpdateQuantity = (productId: string, requestedQuantity: number) => {
    if (requestedQuantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }

    setCart(prev =>
      prev.map(item => {
        if (item.product.id === productId) {
          const latestProduct = products.find(p => p.id === productId) || item.product;
          const maxStock = typeof latestProduct.stock === 'number' ? Math.max(0, latestProduct.stock) : 99;

          if (requestedQuantity > maxStock) {
            triggerStockNotification(
              `Only ${maxStock} unit${maxStock > 1 ? 's' : ''} available in stock for "${latestProduct.name}". Cannot exceed stock count.`,
              'Stock Limit Reached'
            );
            return { ...item, product: latestProduct, quantity: maxStock };
          }

          return { ...item, product: latestProduct, quantity: requestedQuantity };
        }
        return item;
      })
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  };

  const handleToggleWishlist = (product: Product) => {
    setWishlist(prev => {
      const exists = prev.some(p => p.id === product.id);
      if (exists) return prev.filter(p => p.id !== product.id);
      return [...prev, product];
    });
  };

  const handleOrderCompleted = (newOrder: Order) => {
    setOrders(prev => [newOrder, ...prev]);
    setCart([]);

    // Immediately update local product inventory in real-time
    if (newOrder.items && newOrder.items.length > 0) {
      setProducts(prevProducts =>
        prevProducts.map(prod => {
          const orderedItem = newOrder.items.find(
            i => i.productId === prod.id || (i.sku && i.sku === prod.sku)
          );
          if (orderedItem) {
            const qty = Number(orderedItem.quantity) || 1;
            const updatedStock = Math.max(0, (Number(prod.stock) || 0) - qty);
            return {
              ...prod,
              stock: updatedStock
            };
          }
          return prod;
        })
      );
    }

    notifyDataUpdated('products');
    notifyDataUpdated('orders');
  };

  const handleNavigate = (section: string, filterParam?: string) => {
    setActiveSection(section);
    if (filterParam) {
      setSelectedCollectionFilter(filterParam);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filtered watch list for Watches / Collections page
  const displayedProducts = products.filter(p => {
    if (selectedCollectionFilter !== 'all' && p.collectionId !== selectedCollectionFilter) {
      return false;
    }
    if (selectedCategoryFilter !== 'all' && p.category.toLowerCase() !== selectedCategoryFilter.toLowerCase()) {
      return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortOrder === 'low-to-high') return a.price - b.price;
    if (sortOrder === 'high-to-low') return b.price - a.price;
    return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
  });

  return (
    <div className="min-h-screen bg-white text-[#0B192C] font-sans antialiased selection:bg-amber-500 selection:text-slate-950 flex flex-col justify-between">
      {/* Dynamic SEO, Social Cards & Schema.org JSON-LD */}
      <SEO activeSection={activeSection} selectedProduct={selectedProductForModal} />

      {/* Global Luxury Header */}
      <Header
        onOpenSearch={() => setIsSearchOverlayOpen(true)}
        onOpenCart={() => setIsCartDrawerOpen(true)}
        cartCount={cart.reduce((s, i) => s + i.quantity, 0)}
        wishlistCount={wishlist.length}
        activeSection={activeSection}
        onNavigate={handleNavigate}
        onOpenChatbot={() => {
          setChatbotInitialMode('chat');
          setIsChatbotOpen(true);
        }}
        onOpenLiveCall={() => {
          setChatbotInitialMode('call');
          setIsChatbotOpen(true);
        }}
        cmsData={cmsData}
      />

      {/* Global Inventory / Stock Alert Toast Notification */}
      {stockNotification && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm bg-[#0B192C] text-white p-4 shadow-2xl border-l-4 border-amber-500 rounded-xs flex items-start gap-3 animate-in slide-in-from-top-4 duration-300">
          <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={18} />
          <div className="flex-1 text-xs">
            <p className="font-semibold text-amber-300 uppercase tracking-wider mb-0.5 font-serif">
              {stockNotification.title || 'Stock Limit Reached'}
            </p>
            <p className="text-slate-200 leading-relaxed font-light">{stockNotification.message}</p>
          </div>
          <button
            onClick={() => setStockNotification(null)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Page Content */}
      <main className="flex-1">
        {/* VIEW 1: HOME PAGE */}
        {activeSection === 'home' && (
          <div className="space-y-0">
            {/* Cinematic Hero */}
            <Hero
              cmsData={cmsData}
              onExplore={() => handleNavigate('watches')}
              onCraftsmanship={() => handleNavigate('craftsmanship')}
            />

            {/* Featured Collections Spotlight */}
            <section className="py-24 bg-[#F9FAFB] border-b border-gray-100">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.3em] text-amber-700 font-semibold block mb-1">
                      Curated Luxury Watch Collections
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-serif font-light text-[#0B192C]">
                      The Collections
                    </h2>
                  </div>
                  <button
                    onClick={() => handleNavigate('collections')}
                    className="text-xs uppercase tracking-[0.2em] font-semibold text-[#0B192C] hover:text-amber-600 transition-colors flex items-center gap-2 group"
                  >
                    <span>View All Collections</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

                {/* Collection Banners */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {collections.slice(0, 3).map(col => {
                    const title = formatCollectionTitle(col.name);
                    const isOriginal = col.id === 'col-1' || title.toLowerCase().includes('original');
                    const isClone = col.id === 'col-2' || title.toLowerCase().includes('clone');
                    const TierIcon = isOriginal ? Award : isClone ? Shield : Sparkles;
                    const defaultTierImg = isOriginal
                      ? '/uploads/vw-media-1787122972078-1919.jpeg'
                      : isClone
                      ? '/uploads/vw-media-1787122997494-6118.jpeg'
                      : '/uploads/vw-media-1787122983955-2251.jpeg';
                    const displayImage = col.image || defaultTierImg;

                    return (
                      <div
                        key={col.id}
                        onClick={() => handleNavigate('watches', col.id)}
                        className="group relative aspect-[4/5] bg-[#0B192C] overflow-hidden cursor-pointer shadow-xl border border-gray-200"
                      >
                        {displayImage ? (
                          <img
                            src={displayImage}
                            alt={title}
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (!target.src.includes('vw-media-1787122972078-1919.jpeg')) {
                                target.src = defaultTierImg;
                              }
                            }}
                            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 opacity-90 group-hover:opacity-100"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-b from-[#112239] via-[#0B192C] to-[#060D17] flex flex-col items-center justify-center p-6 text-center transform group-hover:scale-105 transition-transform duration-700">
                            <div className="w-16 h-16 rounded-full border border-amber-500/30 bg-amber-500/10 flex items-center justify-center mb-16 shadow-lg">
                              <TierIcon className="w-8 h-8 text-amber-400" />
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                        <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
                          <span className="text-[10px] uppercase tracking-[0.25em] text-amber-400 font-semibold block">
                            Exploration Line
                          </span>
                          <h3 className="text-xl font-serif font-medium leading-snug">
                            {title}
                          </h3>
                          <p className="text-xs text-slate-300 font-light line-clamp-2">
                            {col.description}
                          </p>
                          <div className="pt-2 flex items-center gap-1 text-[10px] uppercase tracking-widest font-semibold text-amber-300 group-hover:underline">
                            <span>Explore Timepieces</span>
                            <ArrowRight size={12} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Featured Timepieces Showcase Grid */}
            <section className="py-16 sm:py-24 bg-white">
              <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-8 sm:space-y-12">
                <div className="text-center max-w-2xl mx-auto space-y-2">
                  <span className="text-[10px] uppercase tracking-[0.3em] text-amber-700 font-semibold">
                    Curated Masterworks
                  </span>
                  <h2 className="text-2xl sm:text-4xl font-serif font-light text-[#0B192C]">
                    Featured Timepieces
                  </h2>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 lg:gap-8">
                  {(() => {
                    const featured = products.filter(p => p.featured);
                    const displayList = featured.length >= 20 ? featured : [...featured, ...products.filter(p => !p.featured)];
                    return displayList.slice(0, 20);
                  })().map((p, idx) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      index={idx}
                      onSelect={(p) => setSelectedProductForModal(p)}
                      onAddToCart={handleAddToCart}
                      onToggleWishlist={handleToggleWishlist}
                      isWishlisted={wishlist.some(w => w.id === p.id)}
                    />
                  ))}
                </div>

                {/* Explore Collection Button */}
                <div className="text-center pt-4 sm:pt-6">
                  <button
                    onClick={() => handleNavigate('watches')}
                    className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 bg-[#0B192C] hover:bg-amber-600 text-white transition-all duration-300 text-xs font-semibold uppercase tracking-[0.2em] shadow-sm hover:shadow-md cursor-pointer group rounded-sm"
                  >
                    <span>Explore Collection</span>
                    <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1 text-amber-400 group-hover:text-white" />
                  </button>
                </div>
              </div>
            </section>

            {/* Editorial Storytelling */}
            <EditorialStory
              cmsData={cmsData}
              onExplore={() => handleNavigate('watches')}
            />

            {/* Craftsmanship Section */}
            <CraftsmanshipSection cmsData={cmsData} />
          </div>
        )}

        {/* VIEW 2: COLLECTIONS LISTING PAGE */}
        {activeSection === 'collections' && (
          <div className="pt-32 pb-24 bg-[#F9FAFB]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
              <div className="text-center max-w-3xl mx-auto space-y-3">
                <span className="text-[10px] uppercase tracking-[0.3em] text-amber-700 font-semibold">
                  Ventures Watch Divisions
                </span>
                <h1 className="text-4xl font-serif font-light text-[#0B192C]">
                  The Watch Collections
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 font-light leading-relaxed">
                  Explore our curated lines ranging from ultra-thin dress timepieces to high-beat automatic chronographs.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {collections.map(col => {
                  const title = formatCollectionTitle(col.name);
                  const colProducts = products.filter(p => p.collectionId === col.id || p.collectionName === title || p.collectionName === col.name);
                  const isOriginal = col.id === 'col-1' || title.toLowerCase().includes('original');
                  const isClone = col.id === 'col-2' || title.toLowerCase().includes('clone');
                  const TierIcon = isOriginal ? Award : isClone ? Shield : Sparkles;
                  const defaultTierImg = isOriginal
                    ? '/uploads/vw-media-1787122972078-1919.jpeg'
                    : isClone
                    ? '/uploads/vw-media-1787122997494-6118.jpeg'
                    : '/uploads/vw-media-1787122983955-2251.jpeg';
                  const displayImage = col.image || defaultTierImg;

                  return (
                    <div
                      key={col.id}
                      onClick={() => handleNavigate('watches', col.id)}
                      className="bg-white border border-gray-200 overflow-hidden group cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="aspect-[16/9] bg-[#0B192C] relative overflow-hidden flex items-center justify-center">
                        {displayImage ? (
                          <img
                            src={displayImage}
                            alt={title}
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (!target.src.includes('vw-media-1787122972078-1919.jpeg')) {
                                target.src = defaultTierImg;
                              }
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#112239] via-[#0B192C] to-[#060D17] flex flex-col items-center justify-center p-6 text-center text-white">
                            <div className="w-14 h-14 rounded-full border border-amber-500/30 bg-amber-500/10 flex items-center justify-center mb-3">
                              <TierIcon className="w-7 h-7 text-amber-400" />
                            </div>
                            <span className="text-[11px] uppercase tracking-widest text-amber-400/80 font-medium">Ventures Watches</span>
                          </div>
                        )}
                      </div>
                      <div className="p-6 space-y-3">
                        <div className="flex justify-between items-baseline">
                          <h3 className="text-xl font-serif text-[#0B192C]">{title}</h3>
                          <span className="text-xs text-amber-700 font-semibold font-mono">
                            {colProducts.length} Timepieces
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 font-light">{col.description}</p>
                        <div className="pt-2 text-xs uppercase tracking-widest font-semibold text-[#0B192C] group-hover:text-amber-600 flex items-center gap-1">
                          <span>Browse Collection</span>
                          <ArrowRight size={14} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: WATCHES CATALOG PAGE (WITH LIVE FILTERS) */}
        {activeSection === 'watches' && (
          <div className="pt-32 pb-24 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
                <div>
                  <h1 className="text-3xl font-serif font-light text-[#0B192C]">
                    All Timepieces
                  </h1>
                  <p className="text-xs text-gray-500 font-light mt-1">
                    Showing {displayedProducts.length} masterworks
                  </p>
                </div>

                {/* Filter & Sort Controls */}
                <div className="flex flex-wrap items-center gap-4">
                  {/* Collection Filter Dropdown */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400 uppercase tracking-wider text-[10px]">Collection:</span>
                    <select
                      value={selectedCollectionFilter}
                      onChange={(e) => setSelectedCollectionFilter(e.target.value)}
                      className="border border-gray-200 bg-[#F9FAFB] px-3 py-2 text-xs font-semibold text-[#0B192C] focus:outline-none"
                    >
                      <option value="all">All Collections</option>
                      {collections.map(c => (
                        <option key={c.id} value={c.id}>{formatCollectionTitle(c.name)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Category Dropdown */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400 uppercase tracking-wider text-[10px]">Category:</span>
                    <select
                      value={selectedCategoryFilter}
                      onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                      className="border border-gray-200 bg-[#F9FAFB] px-3 py-2 text-xs font-semibold text-[#0B192C] focus:outline-none"
                    >
                      <option value="all">All Categories</option>
                      <option value="Automatic">Original Watches</option>
                      <option value="Chronograph">Clone Watches</option>
                      <option value="Classic">Copy Watches</option>
                    </select>
                  </div>

                  {/* Sort Order */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400 uppercase tracking-wider text-[10px]">Sort By:</span>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as any)}
                      className="border border-gray-200 bg-[#F9FAFB] px-3 py-2 text-xs font-semibold text-[#0B192C] focus:outline-none"
                    >
                      <option value="featured">Featured First</option>
                      <option value="low-to-high">Price: Low to High</option>
                      <option value="high-to-low">Price: High to Low</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Product Grid */}
              {displayedProducts.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                  <h3 className="text-lg font-serif text-[#0B192C]">No timepieces match your active filters.</h3>
                  <button
                    onClick={() => {
                      setSelectedCollectionFilter('all');
                      setSelectedCategoryFilter('all');
                    }}
                    className="text-xs uppercase tracking-widest font-semibold text-amber-700 underline"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 lg:gap-8">
                  {displayedProducts.map((p, idx) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      index={idx}
                      onSelect={(p) => setSelectedProductForModal(p)}
                      onAddToCart={handleAddToCart}
                      onToggleWishlist={handleToggleWishlist}
                      isWishlisted={wishlist.some(w => w.id === p.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 4: CRAFTSMANSHIP DEEP DIVE */}
        {activeSection === 'craftsmanship' && (
          <div className="pt-28">
            <CraftsmanshipSection cmsData={cmsData} />
            <EditorialStory cmsData={cmsData} onExplore={() => handleNavigate('watches')} />
          </div>
        )}

        {/* VIEW 5: ABOUT PAGE */}
        {activeSection === 'about' && (
          <div className="pt-32 pb-24 bg-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-12">
              <div className="text-center space-y-3">
                <span className="text-[10px] uppercase tracking-[0.3em] text-amber-700 font-semibold">
                  {cmsData.aboutSubtitle || 'Atelier & Heritage'}
                </span>
                <h1 className="text-4xl font-serif text-[#0B192C] font-light">
                  {cmsData.aboutTitle || 'The Story of Ventures Watches'}
                </h1>
              </div>

              <div className="aspect-[16/9] bg-slate-900 border overflow-hidden rounded-sm shadow-md">
                <img
                  src={cmsData.aboutImage || cmsData.aboutImageUrl || '/uploads/vw-media-1787123315922-8585.jpg'}
                  alt="Ventures Atelier"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.includes('vw-media-1787123315922-8585.jpg')) {
                      target.src = '/uploads/vw-media-1787123315922-8585.jpg';
                    }
                  }}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-6 text-sm font-light text-gray-700 leading-relaxed whitespace-pre-line">
                {cmsData.aboutText || `Founded with a vision to bring refined watchmaking to a modern generation, VENTURES WATCHES represents a commitment to timeless design, precision, and uncompromising craftsmanship.

Every timepiece is thoughtfully selected to balance sophisticated aesthetics with dependable performance. From elegant detailing to carefully considered materials, each watch is created to become a lasting part of the journeys, moments, and achievements that define its wearer.`}
              </div>

              {/* Atelier Brand Pillars */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-100">
                <div className="bg-[#F9FAFB] p-6 rounded border border-gray-200 space-y-2">
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-[#0B192C]">
                    {cmsData.aboutPillar1Title || 'Obsessive Quality Curation'}
                  </h3>
                  <p className="text-xs text-gray-600 font-light leading-relaxed">
                    {cmsData.aboutPillar1Text || 'Every piece is personally evaluated for case polishing, crystal clarity, and movement rate stability.'}
                  </p>
                </div>
                <div className="bg-[#F9FAFB] p-6 rounded border border-gray-200 space-y-2">
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-[#0B192C]">
                    {cmsData.aboutPillar2Title || 'Uncompromising Transparency'}
                  </h3>
                  <p className="text-xs text-gray-600 font-light leading-relaxed">
                    {cmsData.aboutPillar2Text || 'We maintain absolute honesty across our authentic timepieces, 1:1 clone grades, and tribute editions.'}
                  </p>
                </div>
                <div className="bg-[#F9FAFB] p-6 rounded border border-gray-200 space-y-2">
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-[#0B192C]">
                    {cmsData.aboutPillar3Title || 'Direct VIP Concierge'}
                  </h3>
                  <p className="text-xs text-gray-600 font-light leading-relaxed">
                    {cmsData.aboutPillar3Text || 'One-on-one personal guidance via WhatsApp from initial selection through to secure home delivery.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 6: CONTACT CONCIERGE PAGE */}
        {activeSection === 'contact' && (
          <div className="pt-32 pb-24 bg-[#F9FAFB]">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-12">
              <div className="text-center space-y-3">
                <span className="text-[10px] uppercase tracking-[0.3em] text-amber-700 font-semibold">
                  Private Watch Concierge
                </span>
                <h1 className="text-4xl font-serif text-[#0B192C] font-light">
                  {cmsData.contactTitle || 'Contact VW-Ventures Watches'}
                </h1>
                <p className="text-xs text-gray-500 font-light">
                  {cmsData.contactSubtitle || 'Direct WhatsApp chat, official Instagram channel, or private email inquiry.'}
                </p>
              </div>

              {/* Instagram & WhatsApp Official Profile Card */}
              <div className="bg-[#0B192C] text-white p-8 rounded-xl shadow-xl border border-slate-800 space-y-6">
                <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-800 text-center sm:text-left">
                  <div className="w-20 h-20 bg-slate-900 border-2 border-amber-500/40 rounded-full flex items-center justify-center p-1 flex-shrink-0 shadow-lg">
                    <div className="w-full h-full bg-gradient-to-br from-amber-500 to-amber-700 rounded-full flex items-center justify-center text-slate-950 font-serif font-bold text-2xl">
                      VW
                    </div>
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h2 className="text-xl font-bold tracking-tight">
                        {cmsData.instagramHandle?.replace('@', '') || 'ventures.watches'}
                      </h2>
                      <span className="bg-amber-500/20 text-amber-400 text-[10px] font-semibold px-2 py-0.5 rounded border border-amber-500/30">
                        VW-VENTURES WATCHES
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 font-light">
                      {cmsData.brandStatement || '100% Authentic Watches And High End Clones In Pakistan 🇵🇰 ⌚ ⏰'}
                    </p>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs pt-1 text-slate-400">
                      <div><strong className="text-white">Phone / WhatsApp:</strong> {cmsData.contactPhone || cmsData.whatsappNumber || '+92 319 2265524'}</div>
                      <div><strong className="text-white">Email:</strong> {cmsData.contactEmail || 'concierge@ventureswatches.com'}</div>
                      <div><strong className="text-white">Location:</strong> {cmsData.contactAddress || 'Karachi, Pakistan'}</div>
                    </div>
                  </div>
                </div>

                {/* Direct Concierge Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <a
                    href={cmsData.whatsappLink || "https://wa.me/923192265524?text=Hi%20VW-Ventures%20Watches,%20I'm%20interested%20in%20your%20watch%20collection."}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-3.5 px-4 rounded-lg flex items-center justify-center gap-2 shadow-lg transition-colors text-center"
                  >
                    <MessageCircle size={18} className="fill-current" />
                    <span>WhatsApp: {cmsData.whatsappNumber || '0319 2265524'}</span>
                  </a>

                  <a
                    href={cmsData.instagramLink || "https://www.instagram.com/ventures.watches/"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-95 text-white font-semibold text-xs py-3.5 px-4 rounded-lg flex items-center justify-center gap-2 shadow-lg transition-opacity text-center"
                  >
                    <Instagram size={18} />
                    <span>Instagram Profile</span>
                  </a>

                  <a
                    href={cmsData.facebookLink || "https://www.facebook.com/share/1CJGTYKA22/?mibextid=wwXIfr"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-3.5 px-4 rounded-lg flex items-center justify-center gap-2 shadow-lg transition-colors text-center"
                  >
                    <Facebook size={18} />
                    <span>Facebook Page</span>
                  </a>
                </div>
              </div>

              {/* Email Form */}
              <div className="bg-white border border-gray-200 p-8 shadow-sm space-y-4">
                <h3 className="text-lg font-serif text-[#0B192C]">Or Transmit a Written Request</h3>
                {contactSubmitted ? (
                  <div className="p-8 text-center space-y-3 bg-emerald-50 text-emerald-800">
                    <CheckCircle size={32} className="mx-auto text-emerald-600" />
                    <h3 className="text-lg font-serif">Message Transmitted</h3>
                    <p className="text-xs font-light">Our Senior Concierge will respond to your email within 12 hours.</p>
                  </div>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); setContactSubmitted(true); }} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-gray-600 mb-1">Your Name</label>
                        <input type="text" required placeholder="e.g. Sarah Jenkins" className="w-full border p-2.5 text-xs focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-gray-600 mb-1">Email Address</label>
                        <input type="email" required placeholder="e.g. sarah@example.com" className="w-full border p-2.5 text-xs focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-gray-600 mb-1">Inquiry Topic</label>
                      <select className="w-full border p-2.5 text-xs focus:outline-none bg-white">
                        <option>WhatsApp Quick Inquiry ({cmsData.whatsappNumber || '0319 2265524'})</option>
                        <option>Authentic Watch Allocation</option>
                        <option>High End Clone Inquiries</option>
                        <option>Warranty & Servicing</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-gray-600 mb-1">Message</label>
                      <textarea rows={4} required placeholder="How may our concierge assist you?" className="w-full border p-2.5 text-xs focus:outline-none" />
                    </div>
                    <button type="submit" className="w-full bg-[#0B192C] hover:bg-amber-600 text-white text-xs uppercase tracking-widest font-semibold py-4 transition-colors">
                      Transmit Inquiry
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 7: WISHLIST PAGE */}
        {activeSection === 'wishlist' && (
          <div className="pt-32 pb-24 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
              <h1 className="text-3xl font-serif font-light text-[#0B192C]">
                Your Saved Wishlist ({wishlist.length})
              </h1>

              {wishlist.length === 0 ? (
                <div className="text-center py-20 space-y-4">
                  <p className="text-sm font-serif text-gray-500">You have no saved timepieces in your wishlist.</p>
                  <button
                    onClick={() => handleNavigate('watches')}
                    className="bg-[#0B192C] text-white text-xs uppercase tracking-widest py-3 px-6 font-semibold"
                  >
                    Explore Watches
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 lg:gap-8">
                  {wishlist.map((p, idx) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      index={idx}
                      onSelect={(p) => setSelectedProductForModal(p)}
                      onAddToCart={handleAddToCart}
                      onToggleWishlist={handleToggleWishlist}
                      isWishlisted={true}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Global Luxury Footer */}
      <Footer
        onNavigate={handleNavigate}
        onOpenAdmin={() => setIsAdminOpen(true)}
        cmsData={cmsData}
        onOpenSearch={() => setIsSearchOverlayOpen(true)}
        wishlistCount={wishlist.length}
        cartCount={cart.reduce((total, item) => total + item.quantity, 0)}
        onOpenCart={() => setIsCartDrawerOpen(true)}
      />

      {/* Product Detail Modal */}
      {selectedProductForModal && (() => {
        const activeProductForModal = products.find(p => p.id === selectedProductForModal.id) || selectedProductForModal;
        return (
          <ProductDetailModal
            product={activeProductForModal}
            allProducts={products}
            onClose={() => setSelectedProductForModal(null)}
            onAddToCart={handleAddToCart}
            onToggleWishlist={handleToggleWishlist}
            isWishlisted={wishlist.some(w => w.id === activeProductForModal.id)}
            onBuyNow={(p, qty = 1) => {
              handleAddToCart(p, qty);
              setIsCheckoutModalOpen(true);
              setSelectedProductForModal(null);
            }}
          />
        );
      })()}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveFromCart}
        onProceedToCheckout={() => setIsCheckoutModalOpen(true)}
      />

      {/* Search Overlay */}
      <SearchOverlay
        isOpen={isSearchOverlayOpen}
        onClose={() => setIsSearchOverlayOpen(false)}
        products={products}
        onSelectProduct={(p) => setSelectedProductForModal(p)}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        cart={cart}
        onOrderCompleted={handleOrderCompleted}
      />

      {/* Admin Console Portal */}
      {isAdminOpen && (
        <AdminDashboard
          onCloseAdmin={() => {
            try {
              sessionStorage.removeItem('vw_admin_authed');
              localStorage.removeItem('vw_admin_authed');
            } catch {}
            setIsAdminOpen(false);
          }}
          products={products}
          collections={collections}
          orders={orders}
          cmsData={cmsData}
          mediaItems={mediaItems}
          customers={customers}
          onRefreshData={loadInitialData}
        />
      )}

      {/* AI Watch Advisor Chatbot & Live Audio Desk */}
      <Chatbot
        products={products}
        collections={collections}
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
        initialMode={chatbotInitialMode}
        onSelectProduct={(p) => setSelectedProductForModal(p)}
        onNavigate={handleNavigate}
      />
    </div>
  );
}
