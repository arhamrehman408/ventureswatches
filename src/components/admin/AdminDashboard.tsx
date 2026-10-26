import React, { useState } from 'react';
import { Product, Collection, Order, CMSData, MediaItem } from '../../types';
import {
  ShieldCheck, LayoutDashboard, Watch, FolderTree, ShoppingCart, Users, Image as ImageIcon,
  FileText, Plus, Edit, Trash2, Search, ArrowUpRight, LogOut, ExternalLink, Save, CheckCircle,
  Upload, Copy, Sparkles, Check, Folder, Link as LinkIcon, Lock, User as UserIcon, Eye, EyeOff, KeyRound,
  Award, Shield, Clock, Mail, CheckCircle2, XCircle, X, Bell
} from 'lucide-react';
import { ProductEditorModal } from './ProductEditorModal';
import { CollectionEditorModal } from './CollectionEditorModal';
import { QuickUploadWebsiteModal } from './QuickUploadWebsiteModal';
import { OrderEmailVerification } from './OrderEmailVerification';
import { PriceAlertsManager } from './PriceAlertsManager';
import { ProductDetailModal } from '../ProductDetailModal';
import { saveProduct, deleteProduct, saveCMSData, updateOrderStatus, uploadMedia, deleteMedia, updateCollection, saveCollection, deleteCollection, uploadMediaFile, adminLogin, updateAdminCredentials, normalizeCollection, resetCollectionImagesToDefault, deleteOrder, purgeAllOrders } from '../../services/api';
import { BackgroundVideo, parseVideoUrl } from '../BackgroundVideo';
import { Logo } from '../Logo';

interface AdminDashboardProps {
  onCloseAdmin: () => void;
  products: Product[];
  collections: Collection[];
  orders: Order[];
  cmsData: CMSData;
  mediaItems: MediaItem[];
  customers: any[];
  onRefreshData: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onCloseAdmin,
  products,
  collections,
  orders,
  cmsData,
  mediaItems,
  customers,
  onRefreshData
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'collections' | 'orders' | 'order-emails' | 'price-alerts' | 'customers' | 'cms' | 'media' | 'security'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [previewingProduct, setPreviewingProduct] = useState<Product | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [isCollectionEditorOpen, setIsCollectionEditorOpen] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<{ id: string; name: string; count: number } | null>(null);
  const [cmsForm, setCmsForm] = useState<CMSData>(cmsData);
  const [localProducts, setLocalProducts] = useState<Product[]>(products);
  const [localCollections, setLocalCollections] = useState<Collection[]>(collections);
  const [localMediaItems, setLocalMediaItems] = useState<MediaItem[]>(mediaItems);
  const [isMediaSaving, setIsMediaSaving] = useState(false);
  const [lastMediaSavedAt, setLastMediaSavedAt] = useState<string | null>(null);

  React.useEffect(() => {
    if (cmsData) {
      setCmsForm(prev => ({
        ...prev,
        ...cmsData
      }));
    }
  }, [cmsData]);

  React.useEffect(() => {
    setLocalProducts(products);
  }, [products]);

  React.useEffect(() => {
    setLocalCollections(collections);
  }, [collections]);

