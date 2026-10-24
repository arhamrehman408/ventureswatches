import React, { useState, useEffect, useRef } from 'react';
import { Product, Collection, WatchSpecs } from '../../types';
import {
  X, Save, Image, Plus, Trash2, ShieldCheck, Upload, Folder, Check,
  Video, Sparkles, Layers, Tag, DollarSign, Eye, EyeOff,
  Settings2, FileText, Compass, ArrowLeft, ArrowRight,
  Mic, MicOff, Wand2, Loader2, Sparkle
} from 'lucide-react';
import { uploadMediaFile, geminiAutofillProductDraft } from '../../services/api';

interface ProductEditorModalProps {
  product: Product | null; // null if creating new
  collections: Collection[];
  onClose: () => void;
  onSave: (product: Partial<Product>) => void;
  onDelete?: (id: string) => void;
  mediaGallery?: string[];
}

export const ProductEditorModal: React.FC<ProductEditorModalProps> = ({
  product,
  collections,
  onClose,
  onSave,
  onDelete,
  mediaGallery = []
}) => {
  // Standard known specs keys
  const standardSpecKeys = [
    'movement', 'caseMaterial', 'caseSize', 'caseThickness', 'thickness', 'diameter',
    'dialColor', 'crystal', 'strapMaterial', 'waterResistance',
    'powerReserve', 'warranty'
  ];

  // Extract any custom specs already stored in product.specifications
  const initialCustomSpecs: { key: string; value: string }[] = [];
  if (product?.specifications) {
    Object.entries(product.specifications).forEach(([k, v]) => {
      if (!standardSpecKeys.includes(k) && typeof v === 'string') {
        initialCustomSpecs.push({ key: k, value: v });
      }
    });
  }

  const [customSpecs, setCustomSpecs] = useState<{ key: string; value: string }[]>(initialCustomSpecs);
  const [newCustomSpecKey, setNewCustomSpecKey] = useState('');
  const [newCustomSpecVal, setNewCustomSpecVal] = useState('');

  const initialComparePrice = (product?.compareAtPrice !== undefined && product?.compareAtPrice !== null && !isNaN(Number(product.compareAtPrice)) && Number(product.compareAtPrice) > 0)
    ? String(product.compareAtPrice)
    : '';
  const [compareAtPriceInput, setCompareAtPriceInput] = useState<string>(initialComparePrice);

  const [formData, setFormData] = useState<Partial<Product>>({
    id: product?.id || `prod-${Date.now()}`,
    name: product?.name || '',
    slug: product?.slug || '',
    sku: product?.sku || `VW-${Math.floor(1000 + Math.random() * 9000)}`,
    shortDescription: product?.shortDescription || '',
    description: product?.description || '',
    price: product?.price || 450000,
    compareAtPrice: initialComparePrice ? Number(initialComparePrice) : null,
    currency: product?.currency || 'PKR',
    collectionId: product?.collectionId || (collections[0]?.id || 'col-1'),
    collectionName: product?.collectionName || (collections[0]?.name || 'Original Watches'),
    category: product?.category || 'Automatic',
    stock: product?.stock !== undefined ? product.stock : 5,
    status: product?.status || 'published',
    featured: product?.featured ?? true,
    newArrival: product?.newArrival ?? true,
    images: Array.isArray(product?.images) ? [...product.images] : [],
    videos: Array.isArray(product?.videos) ? [...product.videos] : [],
    specifications: {
      caseMaterial: product?.specifications?.caseMaterial || '904L Corrosion-Resistant Stainless Steel',
      caseSize: product?.specifications?.caseSize || product?.specifications?.diameter || '',
      caseThickness: product?.specifications?.caseThickness || product?.specifications?.thickness || '',
      dialColor: product?.specifications?.dialColor || '',
      crystal: product?.specifications?.crystal || 'Scratch-Resistant Sapphire with AR Coating',
      strapMaterial: product?.specifications?.strapMaterial || 'Solid Steel / Hand-Stitched Leather',
      powerReserve: product?.specifications?.powerReserve || '72 Hours',
      warranty: product?.specifications?.warranty || '3 Days Warranty',
      ...(product?.specifications || {})
    },
    seo: {
      metaTitle: product?.seo?.metaTitle || '',
      metaDescription: product?.seo?.metaDescription || ''
    }
  });

  useEffect(() => {
    if (product) {
      const cmp = (product.compareAtPrice !== undefined && product.compareAtPrice !== null && !isNaN(Number(product.compareAtPrice)) && Number(product.compareAtPrice) > 0)
        ? String(product.compareAtPrice)
        : '';
      setCompareAtPriceInput(cmp);
      setFormData(prev => ({
        ...prev,
        ...product,
        compareAtPrice: cmp ? Number(cmp) : null,
        specifications: {
          ...product.specifications,
          caseSize: product.specifications?.caseSize || product.specifications?.diameter || '',
          caseThickness: product.specifications?.caseThickness || product.specifications?.thickness || '',
          warranty: product.specifications?.warranty || '3 Days Warranty'
        }
      }));
    }
  }, [product]);

  const [imageUrlInput, setImageUrlInput] = useState('');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [showSeoSection, setShowSeoSection] = useState(false);

  // Gemini AI Multimodal Assistant State
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(true);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSelectedImage, setAiSelectedImage] = useState<string>('');
  const [isAiListening, setIsAiListening] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiGeneratedSuccess, setAiGeneratedSuccess] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSpeechSupported, setAiSpeechSupported] = useState(true);
  const aiRecognitionRef = useRef<any>(null);

  // Check speech recognition support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setAiSpeechSupported(false);
      }
    }
    return () => {
      if (aiRecognitionRef.current) {
        try { aiRecognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  const toggleSpeechRecognition = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. You can type your watch details directly into the prompt box!");
      return;
    }

    if (isAiListening) {
      if (aiRecognitionRef.current) {
        try { aiRecognitionRef.current.stop(); } catch {}
      }
      setIsAiListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsAiListening(true);
        setAiError(null);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setAiPrompt(prev => {
            const clean = prev.trim();
            return clean ? `${clean} ${transcript.trim()}` : transcript.trim();
          });
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition error:', e);
        setIsAiListening(false);
      };

      recognition.onend = () => {
        setIsAiListening(false);
      };

      aiRecognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Could not start speech recognition:', err);
      setIsAiListening(false);
    }
  };

  const handleAiAutofill = async () => {
    const candidateImage = aiSelectedImage || (formData.images && formData.images[0]) || '';
    if (!candidateImage && !aiPrompt.trim()) {
      setAiError("Please select a watch photo or speak/type notes about the watch.");
      return;
    }

    if (isAiListening && aiRecognitionRef.current) {
      try { aiRecognitionRef.current.stop(); } catch {}
      setIsAiListening(false);
    }

    setIsAiGenerating(true);
    setAiError(null);
    setAiGeneratedSuccess(false);

    try {
      const result = await geminiAutofillProductDraft({
        image: candidateImage,
        prompt: aiPrompt,
        collections
      });

      if (result.success && result.productDraft) {
        const draft = result.productDraft;

        setFormData(prev => {
          const mergedImages = Array.from(new Set([
            ...(candidateImage ? [candidateImage] : []),
            ...(prev.images || [])
          ]));

          return {
            ...prev,
            name: draft.name || prev.name,
            collectionId: draft.collectionId || prev.collectionId,
            collectionName: draft.collectionName || prev.collectionName,
            category: draft.category || prev.category,
            price: typeof draft.price === 'number' ? draft.price : prev.price,
            compareAtPrice: typeof draft.compareAtPrice === 'number' ? draft.compareAtPrice : prev.compareAtPrice,
            sku: draft.sku || prev.sku,
            stock: typeof draft.stock === 'number' ? draft.stock : prev.stock,
            status: 'draft', // STRICTLY SAVED AS DRAFT: NEVER AUTO-LIVE!
            shortDescription: draft.shortDescription || prev.shortDescription,
            description: draft.description || prev.description,
            specifications: {
              ...(prev.specifications || {}),
              ...(draft.specifications || {})
            },
            seo: {
              metaTitle: draft.seo?.metaTitle || prev.seo?.metaTitle || '',
              metaDescription: draft.seo?.metaDescription || prev.seo?.metaDescription || ''
            },
            images: mergedImages
          };
        });

        if (draft.compareAtPrice) {
          setCompareAtPriceInput(String(draft.compareAtPrice));
        }

        setAiGeneratedSuccess(true);
      } else {
        setAiError(result.error || "Could not generate details. Please check the image and notes.");
      }
    } catch (err: any) {
      setAiError(err?.message || "AI auto-fill encountered an error.");
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Filter out any legacy invalid media URLs
  const allGalleryOptions = Array.from(new Set(
    mediaGallery.filter(url => Boolean(url && !url.includes('1787123150539') && !url.includes('1787123202086') && !url.includes('1787123229539') && !url.includes('1787122972078') && !url.includes('1787122997494') && !url.includes('1787122983955') && !url.includes('1787123090324')))
  ));

  const handleCollectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'custom') {
      setFormData(prev => ({
        ...prev,
        collectionId: `col-${Date.now()}`,
        collectionName: prev.collectionName || 'Custom Collection'
      }));
    } else {
      const selectedCol = collections.find(c => c.id === val);
      setFormData(prev => ({
        ...prev,
        collectionId: val,
        collectionName: selectedCol ? selectedCol.name : prev.collectionName || 'Original Watches'
      }));
    }
  };

  const handleSpecChange = (key: keyof WatchSpecs, value: string) => {
    setFormData(prev => ({
      ...prev,
      specifications: {
        ...(prev.specifications as WatchSpecs),
        [key]: value
      }
    }));
  };

  const handleAddCustomSpec = () => {
    if (!newCustomSpecKey.trim() || !newCustomSpecVal.trim()) return;
    const cleanKey = newCustomSpecKey.trim();
    const cleanVal = newCustomSpecVal.trim();
    setCustomSpecs(prev => [...prev.filter(s => s.key !== cleanKey), { key: cleanKey, value: cleanVal }]);
    setFormData(prev => ({
      ...prev,
      specifications: {
        ...(prev.specifications as WatchSpecs),
        [cleanKey]: cleanVal
      }
    }));
    setNewCustomSpecKey('');
    setNewCustomSpecVal('');
  };

  const handleRemoveCustomSpec = (keyToRemove: string) => {
    setCustomSpecs(prev => prev.filter(s => s.key !== keyToRemove));
    setFormData(prev => {
      const updatedSpecs: any = { ...(prev.specifications || {}) };
      delete updatedSpecs[keyToRemove];
      return { ...prev, specifications: updatedSpecs };
    });
  };

  const processFiles = async (fileList: File[]) => {
    if (fileList.length === 0) return;
    setIsUploading(true);
    const uploadedUrls: string[] = [];
    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        setUploadStatusText(`Uploading photo ${i + 1} of ${fileList.length} (${file.name})...`);
        const uploadedUrl = await uploadMediaFile(file, 'Product Photography');
        if (uploadedUrl) {
          uploadedUrls.push(uploadedUrl);
        }
      }
      if (uploadedUrls.length > 0) {
        setFormData(prev => ({
          ...prev,
          images: [...(prev.images || []), ...uploadedUrls]
        }));
      }
    } catch (err) {
      console.error('File upload failed:', err);
    } finally {
      setIsUploading(false);
      setUploadStatusText('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFiles(Array.from(files));
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = (Array.from(e.dataTransfer.files) as File[]).filter(f => f.type.startsWith('image/'));
      if (files.length > 0) {
        await processFiles(files);
      }
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingVideo(true);
      try {
        const uploadedUrl = await uploadMediaFile(file, 'Product Video Clip');
        if (uploadedUrl) {
          setFormData(prev => ({
            ...prev,
            videos: [...(prev.videos || []), uploadedUrl]
          }));
        }
      } catch (err) {
        console.error('Video upload failed:', err);
      } finally {
        setIsUploadingVideo(false);
        e.target.value = '';
      }
    }
  };

  const handleAddImage = () => {
    if (imageUrlInput.trim()) {
      // Allow pasting multiple URLs separated by commas, newlines, or whitespace
      const urls = imageUrlInput
        .split(/[\n,\r\s]+/)
        .map(u => u.trim())
        .filter(u => u.length > 5);

      if (urls.length > 0) {
        setFormData(prev => ({
          ...prev,
          images: [...(prev.images || []), ...urls]
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          images: [...(prev.images || []), imageUrlInput.trim()]
        }));
      }
      setImageUrlInput('');
    }
  };

  const handleAddVideo = () => {
    if (videoUrlInput.trim()) {
      setFormData(prev => ({
        ...prev,
        videos: [...(prev.videos || []), videoUrlInput.trim()]
      }));
      setVideoUrlInput('');
    }
  };

  const handleRemoveImage = (idx: number) => {
    const updated = (formData.images || []).filter((_, i) => i !== idx);
    setFormData(prev => ({ ...prev, images: updated }));
  };

  const handleSetCover = (idx: number) => {
    const list = [...(formData.images || [])];
    const selected = list.splice(idx, 1)[0];
    list.unshift(selected);
    setFormData(prev => ({ ...prev, images: list }));
  };

  const handleMoveImage = (idx: number, direction: 'left' | 'right') => {
    const list = [...(formData.images || [])];
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    setFormData(prev => ({ ...prev, images: list }));
  };

  const handleRemoveVideo = (idx: number) => {
    const updated = (formData.videos || []).filter((_, i) => i !== idx);
    setFormData(prev => ({ ...prev, videos: updated }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    // Build complete specifications including custom specs and background defaults
    const completeSpecs: any = {
      caseMaterial: formData.specifications?.caseMaterial || '904L Corrosion-Resistant Stainless Steel',
      dialColor: formData.specifications?.dialColor || 'Custom Hand-Crafted Dial',
      crystal: formData.specifications?.crystal || 'Scratch-Resistant Sapphire with AR Coating',
      strapMaterial: formData.specifications?.strapMaterial || 'Solid Steel / Hand-Stitched Leather',
      powerReserve: formData.specifications?.powerReserve || '72 Hours',
      warranty: (formData.specifications?.warranty || '3 Days Warranty').replace(/guarantee/gi, 'Warranty'),
      ...(formData.specifications || {})
    };

    // Case Diameter (Optional) - only save if provided, do not force default
    if (formData.specifications?.caseSize && formData.specifications.caseSize.trim()) {
      completeSpecs.caseSize = formData.specifications.caseSize.trim();
    } else {
      delete completeSpecs.caseSize;
    }

    // Case Thickness (Optional) - only save if provided, do not force default
    if (formData.specifications?.caseThickness && formData.specifications.caseThickness.trim()) {
      completeSpecs.caseThickness = formData.specifications.caseThickness.trim();
    } else {
      delete completeSpecs.caseThickness;
    }

    // Ensure removed/normalized legacy fields are not saved
    delete completeSpecs.movement;
    delete completeSpecs.waterResistance;
    delete completeSpecs.thickness;
    delete completeSpecs.diameter;

    customSpecs.forEach(cs => {
      if (cs.key && cs.value) {
        completeSpecs[cs.key] = cs.value;
      }
    });

    // Auto-generate slug and sku in background if omitted
    const finalSlug = formData.slug?.trim() ||
      formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') ||
      `prod-${Date.now()}`;

    const finalSku = formData.sku?.trim() ||
      `VWO-${Math.floor(1000 + Math.random() * 9000)}`;

    const finalId = formData.id || `prod-${Date.now()}`;

    // Cleanly parse compareAtPrice - if erased or non-positive, save as null so it doesn't show or retain old cached values
    const cleanedComparePrice = (compareAtPriceInput.trim() !== '' && !isNaN(Number(compareAtPriceInput)) && Number(compareAtPriceInput) > 0)
      ? Number(compareAtPriceInput)
      : null;

    const finalData: Partial<Product> = {
      ...formData,
      id: finalId,
      sku: finalSku,
      slug: finalSlug,
      compareAtPrice: cleanedComparePrice,
      specifications: completeSpecs
    };

    onSave(finalData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-4xl bg-white text-[#0B192C] shadow-2xl rounded-sm overflow-hidden border border-gray-200 my-6">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0B192C] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={20} className="text-amber-400" />
            <div>
              <h2 className="text-xs uppercase tracking-[0.25em] font-semibold text-white">
                {product ? `Edit Timepiece: ${product.name}` : 'Upload New Luxury Timepiece'}
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Streamlined upload form: add multiple watch pictures, pricing, category & story.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-full transition-colors"
            title="Close editor"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8 max-h-[82vh] overflow-y-auto">
          {/* Gemini AI Smart Watch Autofill (Photo + Spoken/Text Prompt) */}
          <div className="bg-gradient-to-br from-[#0B192C] via-[#0E2038] to-[#0B192C] text-white p-5 rounded-sm border border-amber-500/40 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                  <Sparkles size={16} className="text-amber-400 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-amber-300">
                      Gemini AI Auto-Fill (Photo & Voice)
                    </h3>
                    <span className="text-[9px] uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">
                      Staged Draft Mode
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-light mt-0.5">
                    Select a watch photo, speak or type details, and Gemini will prepare a complete ready product. It will <strong>NOT</strong> go live without your explicit approval.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
                className="text-xs text-amber-400 hover:text-white px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded border border-white/10 transition-colors"
              >
                {isAiPanelOpen ? 'Collapse' : 'Expand'}
              </button>
            </div>

            {isAiPanelOpen && (
              <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                {/* Visual Image Selector for AI */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1 space-y-2">
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-amber-200">
                      1. Watch Reference Photo
                    </label>
                    <div className="relative border border-dashed border-amber-500/40 rounded bg-black/30 p-3 text-center flex flex-col items-center justify-center min-h-[120px]">
                      {aiSelectedImage || (formData.images && formData.images[0]) ? (
                        <div className="relative group w-full flex flex-col items-center">
                          <img
                            src={aiSelectedImage || formData.images![0]}
                            alt="Watch reference"
                            className="h-24 w-full object-contain rounded bg-black/40 border border-white/10"
                          />
                          <span className="text-[9px] text-amber-300 font-mono mt-1">Photo Selected</span>
                          <button
                            type="button"
                            onClick={() => setAiSelectedImage('')}
                            className="text-[9px] text-rose-400 hover:text-rose-300 underline mt-0.5"
                          >
                            Clear Photo
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2 py-2">
                          <Image size={24} className="mx-auto text-amber-400/60" />
                          <p className="text-[10px] text-slate-400">
                            Upload a watch photo or select from existing images
                          </p>
                        </div>
                      )}
                      <label className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 hover:text-white text-[10px] font-semibold uppercase tracking-wider rounded cursor-pointer transition-colors">
                        <Upload size={12} />
                        <span>Choose Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              try {
                                const url = await uploadMediaFile(f, 'AI Reference Watch Photo');
                                if (url) {
                                  setAiSelectedImage(url);
                                  setFormData(prev => ({
                                    ...prev,
                                    images: Array.from(new Set([url, ...(prev.images || [])]))
                                  }));
                                }
                              } catch (err) {
                                console.error('Upload error:', err);
                              }
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Voice / Text Dictation Prompter */}
                  <div className="md:col-span-2 space-y-2 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] uppercase tracking-wider font-semibold text-amber-200">
                        2. Spoken Voice or Written Notes
                      </label>
                      <button
                        type="button"
                        onClick={toggleSpeechRecognition}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-semibold uppercase tracking-wider transition-all duration-200 ${
                          isAiListening
                            ? 'bg-rose-500 text-white animate-pulse shadow-lg ring-2 ring-rose-400'
                            : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-white border border-amber-500/40'
                        }`}
                        title="Click to speak watch details"
                      >
                        {isAiListening ? <MicOff size={12} /> : <Mic size={12} />}
                        <span>{isAiListening ? '🎙️ Listening... (Click to Stop)' : '🎙️ Speak Prompt'}</span>
                      </button>
                    </div>

                    <div className="relative flex-1">
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Speak or type watch details here... (e.g. 'Rolex Submariner Date Clone, 904L steel, ceramic black bezel, automatic movement, 185,000 rupees, 3 days warranty')"
                        rows={3}
                        className="w-full h-full min-h-[85px] bg-black/40 border border-white/20 p-2.5 text-xs text-white placeholder:text-slate-400 rounded focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none font-sans"
                      />
                      {isAiListening && (
                        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 text-[9px] text-emerald-400 font-mono bg-black/80 px-2 py-0.5 rounded border border-emerald-500/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          <span>Live Transcribing Speech...</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-light">
                        <span>💡 Tip: Mention price, tier (Clone, Original, Copy), and specs to guide Gemini accurately.</span>
                      </div>
                      <button
                        type="button"
                        disabled={isAiGenerating}
                        onClick={handleAiAutofill}
                        className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded shadow-md transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isAiGenerating ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Gemini Analyzing...</span>
                          </>
                        ) : (
                          <>
                            <Wand2 size={14} />
                            <span>Auto-Fill Details</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {aiError && (
                  <div className="bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs p-2.5 rounded flex items-center gap-2">
                    <X size={14} className="text-rose-400 shrink-0" />
                    <span>{aiError}</span>
                  </div>
                )}

                {/* Staged Draft Banner with Explicit Approval Buttons */}
                {aiGeneratedSuccess && (
                  <div className="bg-gradient-to-r from-emerald-950/60 via-amber-950/40 to-black/60 border border-emerald-500/60 p-3.5 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-300">
                    <div className="flex items-start gap-2.5">
                      <Check size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                          Product Draft Successfully Generated & Staged!
                        </h4>
                        <p className="text-[11px] text-slate-300 font-light mt-0.5">
                          All fields below have been populated. <strong>This product is NOT live on the website yet.</strong> Please review all specifications and choose an action below.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, status: 'published' }));
                          const form = document.querySelector('form');
                          if (form) form.requestSubmit();
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold uppercase tracking-wider rounded flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                      >
                        <Check size={13} />
                        <span>Approve & Publish Live</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, status: 'draft' }));
                          const form = document.querySelector('form');
                          if (form) form.requestSubmit();
                        }}
                        className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-semibold uppercase tracking-wider rounded transition-colors cursor-pointer"
                      >
                        Keep as Draft
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 1. General Identification & Catalog Info */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2 border-gray-200">
              <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-[#0B192C] flex items-center gap-2">
                <Tag size={15} className="text-amber-600" />
                <span>1. General Information & Category</span>
              </h3>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                Streamlined Product Form
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-semibold text-gray-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Submariner Date 41mm Oystersteel"
                  value={formData.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      name: newName
                    }));
                  }}
                  className="w-full border border-gray-300 p-2.5 text-xs focus:border-[#0B192C] focus:ring-1 focus:ring-[#0B192C] focus:outline-none rounded-none font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-semibold text-gray-700 mb-1">
                  Collection Category
                </label>
                <select
                  value={collections.some(c => c.id === formData.collectionId) ? formData.collectionId : 'custom'}
                  onChange={handleCollectionChange}
                  className="w-full border border-gray-300 p-2.5 text-xs focus:border-[#0B192C] focus:outline-none"
                >
                  {collections.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                  <option value="custom">★ Custom / Other Collection...</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-semibold text-gray-700 mb-1">
                  Collection Display Title (Editable)
                </label>
                <input
                  type="text"
                  value={formData.collectionName}
                  onChange={(e) => setFormData({ ...formData, collectionName: e.target.value })}
                  placeholder="e.g. Original Watches or Pouches & Accessories"
                  className="w-full border border-gray-300 p-2.5 text-xs focus:border-[#0B192C] focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-semibold text-gray-700 mb-1">
                  Watch Subcategory
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g. Automatic, Chronograph, Diver"
                  className="w-full border border-gray-300 p-2.5 text-xs focus:border-[#0B192C] focus:outline-none"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {['Automatic', 'Chronograph', 'Quartz', 'Tourbillon', 'Diver'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat })}
                      className="text-[9px] bg-gray-100 hover:bg-amber-100 text-gray-700 px-1.5 py-0.5 rounded transition-colors"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-semibold text-gray-700 mb-1">
                  Inventory Stock Count (Pieces)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 p-2.5 text-xs focus:border-[#0B192C] focus:outline-none"
                  />
                  <div className="flex gap-1">
                    {[0, 1, 5, 10].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFormData({ ...formData, stock: s })}
                        className={`text-[10px] px-2 py-1.5 rounded font-mono border ${
                          formData.stock === s ? 'bg-[#0B192C] text-white border-[#0B192C]' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200'
                        }`}
                      >
                        {s === 0 ? 'Out' : s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-semibold text-gray-700 mb-1">
                  Product Visibility Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full border border-gray-300 p-2.5 text-xs focus:border-[#0B192C] focus:outline-none"
                >
                  <option value="published">🟢 Published (Live on Storefront)</option>
                  <option value="draft">🟡 Draft (Hidden / Private)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-semibold text-gray-700 mb-1">
                Short Summary Description
              </label>
              <input
                type="text"
                value={formData.shortDescription}
                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                placeholder="e.g. Master-crafted automatic timepiece with sapphire crystal."
                className="w-full border border-gray-300 p-2.5 text-xs focus:border-[#0B192C] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-semibold text-gray-700 mb-1">
                Full Watch Story Description
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed craftsmanship notes, provenance, movement engineering..."
                className="w-full border border-gray-300 p-2.5 text-xs focus:border-[#0B192C] focus:outline-none leading-relaxed"
              />
            </div>

            {/* Live Watch Preview: Short Description & Story */}
            {(formData.shortDescription || formData.description) && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded">
                <div className="text-[10px] uppercase font-bold tracking-wider text-amber-700 mb-1.5 flex items-center gap-1.5">
                  <Eye size={12} />
                  <span>Watch Preview Live Display</span>
                </div>
                <div className="space-y-1.5">
                  {formData.shortDescription && (
                    <div className="bg-white border-l-2 border-amber-600 px-3 py-1.5 rounded-r shadow-xs">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-amber-800 block mb-0.5">
                        Short Description
                      </span>
                      <p className="text-xs font-medium text-slate-800">
                        {formData.shortDescription}
                      </p>
                    </div>
                  )}
                  {formData.description && (
                    <p className="text-[11px] text-gray-600 font-light leading-relaxed pl-1">
                      {formData.description}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. Product Photography & Multi-Photo Showcase */}
          <div className="space-y-4 bg-slate-50/70 border border-slate-200 p-4 sm:p-5 rounded-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 border-gray-200 gap-2">
              <div>
                <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-[#0B192C] flex items-center gap-2">
                  <Image size={16} className="text-amber-600" />
                  <span>2. Product Photography Showcase</span>
                  <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                    {formData.images?.length || 0} Photos Added
                  </span>
                </h3>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Select and upload multiple photos at once. The first picture serves as the main catalog cover.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <label className={`cursor-pointer ${isUploading ? 'bg-amber-300 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-400'} text-slate-950 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded flex items-center gap-1.5 shadow-sm transition-colors`}>
                  <Upload size={14} className={isUploading ? 'animate-bounce' : ''} />
                  <span>{isUploading ? (uploadStatusText || 'Uploading...') : 'Upload Multiple Photos'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={isUploading}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setIsGalleryOpen(true)}
                  className="bg-[#0B192C] hover:bg-slate-800 text-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider rounded flex items-center gap-1.5 transition-colors"
                >
                  <Folder size={14} />
                  <span>Media Library</span>
                </button>
              </div>
            </div>

            {/* Drag & Drop Multi-Photo Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-5 text-center transition-all cursor-pointer relative ${
                isDragging
                  ? 'border-amber-500 bg-amber-50/80 scale-[1.01]'
                  : 'border-slate-300 bg-white hover:border-amber-400 hover:bg-amber-50/30'
              }`}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={isUploading}
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="space-y-1.5 pointer-events-none">
                <Upload className="mx-auto text-amber-600" size={24} />
                <div className="text-xs font-bold text-[#0B192C]">
                  Drop multiple watch photos here, or click to browse files
                </div>
                <div className="text-[10px] text-gray-500">
                  Select 2, 3, 5 or more watch photos simultaneously (JPG, PNG, WEBP)
                </div>
                {uploadStatusText && (
                  <div className="text-[11px] text-amber-700 font-semibold animate-pulse pt-1">
                    ⏳ {uploadStatusText}
                  </div>
                )}
              </div>
            </div>

            {/* Multiple URL input */}
            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-semibold text-gray-700">
                Or Paste Image Link(s) (supports multiple URLs separated by commas or new lines)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste one or more image URLs (e.g. https://...)..."
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddImage();
                    }
                  }}
                  className="flex-1 border border-gray-300 p-2 text-xs bg-white focus:border-[#0B192C] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddImage}
                  className="bg-[#0B192C] text-white px-4 py-2 text-xs font-semibold uppercase tracking-wider flex items-center gap-1 hover:bg-amber-600 transition-colors"
                >
                  <Plus size={14} /> Add Photos
                </button>
              </div>
            </div>

            {/* Images Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
              {formData.images?.map((img, idx) => {
                const isPrimary = idx === 0;
                return (
                  <div
                    key={idx}
                    className={`relative aspect-[4/5] bg-white border p-1 group rounded overflow-hidden flex flex-col justify-between shadow-sm transition-all ${
                      isPrimary ? 'ring-2 ring-amber-500 border-amber-500 shadow-md' : 'border-gray-200'
                    }`}
                  >
                    <div className="relative w-full h-full overflow-hidden bg-slate-900 rounded">
                      <img src={img} alt={`Product photo ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                        isPrimary ? 'bg-amber-500 text-slate-950 shadow' : 'bg-black/75 text-white'
                      }`}>
                        {isPrimary ? '★ Cover' : `#${idx + 1}`}
                      </div>
                      
                      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-full shadow"
                          title="Remove picture"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-1 flex items-center justify-between gap-1 pt-1 border-t border-gray-100">
                      {!isPrimary ? (
                        <button
                          type="button"
                          onClick={() => handleSetCover(idx)}
                          className="flex-1 bg-slate-100 hover:bg-amber-500 hover:text-slate-950 text-slate-700 text-[9px] font-bold py-1 rounded transition-colors text-center"
                        >
                          Make Cover
                        </button>
                      ) : (
                        <span className="flex-1 text-[9px] text-amber-700 font-bold text-center py-1">
                          Primary Cover
                        </span>
                      )}

                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveImage(idx, 'left')}
                          className="p-1 text-gray-500 hover:text-[#0B192C] disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move earlier in gallery"
                        >
                          <ArrowLeft size={11} />
                        </button>
                        <button
                          type="button"
                          disabled={idx === (formData.images?.length || 1) - 1}
                          onClick={() => handleMoveImage(idx, 'right')}
                          className="p-1 text-gray-500 hover:text-[#0B192C] disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move later in gallery"
                        >
                          <ArrowRight size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {formData.images && formData.images.length === 0 && (
              <div className="border border-dashed border-gray-300 p-6 text-center text-xs text-gray-500 rounded bg-white">
                No photos attached yet. Click "Upload Multiple Photos", drag & drop pictures, or paste image URLs above.
              </div>
            )}

            {/* Video Showcase Section (Optional) */}
            <div className="pt-3 border-t border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#0B192C] flex items-center gap-1.5">
                  <Video size={14} className="text-amber-600" />
                  <span>Timepiece Motion Video Showcase (Optional)</span>
                </span>
                <label className={`cursor-pointer ${isUploadingVideo ? 'bg-amber-300' : 'bg-slate-800 hover:bg-slate-700'} text-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wider rounded flex items-center gap-1`}>
                  <Upload size={12} />
                  <span>{isUploadingVideo ? 'Uploading Video...' : 'Upload Video File'}</span>
                  <input
                    type="file"
                    accept="video/*"
                    disabled={isUploadingVideo}
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste direct MP4 video link or stream URL..."
                  value={videoUrlInput}
                  onChange={(e) => setVideoUrlInput(e.target.value)}
                  className="flex-1 border border-gray-300 p-2 text-xs bg-white focus:border-[#0B192C] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddVideo}
                  className="bg-[#0B192C] text-white px-4 py-2 text-xs font-semibold uppercase tracking-wider flex items-center gap-1 hover:bg-amber-600 transition-colors"
                >
                  <Plus size={13} /> Add Video
                </button>
              </div>

              {formData.videos && formData.videos.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {formData.videos.map((vid, idx) => (
                    <div key={idx} className="relative bg-slate-900 border border-slate-700 p-2 rounded flex flex-col justify-between">
                      <video src={vid} controls className="w-full h-32 object-cover rounded bg-black" />
                      <div className="flex items-center justify-between pt-2 text-[10px] text-slate-300">
                        <span className="truncate max-w-[200px]">{vid}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveVideo(idx)}
                          className="text-rose-400 hover:text-rose-300 flex items-center gap-1 p-1"
                        >
                          <Trash2 size={12} /> Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3. Pricing, Currency & Marketing Badges */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2 border-gray-200">
              <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-[#0B192C] flex items-center gap-2">
                <DollarSign size={15} className="text-amber-600" />
                <span>3. Pricing & Marketing Badges</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-semibold text-gray-700 mb-1">
                  Currency
                </label>
                <select
                  value={formData.currency || 'PKR'}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full border border-gray-300 p-2.5 text-xs focus:border-[#0B192C] focus:outline-none"
                >
                  <option value="PKR">PKR (Pakistani Rupee ₨)</option>
                  <option value="USD">USD (US Dollar $)</option>
                  <option value="EUR">EUR (Euro €)</option>
                  <option value="GBP">GBP (British Pound £)</option>
                  <option value="AED">AED (UAE Dirham)</option>
                  <option value="SAR">SAR (Saudi Riyal)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-semibold text-gray-700 mb-1">
                  Retail Selling Price *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 p-2.5 text-xs font-bold text-[#0B192C] focus:border-[#0B192C] focus:outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-[11px] font-mono text-gray-500 font-semibold">
                    {formData.currency || 'PKR'}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] uppercase font-semibold text-gray-700 flex items-center gap-2">
                    <span>Compare At / Strikethrough Price (Optional)</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-normal ${
                      compareAtPriceInput.trim() 
                        ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                        : 'bg-gray-100 text-gray-500 border border-gray-200'
                    }`}>
                      {compareAtPriceInput.trim() ? 'Active Strikethrough' : 'No Strikethrough'}
                    </span>
                  </label>
                  {compareAtPriceInput.trim() !== '' && (
                    <button
                      type="button"
                      onClick={() => {
                        setCompareAtPriceInput('');
                        setFormData(prev => ({ ...prev, compareAtPrice: null }));
                      }}
                      className="text-[10px] text-rose-600 hover:text-rose-800 underline font-medium cursor-pointer"
                    >
                      Clear Strikethrough Price
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={compareAtPriceInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCompareAtPriceInput(val);
                      setFormData(prev => ({
                        ...prev,
                        compareAtPrice: val.trim() !== '' && !isNaN(Number(val)) && Number(val) > 0 ? Number(val) : null
                      }));
                    }}
                    placeholder="e.g. 500000 (Higher original price to show as discount)"
                    className="w-full border border-gray-300 p-2.5 pr-14 text-xs focus:border-[#0B192C] focus:outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-semibold text-gray-400 pointer-events-none">
                    {formData.currency || 'PKR'}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  Higher original price to show as a crossed-out strikethrough discount (e.g. was PKR 500,000, now PKR 450,000). Leave blank if not on sale.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 pt-2 border-t border-gray-100">
              <label className="flex items-center gap-2.5 text-xs font-semibold text-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="w-4 h-4 rounded text-[#0B192C] focus:ring-[#0B192C]"
                />
                <span>Featured Luxury Timepiece (Highlighted on Homepage)</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs font-semibold text-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.newArrival}
                  onChange={(e) => setFormData({ ...formData, newArrival: e.target.checked })}
                  className="w-4 h-4 rounded text-[#0B192C] focus:ring-[#0B192C]"
                />
                <span>New Arrival Badge (Shows "NEW" label)</span>
              </label>
            </div>
          </div>

          {/* 4. Horological Specifications */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2 border-gray-200">
              <div>
                <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-[#0B192C] flex items-center gap-2">
                  <Settings2 size={15} className="text-amber-600" />
                  <span>4. Watch Technical Specifications</span>
                </h3>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Configure diameter (optional), thickness (optional), dial, crystal, strap, and warranty.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-semibold text-gray-700 mb-1 flex items-center justify-between">
                  <span>Case Diameter</span>
                  <span className="text-[9px] text-amber-700 font-normal bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Optional</span>
                </label>
                <input
                  type="text"
                  value={formData.specifications?.caseSize || ''}
                  onChange={(e) => handleSpecChange('caseSize', e.target.value)}
                  placeholder="e.g. 40 mm, 41 mm (Optional)"
                  className="w-full border border-gray-300 p-2.5 text-xs focus:border-[#0B192C] focus:outline-none"
                />
                <p className="text-[9px] text-gray-500 mt-0.5">Leave blank if not specified</p>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-semibold text-gray-700 mb-1 flex items-center justify-between">
                  <span>Case Thickness</span>
                  <span className="text-[9px] text-amber-700 font-normal bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Optional</span>
                </label>
                <input
                  type="text"
                  value={formData.specifications?.caseThickness || ''}
                  onChange={(e) => handleSpecChange('caseThickness', e.target.value)}
                  placeholder="e.g. 11.5 mm, 12 mm (Optional)"
                  className="w-full border border-gray-300 p-2.5 text-xs focus:border-[#0B192C] focus:outline-none"
                />
                <p className="text-[9px] text-gray-500 mt-0.5">Leave blank if not specified</p>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-semibold text-gray-700 mb-1">
                  Dial Finish / Color
                </label>
                <input
                  type="text"
                  value={formData.specifications?.dialColor || ''}
                  onChange={(e) => handleSpecChange('dialColor', e.target.value)}
                  placeholder="e.g. Midnight Navy Sunburst / Black Lacquer"
                  className="w-full border border-gray-300 p-2.5 text-xs focus:border-[#0B192C] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-semibold text-gray-700 mb-1">
                  Crystal Glass
                </label>
                <input
                  type="text"
                  value={formData.specifications?.crystal || ''}
                  onChange={(e) => handleSpecChange('crystal', e.target.value)}
                  placeholder="e.g. Scratch-resistant Sapphire with AR Coating"
                  className="w-full border border-gray-300 p-2.5 text-xs focus:border-[#0B192C] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-semibold text-gray-700 mb-1">
                  Strap / Bracelet
                </label>
                <input
                  type="text"
                  value={formData.specifications?.strapMaterial || ''}
                  onChange={(e) => handleSpecChange('strapMaterial', e.target.value)}
                  placeholder="e.g. Solid 904L Steel Bracelet / Hand-Stitched Leather"
                  className="w-full border border-gray-300 p-2.5 text-xs focus:border-[#0B192C] focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] uppercase font-semibold text-gray-700">
                    Warranty Period
                  </label>
                  <span className="text-[9px] text-emerald-700 font-medium">
                    {(formData.specifications?.warranty || '3 Days Warranty').replace(/guarantee/gi, 'Warranty')}
                  </span>
                </div>
                <input
                  type="text"
                  value={formData.specifications?.warranty !== undefined ? formData.specifications.warranty.replace(/guarantee/gi, 'Warranty') : '3 Days Warranty'}
                  onChange={(e) => handleSpecChange('warranty', e.target.value)}
                  placeholder="e.g. 3 Days Warranty, 7 Days Warranty, 1 Month, 1 Year"
                  className="w-full border border-gray-300 p-2.5 text-xs focus:border-[#0B192C] focus:outline-none font-medium text-[#0B192C]"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {['3 Days Warranty', '7 Days Warranty', '15 Days Warranty', '1 Month', '6 Months', '1 Year Warranty', '2 Years Warranty'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleSpecChange('warranty', preset)}
                      className={`text-[9px] px-2 py-0.5 border rounded cursor-pointer transition-colors ${
                        formData.specifications?.warranty === preset
                          ? 'bg-[#0B192C] text-white border-[#0B192C] font-semibold'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom Extra Specifications */}
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#0B192C] flex items-center gap-1.5">
                  <Plus size={14} className="text-amber-600" />
                  <span>Additional Custom Specifications</span>
                </span>
                <span className="text-[10px] text-gray-500">Add custom specs (e.g. Bezel, Clasp, Weight)</span>
              </div>

              {customSpecs.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {customSpecs.map((cs, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white border border-gray-200 px-3 py-2 text-xs">
                      <div>
                        <span className="text-gray-500 font-semibold uppercase text-[10px] mr-2">{cs.key}:</span>
                        <span className="text-[#0B192C] font-medium">{cs.value}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomSpec(cs.key)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                        title="Remove spec"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Spec Title (e.g. Bezel, Weight, Clasp)"
                  value={newCustomSpecKey}
                  onChange={(e) => setNewCustomSpecKey(e.target.value)}
                  className="flex-1 border border-gray-300 p-2 text-xs bg-white focus:border-[#0B192C] focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Spec Value (e.g. Ceramic Rotating Bezel)"
                  value={newCustomSpecVal}
                  onChange={(e) => setNewCustomSpecVal(e.target.value)}
                  className="flex-1 border border-gray-300 p-2 text-xs bg-white focus:border-[#0B192C] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCustomSpec}
                  className="bg-[#0B192C] hover:bg-slate-800 text-white px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-none transition-colors"
                >
                  + Add Spec
                </button>
              </div>
            </div>
          </div>

          {/* 5. SEO & Search Engine Optimization (Collapsible) */}
          <div className="border border-gray-200 p-4 rounded-sm space-y-3 bg-gray-50">
            <button
              type="button"
              onClick={() => setShowSeoSection(!showSeoSection)}
              className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#0B192C]"
            >
              <div className="flex items-center gap-2">
                <Compass size={15} className="text-amber-600" />
                <span>5. SEO Search Engine Metadata (Optional)</span>
              </div>
              <span className="text-[10px] text-gray-500 underline">
                {showSeoSection ? 'Hide SEO Fields' : 'Edit SEO Fields'}
              </span>
            </button>

            {showSeoSection && (
              <div className="space-y-3 pt-2 border-t border-gray-200">
                <div>
                  <label className="block text-[10px] uppercase font-semibold text-gray-700 mb-1">
                    Meta Page Title
                  </label>
                  <input
                    type="text"
                    value={formData.seo?.metaTitle || ''}
                    onChange={(e) => setFormData({ ...formData, seo: { ...formData.seo, metaTitle: e.target.value } })}
                    placeholder="e.g. Rolex Submariner Date 41mm | Ventures Watches Pakistan"
                    className="w-full border border-gray-300 p-2 text-xs bg-white focus:border-[#0B192C] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-semibold text-gray-700 mb-1">
                    Meta Search Description
                  </label>
                  <textarea
                    rows={2}
                    value={formData.seo?.metaDescription || ''}
                    onChange={(e) => setFormData({ ...formData, seo: { ...formData.seo, metaDescription: e.target.value } })}
                    placeholder="Brief description for Google search snippets..."
                    className="w-full border border-gray-300 p-2 text-xs bg-white focus:border-[#0B192C] focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Gallery Modal Picker Overlay */}
          {isGalleryOpen && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0B192C] text-white p-6 rounded-lg max-w-2xl w-full space-y-4 max-h-[80vh] flex flex-col border border-slate-700">
                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <h4 className="text-xs uppercase tracking-widest font-semibold text-amber-400 flex items-center gap-2">
                    <Folder size={16} /> Select Pictures from Watch Media Library
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsGalleryOpen(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 gap-3 p-1">
                  {allGalleryOptions.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                      <Folder size={28} className="text-slate-500" />
                      <p>No photos in library yet.</p>
                      <p className="text-[11px] text-slate-500">Upload product photos directly using "Upload Multiple Photos".</p>
                    </div>
                  ) : (
                    allGalleryOptions.map((url, i) => {
                      const isSelected = formData.images?.includes(url);
                      return (
                        <div
                          key={i}
                          onClick={() => {
                            if (isSelected) {
                              setFormData(prev => ({
                                ...prev,
                                images: prev.images?.filter(img => img !== url)
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                images: [...(prev.images || []), url]
                              }));
                            }
                          }}
                          className={`relative aspect-square rounded overflow-hidden cursor-pointer border-2 transition-all group ${
                            isSelected ? 'border-amber-400 ring-2 ring-amber-400/50' : 'border-slate-800 hover:border-slate-500'
                          }`}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          {isSelected && (
                            <div className="absolute top-1 right-1 bg-amber-500 text-slate-950 p-1 rounded-full shadow">
                              <Check size={12} />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-700">
                  <button
                    type="button"
                    onClick={() => setIsGalleryOpen(false)}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold uppercase tracking-wider px-5 py-2 rounded"
                  >
                    Done Selecting
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions Footer */}
          <div className="pt-6 border-t border-gray-200 flex items-center justify-between gap-3">
            {product?.id && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(product.id);
                  onClose();
                }}
                className="px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 rounded transition-colors"
              >
                <Trash2 size={16} />
                <span>Delete Timepiece</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 border border-gray-300 text-xs font-semibold uppercase tracking-wider text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, status: 'draft' }));
                  const form = document.querySelector('form');
                  if (form) form.requestSubmit();
                }}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors flex items-center gap-1.5"
                title="Save product internally as a draft without showing on public website"
              >
                <Save size={15} />
                <span>Save as Draft</span>
              </button>
              <button
                type="submit"
                onClick={() => {
                  setFormData(prev => ({ ...prev, status: 'published' }));
                }}
                className="px-6 py-3 bg-[#0B192C] hover:bg-emerald-600 text-white text-xs font-semibold uppercase tracking-widest flex items-center gap-2 shadow-lg transition-colors rounded-sm"
                title="Grant permission to publish live to store"
              >
                <Check size={16} />
                <span>Approve & Publish Live</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

