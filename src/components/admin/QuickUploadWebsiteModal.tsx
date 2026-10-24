import React, { useState } from 'react';
import { Product, Collection, WatchSpecs } from '../../types';
import { saveProduct, saveCMSData, updateCollection, uploadMedia, uploadMediaFile } from '../../services/api';
import { X, Upload, Sparkles, Check, Watch, Folder, Image as ImageIcon, Link as LinkIcon, ShieldCheck, Trash2, Plus } from 'lucide-react';

interface QuickUploadWebsiteModalProps {
  isOpen: boolean;
  initialImageUrl?: string;
  products: Product[];
  collections: Collection[];
  cmsData: any;
  onClose: () => void;
  onRefreshData: () => void;
  showToast: (msg: string) => void;
}

export const QuickUploadWebsiteModal: React.FC<QuickUploadWebsiteModalProps> = ({
  isOpen,
  initialImageUrl = '',
  products,
  collections,
  cmsData,
  onClose,
  onRefreshData,
  showToast
}) => {
  const [imageUrl, setImageUrl] = useState<string>(initialImageUrl);
  const [uploadedImages, setUploadedImages] = useState<string[]>(initialImageUrl ? [initialImageUrl] : []);
  const [fileName, setFileName] = useState<string>('');
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [publishType, setPublishType] = useState<'new-product' | 'existing-product' | 'hero' | 'category-tier' | 'craftsmanship' | 'curated-horology' | 'collection'>('new-product');

  // New product form
  const [watchName, setWatchName] = useState('Ventures Grand Chronograph');
  const [price, setPrice] = useState(480000);
  const [comparePriceInput, setComparePriceInput] = useState<string>('');
  const [selectedCollectionId, setSelectedCollectionId] = useState(collections[0]?.id || 'col-1');
  const [category, setCategory] = useState('Automatic');
  const [shortDesc, setShortDesc] = useState('Masterpiece timepiece with precision hand-finishing.');

  // Existing target selection
  const [targetProductId, setTargetProductId] = useState(products[0]?.id || '');
  const [targetCollectionId, setTargetCollectionId] = useState(collections[0]?.id || '');
  const [selectedCategoryTier, setSelectedCategoryTier] = useState<'original' | 'clone' | 'copy'>('original');
  const [isMainCover, setIsMainCover] = useState(true);

  const [isPublishing, setIsPublishing] = useState(false);
  const [fileType, setFileType] = useState<string>('image');

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileList: File[] = Array.from(files);
      const isVid = Boolean(fileList[0].type?.startsWith('video/') || fileList[0].name.match(/\.(mp4|webm|mov|m4v|mkv|avi|3gp|wmv|flv|ogv|ts|m2ts)$/i));
      setFileType(isVid ? 'video/mp4' : (fileList[0].type || 'image/jpeg'));
      setFileName(fileList.length === 1 ? fileList[0].name : `${fileList.length} files selected`);

      try {
        if (isVid) {
          showToast('⏳ Uploading video file to server...');
          const uploadedUrl = await uploadMediaFile(fileList[0], publishType === 'hero' ? 'Homepage Hero' : 'Website Showcase');
          setImageUrl(uploadedUrl);
          setUploadedImages([uploadedUrl]);
          showToast('🎬 Video uploaded & ready to publish!');
        } else {
          showToast(`⏳ Uploading ${fileList.length} watch picture(s)...`);
          const newUrls: string[] = [];
          for (let i = 0; i < fileList.length; i++) {
            const uploadedUrl = await uploadMediaFile(fileList[i], publishType === 'hero' ? 'Homepage Hero' : 'Website Showcase');
            if (uploadedUrl) {
              newUrls.push(uploadedUrl);
            }
          }
          if (newUrls.length > 0) {
            setUploadedImages(prev => [...prev, ...newUrls]);
            if (!imageUrl || !uploadedImages.length) {
              setImageUrl(newUrls[0]);
            }
            showToast(`📸 ${newUrls.length} photo(s) stored & added! Ready to publish.`);
          }
        }
      } catch (err) {
        showToast('❌ Upload failed.');
      } finally {
        e.target.value = '';
      }
    }
  };

  const handleAddUrl = () => {
    if (imageUrl.trim()) {
      const urls = imageUrl.split(/[\n,\r\s]+/).map(u => u.trim()).filter(u => u.length > 5);
      if (urls.length > 0) {
        setUploadedImages(prev => Array.from(new Set([...prev, ...urls])));
        setImageUrl(urls[0]);
        showToast(`Added ${urls.length} image link(s)!`);
      }
    }
  };

  const handleSetCoverImage = (index: number) => {
    const list = [...uploadedImages];
    const selected = list.splice(index, 1)[0];
    list.unshift(selected);
    setUploadedImages(list);
    setImageUrl(selected);
  };

  const handleRemoveUploadedImage = (index: number) => {
    const list = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(list);
    if (list.length > 0) {
      setImageUrl(list[0]);
    } else {
      setImageUrl('');
    }
  };

  const isVideo = fileType.startsWith('video/') ||
    imageUrl.startsWith('data:video/') ||
    Boolean(imageUrl.match(/\.(mp4|webm|mov|m4v|mkv|avi|3gp|wmv|flv|ogv|ts|m2ts)(\?.*)?$/i)) ||
    imageUrl.includes('/videos/') ||
    imageUrl.includes('youtube') ||
    imageUrl.includes('vimeo') ||
    imageUrl.includes('drive.google') ||
    imageUrl.includes('streamable') ||
    imageUrl.includes('tiktok') ||
    imageUrl.includes('loom.com') ||
    imageUrl.includes('wistia') ||
    imageUrl.includes('dropbox') ||
    imageUrl.includes('1drv.ms') ||
    imageUrl.includes('<iframe');

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    const allImages = uploadedImages.length > 0 ? uploadedImages : (imageUrl ? [imageUrl] : []);
    if (allImages.length === 0 && !imageUrl) {
      alert('Please upload picture(s) or enter a media URL first!');
      return;
    }

    setIsPublishing(true);

    try {
      // Record media items in library
      for (const img of allImages) {
        await uploadMedia({
          url: img,
          name: fileName || `Watch-Media-${Date.now().toString().slice(-4)}.${isVideo ? 'mp4' : 'jpg'}`,
          type: isVideo ? 'video' : 'image',
          category: publishType === 'hero' ? 'Homepage Hero' : 'Store Picture'
        });
      }

      if (publishType === 'new-product') {
        const targetCol = collections.find(c => c.id === selectedCollectionId);
        const newProduct: Partial<Product> = {
          name: watchName,
          slug: watchName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          sku: `VW-${Math.floor(1000 + Math.random() * 9000)}`,
          shortDescription: shortDesc,
          description: `${watchName} is engineered with unyielding craftsmanship. Featuring high-grade corrosion resistant alloy and multi-layer anti-reflective sapphire crystal.`,
          price: Number(price),
          compareAtPrice: (comparePriceInput.trim() !== '' && !isNaN(Number(comparePriceInput)) && Number(comparePriceInput) > 0) ? Number(comparePriceInput) : null,
          currency: 'PKR',
          collectionId: selectedCollectionId,
          collectionName: targetCol ? targetCol.name : 'Ventures Collection',
          category,
          stock: 5,
          status: 'published',
          featured: true,
          newArrival: true,
          images: allImages,
          specifications: {
            caseMaterial: '904L Corrosion-Resistant Stainless Steel',
            caseSize: '41 mm',
            dialColor: 'Custom Hand-Crafted Dial',
            crystal: 'Scratch-Resistant Sapphire with AR Coating',
            strapMaterial: 'Solid Steel / Hand-Stitched Leather',
            powerReserve: '72 Hours',
            warranty: '3 Days Warranty'
          }
        };

        await saveProduct(newProduct);
        showToast(`✨ Success! "${watchName}" with ${allImages.length} photo(s) published & live on storefront!`);
      } else if (publishType === 'existing-product') {
        const targetProd = products.find(p => p.id === targetProductId);
        if (targetProd) {
          const currentImages = targetProd.images || [];
          const updatedImages = isMainCover
            ? [...allImages, ...currentImages.filter(img => !allImages.includes(img))]
            : Array.from(new Set([...currentImages, ...allImages]));

          await saveProduct({
            ...targetProd,
            images: updatedImages
          });
          showToast(`⌚ ${allImages.length} photo(s) attached to "${targetProd.name}" on website!`);
        }
      } else if (publishType === 'hero') {
        const mainUrl = allImages[0] || imageUrl;
        if (isVideo) {
          await saveCMSData({
            ...cmsData,
            heroVideoUrl: mainUrl
          });
          showToast('🎬 Homepage Hero Watch Dial Motion Video updated & live!');
        } else {
          await saveCMSData({
            ...cmsData,
            heroImageUrl: mainUrl
          });
          showToast('🌟 Homepage Hero background picture updated on website!');
        }
      } else if (publishType === 'category-tier') {
        const mainUrl = allImages[0] || imageUrl;
        const tierName = selectedCategoryTier === 'original'
          ? 'Original Watches (Authentic Luxury Watches)'
          : selectedCategoryTier === 'clone'
          ? 'Clone Watches (1:1 Super Clone Engineering)'
          : 'Copy Watches (Accessible Style & Everyday Elegance)';

        await saveCMSData({
          ...cmsData,
          ...(selectedCategoryTier === 'original' ? { originalWatchesImage: mainUrl } : {}),
          ...(selectedCategoryTier === 'clone' ? { cloneWatchesImage: mainUrl } : {}),
          ...(selectedCategoryTier === 'copy' ? { copyWatchesImage: mainUrl } : {})
        });
        showToast(`💎 ${tierName} showcase picture updated live on website!`);
      } else if (publishType === 'craftsmanship') {
        const mainUrl = allImages[0] || imageUrl;
        await saveCMSData({
          ...cmsData,
          craftsmanshipImageUrl: mainUrl,
          craftsmanshipImage: mainUrl
        });
        showToast('🎨 Craftsmanship section media updated on website!');
      } else if (publishType === 'curated-horology') {
        const mainUrl = allImages[0] || imageUrl;
        await saveCMSData({
          ...cmsData,
          editorialImage: mainUrl
        });
        showToast('✨ Curated Timepieces section picture updated on website!');
      } else if (publishType === 'collection') {
        const mainUrl = allImages[0] || imageUrl;
        const targetCol = collections.find(c => c.id === targetCollectionId);
        if (targetCol) {
          await updateCollection(targetCollectionId, { image: mainUrl });
          showToast(`📁 Cover media updated for collection "${targetCol.name}" on website!`);
        }
      }

      onRefreshData();
      onClose();
    } catch (err) {
      console.error('Publish error:', err);
      alert('Failed to publish picture. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#0B192C] text-slate-100 w-full max-w-3xl rounded-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#070F1E] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
              <Upload size={20} />
            </div>
            <div>
              <h2 className="text-sm uppercase tracking-[0.2em] font-bold text-white flex items-center gap-2">
                <span>Upload Photos to Website</span>
                <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-mono font-bold">
                  MULTI-PHOTO
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">Add multiple watch pictures directly to your storefront catalog, products, or collections.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handlePublish} className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* STEP 1: Upload or Choose Pictures */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-mono">1</span>
                <span>Select Multiple Watch Pictures or Image URLs</span>
                {uploadedImages.length > 0 && (
                  <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-[10px] font-mono">
                    {uploadedImages.length} Photos Selected
                  </span>
                )}
              </label>

              <div className="flex gap-1 bg-slate-900 p-1 rounded border border-slate-800">
                <button
                  type="button"
                  onClick={() => setUploadMode('file')}
                  className={`px-3 py-1 text-[11px] font-semibold rounded transition-colors ${uploadMode === 'file' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                >
                  Local Files
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('url')}
                  className={`px-3 py-1 text-[11px] font-semibold rounded transition-colors ${uploadMode === 'url' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                >
                  Image URLs
                </button>
              </div>
            </div>

            {uploadMode === 'file' ? (
              <div className="border-2 border-dashed border-slate-700 hover:border-amber-500 rounded-lg p-6 text-center bg-slate-900/50 hover:bg-slate-900 transition-all cursor-pointer relative group">
                <input
                  type="file"
                  accept="image/*,video/*,.mp4,.webm,.mov,.m4v"
                  multiple
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="space-y-2 pointer-events-none">
                  <Upload className="mx-auto text-amber-400 group-hover:scale-110 transition-transform" size={32} />
                  <div className="text-xs font-semibold text-white">
                    {fileName ? `Files: ${fileName}` : 'Click or Drag & Drop multiple watch photos here'}
                  </div>
                  <div className="text-[10px] text-slate-400">Select one or more photos at once (JPG, PNG, WEBP)</div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste image URL (or multiple URLs separated by commas)..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 p-2.5 text-xs text-white rounded focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddUrl}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 text-xs font-bold uppercase rounded flex items-center gap-1"
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>
            )}

            {/* Uploaded Photos Thumbnails Grid */}
            {uploadedImages.length > 0 && (
              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-300 font-semibold">
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <Check size={14} className="text-emerald-400" />
                    <span>Attached Photos ({uploadedImages.length}):</span>
                  </span>
                  <label className="text-[10px] text-amber-300 hover:underline cursor-pointer flex items-center gap-1">
                    <Plus size={12} /> Add More Photos
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 pt-1">
                  {uploadedImages.map((img, idx) => {
                    const isCover = idx === 0;
                    return (
                      <div key={idx} className={`relative aspect-square rounded-md overflow-hidden border ${isCover ? 'border-amber-500 ring-2 ring-amber-500/50' : 'border-slate-700'} group bg-slate-950`}>
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <span className={`absolute top-1 left-1 text-[8px] font-mono px-1 py-0.5 rounded font-bold ${isCover ? 'bg-amber-500 text-slate-950' : 'bg-black/75 text-white'}`}>
                          {isCover ? '★ Cover' : `#${idx + 1}`}
                        </span>
                        
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5">
                          <button
                            type="button"
                            onClick={() => handleRemoveUploadedImage(idx)}
                            className="self-end p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full"
                            title="Remove photo"
                          >
                            <Trash2 size={11} />
                          </button>
                          {!isCover && (
                            <button
                              type="button"
                              onClick={() => handleSetCoverImage(idx)}
                              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 text-[9px] font-bold py-0.5 rounded"
                            >
                              Set Cover
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: Choose Where it Updates / Adds to Website */}
          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2 border-b border-slate-800 pb-2">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-mono">2</span>
              <span>Where should these picture(s) appear on your website?</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'new-product', title: '✨ Add as NEW Watch Product', desc: 'Create a brand new published timepiece with these picture(s) on the store.' },
                { id: 'existing-product', title: '⌚ Add to Existing Watch', desc: 'Attach these picture(s) to an existing watch gallery in your catalog.' },
                { id: 'category-tier', title: '💎 Category Tier Showcase', desc: 'Update tabs for Authentic Luxury, Super Clone, or Accessible Style in Our Watch Categories.' },
                { id: 'collection', title: '📁 Set as Collection Cover', desc: 'Change the banner image for a specific watch collection (Original, Clone, or Copy).' },
                { id: 'hero', title: '🌟 Set as Homepage Hero', desc: 'Replace the main background hero picture on the homepage.' },
                { id: 'craftsmanship', title: '🎨 Set as Craftsmanship Image', desc: 'Update the craftsmanship section photo on your homepage.' },
                { id: 'curated-horology', title: '📖 Set as Curated Timepieces Picture', desc: 'Update the editorial story photo in the Timepieces Worth Discovering section.' }
              ].map(opt => (
                <div
                  key={opt.id}
                  onClick={() => setPublishType(opt.id as any)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${publishType === opt.id ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/50' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'}`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="publishType"
                      checked={publishType === opt.id}
                      onChange={() => setPublishType(opt.id as any)}
                      className="accent-amber-500"
                    />
                    <span className="text-xs font-bold text-white">{opt.title}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 pl-5">{opt.desc}</p>
                </div>
              ))}
            </div>

            {/* Dynamic Options Form based on Publish Type */}
            {publishType === 'new-product' && (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-3 animate-in fade-in duration-200">
                <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">New Watch Details</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">Watch Name *</label>
                    <input
                      type="text"
                      required
                      value={watchName}
                      onChange={(e) => setWatchName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 p-2 text-xs text-white rounded"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">Price (PKR ₨) *</label>
                    <input
                      type="number"
                      required
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 p-2 text-xs text-white rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                    Compare At / Strikethrough Price (PKR ₨) - Optional
                  </label>
                  <input
                    type="number"
                    placeholder="Leave empty for no strikethrough comparison"
                    value={comparePriceInput}
                    onChange={(e) => setComparePriceInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 p-2 text-xs text-white rounded"
                  />
                  <span className="text-[9px] text-slate-500 mt-0.5 block">
                    If empty, no crossed-out original price will be shown.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">Collection</label>
                    <select
                      value={selectedCollectionId}
                      onChange={(e) => setSelectedCollectionId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 p-2 text-xs text-white rounded"
                    >
                      {collections.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 p-2 text-xs text-white rounded"
                    >
                      <option value="Automatic">Automatic</option>
                      <option value="Chronograph">Chronograph</option>
                      <option value="Skeleton">Skeleton</option>
                      <option value="Grand Complication">Grand Complication</option>
                      <option value="Limited Edition">Limited Edition</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {publishType === 'existing-product' && (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-3">
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1">Select Target Watch Product *</label>
                  <select
                    value={targetProductId}
                    onChange={(e) => setTargetProductId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 p-2 text-xs text-white rounded"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isMainCover"
                    checked={isMainCover}
                    onChange={(e) => setIsMainCover(e.target.checked)}
                    className="accent-amber-500"
                  />
                  <label htmlFor="isMainCover" className="text-xs text-slate-300">
                    Set first photo as Main Cover Picture (Front card image on storefront)
                  </label>
                </div>
              </div>
            )}

            {publishType === 'category-tier' && (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-3 animate-in fade-in duration-200">
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">Select Category Showcase Tab *</label>
                <select
                  value={selectedCategoryTier}
                  onChange={(e) => setSelectedCategoryTier(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 p-2 text-xs text-white rounded"
                >
                  <option value="original">Tab 1: Authentic Luxury Watches (Original Watches)</option>
                  <option value="clone">Tab 2: 1:1 Super Clone Engineering (Clone Watches)</option>
                  <option value="copy">Tab 3: Accessible Style & Everyday Elegance (Copy Watches)</option>
                </select>
                <p className="text-[10px] text-amber-400/90 font-mono">
                  ✨ This updates the deep-dive tab image in "Our Watch Categories" independently from the collection banners.
                </p>
              </div>
            )}

            {publishType === 'collection' && (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-3">
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1">Select Collection Category *</label>
                  <select
                    value={targetCollectionId}
                    onChange={(e) => setTargetCollectionId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 p-2 text-xs text-white rounded"
                  >
                    {collections.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    📁 Updates the card banner image in the "Exploration Line" and "Watch Collections" catalog view.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Footer Button */}
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPublishing || (!imageUrl && uploadedImages.length === 0)}
              className={`px-6 py-2.5 text-xs uppercase font-bold tracking-wider rounded flex items-center gap-2 shadow-lg transition-all ${isPublishing || (!imageUrl && uploadedImages.length === 0) ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-400 text-slate-950'}`}
            >
              <Sparkles size={16} />
              <span>{isPublishing ? 'Publishing to Website...' : `⚡ Publish Photo${uploadedImages.length > 1 ? 's' : ''} & Update Website Now`}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