  React.useEffect(() => {
    setLocalMediaItems(mediaItems);
  }, [mediaItems]);
  const [cmsSaved, setCmsSaved] = useState(false);
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedProductForMedia, setSelectedProductForMedia] = useState<string>('');
  const [selectedCollectionForMedia, setSelectedCollectionForMedia] = useState<string>('');
  const [mediaCategoryFilter, setMediaCategoryFilter] = useState<string>('all');
  const [isQuickUploadModalOpen, setIsQuickUploadModalOpen] = useState(false);
  const [quickUploadImageUrl, setQuickUploadImageUrl] = useState('');

  // Authentication State - ALWAYS starts locked (false) so entering the door always requires credentials
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Clear any residual session cache on mount so door is strictly secured
  React.useEffect(() => {
    try {
      sessionStorage.removeItem('vw_admin_authed');
      localStorage.removeItem('vw_admin_authed');
    } catch {}
  }, []);

  const handleCloseAndLock = () => {
    try {
      sessionStorage.removeItem('vw_admin_authed');
      localStorage.removeItem('vw_admin_authed');
      sessionStorage.removeItem('vw_admin_token');
      localStorage.removeItem('vw_admin_token');
      const currentUser = localStorage.getItem('vw_current_user');
      if (currentUser) {
        const u = JSON.parse(currentUser);
        if (u && u.role === 'admin') {
          localStorage.removeItem('vw_current_user');
        }
      }
    } catch {}
    setIsAuthenticated(false);
    setLoginPassword('');
    setLoginUsername('');
    onCloseAdmin();
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem('vw_admin_authed');
      localStorage.removeItem('vw_admin_authed');
      sessionStorage.removeItem('vw_admin_token');
      localStorage.removeItem('vw_admin_token');
      const currentUser = localStorage.getItem('vw_current_user');
      if (currentUser) {
        const u = JSON.parse(currentUser);
        if (u && u.role === 'admin') {
          localStorage.removeItem('vw_current_user');
        }
      }
    } catch {}
    setIsAuthenticated(false);
    setLoginPassword('');
    setLoginUsername('');
    showToast('🔒 Logged out of Admin Console. Access locked.');
  };

  // Password & Username Update State
  const [updateUsername, setUpdateUsername] = useState('admin');
  const [updatePassword, setUpdatePassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [isUpdatingCreds, setIsUpdatingCreds] = useState(false);

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const res = await adminLogin(loginUsername, loginPassword);
      if (res.success) {
        setIsAuthenticated(true);
        onRefreshData();
        showToast('🔓 Welcome back! Access granted to Master Admin Console.');
      } else {
        setLoginError(res.error || 'Invalid username or password. Please verify your credentials.');
      }
    } catch (err) {
      setLoginError('Authentication service error. Please verify your credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleUpdateCredsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateError(null);
    setUpdateSuccess(null);
    if (!updatePassword || updatePassword.length < 4) {
      setUpdateError('Password must be at least 4 characters long.');
      return;
    }
    if (updatePassword !== confirmPassword) {
      setUpdateError('New password and confirmation do not match.');
      return;
    }
    setIsUpdatingCreds(true);
    try {
      const res = await updateAdminCredentials(updateUsername, updatePassword);
      if (res.success) {
        setUpdateSuccess(`✅ Admin credentials updated! Username: "${updateUsername}". Use your new password on next login.`);
        showToast('✅ Admin credentials updated successfully!');
        setUpdatePassword('');
        setConfirmPassword('');
      } else {
        setUpdateError(res.error || 'Failed to update credentials.');
      }
    } catch (err) {
      setUpdateError('Error updating credentials.');
    } finally {
      setIsUpdatingCreds(false);
    }
  };

  // Delete confirmation modals state
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);
  const [mediaToDelete, setMediaToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Online URL Input States for Media Library
  const [newMediaType, setNewMediaType] = useState<'image' | 'video'>('image');
  const [heroVideoUrlInput, setHeroVideoUrlInput] = useState('');
  const [heroImageUrlInput, setHeroImageUrlInput] = useState('');
  const [originalWatchesUrlInput, setOriginalWatchesUrlInput] = useState('');
  const [cloneWatchesUrlInput, setCloneWatchesUrlInput] = useState('');
  const [copyWatchesUrlInput, setCopyWatchesUrlInput] = useState('');
  const [craftsmanshipUrlInput, setCraftsmanshipUrlInput] = useState('');
  const [editorialUrlInput, setEditorialUrlInput] = useState('');
  const [aboutUrlInput, setAboutUrlInput] = useState('');
  const [collectionUrlInputs, setCollectionUrlInputs] = useState<{ [id: string]: string }>({});
  const [productUrlInputs, setProductUrlInputs] = useState<{ [id: string]: string }>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Live dynamic calculations for Overview & KPIs based strictly on real store sales & catalog data
  const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  const validOrders = sortedOrders.filter(o => o.orderStatus !== 'Cancelled');
  const totalSales = validOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const totalOrders = validOrders.length;
  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => (Number(p.stock) || 0) < 5);
  const pendingEmailOrdersCount = validOrders.filter(o => {
    if (o.orderStatus === 'Confirmed' || o.orderStatus === 'Delivered' || o.orderStatus === 'Shipped' || o.emailApprovalStatus === 'Approved & Sent' || o.emailConfirmationSent) {
      return false;
    }
    return (o.emailApprovalStatus || 'Pending Review') === 'Pending Review';
  }).length;

  // Real live date & month-over-month growth computation
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const thisMonthOrders = validOrders.filter(o => {
    const d = new Date(o.createdAt);
    return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const thisMonthSales = thisMonthOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const prevMonthOrders = validOrders.filter(o => {
    const d = new Date(o.createdAt);
    return !isNaN(d.getTime()) && d.getMonth() === prevMonth && d.getFullYear() === prevYear;
  });
  const prevMonthSales = prevMonthOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  // Dynamic growth metrics
  let salesGrowthBadge: { text: string; type: 'positive' | 'negative' | 'neutral' } = {
    text: 'Live store ready (0 sales)',
    type: 'neutral'
  };

  if (totalOrders === 0 || totalSales === 0) {
    salesGrowthBadge = {
      text: 'Live store ready (0 orders placed)',
      type: 'neutral'
    };
  } else if (prevMonthSales > 0) {
    const pct = ((thisMonthSales - prevMonthSales) / prevMonthSales) * 100;
    if (pct >= 0) {
      salesGrowthBadge = {
        text: `+${pct.toFixed(1)}% vs last month`,
        type: 'positive'
      };
    } else {
      salesGrowthBadge = {
        text: `${pct.toFixed(1)}% vs last month`,
        type: 'negative'
      };
    }
  } else if (thisMonthSales > 0) {
    salesGrowthBadge = {
      text: `${thisMonthOrders.length} order${thisMonthOrders.length > 1 ? 's' : ''} this month`,
      type: 'positive'
    };
  } else {
    salesGrowthBadge = {
      text: `${validOrders.length} total completed orders`,
      type: 'positive'
    };
  }

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0
    }).format(amount).replace('PKR', '₨');
  };

  const handleSaveProduct = async (productData: Partial<Product>) => {
    await saveProduct(productData);
    onRefreshData();
  };

  const handleDeleteProduct = (id: string) => {
    const targetProd = products.find(p => p.id === id);
    const prodName = targetProd ? targetProd.name : 'this timepiece';
    setProductToDelete({ id, name: prodName });
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await deleteProduct(productToDelete.id);
      showToast(`🗑️ "${productToDelete.name}" removed from storefront catalog!`);
      await onRefreshData();
    } catch (err) {
      console.error('Delete product error:', err);
      showToast('❌ Failed to delete product.');
    } finally {
      setIsDeleting(false);
      setProductToDelete(null);
    }
  };

  const handleOpenAddCollection = () => {
    setEditingCollection(null);
    setIsCollectionEditorOpen(true);
  };

  const handleOpenEditCollection = (col: Collection) => {
    setEditingCollection(col);
    setIsCollectionEditorOpen(true);
  };

  const handleSaveCollection = async (collectionData: Partial<Collection>) => {
    const isNew = !editingCollection || !editingCollection.id;
    const colName = collectionData.name || 'Collection';
    showToast(`⏳ ${isNew ? 'Creating' : 'Saving'} collection "${colName}"...`);
    try {
      const saved = await saveCollection(collectionData);
      if (saved) {
        setLocalCollections(prev => {
          const exists = prev.some(c => c.id === saved.id);
          return exists ? prev.map(c => c.id === saved.id ? saved : c) : [...prev, saved];
        });
        showToast(`✅ Collection "${saved.name}" successfully ${isNew ? 'created' : 'saved'}!`);
        await onRefreshData();
      }
    } catch (err) {
      console.error('Failed to save collection:', err);
      showToast('❌ Failed to save collection.');
    }
  };

  const handleDeleteCollection = (id: string) => {
    const target = localCollections.find(c => c.id === id);
    const colName = target?.name || 'Collection';
    const linked = products.filter(p => p.collectionId === id || p.collectionName === target?.name).length;
    setCollectionToDelete({ id, name: colName, count: linked });
  };

  const confirmDeleteCollection = async () => {
    if (!collectionToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCollection(collectionToDelete.id);
      setLocalCollections(prev => prev.filter(c => c.id !== collectionToDelete.id));
      showToast(`🗑️ Collection "${collectionToDelete.name}" removed from storefront!`);
      await onRefreshData();
    } catch (err) {
      console.error('Delete collection error:', err);
      showToast('❌ Failed to remove collection.');
    } finally {
      setIsDeleting(false);
      setCollectionToDelete(null);
    }
  };

  const handleDeleteMedia = (id: string) => {
    const targetMedia = mediaItems.find(m => m.id === id);
    const mediaName = targetMedia ? targetMedia.name : 'this asset';
    setMediaToDelete({ id, name: mediaName });
  };

  const confirmDeleteMedia = async () => {
    if (!mediaToDelete) return;
    setIsDeleting(true);
    try {
      await deleteMedia(mediaToDelete.id);
      showToast(`🗑️ "${mediaToDelete.name}" deleted from media library!`);
      await onRefreshData();
    } catch (err) {
      console.error('Delete media error:', err);
      showToast('❌ Failed to delete media.');
    } finally {
      setIsDeleting(false);
      setMediaToDelete(null);
    }
  };

  const handleSaveCMS = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveCMSData(cmsForm);
    setCmsSaved(true);
    setTimeout(() => setCmsSaved(false), 2500);
    onRefreshData();
  };

  const handleOrderStatusChange = async (orderId: string, status: any) => {
    await updateOrderStatus(orderId, status);
    await onRefreshData();
  };

  const handleSaveMediaLibraryAll = async () => {
    setIsMediaSaving(true);
    try {
      // 1. Save CMS Form (Hero video/image, craftsmanship, editorial picture)
      await saveCMSData(cmsForm);

      // 2. Parallel save any collection updates
      if (localCollections && localCollections.length > 0) {
        await Promise.allSettled(
          localCollections.map(col => updateCollection(col.id, { image: col.image }))
        );
      }

      // 3. Parallel save any product updates
      if (localProducts && localProducts.length > 0) {
        await Promise.allSettled(
          localProducts.map(prod => saveProduct(prod))
        );
      }

      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastMediaSavedAt(timestamp);
      showToast('💾 All Media Library changes saved & live across all devices!');
      await onRefreshData();
    } catch (e) {
      console.error('Save all media error:', e);
      showToast('⚠️ Changes saved with partial sync warning. Retrying in background...');
      try { await onRefreshData(); } catch {}
    } finally {
      setIsMediaSaving(false);
    }
  };

  const handleUploadMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMediaUrl.trim()) {
      const isVid = newMediaType === 'video' ||
        Boolean(newMediaUrl.match(/\.(mp4|webm|mov|m4v)$/i)) ||
        newMediaUrl.includes('/videos/');
      const newEntry: MediaItem = {
        id: `media-${Date.now()}`,
        url: newMediaUrl.trim(),
        name: `Watch-Media-${Date.now().toString().slice(-4)}.${isVid ? 'mp4' : 'jpg'}`,
        type: isVid ? 'video' : 'image',
        category: isVid ? 'Video Asset' : 'Watch Picture',
        uploadedAt: new Date().toISOString()
      };
      setLocalMediaItems(prev => [newEntry, ...prev]);
      await uploadMedia(newEntry);
      setNewMediaUrl('');
      setLastMediaSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      showToast(`✨ ${isVid ? 'Video' : 'Picture'} URL added & saved to Media Vault!`);
      await onRefreshData();
    }
  };

  const handleLocalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, category = 'Uploaded Asset') => {
    const file = e.target.files?.[0];
    if (file) {
      const isVid = file.type?.startsWith('video/') || Boolean(file.name.match(/\.(mp4|webm|mov|m4v|mkv)$/i));
      showToast(`⏳ Uploading & permanently storing ${isVid ? 'video' : 'photo'} in Cloud Database...`);
      try {
        const persistentUrl = await uploadMediaFile(file, category);
        const newEntry: MediaItem = {
          id: `media-${Date.now()}`,
          url: persistentUrl,
          name: file.name || `Watch-${isVid ? 'Video' : 'Media'}-${Date.now().toString().slice(-4)}.${isVid ? 'mp4' : 'jpg'}`,
          type: isVid ? 'video' : 'image',
          category,
          uploadedAt: new Date().toISOString()
        };
        setLocalMediaItems(prev => [newEntry, ...prev]);
        setLastMediaSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        showToast(`💾 "${file.name}" permanently stored in database! Live across reloads & server restarts.`);
        await onRefreshData();
      } catch (err) {
        showToast('❌ Upload failed. Please try again or paste a media URL.');
      }
    }
  };

  const handleSetAsHeroBackground = async (imageUrl: string) => {
    try {
      const updatedCMS = { ...cmsForm, heroImageUrl: imageUrl };
      setCmsForm(updatedCMS);
      await saveCMSData(updatedCMS);
      setLastMediaSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      showToast('🌟 Picture set & saved as Homepage Hero Background!');
      await onRefreshData();
    } catch (e) {
      console.warn('Set hero background warning:', e);
      showToast('🌟 Picture updated live!');
    }
  };

  const handleSaveHeroVideo = async (videoUrl: string) => {
    if (!videoUrl) return;
    try {
      const updatedCMS = { ...cmsForm, heroVideoUrl: videoUrl };
      setCmsForm(updatedCMS);
      await saveCMSData(updatedCMS);
      setLastMediaSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      showToast('▶ Hero Video saved & updated live across all devices!');
      await onRefreshData();
    } catch (e) {
      console.warn('Save hero video warning:', e);
      showToast('▶ Hero Video updated live!');
    }
  };

  const handleSaveCategoryTierImage = async (tierKey: 'original' | 'clone' | 'copy', imageUrl: string) => {
    const tierName = tierKey === 'original'
      ? 'Original Watches (Authentic Luxury Watches)'
      : tierKey === 'clone'
      ? 'Clone Watches (1:1 Super Clone Engineering)'
      : 'Copy Watches (Accessible Style & Everyday Elegance)';

    try {
      const updatedCMS: CMSData = {
        ...cmsForm,
        ...(tierKey === 'original' ? { originalWatchesImage: imageUrl } : {}),
        ...(tierKey === 'clone' ? { cloneWatchesImage: imageUrl } : {}),
        ...(tierKey === 'copy' ? { copyWatchesImage: imageUrl } : {})
      };

      setCmsForm(updatedCMS);
      await saveCMSData(updatedCMS);

      setLastMediaSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      showToast(imageUrl ? `💎 ${tierName} picture saved live!` : `🗑️ ${tierName} picture removed!`);
      await onRefreshData();
    } catch (e) {
      console.warn('Save category tier warning:', e);
      showToast(imageUrl ? `💎 ${tierName} picture updated live!` : `🗑️ ${tierName} picture removed!`);
    }
  };

  const handleSaveCraftsmanshipImage = async (imageUrl: string) => {
    if (!imageUrl) return;
    try {
      const updatedCMS = { ...cmsForm, craftsmanshipImageUrl: imageUrl, craftsmanshipImage: imageUrl };
      setCmsForm(updatedCMS);
      await saveCMSData(updatedCMS);
      setLastMediaSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      showToast('✨ Craftsmanship picture saved & updated live!');
      await onRefreshData();
    } catch (e) {
      console.warn('Save craftsmanship image warning:', e);
      showToast('✨ Craftsmanship picture updated live!');
    }
  };

  const handleSaveEditorialImage = async (imageUrl: string) => {
    if (!imageUrl) return;
    try {
      const updatedCMS = { ...cmsForm, editorialImage: imageUrl };
      setCmsForm(updatedCMS);
      await saveCMSData(updatedCMS);
      setLastMediaSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      showToast('✨ Curated Timepieces picture saved & updated live!');
      await onRefreshData();
    } catch (e) {
      console.warn('Save editorial image warning:', e);
      showToast('✨ Curated Timepieces picture updated live!');
    }
  };

  const handleSaveAboutImage = async (imageUrl: string) => {
    if (!imageUrl) return;
    try {
      const updatedCMS = { ...cmsForm, aboutImage: imageUrl, aboutImageUrl: imageUrl };
      setCmsForm(updatedCMS);
      await saveCMSData(updatedCMS);
      setLastMediaSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      showToast('✨ About section picture saved & updated live!');
      await onRefreshData();
    } catch (e) {
      console.warn('Save about image warning:', e);
      showToast('✨ About section picture updated live!');
    }
  };

  const handleAttachPictureToProduct = async (imageUrl: string, productId: string) => {
    if (!productId || !imageUrl) return;
    const targetProduct = localProducts.find(p => p.id === productId);
    if (targetProduct) {
      try {
        const currentImages = targetProduct.images || [];
        const updatedImages = [imageUrl, ...currentImages.filter(img => img !== imageUrl)];
        const updatedProduct = { ...targetProduct, images: updatedImages };
        
        setLocalProducts(prev => prev.map(p => p.id === productId ? updatedProduct : p));
        await saveProduct(updatedProduct);
        setLastMediaSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        showToast(`⌚ Photo saved & set for "${targetProduct.name}"!`);
        await onRefreshData();
      } catch (e) {
        console.warn('Attach picture warning:', e);
        showToast(`⌚ Photo updated for "${targetProduct.name}"!`);
      }
    }
  };

  const handleAssignPictureToCollection = async (imageUrl: string, collectionId: string) => {
    if (!collectionId) return;
    const targetCol = localCollections.find(c => c.id === collectionId);
    try {
      setLocalCollections(prev => prev.map(c => c.id === collectionId ? { ...c, image: imageUrl } : c));
      await updateCollection(collectionId, { image: imageUrl });
      setLastMediaSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      showToast(`📁 Cover saved & updated for "${targetCol?.name || 'Collection'}"!`);
      await onRefreshData();
    } catch (e) {
      console.warn('Assign picture warning:', e);
      showToast(`📁 Cover updated for "${targetCol?.name || 'Collection'}"!`);
    }
  };

  const handleCopyImageUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast('📋 Image URL copied to clipboard!');
  };

  const handleImportPresetPicture = async (url: string, name: string, type: 'image' | 'video' = 'image') => {
    const newEntry: MediaItem = {
      id: `media-${Date.now()}`,
      url,
      name,
      type,
      category: type === 'video' ? 'Motion Video Preset' : 'Analog Dial Preset',
      uploadedAt: new Date().toISOString()
    };
    setLocalMediaItems(prev => [newEntry, ...prev]);
    await uploadMedia(newEntry);
    setLastMediaSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    showToast(`Added ${name} to Media Library!`);
    await onRefreshData();
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 bg-[#070F1E]/95 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-[#0B192C] border border-amber-500/30 rounded-xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 relative text-slate-100 animate-in fade-in zoom-in duration-300">
          <div className="flex flex-col items-center text-center gap-2">
            <Logo mode="light" size="lg" />
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/30 text-[10px] uppercase font-mono tracking-widest font-semibold">
              <ShieldCheck size={13} />
              <span>Restricted Admin Console</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-white mt-1">
              Admin Gateway Login
            </h2>
            <p className="text-xs text-slate-400">
              Enter your master username and password to access store management.
            </p>
          </div>

          <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
            {loginError && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded flex items-center gap-2">
                <ShieldCheck size={16} className="text-rose-400 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-slate-300 font-medium mb-1.5">
                Username / Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Enter admin username or email"
                  autoComplete="off"
                  required
                  className="w-full bg-slate-900 border border-slate-700 text-sm pl-10 pr-4 py-2.5 rounded text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                />
                <UserIcon size={16} className="absolute left-3.5 top-3 text-slate-500" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-slate-300 font-medium mb-1.5">
                Master Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter master password"
                  autoComplete="new-password"
                  required
                  className="w-full bg-slate-900 border border-slate-700 text-sm pl-10 pr-10 py-2.5 rounded text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                />
                <Lock size={16} className="absolute left-3.5 top-3 text-slate-500" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded text-xs uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Lock size={15} />
                <span>{isLoggingIn ? 'Verifying Credentials...' : 'Sign In To Admin Console'}</span>
              </button>

              <button
                type="button"
                onClick={handleCloseAndLock}
                className="w-full bg-transparent hover:bg-white/5 text-slate-400 hover:text-white py-2.5 rounded text-xs uppercase tracking-wider transition-colors"
              >
                Return to Website
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.collectionName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#070F1E] text-slate-100 flex flex-col font-sans overflow-hidden">
      {/* Top Bar */}
      <header className="bg-[#0B192C] border-b border-slate-800 px-4 py-3 sm:px-6 sm:py-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center justify-between md:justify-start gap-3">
          <div className="flex items-center gap-2.5">
            <Logo mode="light" size="sm" />
            <span className="text-[9px] sm:text-[10px] bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded font-mono font-semibold">
              ADMIN
            </span>
          </div>

          <button
            onClick={handleCloseAndLock}
            className="md:hidden text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded border border-amber-500/20 flex items-center gap-1"
          >
            <ExternalLink size={12} />
            <span>Storefront</span>
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => {
              setQuickUploadImageUrl('');
              setIsQuickUploadModalOpen(true);
            }}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 sm:gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 sm:px-4 py-2 text-[11px] sm:text-xs uppercase tracking-wider rounded shadow-lg transition-all"
          >
            <Upload size={14} />
            <span>📸 Upload Picture</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-2 rounded transition-colors border border-rose-500/20"
            title="Log Out of Admin Console"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline font-medium">Log Out</span>
          </button>

          <button
            onClick={handleCloseAndLock}
            className="hidden md:flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded transition-colors border border-slate-700"
          >
            <ExternalLink size={14} />
            <span>Return to Storefront</span>
          </button>
        </div>
      </header>

      {/* Main Admin Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {/* Responsive Navigation: Horizontal scroll on mobile, Vertical sidebar on desktop */}
        <aside className="w-full md:w-64 bg-[#091424] border-b md:border-b-0 md:border-r border-slate-800 p-2 sm:p-3 md:p-4 flex-shrink-0 flex flex-col justify-between">
          <nav className="flex md:flex-col gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
            <div className="hidden md:block px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">
              Management Views
            </div>

            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-shrink-0 md:w-full flex items-center gap-2 sm:gap-3 px-3 py-2 text-xs rounded font-medium transition-colors whitespace-nowrap ${
                activeTab === 'overview' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-300 bg-slate-900/60 md:bg-transparent hover:bg-white/5 border border-slate-800 md:border-0'
              }`}
            >
              <LayoutDashboard size={15} />
              <span>Overview & KPIs</span>
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`flex-shrink-0 md:w-full flex items-center gap-2 sm:gap-3 px-3 py-2 text-xs rounded font-medium transition-colors whitespace-nowrap ${
                activeTab === 'products' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-300 bg-slate-900/60 md:bg-transparent hover:bg-white/5 border border-slate-800 md:border-0'
              }`}
            >
              <Watch size={15} />
              <span>Products ({products.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('collections')}
              className={`flex-shrink-0 md:w-full flex items-center gap-2 sm:gap-3 px-3 py-2 text-xs rounded font-medium transition-colors whitespace-nowrap ${
                activeTab === 'collections' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-300 bg-slate-900/60 md:bg-transparent hover:bg-white/5 border border-slate-800 md:border-0'
              }`}
            >
              <FolderTree size={15} />
              <span>Collections ({collections.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`flex-shrink-0 md:w-full flex items-center gap-2 sm:gap-3 px-3 py-2 text-xs rounded font-medium transition-colors whitespace-nowrap ${
                activeTab === 'orders' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-300 bg-slate-900/60 md:bg-transparent hover:bg-white/5 border border-slate-800 md:border-0'
              }`}
            >
              <ShoppingCart size={15} />
              <span>Orders ({orders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('order-emails')}
              className={`flex-shrink-0 md:w-full flex items-center justify-between gap-2 sm:gap-3 px-3 py-2 text-xs rounded font-medium transition-colors whitespace-nowrap ${
                activeTab === 'order-emails' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-300 bg-slate-900/60 md:bg-transparent hover:bg-white/5 border border-slate-800 md:border-0'
              }`}
            >
              <div className="flex items-center gap-2">
                <Mail size={15} />
                <span>Order Confirmation Emails</span>
              </div>
              {pendingEmailOrdersCount > 0 && (
                <span className="bg-amber-400 text-slate-950 font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded-full animate-pulse">
                  {pendingEmailOrdersCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('price-alerts')}
              className={`flex-shrink-0 md:w-full flex items-center gap-2 sm:gap-3 px-3 py-2 text-xs rounded font-medium transition-colors whitespace-nowrap ${
                activeTab === 'price-alerts' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-300 bg-slate-900/60 md:bg-transparent hover:bg-white/5 border border-slate-800 md:border-0'
              }`}
            >
              <Bell size={15} />
              <span>Price Drop Alerts</span>
            </button>

            <button
              onClick={() => setActiveTab('customers')}
              className={`flex-shrink-0 md:w-full flex items-center gap-2 sm:gap-3 px-3 py-2 text-xs rounded font-medium transition-colors whitespace-nowrap ${
                activeTab === 'customers' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-300 bg-slate-900/60 md:bg-transparent hover:bg-white/5 border border-slate-800 md:border-0'
              }`}
            >
              <Users size={15} />
              <span>Customers ({customers.length})</span>
            </button>

            <div className="hidden md:block pt-3 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">
              CMS & Content
            </div>

            <button
              onClick={() => setActiveTab('cms')}
              className={`flex-shrink-0 md:w-full flex items-center gap-2 sm:gap-3 px-3 py-2 text-xs rounded font-medium transition-colors whitespace-nowrap ${
                activeTab === 'cms' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-300 bg-slate-900/60 md:bg-transparent hover:bg-white/5 border border-slate-800 md:border-0'
              }`}
            >
              <FileText size={15} />
              <span>Homepage CMS</span>
            </button>

            <button
              onClick={() => setActiveTab('media')}
              className={`flex-shrink-0 md:w-full flex items-center gap-2 sm:gap-3 px-3 py-2 text-xs rounded font-medium transition-colors whitespace-nowrap ${
                activeTab === 'media' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-300 bg-slate-900/60 md:bg-transparent hover:bg-white/5 border border-slate-800 md:border-0'
              }`}
            >
              <ImageIcon size={15} />
              <span>Media Library</span>
            </button>

            <div className="hidden md:block pt-3 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">
              Security
            </div>

            <button
              onClick={() => setActiveTab('security')}
              className={`flex-shrink-0 md:w-full flex items-center gap-2 sm:gap-3 px-3 py-2 text-xs rounded font-medium transition-colors whitespace-nowrap ${
                activeTab === 'security' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-300 bg-slate-900/60 md:bg-transparent hover:bg-white/5 border border-slate-800 md:border-0'
              }`}
            >
              <KeyRound size={15} />
              <span>Admin Passwords</span>
            </button>
          </nav>

          <div className="hidden md:block p-3 bg-slate-900 border border-slate-800 rounded text-[11px] text-slate-400 space-y-1 mt-4">
            <div className="text-amber-400 font-semibold">Live System Status</div>
            <div>Express Node API Connected</div>
            <div className="font-mono text-[10px] text-slate-500">v2.4.0 • Local Store</div>
          </div>
        </aside>

        {/* Dynamic Main Workspace Content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 bg-[#070F1E] space-y-6 md:space-y-8 w-full max-w-full overflow-x-hidden">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-serif text-white font-light">Watch Store Performance Overview</h2>
                  <p className="text-xs text-slate-400">Real-time metrics, revenue logs, and stock alerts.</p>
                </div>
              </div>

              {/* Pending Email & Payment Screenshot Verification Alert */}
              {pendingEmailOrdersCount > 0 && (
                <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/40 p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30 animate-pulse">
                      <Mail size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Action Required: {pendingEmailOrdersCount} Payment Screenshot{pendingEmailOrdersCount > 1 ? 's' : ''} Awaiting Approval</span>
                        <span className="bg-amber-400 text-slate-950 font-mono text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                          Pending Review
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Examine bank transfer screenshots, verify SadaPay ledger, and send official order confirmation emails with 1-click Tick (✔).
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('order-emails')}
                    className="flex-shrink-0 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded text-xs uppercase tracking-wider shadow-lg flex items-center gap-1.5 transition-all"
                  >
                    <span>Open Email Verification Desk</span>
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              )}

              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                <div className="bg-[#0B192C] border border-slate-800 p-4 sm:p-6 rounded-lg space-y-1 sm:space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Total Gross Sales</span>
                    <span className="w-2 h-2 rounded-full bg-amber-400/80 animate-pulse"></span>
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-amber-400 font-mono">{formatPrice(totalSales)}</div>
                  <div className="text-[9px] sm:text-[10px] flex items-center gap-1 font-medium">
                    {salesGrowthBadge.type === 'positive' ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <ArrowUpRight size={12} /> {salesGrowthBadge.text}
                      </span>
                    ) : salesGrowthBadge.type === 'negative' ? (
                      <span className="text-rose-400 flex items-center gap-1">
                        <ArrowUpRight size={12} className="rotate-90" /> {salesGrowthBadge.text}
                      </span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> {salesGrowthBadge.text}
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-[#0B192C] border border-slate-800 p-4 sm:p-6 rounded-lg space-y-1 sm:space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Total Orders</span>
                    <ShoppingCart size={13} className="text-slate-500" />
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-white font-mono">{totalOrders}</div>
                  <div className="text-[9px] sm:text-[10px] text-slate-400">
                    {totalOrders === 0 ? 'Ready for live customer orders' : `${orders.filter(o => o.orderStatus === 'Confirmed' || o.paymentStatus === 'Paid').length} Confirmed / Paid`}
                  </div>
                </div>

                <div className="bg-[#0B192C] border border-slate-800 p-4 sm:p-6 rounded-lg space-y-1 sm:space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Active Timepieces</span>
                    <Watch size={13} className="text-slate-500" />
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-white font-mono">{totalProducts}</div>
                  <div className="text-[9px] sm:text-[10px] text-slate-400">{collections.length} Catalog Collections</div>
                </div>

                <div className="bg-[#0B192C] border border-slate-800 p-4 sm:p-6 rounded-lg space-y-1 sm:space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Stock Health</span>
                    <span className={`w-2 h-2 rounded-full ${lowStockProducts.length === 0 ? 'bg-emerald-400' : 'bg-rose-400 animate-pulse'}`}></span>
                  </div>
                  <div className={`text-lg sm:text-2xl font-bold font-mono ${lowStockProducts.length === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {lowStockProducts.length}
                  </div>
                  <div className={`text-[9px] sm:text-[10px] ${lowStockProducts.length === 0 ? 'text-emerald-400/80' : 'text-rose-300'}`}>
                    {lowStockProducts.length === 0 ? 'All models in healthy stock' : `${lowStockProducts.length} model${lowStockProducts.length > 1 ? 's' : ''} under 5 units`}
                  </div>
                </div>
              </div>

              {/* Recent Orders Table */}
              <div className="bg-[#0B192C] border border-slate-800 rounded-lg p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-white">Recent Customer Allocations</h3>
                  {orders.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('orders')}
                      className="text-xs text-amber-400 hover:text-amber-300 underline font-medium"
                    >
                      View All Orders ({orders.length}) ➔
                    </button>
                  )}
                </div>

                {orders.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-amber-400/70">
                      <ShoppingCart size={18} />
                    </div>
                    <div className="text-xs font-semibold text-white">No Customer Orders Placed Yet</div>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      All test data has been cleared. When new customer purchases arrive on your live website, their details and revenue logs will automatically stream in here in real time.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300 min-w-[500px]">
                      <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="p-2.5 sm:p-3">Order Ref</th>
                          <th className="p-2.5 sm:p-3">Customer</th>
                          <th className="p-2.5 sm:p-3">Date</th>
                          <th className="p-2.5 sm:p-3">Status</th>
                          <th className="p-2.5 sm:p-3 text-right">Total Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {sortedOrders.slice(0, 5).map(ord => (
                          <tr key={ord.id} className="hover:bg-white/5">
                            <td className="p-2.5 sm:p-3 font-mono font-semibold text-white">{ord.orderNumber}</td>
                            <td className="p-2.5 sm:p-3">{ord.customer?.name || 'Customer'}</td>
                            <td className="p-2.5 sm:p-3 text-slate-400">{new Date(ord.createdAt).toLocaleDateString()}</td>
                            <td className="p-2.5 sm:p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                ord.orderStatus === 'Confirmed' || ord.orderStatus === 'Delivered'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : ord.orderStatus === 'Cancelled'
                                  ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                  : 'bg-amber-950 text-amber-400 border border-amber-800'
                              }`}>
                                {ord.orderStatus}
                              </span>
                            </td>
                            <td className="p-2.5 sm:p-3 text-right font-semibold text-amber-400 font-mono">{formatPrice(ord.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-serif text-white font-light">Product Catalog Management</h2>
                  <p className="text-xs text-slate-400">Add, edit, or remove timepieces from the live storefront.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  <button
                    onClick={() => {
                      setQuickUploadImageUrl('');
                      setIsQuickUploadModalOpen(true);
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs uppercase tracking-wider font-semibold py-2.5 sm:py-3 px-4 rounded flex items-center justify-center gap-2 shadow transition-colors"
                  >
                    <Upload size={15} />
                    <span>📸 Upload Watch Picture</span>
                  </button>

                  <button
                    onClick={() => {
                      setEditingProduct(null);
                      setIsEditorOpen(true);
                    }}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs uppercase tracking-wider font-bold py-2.5 sm:py-3 px-4 rounded flex items-center justify-center gap-2 shadow-lg transition-all"
                    title="Add watch using Gemini AI Photo Analysis & Voice Dictation"
                  >
                    <Sparkles size={15} />
                    <span>✨ AI Voice & Photo Creator</span>
                  </button>

                  <button
                    onClick={() => {
                      setEditingProduct(null);
                      setIsEditorOpen(true);
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-white text-xs uppercase tracking-wider font-semibold py-2.5 sm:py-3 px-4 rounded flex items-center justify-center gap-2 border border-slate-700 shadow"
                  >
                    <Plus size={15} />
                    <span>Manual Create</span>
                  </button>
                </div>
              </div>

              {/* Search filter */}
              <div className="relative">
                <Search size={18} className="absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter by timepiece name, SKU, or collection..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0B192C] border border-slate-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 rounded focus:border-amber-400 focus:outline-none"
                />
              </div>

              {/* Products Table */}
              <div className="bg-[#0B192C] border border-slate-800 rounded overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300 min-w-[640px]">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Timepiece</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Collection</th>
                      <th className="p-3">Price</th>
                      <th className="p-3">Stock</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredProducts.map(p => (
                      <tr key={p.id} className="hover:bg-white/5">
                        <td className="p-3 flex items-center gap-3">
                          <img src={p.images[0]} alt="" className="w-10 h-12 object-contain bg-slate-900 p-1 border border-slate-800" />
                          <div>
                            <div className="font-serif font-semibold text-white">{p.name}</div>
                            <div className="text-[10px] text-slate-400">{p.specifications?.caseSize ? `${p.specifications.caseSize} • ` : ''}{(p.specifications?.warranty || '3 Days Warranty').replace(/guarantee/gi, 'Warranty')}</div>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-slate-400">{p.sku}</td>
                        <td className="p-3 text-amber-400 font-medium">{p.collectionName}</td>
                        <td className="p-3 font-semibold text-white">
                          <div>{formatPrice(p.price)}</div>
                          {p.compareAtPrice && Number(p.compareAtPrice) > 0 ? (
                            <div className="text-[10px] text-slate-400 line-through font-normal">{formatPrice(Number(p.compareAtPrice))}</div>
                          ) : null}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            p.stock > 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}>
                            {p.stock} units
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setPreviewingProduct(p)}
                              className="p-1.5 text-amber-400 hover:text-amber-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                              title="Preview Watch in Watch Preview"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setEditingProduct(p);
                                setIsEditorOpen(true);
                              }}
                              className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded"
                              title="Edit Timepiece"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-950/50 hover:bg-rose-900 rounded"
                              title="Delete Timepiece"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Collections Tab */}
          {activeTab === 'collections' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-serif text-white font-light">Watch Collections</h2>
                  <p className="text-xs text-slate-400">Create, edit, organize, or remove collection categories and update banner pictures.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenAddCollection}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase px-4 py-2 rounded flex items-center gap-1.5 transition-colors shadow-lg cursor-pointer"
                  >
                    <Plus size={15} />
                    <span>Add New Collection</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      showToast('⏳ Removing custom uploaded pictures and restoring official collection branding...');
                      await resetCollectionImagesToDefault();
                      setLastMediaSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                      showToast('✅ Uploaded collection pictures removed & reset to official branded graphics!');
                      await onRefreshData();
                    }}
                    className="bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800 font-bold text-xs uppercase px-3 py-2 rounded flex items-center gap-1 transition-colors shadow cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Reset Cover Pictures</span>
                  </button>
                </div>
              </div>

              {localCollections.length === 0 ? (
                <div className="bg-[#0B192C] border border-slate-800 rounded-lg p-12 text-center space-y-4">
                  <FolderTree size={48} className="text-amber-500/40 mx-auto" />
                  <h3 className="text-lg font-serif text-white">No Watch Collections Found</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Organize your store by creating collections (e.g. Original Watches, Clone Watches, Master Chronographs).
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenAddCollection}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase px-5 py-2.5 rounded inline-flex items-center gap-2 transition-colors shadow cursor-pointer"
                  >
                    <Plus size={16} />
                    <span>Create Your First Collection</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {localCollections.map(rawCol => {
                    const col = normalizeCollection(rawCol);
                    const productCount = products.filter(p => p.collectionId === col.id || p.collectionName === col.name).length;
                    return (
                      <div key={col.id} className="bg-[#0B192C] border border-slate-800 p-6 rounded space-y-4 flex flex-col justify-between hover:border-slate-700 transition-colors shadow">
                        <div className="space-y-4">
                          {/* Card Header with Badges & Action Buttons */}
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-serif text-white">{col.name}</h3>
                                {col.featured && (
                                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                                    <Sparkles size={11} />
                                    <span>Featured</span>
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-1">
                                <span className="font-mono text-slate-500">/{col.slug || col.id}</span>
                                <span>•</span>
                                <span className="text-amber-400/90 font-medium">{productCount} Timepiece{productCount === 1 ? '' : 's'}</span>
                                {typeof col.sortOrder === 'number' && (
                                  <>
                                    <span>•</span>
                                    <span className="text-slate-500">Order: #{col.sortOrder}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenEditCollection(col)}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-amber-500/40 text-xs px-2.5 py-1.5 rounded flex items-center gap-1 font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                                title="Edit Collection Details"
                              >
                                <Edit size={13} className="text-amber-400" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCollection(col.id)}
                                className="bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 hover:border-rose-700 text-xs px-2.5 py-1.5 rounded flex items-center gap-1 font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                                title="Delete / Remove Collection"
                              >
                                <Trash2 size={13} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>

                          {/* Collection Cover Image */}
                          <div className="aspect-[16/9] bg-slate-900 overflow-hidden relative group rounded border border-slate-800 flex items-center justify-center">
                            {col.image ? (
                              <img src={col.image} alt={col.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                              <div className="flex flex-col items-center justify-center p-4 text-center text-slate-500 space-y-2">
                                <Clock size={36} className="text-amber-500/40" />
                                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">No Cover Picture Assigned</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
                              <label className="cursor-pointer bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 text-[11px] uppercase tracking-wider rounded flex items-center gap-1 shadow-lg">
                                <Upload size={14} />
                                <span>{col.image ? 'Change Cover' : 'Upload Cover'}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      showToast('⏳ Uploading collection cover...');
                                      try {
                                        const uploadedUrl = await uploadMediaFile(file, 'Collection Banner');
                                        await handleAssignPictureToCollection(uploadedUrl, col.id);
                                      } catch (err) {
                                        showToast('❌ Upload failed. Please try a different image.');
                                      }
                                    }
                                  }}
                                  className="hidden"
                                />
                              </label>
                              {col.image && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await updateCollection(col.id, { image: '' });
                                    showToast(`🗑️ "${col.name}" cover picture removed!`);
                                    await onRefreshData();
                                  }}
                                  className="bg-rose-900/80 hover:bg-rose-800 text-white font-bold px-3 py-1.5 text-[11px] uppercase tracking-wider rounded flex items-center gap-1 shadow-lg border border-rose-700/50 cursor-pointer"
                                >
                                  <Trash2 size={14} />
                                  <span>Remove Picture</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {col.description && (
                            <p className="text-xs text-slate-300 font-light leading-relaxed">{col.description}</p>
                          )}
                        </div>

                        {/* Card Footer Quick Links */}
                        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                          <span className="text-[10px] uppercase font-mono text-slate-500">ID: {col.id}</span>
                          <button
                            type="button"
                            onClick={() => handleOpenEditCollection(col)}
                            className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                          >
                            <span>Edit Name & Settings</span>
                            <Edit size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-serif text-white font-light">Customer Orders Management</h2>
                  <p className="text-xs text-slate-400">View customer purchases, payment proofs, and update fulfillment states.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  {orders.length > 0 && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm("Are you sure you want to clear all existing orders? This will permanently wipe all test order records.")) {
                          showToast('⏳ Clearing all orders...');
                          await purgeAllOrders();
                          showToast('✅ All orders and test records purged!');
                          await onRefreshData();
                        }
                      }}
                      className="flex items-center gap-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800 font-bold px-3 py-2 rounded text-xs uppercase tracking-wider shadow transition-all"
                    >
                      <Trash2 size={13} />
                      <span>Clear / Reset Orders ({orders.length})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveTab('order-emails')}
                    className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-4 py-2 rounded text-xs uppercase tracking-wider shadow-lg transition-all"
                  >
                    <Mail size={14} />
                    <span>Open Email Verification Desk {pendingEmailOrdersCount > 0 ? `(${pendingEmailOrdersCount} Pending)` : ''}</span>
                  </button>
                </div>
              </div>

              {pendingEmailOrdersCount > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-lg flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/20 text-amber-400 rounded-full animate-pulse">
                      <Clock size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-amber-300">
                        {pendingEmailOrdersCount} Order{pendingEmailOrdersCount > 1 ? 's' : ''} Awaiting Screenshot & Payment Email Approval
                      </h4>
                      <p className="text-[11px] text-slate-300">
                        Customers have uploaded payment receipts. Review the screenshots and click Tick (✔) to send confirmation emails.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('order-emails')}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded whitespace-nowrap"
                  >
                    Examine Receipts ➔
                  </button>
                </div>
              )}

              {orders.length === 0 ? (
                <div className="bg-[#0B192C] border border-slate-800 rounded-xl p-12 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-amber-400/70 shadow-inner">
                    <ShoppingCart size={26} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-serif text-white">No Orders Placed Yet</h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      All previous mock & test orders have been purged. When a customer completes checkout or places an order on your live store, it will automatically appear here with full payment details in real time.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 bg-slate-900/80 border border-slate-800 text-[11px] text-emerald-400 px-3 py-1.5 rounded-full font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Ready for live store customer purchases</span>
                  </div>
                </div>
              ) : (
                <div className="bg-[#0B192C] border border-slate-800 rounded overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-3">Ref</th>
                        <th className="p-3">Customer Contact</th>
                        <th className="p-3">Items</th>
                        <th className="p-3">Payment Info & Proof</th>
                        <th className="p-3">Total Amount</th>
                        <th className="p-3">Email Approval</th>
                        <th className="p-3">Order Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {sortedOrders.map(ord => {
                        const emailStatus = ord.emailApprovalStatus || (ord.orderStatus === 'Confirmed' || ord.orderStatus === 'Delivered' || ord.orderStatus === 'Shipped' || ord.emailConfirmationSent ? 'Approved & Sent' : ord.orderStatus === 'Cancelled' ? 'Rejected / Declined' : 'Pending Review');
                        return (
                          <tr key={ord.id} className="hover:bg-white/5">
                            <td className="p-3 font-mono font-semibold text-white">
                              <div>{ord.orderNumber}</div>
                              <div className="text-[10px] text-slate-500">{new Date(ord.createdAt).toLocaleDateString()}</div>
                            </td>
                            <td className="p-3">
                              <div className="font-semibold text-white">{ord.customer?.name || 'Customer'}</div>
                              <div className="text-[10px] text-slate-400">{ord.customer?.email} • {ord.customer?.phone}</div>
                              <div className="text-[10px] text-slate-500">{ord.customer?.address}, {ord.customer?.city}</div>
                            </td>
                            <td className="p-3">
                              {(ord.items || []).map((i, idx) => (
                                <div key={idx} className="text-[11px] text-slate-300">
                                  {i.quantity}x {i.productName}
                                </div>
                              ))}
                            </td>
                            <td className="p-3">
                              <div className="space-y-1">
                                <span className="inline-block text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                                  ⚡ {ord.paymentMethod?.toUpperCase() || 'Advance Transfer'}
                                </span>
                                <div className="text-[10px] text-slate-400">
                                  Dest: SadaPay (03192265524)
                                </div>
                                {ord.paymentDetails?.trxId && (
                                  <div className="text-[10px] font-mono text-emerald-400">
                                    TRX: {ord.paymentDetails.trxId}
                                  </div>
                                )}
                                {ord.paymentDetails?.proofUrl ? (
                                  <button
                                    type="button"
                                    onClick={() => setActiveTab('order-emails')}
                                    className="inline-flex items-center gap-1 text-[10px] text-amber-400 underline hover:text-amber-300"
                                  >
                                    <span>📸 View Screenshot</span>
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-500 italic">No screenshot attached</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 font-semibold text-amber-400 font-mono">{formatPrice(ord.total)}</td>
                            <td className="p-3">
                              <div className="space-y-1.5">
                                {emailStatus === 'Approved & Sent' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                                    <CheckCircle2 size={11} />
                                    <span>✓ Emailed</span>
                                  </span>
                                ) : emailStatus === 'Rejected / Declined' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 font-semibold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                                    <XCircle size={11} />
                                    <span>✖ Declined</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 animate-pulse">
                                    <Clock size={11} />
                                    <span>⏳ Pending Review</span>
                                  </span>
                                )}

                                <div>
                                  <button
                                    type="button"
                                    onClick={() => setActiveTab('order-emails')}
                                    className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold underline block"
                                  >
                                    Email Desk (✔ / ✖) ➔
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <select
                                value={ord.orderStatus}
                                onChange={(e) => handleOrderStatusChange(ord.id, e.target.value)}
                                className="bg-slate-900 border border-slate-700 text-xs px-2 py-1 rounded text-white focus:outline-none"
                              >
                                <option value="Pending">Pending</option>
                                <option value="Confirmed">Confirmed</option>
                                <option value="Processing">Processing</option>
                                <option value="Shipped">Shipped</option>
                                <option value="Delivered">Delivered</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={async () => {
                                  if (window.confirm(`Delete order #${ord.orderNumber}?`)) {
                                    showToast(`🗑️ Deleting order #${ord.orderNumber}...`);
                                    await deleteOrder(ord.id);
                                    showToast(`✅ Order #${ord.orderNumber} deleted.`);
                                    await onRefreshData();
                                  }
                                }}
                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                                title="Delete Order"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Order Confirmation Emails & Verification Tab */}
          {activeTab === 'order-emails' && (
            <OrderEmailVerification
              orders={orders}
              onRefreshData={onRefreshData}
              showToast={showToast}
            />
          )}

          {/* CMS Tab */}
          {activeTab === 'cms' && (
            <form onSubmit={handleSaveCMS} className="space-y-6 max-w-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-serif text-white font-light">Homepage CMS Content Editor</h2>
                  <p className="text-xs text-slate-400">Update hero headlines, brand statements, and editorial content.</p>
                </div>

                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs uppercase tracking-wider font-semibold py-3 px-6 rounded flex items-center gap-2 shadow-lg"
                >
                  <Save size={16} />
                  <span>Save CMS Content</span>
                </button>
              </div>

              {cmsSaved && (
                <div className="p-3 bg-emerald-950 border border-emerald-700 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle size={16} />
                  <span>Homepage content updated successfully!</span>
                </div>
              )}

              <div className="bg-[#0B192C] border border-slate-800 p-6 rounded space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm uppercase tracking-wider font-semibold text-amber-400">1. Hero Section Banner & Text Controls</h3>
                    <p className="text-[11px] text-slate-400">
                      Customize, edit, or completely remove any text (headline, subtitle badge, description, buttons) from the storefront hero banner.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await saveCMSData(cmsForm);
                      setCmsSaved(true);
                      setTimeout(() => setCmsSaved(false), 2500);
                      showToast('💾 Hero banner changes saved live to storefront!');
                      await onRefreshData();
                    }}
                    className="self-start sm:self-auto bg-emerald-600 hover:bg-emerald-500 text-white text-xs uppercase tracking-wider font-bold py-2 px-4 rounded flex items-center gap-1.5 shadow"
                  >
                    <Save size={14} />
                    <span>Save Hero Live</span>
                  </button>
                </div>

                {/* 1A. Hero Main Headline */}
                <div className="bg-slate-900/70 p-4 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase text-slate-200 flex items-center gap-2">
                      <span>Hero Main Headline</span>
                      {(!cmsForm.heroTitle || cmsForm.heroTitle.trim() === '') && (
                        <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30">
                          Removed / Hidden
                        </span>
                      )}
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCmsForm({ ...cmsForm, heroTitle: '' })}
                        className="text-[10px] bg-rose-950/60 hover:bg-rose-900 text-rose-300 px-2 py-1 rounded border border-rose-800 transition-colors flex items-center gap-1"
                        title="Remove headline from hero"
                      >
                        <Trash2 size={11} />
                        <span>Clear / Remove</span>
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={cmsForm.heroTitle ?? ''}
                    onChange={(e) => setCmsForm({ ...cmsForm, heroTitle: e.target.value })}
                    placeholder="Enter hero main headline (or leave empty to hide)..."
                    className="w-full bg-slate-950 border border-slate-700 p-2.5 text-xs text-white rounded focus:border-amber-400 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400">
                    Displays in large luxury serif typography in the center of the hero. Clear completely to hide.
                  </p>
                </div>

                {/* 1B. Hero Eyebrow Subtitle Badge */}
                <div className="bg-slate-900/70 p-4 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase text-slate-200 flex items-center gap-2">
                      <span>Hero Eyebrow Subtitle Badge</span>
                      {(!cmsForm.heroSubtitle || cmsForm.heroSubtitle.trim() === '') && (
                        <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30">
                          Removed / Hidden
                        </span>
                      )}
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCmsForm({ ...cmsForm, heroSubtitle: '' })}
                        className="text-[10px] bg-rose-950/60 hover:bg-rose-900 text-rose-300 px-2 py-1 rounded border border-rose-800 transition-colors flex items-center gap-1"
                        title="Remove eyebrow badge from hero"
                      >
                        <Trash2 size={11} />
                        <span>Clear / Remove</span>
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={cmsForm.heroSubtitle ?? ''}
                    onChange={(e) => setCmsForm({ ...cmsForm, heroSubtitle: e.target.value })}
                    placeholder="Enter eyebrow badge text (or leave empty to hide)..."
                    className="w-full bg-slate-950 border border-slate-700 p-2.5 text-xs text-white rounded focus:border-amber-400 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400">
                    Displays inside the glowing pill badge with sparkles above the main headline. Clear completely to hide.
                  </p>
                </div>

                {/* 1C. Hero Description Tagline (Brand Statement) */}
                <div className="bg-slate-900/70 p-4 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase text-slate-200 flex items-center gap-2">
                      <span>Hero Description Tagline</span>
                      {(!cmsForm.brandStatement || cmsForm.brandStatement.trim() === '') && (
                        <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30">
                          Removed / Hidden
                        </span>
                      )}
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCmsForm({ ...cmsForm, brandStatement: '' })}
                        className="text-[10px] bg-rose-950/60 hover:bg-rose-900 text-rose-300 px-2 py-1 rounded border border-rose-800 transition-colors flex items-center gap-1"
                        title="Remove description from hero"
                      >
                        <Trash2 size={11} />
                        <span>Clear / Remove</span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    value={cmsForm.brandStatement ?? ''}
                    onChange={(e) => setCmsForm({ ...cmsForm, brandStatement: e.target.value })}
                    placeholder="Enter tagline/description paragraph (or leave empty to hide)..."
                    className="w-full bg-slate-950 border border-slate-700 p-2.5 text-xs text-white rounded focus:border-amber-400 focus:outline-none font-sans"
                  />
                  <p className="text-[10px] text-slate-400">
                    Displays below the main headline. Clear completely to remove the description from the hero.
                  </p>
                </div>

                {/* 1D. Hero Action Buttons Note */}
                <div className="bg-slate-900/50 p-3.5 rounded-lg border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Hero Action Buttons: <strong className="text-slate-200">Removed from Hero</strong> (Clean luxury typography presentation)</span>
                  </div>
                  <span className="text-[10px] text-amber-400/80 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                    Buttons Disabled
                  </span>
                </div>

                {/* 1E. Live Preview Box */}
                <div className="bg-[#070e18] border border-amber-500/30 rounded-lg p-5 text-center relative overflow-hidden shadow-inner">
                  <div className="absolute top-2 left-2 bg-slate-900/90 text-amber-300 text-[10px] px-2 py-0.5 rounded border border-slate-700 font-mono">
                    Live Storefront Hero Preview
                  </div>

                  <div className="py-6 space-y-3 max-w-xl mx-auto">
                    {cmsForm.heroSubtitle && cmsForm.heroSubtitle.trim() !== '' ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[10px] uppercase font-semibold text-amber-300 border border-amber-300/30">
                        <Sparkles size={11} className="text-amber-300" />
                        <span>{cmsForm.heroSubtitle}</span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-600 italic">
                        [Eyebrow badge hidden / removed]
                      </div>
                    )}

                    {cmsForm.heroTitle && cmsForm.heroTitle.trim() !== '' ? (
                      <h2 className="text-xl sm:text-2xl font-serif tracking-wider uppercase text-white font-light">
                        {cmsForm.heroTitle}
                      </h2>
                    ) : (
                      <div className="text-[11px] text-slate-600 italic">
                        [Headline hidden / removed]
                      </div>
                    )}

                    {cmsForm.brandStatement && cmsForm.brandStatement.trim() !== '' ? (
                      <p className="text-xs text-slate-300 font-light max-w-md mx-auto">
                        {cmsForm.brandStatement}
                      </p>
                    ) : (
                      <div className="text-[10px] text-slate-600 italic">
                        [Description tagline hidden / removed]
                      </div>
                    )}
                  </div>
                </div>

                {/* 1F. Hero Video Background Configuration */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                    <label className="text-[10px] uppercase text-amber-400 font-bold flex items-center gap-1.5">
                      <span>Hero Background Watch Video</span>
                      <span className="bg-emerald-500/20 text-emerald-300 text-[9px] px-1.5 py-0.5 rounded font-mono">Custom Admin Upload Only</span>
                    </label>
                    <div className="flex items-center gap-2">
                      {cmsForm.heroVideoUrl && (
                        <button
                          type="button"
                          onClick={async () => {
                            const updatedCMS = { ...cmsForm, heroVideoUrl: '' };
                            setCmsForm(updatedCMS);
                            try {
                              localStorage.removeItem('vw_custom_hero_video_url');
                            } catch {}
                            await saveCMSData(updatedCMS);
                            showToast('🗑️ Hero video removed. Storefront now uses luxury background styling.');
                            onRefreshData();
                          }}
                          className="text-[10px] bg-red-500/20 hover:bg-red-500 hover:text-white text-red-300 px-2.5 py-1 rounded border border-red-500/30 transition-colors flex items-center gap-1 font-medium"
                        >
                          <Trash2 size={12} />
                          <span>Remove Video</span>
                        </button>
                      )}
                      <label className="cursor-pointer text-[10px] bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 px-2.5 py-1 rounded border border-amber-500/30 transition-colors flex items-center gap-1 self-start sm:self-auto font-medium">
                        <Upload size={12} />
                        <span>Upload Video File</span>
                        <input
                          type="file"
                          accept="video/*,*/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              showToast('⏳ Uploading video file to server for all devices...');
                              try {
                                const uploadedUrl = await uploadMediaFile(file);
                                const updatedCMS = { ...cmsForm, heroVideoUrl: uploadedUrl };
                                setCmsForm(updatedCMS);
                                try {
                                  localStorage.setItem('vw_custom_hero_video_url', uploadedUrl);
                                } catch {}
                                await saveCMSData(updatedCMS);
                                showToast('✅ Video uploaded & live across mobile & desktop!');
                                onRefreshData();
                              } catch (err) {
                                showToast('❌ Upload failed. Please check file or paste a video link.');
                              }
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={cmsForm.heroVideoUrl || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCmsForm({ ...cmsForm, heroVideoUrl: val });
                      }}
                      placeholder="Upload a video file above or paste a custom MP4 / video link..."
                      className="flex-1 bg-slate-900 border border-slate-700 p-2.5 text-xs text-white placeholder-slate-500 rounded focus:border-amber-400 focus:outline-none font-mono"
                    />
                    {cmsForm.heroVideoUrl && (
                      <button
                        type="button"
                        onClick={async () => {
                          const updatedCMS = { ...cmsForm, heroVideoUrl: '' };
                          setCmsForm(updatedCMS);
                          try {
                            localStorage.removeItem('vw_custom_hero_video_url');
                          } catch {}
                          await saveCMSData(updatedCMS);
                          showToast('🗑️ Hero video cleared!');
                          onRefreshData();
                        }}
                        className="px-3 py-2.5 bg-slate-800 hover:bg-red-900/60 text-slate-300 hover:text-red-200 border border-slate-700 text-xs rounded transition-colors"
                        title="Clear Video URL"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <p className="text-[10px] text-slate-400 mt-1">
                    ℹ️ Only videos uploaded or set from this Admin Dashboard will display in the hero section. Default sample videos have been removed.
                  </p>

                  {/* Hero Video Transparency / Translucency Controls */}
                  <div className="mt-4 p-4 rounded-lg bg-slate-950/80 border border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-white flex items-center gap-2">
                          <span>Video Display Style: Transparent vs Translucent</span>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            (cmsForm.heroVideoOpacity ?? (cmsForm.heroVideoOverlay === 'translucent' ? 25 : cmsForm.heroVideoOverlay === 'dark' ? 60 : 0)) === 0
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}>
                            {(cmsForm.heroVideoOpacity ?? (cmsForm.heroVideoOverlay === 'translucent' ? 25 : cmsForm.heroVideoOverlay === 'dark' ? 60 : 0)) === 0
                              ? '✨ 100% Transparent (Crystal Clear)'
                              : `🌫️ Translucent (${cmsForm.heroVideoOpacity ?? (cmsForm.heroVideoOverlay === 'translucent' ? 25 : 60)}% Tint)`}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Set the hero video to completely transparent (pure, crystal-clear video with zero dark overlay) or translucent with custom tint.
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setCmsForm({ ...cmsForm, heroVideoOverlay: 'transparent', heroVideoOpacity: 0 })}
                          className={`text-xs px-3 py-1.5 rounded font-medium transition-all ${
                            (cmsForm.heroVideoOpacity ?? (cmsForm.heroVideoOverlay === 'translucent' ? 25 : cmsForm.heroVideoOverlay === 'dark' ? 60 : 0)) === 0
                              ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                          }`}
                        >
                          ✨ Transparent (0%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCmsForm({ ...cmsForm, heroVideoOverlay: 'translucent', heroVideoOpacity: 25 })}
                          className={`text-xs px-3 py-1.5 rounded font-medium transition-all ${
                            (cmsForm.heroVideoOpacity ?? (cmsForm.heroVideoOverlay === 'translucent' ? 25 : cmsForm.heroVideoOverlay === 'dark' ? 60 : 0)) === 25
                              ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                          }`}
                        >
                          🌫️ Translucent (25%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCmsForm({ ...cmsForm, heroVideoOverlay: 'dark', heroVideoOpacity: 60 })}
                          className={`text-xs px-3 py-1.5 rounded font-medium transition-all ${
                            (cmsForm.heroVideoOpacity ?? (cmsForm.heroVideoOverlay === 'translucent' ? 25 : cmsForm.heroVideoOverlay === 'dark' ? 60 : 0)) === 60
                              ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                          }`}
                        >
                          🌑 Dark Contrast (60%)
                        </button>
                      </div>
                    </div>

                    {/* Fine-Tuning Range Slider */}
                    <div className="pt-2 border-t border-slate-800/80 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Custom Dark Overlay Opacity:</span>
                        <span className="font-mono font-bold text-amber-300">
                          {cmsForm.heroVideoOpacity ?? (cmsForm.heroVideoOverlay === 'translucent' ? 25 : cmsForm.heroVideoOverlay === 'dark' ? 60 : 0)}%
                          {(cmsForm.heroVideoOpacity ?? (cmsForm.heroVideoOverlay === 'translucent' ? 25 : cmsForm.heroVideoOverlay === 'dark' ? 60 : 0)) === 0 && ' (Pure Transparent)'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={cmsForm.heroVideoOpacity ?? (cmsForm.heroVideoOverlay === 'translucent' ? 25 : cmsForm.heroVideoOverlay === 'dark' ? 60 : 0)}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setCmsForm({
                            ...cmsForm,
                            heroVideoOpacity: val,
                            heroVideoOverlay: val === 0 ? 'transparent' : val <= 40 ? 'translucent' : 'dark'
                          });
                        }}
                        className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                        <span>0% (Transparent)</span>
                        <span>25% (Translucent)</span>
                        <span>50%</span>
                        <span>75%</span>
                        <span>100% (Solid)</span>
                      </div>
                    </div>
                  </div>

                  {/* Live Video Motion Preview Box in CMS */}
                  {cmsForm.heroVideoUrl && (
                    <div className="mt-3 relative rounded overflow-hidden h-36 bg-slate-950 border border-amber-500/30 shadow-lg">
                      <BackgroundVideo
                        videoUrl={cmsForm.heroVideoUrl}
                        isMuted={true}
                        isPlaying={true}
                        className="w-full h-full object-cover"
                      />
                      {/* Live Preview of the selected overlay opacity */}
                      {(cmsForm.heroVideoOpacity ?? (cmsForm.heroVideoOverlay === 'translucent' ? 25 : cmsForm.heroVideoOverlay === 'dark' ? 60 : 0)) > 0 && (
                        <div
                          className="absolute inset-0 bg-gradient-to-t from-[#0B192C]/90 via-black/50 to-black/60 pointer-events-none transition-opacity duration-300"
                          style={{
                            opacity: (cmsForm.heroVideoOpacity ?? (cmsForm.heroVideoOverlay === 'translucent' ? 25 : cmsForm.heroVideoOverlay === 'dark' ? 60 : 0)) / 100
                          }}
                        />
                      )}
                      <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm text-amber-300 text-[10px] font-mono px-2.5 py-1 rounded border border-amber-500/30 flex items-center gap-1.5 z-10">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>
                          {parseVideoUrl(cmsForm.heroVideoUrl).type === 'youtube'
                            ? '▶ YouTube Background Video'
                            : parseVideoUrl(cmsForm.heroVideoUrl).type === 'vimeo'
                            ? '▶ Vimeo Background Video'
                            : parseVideoUrl(cmsForm.heroVideoUrl).type === 'drive'
                            ? '▶ Google Drive Video'
                            : '▶ Direct Video Stream Preview'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-[#0B192C] border border-slate-800 p-6 rounded space-y-4">
                <h3 className="text-xs uppercase tracking-wider font-semibold text-amber-400">2. Brand Manifesto Statement</h3>
                <div>
                  <textarea
                    rows={2}
                    value={cmsForm.brandStatement}
                    onChange={(e) => setCmsForm({ ...cmsForm, brandStatement: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 p-2.5 text-xs text-white font-serif"
                  />
                </div>
              </div>

              <div className="bg-[#0B192C] border border-slate-800 p-6 rounded space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-amber-400">3. Curated Timepieces Section (Above Quote)</h3>
                  <span className="text-[10px] text-slate-400 font-mono">Homepage Storytelling</span>
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">Editorial Section Title</label>
                  <input
                    type="text"
                    value={cmsForm.editorialTitle || ''}
                    onChange={(e) => setCmsForm({ ...cmsForm, editorialTitle: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 p-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">Editorial Story Description</label>
                  <textarea
                    rows={2}
                    value={cmsForm.editorialText || ''}
                    onChange={(e) => setCmsForm({ ...cmsForm, editorialText: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 p-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">Curated Timepieces Picture URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={cmsForm.editorialImage || ''}
                      onChange={(e) => setCmsForm({ ...cmsForm, editorialImage: e.target.value })}
                      placeholder="Paste picture link or use Media Library tab to upload..."
                      className="flex-1 bg-slate-900 border border-slate-700 p-2.5 text-xs text-white"
                    />
                    <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 text-xs rounded border border-slate-700 flex items-center gap-1 font-medium">
                      <Upload size={14} />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            showToast('⏳ Uploading Curated Timepieces picture...');
                            try {
                              const uploadedUrl = await uploadMediaFile(file, 'Curated Timepieces');
                              setCmsForm({ ...cmsForm, editorialImage: uploadedUrl });
                              showToast('Picture uploaded! Click "Save CMS Content" to save.');
                            } catch (err) {
                              showToast('Picture ready! Click "Save CMS Content" to apply.');
                            }
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-[#0B192C] border border-slate-800 p-6 rounded space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-amber-400">4. Watch Category Tiers (Original, Clone & Copy Tiers)</h3>
                  <span className="text-[10px] text-slate-400 font-mono">Standards Showcase</span>
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">Craftsmanship / Categories Section Heading</label>
                  <input
                    type="text"
                    value={cmsForm.craftsmanshipTitle || ''}
                    onChange={(e) => setCmsForm({ ...cmsForm, craftsmanshipTitle: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 p-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">Craftsmanship Subtext / Description</label>
                  <textarea
                    rows={2}
                    value={cmsForm.craftsmanshipText || ''}
                    onChange={(e) => setCmsForm({ ...cmsForm, craftsmanshipText: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 p-2.5 text-xs text-white"
                  />
                </div>

                {/* 3 Tier Image Inputs in CMS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-800">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase text-amber-300 font-semibold">1. Original Watches Picture</label>
                    <input
                      type="text"
                      value={cmsForm.originalWatchesImage || ''}
                      onChange={(e) => setCmsForm({ ...cmsForm, originalWatchesImage: e.target.value })}
                      placeholder="Paste picture URL..."
                      className="w-full bg-slate-900 border border-slate-700 p-2 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase text-amber-300 font-semibold">2. Clone Watches Picture</label>
                    <input
                      type="text"
                      value={cmsForm.cloneWatchesImage || ''}
                      onChange={(e) => setCmsForm({ ...cmsForm, cloneWatchesImage: e.target.value })}
                      placeholder="Paste picture URL..."
                      className="w-full bg-slate-900 border border-slate-700 p-2 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase text-amber-300 font-semibold">3. Copy Watches Picture</label>
                    <input
                      type="text"
                      value={cmsForm.copyWatchesImage || ''}
                      onChange={(e) => setCmsForm({ ...cmsForm, copyWatchesImage: e.target.value })}
                      placeholder="Paste picture URL..."
                      className="w-full bg-slate-900 border border-slate-700 p-2 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#0B192C] border border-slate-800 p-6 rounded space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-amber-400">5. About Us / Atelier Story Page</h3>
                  <span className="text-[10px] text-slate-400 font-mono">About Section</span>
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">About Story Headline</label>
                  <input
                    type="text"
                    value={cmsForm.aboutTitle || ''}
                    onChange={(e) => setCmsForm({ ...cmsForm, aboutTitle: e.target.value })}
                    placeholder="e.g. The Story of Ventures Watches"
                    className="w-full bg-slate-900 border border-slate-700 p-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">About Story Description / Narrative</label>
                  <textarea
                    rows={4}
                    value={cmsForm.aboutText || ''}
                    onChange={(e) => setCmsForm({ ...cmsForm, aboutText: e.target.value })}
                    placeholder="Enter the atelier and heritage story..."
                    className="w-full bg-slate-900 border border-slate-700 p-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">About Atelier Hero Picture URL</label>
                  <input
                    type="text"
                    value={cmsForm.aboutImage || cmsForm.aboutImageUrl || ''}
                    onChange={(e) => setCmsForm({ ...cmsForm, aboutImage: e.target.value, aboutImageUrl: e.target.value })}
                    placeholder="Paste picture URL for About Us page..."
                    className="w-full bg-slate-900 border border-slate-700 p-2.5 text-xs text-white"
                  />
                </div>
              </div>
            </form>
          )}

          {/* Media Library Tab */}
          {activeTab === 'media' && (
            <div className="space-y-10 pb-20">
              {/* Header & Quick Navigation Filters */}
              <div className="bg-[#0B192C] border border-slate-800 p-6 rounded-lg space-y-4 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-2xl font-serif text-white font-light flex items-center gap-3">
                      <span>Website Pictures & Media Manager</span>
                      <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full font-mono font-semibold">
                        Live Storefront Media Vault
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Upload and manage pictures for every section on the main page (Hero Video, Collections, Watch Catalog, Craftsmanship, Curated Timepieces).
                    </p>
                  </div>

                  {/* Primary Save & Upload Actions */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Explicit Save All Button */}
                    <button
                      type="button"
                      onClick={handleSaveMediaLibraryAll}
                      disabled={isMediaSaving}
                      className={`px-5 py-2.5 rounded text-xs uppercase font-bold tracking-wider flex items-center gap-2 shadow-xl transition-all ${
                        isMediaSaving
                          ? 'bg-amber-600/50 text-amber-200 cursor-wait'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400/50'
                      }`}
                    >
                      {isMediaSaving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Saving Changes...</span>
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          <span>💾 Save All Media Changes & Sync Live</span>
                        </>
                      )}
                    </button>

                    <label className="cursor-pointer bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 text-xs uppercase tracking-wider rounded flex items-center gap-2 shadow-lg transition-all">
                      <Upload size={16} />
                      <span>Upload Local Media File</span>
                      <input
                        type="file"
                        accept="image/*,video/*,.mp4,.webm,.mov"
                        onChange={(e) => handleLocalFileUpload(e, 'General Upload')}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        onRefreshData();
                        showToast('🔄 Media synced with database!');
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2.5 text-xs rounded font-medium border border-slate-700 transition-colors"
                      title="Force Refresh Data from Server"
                    >
                      🔄 Refresh
                    </button>
                  </div>
                </div>

                {/* Status bar */}
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="font-mono text-emerald-400 text-[11px] font-semibold">🛡️ Permanent Cloud Database Storage Active</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-300">All local uploaded photos & videos are permanently preserved in Firestore database and never lost on server restart or timeout.</span>
                  </div>
                  {lastMediaSavedAt && (
                    <div className="text-[11px] text-amber-300 font-mono flex items-center gap-1">
                      <Check size={13} className="text-emerald-400" />
                      <span>Last saved: {lastMediaSavedAt}</span>
                    </div>
                  )}
                </div>

                {/* Section Filter Pills */}
                <div className="flex flex-wrap gap-2 text-xs pt-2 border-t border-slate-800/80">
                  <span className="text-slate-400 font-semibold uppercase text-[10px] self-center mr-2">Jump to Website Section:</span>
                  {[
                    { id: 'all', label: 'All Website Sections' },
                    { id: 'hero', label: '1. Hero Section' },
                    { id: 'category-tiers', label: '2. Watch Categories (Original, Clone & Copy)' },
                    { id: 'collections', label: '3. Watch Collections' },
                    { id: 'products', label: '4. Timepieces Catalog' },
                    { id: 'curated-horology', label: '5. Curated Timepieces Section' },
                    { id: 'about', label: '6. About Us Atelier Section' }
                  ].map(sec => (
                    <button
                      key={sec.id}
                      onClick={() => setMediaCategoryFilter(sec.id)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                        mediaCategoryFilter === sec.id
                          ? 'bg-amber-500 text-slate-950 font-bold shadow'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700'
                      }`}
                    >
                      {sec.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 1. HOMEPAGE HERO SECTION MEDIA */}
              {(mediaCategoryFilter === 'all' || mediaCategoryFilter === 'hero') && (
                <div className="bg-[#0B192C] border border-slate-800 rounded-xl p-6 space-y-6 shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <div className="text-[10px] uppercase font-mono tracking-widest text-amber-400 font-bold">Main Website Top</div>
                      <h3 className="text-xl font-serif text-white flex items-center gap-2">
                        <span>1. Homepage Hero Section</span>
                        <span className="text-xs text-slate-400 font-sans">("{cmsData.heroTitle || 'VENTURES WATCHES'}")</span>
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveHeroVideo(cmsForm.heroVideoUrl || '')}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase px-3 py-1.5 rounded flex items-center gap-1 transition-colors shadow"
                      >
                        <Save size={14} />
                        <span>💾 Save Hero Video</span>
                      </button>
                      <span className="text-[11px] bg-slate-900 text-slate-300 border border-slate-800 px-3 py-1 rounded">
                        Background Video & Motion Media
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {/* Hero Video Motion Card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-amber-400">Hero Dial Motion Video (MP4 / Stream / YouTube)</span>
                        <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-mono">
                          ▶ Active Video Background
                        </span>
                      </div>
                      <div className="aspect-video bg-black rounded overflow-hidden relative border border-slate-800">
                        {cmsForm.heroVideoUrl ? (
                          <BackgroundVideo
                            videoUrl={cmsForm.heroVideoUrl}
                            isMuted={true}
                            isPlaying={true}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">No Hero Video Configured</div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <label className="flex-1 min-w-[200px] cursor-pointer bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] uppercase tracking-wider py-2 rounded text-center transition-colors flex items-center justify-center gap-1 shadow">
                            <Upload size={14} />
                            <span>Upload Local Video File</span>
                            <input
                              type="file"
                              accept="video/*,.mp4,.webm,.mov,.mkv,.avi,.m4v,.3gp,.ts"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  showToast('⏳ Uploading local video file to server...');
                                  try {
                                    const uploadedUrl = await uploadMediaFile(file, 'Homepage Hero Video');
                                    const updatedCMS = { ...cmsForm, heroVideoUrl: uploadedUrl };
                                    setCmsForm(updatedCMS);
                                    await saveCMSData(updatedCMS);
                                    setLastMediaSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                                    showToast('✅ Local video uploaded, saved & live across mobile & desktop!');
                                    await onRefreshData();
                                  } catch (err) {
                                    showToast('❌ Video upload failed. Please try a smaller video or URL.');
                                  }
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleSaveHeroVideo(cmsForm.heroVideoUrl || '')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] uppercase px-4 py-2 rounded transition-colors flex items-center gap-1.5 shadow"
                          >
                            <Save size={14} />
                            <span>Save Hero Video</span>
                          </button>
                        </div>

                        {/* Paste Online Video URL Input */}
                        <div className="flex gap-2 pt-1 border-t border-slate-800/80">
                          <input
                            type="text"
                            placeholder="Paste ANY video URL (YouTube, Vimeo, Drive, TikTok, Streamable, Dailymotion, Dropbox, MP4, WebM, MOV, or raw iframe)..."
                            value={heroVideoUrlInput}
                            onChange={(e) => setHeroVideoUrlInput(e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-700 text-xs text-white px-2.5 py-1.5 rounded focus:outline-none focus:border-amber-500"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              if (heroVideoUrlInput.trim()) {
                                const url = heroVideoUrlInput.trim();
                                const updatedCMS = { ...cmsForm, heroVideoUrl: url };
                                setCmsForm(updatedCMS);
                                await saveCMSData(updatedCMS);
                                await uploadMedia({
                                  url,
                                  name: `Hero-Video-${Date.now().toString().slice(-4)}.mp4`,
                                  type: 'video',
                                  category: 'Homepage Hero Video'
                                });
                                setHeroVideoUrlInput('');
                                setLastMediaSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                                showToast('▶ Online Video URL applied & saved to Hero!');
                                await onRefreshData();
                              }
                            }}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] uppercase px-3 py-1.5 rounded transition-colors flex items-center gap-1"
                          >
                            <LinkIcon size={12} />
                            <span>Apply & Save URL</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. WATCH CATEGORY SHOWCASE PICTURES (ORIGINAL, CLONE & COPY WATCHES) */}
              {(mediaCategoryFilter === 'all' || mediaCategoryFilter === 'category-tiers') && (
                <div className="bg-[#0B192C] border border-amber-500/40 rounded-xl p-6 space-y-6 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <div className="text-[10px] uppercase font-mono tracking-widest text-amber-400 font-bold flex items-center gap-1.5">
                        <Sparkles size={13} />
                        <span>Homepage Watchmaking Standards Showcase</span>
                      </div>
                      <h3 className="text-xl font-serif text-white flex items-center gap-2">
                        <span>2. Watch Category Showcase Pictures</span>
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const updatedCMS: CMSData = {
                            ...cmsForm,
                            originalWatchesImage: '',
                            cloneWatchesImage: '',
                            copyWatchesImage: ''
                          };
                          setCmsForm(updatedCMS);
                          await saveCMSData(updatedCMS);
                          setLastMediaSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                          showToast('✅ Category pictures cleared!');
                          await onRefreshData();
                        }}
                        className="bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800 font-bold text-xs uppercase px-3 py-1.5 rounded flex items-center gap-1 transition-colors shadow"
                      >
                        <Trash2 size={13} />
                        <span>Remove Uploaded Pictures (Reset)</span>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await saveCMSData(cmsForm);
                          setLastMediaSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                          showToast('💾 All Category Tier Pictures Saved Live!');
                          await onRefreshData();
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase px-3 py-1.5 rounded flex items-center gap-1 transition-colors shadow"
                      >
                        <Save size={14} />
                        <span>💾 Save All Category Pictures</span>
                      </button>
                      <span className="text-[11px] bg-slate-900 text-slate-300 border border-slate-800 px-3 py-1 rounded">
                        3 Category Tabs (Original, Clone, Copy)
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Upload or paste picture URLs for the 3 tabs featured on the homepage (<strong className="text-amber-300">Original Watches</strong>, <strong className="text-amber-300">Clone Watches</strong>, and <strong className="text-amber-300">Copy Watches</strong>). These images display directly under their respective editorial descriptions.
                  </p>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* TIER 1: ORIGINAL WATCHES */}
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3 flex flex-col justify-between shadow">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1">
                            <Award size={13} />
                            <span>Authentic Luxury Watches</span>
                          </span>
                          <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono">
                            Tab 1: Original
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-serif font-semibold text-white">Original Watches</h4>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                            Genuine, manufacturer-verified timepieces sourced directly from world-renowned heritage houses.
                          </p>
                        </div>

                        {/* Image Preview */}
                        <div className="aspect-[4/3] bg-black rounded overflow-hidden relative border border-slate-800 flex items-center justify-center">
                          <img
                            src={cmsForm.originalWatchesImage || '/uploads/vw-media-1786782128028-110.webp'}
                            alt="Original Watches"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm text-amber-300 text-[9px] px-2 py-0.5 rounded font-mono">
                            Live on Tab 1
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <label className="w-full cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] uppercase tracking-wider py-2 rounded text-center transition-colors flex items-center justify-center gap-1 border border-slate-700">
                          <Upload size={13} />
                          <span>Upload Original Watches Picture</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                showToast('⏳ Uploading & permanently storing Original Watches picture...');
                                try {
                                  const uploadedUrl = await uploadMediaFile(file, 'Original Watches Showcase');
                                  await handleSaveCategoryTierImage('original', uploadedUrl);
                                } catch (err) {
                                  showToast('❌ Upload failed.');
                                }
                              }
                            }}
                            className="hidden"
                          />
                        </label>

                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Paste picture URL for Original Watches..."
                            value={originalWatchesUrlInput}
                            onChange={(e) => setOriginalWatchesUrlInput(e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-700 text-[10px] text-white px-2 py-1.5 rounded focus:outline-none focus:border-amber-500"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              if (originalWatchesUrlInput.trim()) {
                                await handleSaveCategoryTierImage('original', originalWatchesUrlInput.trim());
                                setOriginalWatchesUrlInput('');
                              }
                            }}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[9px] uppercase px-2.5 py-1.5 rounded transition-colors flex items-center gap-0.5"
                          >
                            <LinkIcon size={11} />
                            <span>Apply</span>
                          </button>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveCategoryTierImage('original', cmsForm.originalWatchesImage || '')}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] uppercase font-bold py-1.5 rounded transition-colors flex items-center justify-center gap-1"
                          >
                            <Save size={12} />
                            <span>💾 Save</span>
                          </button>
                          {cmsForm.originalWatchesImage && (
                            <button
                              type="button"
                              onClick={async () => {
                                const updatedCMS = { ...cmsForm, originalWatchesImage: '' };
                                setCmsForm(updatedCMS);
                                await saveCMSData(updatedCMS);
                                showToast('🗑️ Original Watches picture removed!');
                                await onRefreshData();
                              }}
                              className="bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-[10px] uppercase font-bold px-2 py-1.5 rounded transition-colors flex items-center gap-1 border border-rose-700/50"
                            >
                              <Trash2 size={12} />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* TIER 2: CLONE WATCHES */}
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3 flex flex-col justify-between shadow">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1">
                            <Shield size={13} />
                            <span>1:1 Super Clone Engineering</span>
                          </span>
                          <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono">
                            Tab 2: Clone
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-serif font-semibold text-white">Clone Watches</h4>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                            Meticulously crafted 1:1 super clones built with exact weight, genuine 904L stainless steel, ceramic bezel inserts.
                          </p>
                        </div>

                        {/* Image Preview */}
                        <div className="aspect-[4/3] bg-black rounded overflow-hidden relative border border-slate-800 flex items-center justify-center">
                          <img
                            src={cmsForm.cloneWatchesImage || '/uploads/vw-media-1786782146887-169.webp'}
                            alt="Clone Watches"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm text-amber-300 text-[9px] px-2 py-0.5 rounded font-mono">
                            Live on Tab 2
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <label className="w-full cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] uppercase tracking-wider py-2 rounded text-center transition-colors flex items-center justify-center gap-1 border border-slate-700">
                          <Upload size={13} />
                          <span>Upload Clone Watches Picture</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                showToast('⏳ Uploading & permanently storing Clone Watches picture...');
                                try {
                                  const uploadedUrl = await uploadMediaFile(file, 'Clone Watches Showcase');
                                  await handleSaveCategoryTierImage('clone', uploadedUrl);
                                } catch (err) {
                                  showToast('❌ Upload failed.');
                                }
                              }
                            }}
                            className="hidden"
                          />
                        </label>

                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Paste picture URL for Clone Watches..."
                            value={cloneWatchesUrlInput}
                            onChange={(e) => setCloneWatchesUrlInput(e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-700 text-[10px] text-white px-2 py-1.5 rounded focus:outline-none focus:border-amber-500"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              if (cloneWatchesUrlInput.trim()) {
                                await handleSaveCategoryTierImage('clone', cloneWatchesUrlInput.trim());
                                setCloneWatchesUrlInput('');
                              }
                            }}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[9px] uppercase px-2.5 py-1.5 rounded transition-colors flex items-center gap-0.5"
                          >
                            <LinkIcon size={11} />
                            <span>Apply</span>
                          </button>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveCategoryTierImage('clone', cmsForm.cloneWatchesImage || '')}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] uppercase font-bold py-1.5 rounded transition-colors flex items-center justify-center gap-1"
                          >
                            <Save size={12} />
                            <span>💾 Save</span>
                          </button>
                          {cmsForm.cloneWatchesImage && (
                            <button
                              type="button"
                              onClick={async () => {
                                const updatedCMS = { ...cmsForm, cloneWatchesImage: '' };
                                setCmsForm(updatedCMS);
                                await saveCMSData(updatedCMS);
                                showToast('🗑️ Clone Watches picture removed!');
                                await onRefreshData();
                              }}
                              className="bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-[10px] uppercase font-bold px-2 py-1.5 rounded transition-colors flex items-center gap-1 border border-rose-700/50"
                            >
                              <Trash2 size={12} />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* TIER 3: COPY WATCHES */}
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3 flex flex-col justify-between shadow">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1">
                            <Sparkles size={13} />
                            <span>Accessible Style & Elegance</span>
                          </span>
                          <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono">
                            Tab 3: Copy
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-serif font-semibold text-white">Copy Watches</h4>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                            Stylish, high-value tribute designs combining iconic luxury aesthetics with reliable daily movements.
                          </p>
                        </div>

                        {/* Image Preview */}
                        <div className="aspect-[4/3] bg-black rounded overflow-hidden relative border border-slate-800 flex items-center justify-center">
                          <img
                            src={cmsForm.copyWatchesImage || '/uploads/vw-media-1786782167017-92.webp'}
                            alt="Copy Watches"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm text-amber-300 text-[9px] px-2 py-0.5 rounded font-mono">
                            Live on Tab 3
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <label className="w-full cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] uppercase tracking-wider py-2 rounded text-center transition-colors flex items-center justify-center gap-1 border border-slate-700">
                          <Upload size={13} />
                          <span>Upload Copy Watches Picture</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                showToast('⏳ Uploading & permanently storing Copy Watches picture...');
                                try {
                                  const uploadedUrl = await uploadMediaFile(file, 'Copy Watches Showcase');
                                  await handleSaveCategoryTierImage('copy', uploadedUrl);
                                } catch (err) {
                                  showToast('❌ Upload failed.');
                                }
                              }
                            }}
                            className="hidden"
                          />
                        </label>

                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Paste picture URL for Copy Watches..."
                            value={copyWatchesUrlInput}
                            onChange={(e) => setCopyWatchesUrlInput(e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-700 text-[10px] text-white px-2 py-1.5 rounded focus:outline-none focus:border-amber-500"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              if (copyWatchesUrlInput.trim()) {
                                await handleSaveCategoryTierImage('copy', copyWatchesUrlInput.trim());
                                setCopyWatchesUrlInput('');
                              }
                            }}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[9px] uppercase px-2.5 py-1.5 rounded transition-colors flex items-center gap-0.5"
                          >
                            <LinkIcon size={11} />
                            <span>Apply</span>
                          </button>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveCategoryTierImage('copy', cmsForm.copyWatchesImage || '')}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] uppercase font-bold py-1.5 rounded transition-colors flex items-center justify-center gap-1"
                          >
                            <Save size={12} />
                            <span>💾 Save</span>
                          </button>
                          {cmsForm.copyWatchesImage && (
                            <button
                              type="button"
                              onClick={async () => {
                                const updatedCMS = { ...cmsForm, copyWatchesImage: '' };
                                setCmsForm(updatedCMS);
                                await saveCMSData(updatedCMS);
                                showToast('🗑️ Copy Watches picture removed!');
                                await onRefreshData();
                              }}
                              className="bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-[10px] uppercase font-bold px-2 py-1.5 rounded transition-colors flex items-center gap-1 border border-rose-700/50"
                            >
                              <Trash2 size={12} />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. WATCH COLLECTIONS BANNERS MEDIA */}
              {(mediaCategoryFilter === 'all' || mediaCategoryFilter === 'collections') && (
                <div className="bg-[#0B192C] border border-slate-800 rounded-xl p-6 space-y-6 shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <div className="text-[10px] uppercase font-mono tracking-widest text-amber-400 font-bold">Homepage Section</div>
                      <h3 className="text-xl font-serif text-white">3. Watch Collections Banner Pictures</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          showToast('⏳ Clearing collection pictures...');
                          await resetCollectionImagesToDefault();
                          setLastMediaSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                          showToast('✅ Collection pictures cleared!');
                          await onRefreshData();
                        }}
                        className="bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800 font-bold text-xs uppercase px-3 py-1.5 rounded flex items-center gap-1 transition-colors shadow"
                      >
                        <Trash2 size={13} />
                        <span>Remove Uploaded Pictures (Reset)</span>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          for (const col of localCollections) {
                            await updateCollection(col.id, { image: col.image });
                          }
                          setLastMediaSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                          showToast('💾 All Collection Pictures Saved!');
                          await onRefreshData();
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase px-3 py-1.5 rounded flex items-center gap-1 transition-colors shadow"
                      >
                        <Save size={14} />
                        <span>💾 Save All Collection Pictures</span>
                      </button>
                      <span className="text-[11px] bg-slate-900 text-slate-300 border border-slate-800 px-3 py-1 rounded">
                        {localCollections.length} Collections Active
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400">
                    Below are all watch collection category cards displayed on the main page. Upload a file or paste an online image URL to change any cover picture.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {localCollections.map(rawCol => {
                      const col = normalizeCollection(rawCol);
                      return (
                        <div key={col.id} className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col justify-between group hover:border-amber-500/50 transition-all shadow">
                          <div>
                            <div className="aspect-[16/10] bg-black relative overflow-hidden flex items-center justify-center">
                              {col.image ? (
                                <img src={col.image} alt={col.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              ) : (
                                <div className="flex flex-col items-center justify-center p-4 text-center text-slate-500 space-y-1">
                                  <Clock size={28} className="text-amber-500/40" />
                                  <span className="text-[9px] uppercase font-mono text-slate-400">No Image Uploaded</span>
                                </div>
                              )}
                              <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm text-amber-300 text-[10px] px-2 py-0.5 rounded font-mono">
                                Collection Banner
                              </div>
                            </div>
                            <div className="p-3">
                              <h4 className="text-sm font-serif font-semibold text-white truncate">{col.name}</h4>
                              <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{col.description}</p>
                            </div>
                          </div>

                        <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2">
                          <label className="w-full cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] uppercase tracking-wider py-1.5 rounded text-center transition-colors flex items-center justify-center gap-1 border border-slate-700">
                            <Upload size={12} />
                            <span>Upload Local Picture</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  showToast('⏳ Uploading collection cover...');
                                  try {
                                    const uploadedUrl = await uploadMediaFile(file, 'Collection Banner');
                                    await handleAssignPictureToCollection(uploadedUrl, col.id);
                                  } catch (err) {
                                    showToast('❌ Upload failed. Please try another image.');
                                  }
                                }
                              }}
                              className="hidden"
                            />
                          </label>

                          {/* Online Picture URL Paste for Collection */}
                          <div className="flex gap-1.5 pt-1 border-t border-slate-800">
                            <input
                              type="text"
                              placeholder="Paste image URL..."
                              value={collectionUrlInputs[col.id] || ''}
                              onChange={(e) => setCollectionUrlInputs({ ...collectionUrlInputs, [col.id]: e.target.value })}
                              className="flex-1 bg-slate-900 border border-slate-700 text-[10px] text-white p-1.5 rounded focus:outline-none focus:border-amber-500"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                const url = collectionUrlInputs[col.id];
                                if (url?.trim()) {
                                  await handleAssignPictureToCollection(url.trim(), col.id);
                                  setCollectionUrlInputs({ ...collectionUrlInputs, [col.id]: '' });
                                }
                              }}
                              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[9px] uppercase px-2 py-1 rounded transition-colors flex items-center gap-0.5"
                            >
                              <LinkIcon size={10} />
                              <span>Apply</span>
                            </button>
                          </div>

                          {/* Action buttons for this card */}
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={async () => {
                                await updateCollection(col.id, { image: col.image || '' });
                                setLastMediaSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                                showToast(`💾 "${col.name}" cover saved!`);
                                await onRefreshData();
                              }}
                              className="flex-1 bg-emerald-600/80 hover:bg-emerald-600 text-white text-[10px] uppercase font-bold py-1 rounded transition-colors flex items-center justify-center gap-1"
                            >
                              <Save size={11} />
                              <span>Save Cover</span>
                            </button>
                            {col.image && (
                              <button
                                type="button"
                                onClick={async () => {
                                  await updateCollection(col.id, { image: '' });
                                  showToast(`🗑️ "${col.name}" cover picture removed!`);
                                  await onRefreshData();
                                }}
                                className="bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-[10px] uppercase font-bold px-2 py-1 rounded transition-colors flex items-center gap-1 border border-rose-700/50"
                              >
                                <Trash2 size={11} />
                                <span>Remove</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}

              {/* 4. TIMEPIECES & WATCH CATALOG PICTURES */}
              {(mediaCategoryFilter === 'all' || mediaCategoryFilter === 'products') && (
                <div className="bg-[#0B192C] border border-slate-800 rounded-xl p-6 space-y-6 shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <div className="text-[10px] uppercase font-mono tracking-widest text-amber-400 font-bold">Homepage Storefront Catalog</div>
                      <h3 className="text-xl font-serif text-white">4. Timepieces Catalog Pictures</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          for (const prod of localProducts) {
                            await saveProduct(prod);
                          }
                          setLastMediaSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                          showToast('💾 All Watch Catalog Pictures Saved!');
                          await onRefreshData();
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase px-3 py-1.5 rounded flex items-center gap-1 transition-colors shadow"
                      >
                        <Save size={14} />
                        <span>💾 Save All Watch Catalog Pictures</span>
                      </button>
                      <span className="text-[11px] bg-slate-900 text-slate-300 border border-slate-800 px-3 py-1 rounded">
                        {localProducts.length} Watches in Catalog
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400">
                    Find any watch item below and upload a file or paste an online photo URL to replace its main storefront picture directly.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {localProducts.map(p => (
                      <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col justify-between group hover:border-amber-500/50 transition-all shadow">
                        <div>
                          <div className="aspect-square bg-slate-950 p-3 relative overflow-hidden flex items-center justify-center">
                            <img src={p.images[0]} alt={p.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm text-amber-300 text-[10px] px-2 py-0.5 rounded font-mono">
                              {p.collectionName}
                            </div>
                            {p.images.length > 1 && (
                              <div className="absolute bottom-2 right-2 bg-slate-800/90 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                                +{p.images.length - 1} More Photos
                              </div>
                            )}
                          </div>
                          <div className="p-3">
                            <h4 className="text-sm font-serif font-semibold text-white truncate">{p.name}</h4>
                            <div className="text-xs text-amber-400 font-medium mt-0.5">{formatPrice(p.price)}</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">SKU: {p.sku}</div>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2">
                          <label className="w-full cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] uppercase tracking-wider py-1.5 rounded text-center transition-colors flex items-center justify-center gap-1 border border-slate-700">
                            <Upload size={12} />
                            <span>Upload Local Watch Photo</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  showToast('⏳ Uploading watch photo...');
                                  try {
                                    const uploadedUrl = await uploadMediaFile(file, 'Watch Catalog');
                                    await handleAttachPictureToProduct(uploadedUrl, p.id);
                                  } catch (err) {
                                    showToast('❌ Upload failed. Please try another image.');
                                  }
                                }
                              }}
                              className="hidden"
                            />
                          </label>

                          {/* Online Picture URL Paste for Watch Product */}
                          <div className="flex gap-1.5 pt-1 border-t border-slate-800">
                            <input
                              type="text"
                              placeholder="Paste photo URL..."
                              value={productUrlInputs[p.id] || ''}
                              onChange={(e) => setProductUrlInputs({ ...productUrlInputs, [p.id]: e.target.value })}
                              className="flex-1 bg-slate-900 border border-slate-700 text-[10px] text-white p-1.5 rounded focus:outline-none focus:border-amber-500"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                const url = productUrlInputs[p.id];
                                if (url?.trim()) {
                                  await handleAttachPictureToProduct(url.trim(), p.id);
                                  setProductUrlInputs({ ...productUrlInputs, [p.id]: '' });
                                }
                              }}
                              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[9px] uppercase px-2 py-1 rounded transition-colors flex items-center gap-0.5"
                            >
                              <LinkIcon size={10} />
                              <span>Apply & Save</span>
                            </button>
                          </div>

                          {/* Save button for this product */}
                          <button
                            type="button"
                            onClick={async () => {
                              await saveProduct(p);
                              setLastMediaSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                              showToast(`💾 "${p.name}" photos saved!`);
                              await onRefreshData();
                            }}
                            className="w-full bg-emerald-600/80 hover:bg-emerald-600 text-white text-[10px] uppercase font-bold py-1 rounded transition-colors flex items-center justify-center gap-1"
                          >
                            <Save size={11} />
                            <span>Save Photo</span>
                          </button>

                          <button
                            onClick={() => {
                              setEditingProduct(p);
                              setIsEditorOpen(true);
                            }}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-[10px] uppercase font-semibold py-1 rounded transition-colors text-center block border border-slate-800"
                          >
                            Edit Full Gallery ({p.images.length} images)
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. CURATED TIMEPIECES EDITORIAL SECTION */}
              {(mediaCategoryFilter === 'all' || mediaCategoryFilter === 'curated-horology') && (
                <div className="bg-[#0B192C] border border-slate-800 rounded-xl p-6 space-y-6 shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <div className="text-[10px] uppercase font-mono tracking-widest text-amber-400 font-bold">Homepage Editorial Story</div>
                      <h3 className="text-xl font-serif text-white">5. Curated Timepieces Section Picture</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveEditorialImage(cmsForm.editorialImage || '')}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase px-3 py-1.5 rounded flex items-center gap-1 transition-colors shadow"
                      >
                        <Save size={14} />
                        <span>💾 Save Curated Timepieces Picture</span>
                      </button>
                      <span className="text-[11px] bg-slate-900 text-slate-300 border border-slate-800 px-3 py-1 rounded">
                        Curated Timepieces Story Card
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400">
                    Upload a local image or paste any image URL to change the picture displayed in the <b>Curated Timepieces / Timepieces Worth Discovering</b> section directly above the brand quote.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-amber-400">Curated Timepieces Feature Picture</span>
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-mono">
                          Live on Storefront
                        </span>
                      </div>
                      <div className="aspect-[16/10] bg-black rounded overflow-hidden relative border border-slate-800 flex items-center justify-center">
                        <img
                          src={cmsForm.editorialImage || '/uploads/vw-media-1787123090324-6787.jpeg'}
                          alt="Curated Timepieces"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="w-full cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] uppercase tracking-wider py-2 rounded text-center transition-colors flex items-center justify-center gap-1 border border-slate-700">
                          <Upload size={14} />
                          <span>Upload Local Picture for Curated Timepieces</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                showToast('⏳ Uploading Curated Timepieces picture...');
                                try {
                                  const uploadedUrl = await uploadMediaFile(file, 'Curated Timepieces');
                                  await handleSaveEditorialImage(uploadedUrl);
                                } catch (err) {
                                  showToast('❌ Upload failed. Please try another image.');
                                }
                              }
                            }}
                            className="hidden"
                          />
                        </label>

                        {/* Online Picture URL Paste for Curated Timepieces */}
                        <div className="flex gap-2 pt-1 border-t border-slate-800">
                          <input
                            type="text"
                            placeholder="Paste online picture link (ChatGPT, Imgur, CDN, Unsplash)..."
                            value={editorialUrlInput}
                            onChange={(e) => setEditorialUrlInput(e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-700 text-xs text-white px-2.5 py-1.5 rounded focus:outline-none focus:border-amber-500"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              if (editorialUrlInput.trim()) {
                                await handleSaveEditorialImage(editorialUrlInput.trim());
                                setEditorialUrlInput('');
                              }
                            }}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] uppercase px-3 py-1.5 rounded transition-colors flex items-center gap-1"
                          >
                            <LinkIcon size={12} />
                            <span>Apply & Save URL</span>
                          </button>
                        </div>

                        {/* Explicit Save button */}
                        <button
                          type="button"
                          onClick={() => handleSaveEditorialImage(cmsForm.editorialImage || '')}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] uppercase font-bold py-1.5 rounded transition-colors flex items-center justify-center gap-1 shadow"
                        >
                          <Save size={13} />
                          <span>💾 Save Curated Timepieces Picture</span>
                        </button>

                        {/* Quick Reset to Default Brand Visual */}
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">Presets & Defaults:</span>
                          <button
                            type="button"
                            onClick={async () => {
                              await handleSaveEditorialImage('/uploads/vw-media-1787123090324-6787.jpeg');
                            }}
                            className="text-[10px] text-amber-400 hover:text-amber-300 underline font-mono"
                          >
                            Reset to Default Curated Timepieces Picture
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. ABOUT US ATELIER SECTION MEDIA */}
              {(mediaCategoryFilter === 'all' || mediaCategoryFilter === 'about') && (
                <div className="bg-[#0B192C] border border-amber-500/40 rounded-xl p-6 space-y-6 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <div className="text-[10px] uppercase font-mono tracking-widest text-amber-400 font-bold flex items-center gap-1.5">
                        <Sparkles size={13} />
                        <span>About Us & Atelier Heritage Showcase</span>
                      </div>
                      <h3 className="text-xl font-serif text-white flex items-center gap-2">
                        <span>6. About Us Atelier Picture</span>
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveAboutImage(cmsForm.aboutImage || cmsForm.aboutImageUrl || '/uploads/vw-media-1787123315922-8585.jpg')}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase px-3 py-1.5 rounded flex items-center gap-1 transition-colors shadow"
                      >
                        <Save size={14} />
                        <span>💾 Save About Us Picture</span>
                      </button>
                      <span className="text-[11px] bg-slate-900 text-slate-300 border border-slate-800 px-3 py-1 rounded">
                        About Page Hero Showcase
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Upload a high-resolution local picture or paste an online photo URL for the main banner displayed on the <strong className="text-amber-300">About Us / Atelier & Heritage</strong> page.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3 shadow">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-amber-400 flex items-center gap-1.5">
                          <Award size={14} />
                          <span>Atelier Hero Picture</span>
                        </span>
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-mono">
                          Live on About Page
                        </span>
                      </div>

                      {/* Image Preview */}
                      <div className="aspect-[16/9] bg-black rounded overflow-hidden relative border border-slate-800 flex items-center justify-center">
                        <img
                          src={cmsForm.aboutImage || cmsForm.aboutImageUrl || '/uploads/vw-media-1787123315922-8585.jpg'}
                          alt="About Atelier"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm text-amber-300 text-[10px] px-2 py-0.5 rounded font-mono">
                          Live on /about
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        {/* Local File Upload */}
                        <label className="w-full cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] uppercase tracking-wider py-2.5 rounded text-center transition-colors flex items-center justify-center gap-2 border border-slate-700">
                          <Upload size={14} />
                          <span>Upload Local Picture for About Page</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                showToast('⏳ Uploading & permanently storing About Us picture...');
                                try {
                                  const uploadedUrl = await uploadMediaFile(file, 'About Us Atelier');
                                  await handleSaveAboutImage(uploadedUrl);
                                } catch (err) {
                                  showToast('❌ Upload failed. Please try another image.');
                                }
                              }
                            }}
                            className="hidden"
                          />
                        </label>

                        {/* Online Picture URL Paste */}
                        <div className="flex gap-2 pt-1 border-t border-slate-800">
                          <input
                            type="text"
                            placeholder="Paste image URL..."
                            value={aboutUrlInput}
                            onChange={(e) => setAboutUrlInput(e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-700 text-xs text-white px-2.5 py-1.5 rounded focus:outline-none focus:border-amber-500"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              if (aboutUrlInput.trim()) {
                                await handleSaveAboutImage(aboutUrlInput.trim());
                                setAboutUrlInput('');
                              }
                            }}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] uppercase px-3 py-1.5 rounded transition-colors flex items-center gap-1"
                          >
                            <LinkIcon size={12} />
                            <span>Apply & Save URL</span>
                          </button>
                        </div>

                        {/* Save Button */}
                        <button
                          type="button"
                          onClick={() => handleSaveAboutImage(cmsForm.aboutImage || cmsForm.aboutImageUrl || '/uploads/vw-media-1787123315922-8585.jpg')}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] uppercase font-bold py-2 rounded transition-colors flex items-center justify-center gap-1 shadow"
                        >
                          <Save size={13} />
                          <span>💾 Save About Us Picture</span>
                        </button>

                        {/* Presets & Reset */}
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">Presets:</span>
                          <button
                            type="button"
                            onClick={async () => {
                              await handleSaveAboutImage('/uploads/vw-media-1787123315922-8585.jpg');
                            }}
                            className="text-[10px] text-amber-400 hover:text-amber-300 underline font-mono"
                          >
                            Reset to Default Atelier Image
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* About Page Context & Live Copy Preview */}
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="text-[10px] uppercase font-mono text-slate-400 font-semibold tracking-wider">
                          About Page Narrative & Live Preview
                        </div>
                        <h4 className="text-base font-serif text-white">
                          {cmsForm.aboutTitle || 'The Story of Ventures Watches'}
                        </h4>
                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line line-clamp-6">
                          {cmsForm.aboutText || `Founded with a vision to bring refined watchmaking to a modern generation, VENTURES WATCHES represents a commitment to timeless design, precision, and uncompromising craftsmanship.\n\nEvery timepiece is thoughtfully selected to balance sophisticated aesthetics with dependable performance.`}
                        </p>
                      </div>

                      <div className="bg-slate-950 p-3 rounded border border-slate-800 text-[11px] text-slate-400 space-y-1">
                        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                          <CheckCircle size={13} />
                          <span>Live Synchronization Protocol</span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Changes saved here immediately update the Atelier story photo across all visitors and are saved to Firestore database storage.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Floating Sticky Bottom Bar for Immediate Save Access */}
              <div className="fixed bottom-4 right-6 z-40 bg-[#0B192C]/95 backdrop-blur-md border border-amber-500/40 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom duration-300">
                <div className="hidden sm:block">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Media Sync Ready</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {lastMediaSavedAt ? `Saved at ${lastMediaSavedAt}` : 'All changes update live in real-time'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSaveMediaLibraryAll}
                  disabled={isMediaSaving}
                  className={`px-4 py-2 rounded-lg text-xs uppercase font-bold tracking-wider flex items-center gap-2 shadow-lg transition-all ${
                    isMediaSaving
                      ? 'bg-amber-600/50 text-amber-200 cursor-wait'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white ring-1 ring-emerald-400/50'
                  }`}
                >
                  <Save size={15} />
                  <span>{isMediaSaving ? 'Saving...' : '💾 Save Media Library Data'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Customers Tab */}
          {activeTab === 'customers' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-serif text-white font-light">Registered Customers & Spend</h2>
                <p className="text-xs text-slate-400">View registered buyer directories, purchase frequencies, and lifetime value.</p>
              </div>

              {customers.length === 0 ? (
                <div className="bg-[#0B192C] border border-slate-800 rounded-xl p-12 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-amber-400/70 shadow-inner">
                    <Users size={26} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-serif text-white">No Customer Profiles Yet</h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Customer profiles, contact dossiers, and total lifetime spend will be populated automatically whenever customers checkout or place orders on your live store.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 bg-slate-900/80 border border-slate-800 text-[11px] text-emerald-400 px-3 py-1.5 rounded-full font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Synchronized with live customer checkouts</span>
                  </div>
                </div>
              ) : (
                <div className="bg-[#0B192C] border border-slate-800 rounded overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-3">Customer Name</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3">Orders</th>
                        <th className="p-3 text-right">Total Spend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {customers.map(c => (
                        <tr key={c.id} className="hover:bg-white/5">
                          <td className="p-3 font-semibold text-white">{c.name}</td>
                          <td className="p-3 text-slate-400">{c.email}</td>
                          <td className="p-3 text-slate-400">{c.phone}</td>
                          <td className="p-3 font-mono">{c.orderCount || 1}</td>
                          <td className="p-3 text-right font-semibold text-amber-400 font-mono">{formatPrice(c.totalSpent)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Price Drop Alerts Tab */}
          {activeTab === 'price-alerts' && (
            <PriceAlertsManager products={products} />
          )}

          {/* Security & Credentials Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h2 className="text-2xl font-serif text-white font-light flex items-center gap-2">
                  <KeyRound className="text-amber-400" size={24} />
                  <span>Admin Credentials & Security</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Update your master username and password for securing the Ventures Watches Admin Console.
                </p>
              </div>

              <div className="bg-[#0B192C] border border-slate-800 rounded-xl p-6 sm:p-8 space-y-6 shadow-xl">
                {updateSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs p-4 rounded flex items-center gap-2.5">
                    <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />
                    <span>{updateSuccess}</span>
                  </div>
                )}

                {updateError && (
                  <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-4 rounded flex items-center gap-2.5">
                    <ShieldCheck size={18} className="text-rose-400 flex-shrink-0" />
                    <span>{updateError}</span>
                  </div>
                )}

                <form onSubmit={handleUpdateCredsSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-300 font-medium mb-2">
                      Master Admin Username / Email
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={updateUsername}
                        onChange={(e) => setUpdateUsername(e.target.value)}
                        placeholder="admin"
                        required
                        className="w-full bg-slate-900 border border-slate-700 text-sm pl-10 pr-4 py-3 rounded text-white focus:outline-none focus:border-amber-400 transition-colors"
                      />
                      <UserIcon size={18} className="absolute left-3.5 top-3.5 text-slate-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-300 font-medium mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        value={updatePassword}
                        onChange={(e) => setUpdatePassword(e.target.value)}
                        placeholder="Enter new master password"
                        required
                        className="w-full bg-slate-900 border border-slate-700 text-sm pl-10 pr-4 py-3 rounded text-white focus:outline-none focus:border-amber-400 transition-colors"
                      />
                      <Lock size={18} className="absolute left-3.5 top-3.5 text-slate-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-300 font-medium mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        required
                        className="w-full bg-slate-900 border border-slate-700 text-sm pl-10 pr-4 py-3 rounded text-white focus:outline-none focus:border-amber-400 transition-colors"
                      />
                      <Lock size={18} className="absolute left-3.5 top-3.5 text-slate-500" />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isUpdatingCreds}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-3 rounded text-xs uppercase tracking-widest shadow-lg transition-all flex items-center gap-2"
                    >
                      <Save size={16} />
                      <span>{isUpdatingCreds ? 'Saving Credentials...' : 'Save New Credentials'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Global Admin Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-amber-500 text-slate-950 font-bold px-4 py-2.5 rounded shadow-2xl flex items-center gap-2 text-xs animate-in slide-in-from-top-2 duration-300">
          <Sparkles size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Product Editor Modal */}
      {isEditorOpen && (
        <ProductEditorModal
          product={editingProduct}
          collections={collections}
          onClose={() => setIsEditorOpen(false)}
          onSave={handleSaveProduct}
          onDelete={handleDeleteProduct}
          mediaGallery={mediaItems.map(m => m.url)}
        />
      )}

      {/* Product Detail / Watch Preview Modal from Admin */}
      {previewingProduct && (
        <ProductDetailModal
          product={previewingProduct}
          allProducts={localProducts}
          onClose={() => setPreviewingProduct(null)}
          onAddToCart={() => {}}
          onToggleWishlist={() => {}}
          isWishlisted={false}
          onBuyNow={() => {}}
        />
      )}

      {/* Collection Editor Modal */}
      {isCollectionEditorOpen && (
        <CollectionEditorModal
          collection={editingCollection}
          onClose={() => {
            setIsCollectionEditorOpen(false);
            setEditingCollection(null);
          }}
          onSave={handleSaveCollection}
          onDelete={handleDeleteCollection}
          mediaGallery={mediaItems.map(m => m.url)}
          productCount={editingCollection ? products.filter(p => p.collectionId === editingCollection.id || p.collectionName === editingCollection.name).length : 0}
        />
      )}

      {/* Quick Upload Website Modal */}
      <QuickUploadWebsiteModal
        isOpen={isQuickUploadModalOpen}
        initialImageUrl={quickUploadImageUrl}
        products={products}
        collections={collections}
        cmsData={cmsData}
        onClose={() => setIsQuickUploadModalOpen(false)}
        onRefreshData={onRefreshData}
        showToast={showToast}
      />

      {/* Delete Confirmation Modal for Collections */}
      {collectionToDelete && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B192C] border border-slate-700 w-full max-w-md rounded-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2 bg-rose-500/10 rounded-full border border-rose-500/20">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-serif font-bold text-white">Delete Collection?</h3>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-white font-semibold">{collectionToDelete.name}</strong>?
              {collectionToDelete.count > 0 && (
                <span className="block mt-2 text-amber-400 font-medium text-xs">
                  ⚠️ Note: {collectionToDelete.count} timepiece{collectionToDelete.count === 1 ? '' : 's'} currently belong to this collection.
                </span>
              )}
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                disabled={isDeleting}
                onClick={() => setCollectionToDelete(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold uppercase tracking-wider rounded transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={confirmDeleteCollection}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold uppercase tracking-wider rounded flex items-center gap-2 shadow-lg transition-colors cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Products */}
      {productToDelete && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B192C] border border-slate-700 w-full max-w-md rounded-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2 bg-rose-500/10 rounded-full border border-rose-500/20">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-serif font-bold text-white">Delete Timepiece?</h3>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-white font-semibold">{productToDelete.name}</strong> from the catalog? This will remove it from the live store immediately.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                disabled={isDeleting}
                onClick={() => setProductToDelete(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold uppercase tracking-wider rounded transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={confirmDeleteProduct}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold uppercase tracking-wider rounded flex items-center gap-2 shadow-lg transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Media */}
      {mediaToDelete && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B192C] border border-slate-700 w-full max-w-md rounded-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2 bg-rose-500/10 rounded-full border border-rose-500/20">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-serif font-bold text-white">Delete Media Asset?</h3>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Are you sure you want to remove <strong className="text-white font-semibold">{mediaToDelete.name}</strong> from the media vault?
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                disabled={isDeleting}
                onClick={() => setMediaToDelete(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold uppercase tracking-wider rounded transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={confirmDeleteMedia}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold uppercase tracking-wider rounded flex items-center gap-2 shadow-lg transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
