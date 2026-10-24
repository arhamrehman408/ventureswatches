import React, { useState, useEffect } from 'react';
import { Collection } from '../../types';
import { FolderTree, Upload, Trash2, X, Save, Image as ImageIcon, Link as LinkIcon, Sparkles } from 'lucide-react';
import { uploadMediaFile } from '../../services/api';

interface CollectionEditorModalProps {
  collection: Collection | null;
  onClose: () => void;
  onSave: (collectionData: Partial<Collection>) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  mediaGallery?: string[];
  productCount?: number;
}

export const CollectionEditorModal: React.FC<CollectionEditorModalProps> = ({
  collection,
  onClose,
  onSave,
  onDelete,
  mediaGallery = [],
  productCount = 0
}) => {
  const isEditing = Boolean(collection && collection.id);

  const [formData, setFormData] = useState<Partial<Collection>>({
    id: collection?.id || `col-${Date.now()}`,
    name: collection?.name || '',
    slug: collection?.slug || '',
    description: collection?.description || '',
    image: collection?.image || '',
    featured: collection?.featured ?? true,
    sortOrder: typeof collection?.sortOrder === 'number' ? collection.sortOrder : 1
  });

  const [isUploading, setIsUploading] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (collection) {
      setFormData({
        id: collection.id,
        name: collection.name || '',
        slug: collection.slug || '',
        description: collection.description || '',
        image: collection.image || '',
        featured: collection.featured ?? true,
        sortOrder: typeof collection.sortOrder === 'number' ? collection.sortOrder : 1
      });
    }
  }, [collection]);

  const handleNameChange = (val: string) => {
    const autoSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setFormData(prev => ({
      ...prev,
      name: val,
      // Auto-update slug if not manually customized or empty
      slug: (!prev.slug || prev.slug === prev.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
        ? autoSlug
        : prev.slug
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const uploadedUrl = await uploadMediaFile(file, 'Collection Banner');
      if (uploadedUrl) {
        setFormData(prev => ({ ...prev, image: uploadedUrl }));
      }
    } catch (err) {
      console.warn('Cover upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddImageUrl = () => {
    if (imageUrlInput.trim()) {
      setFormData(prev => ({ ...prev, image: imageUrlInput.trim() }));
      setImageUrlInput('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    setIsSaving(true);
    try {
      const finalSlug = formData.slug?.trim() ||
        formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') ||
        `col-${Date.now()}`;

      await onSave({
        ...formData,
        name: formData.name.trim(),
        slug: finalSlug,
        description: formData.description?.trim() || '',
        image: formData.image || '',
        featured: formData.featured ?? true,
        sortOrder: Number(formData.sortOrder) || 1
      });
      onClose();
    } catch (err) {
      console.error('Save collection error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!collection?.id || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(collection.id);
      onClose();
    } catch (err) {
      console.error('Delete collection error:', err);
    } finally {
      setIsDeleting(false);
      setConfirmingDelete(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl bg-white text-[#0B192C] shadow-2xl rounded-sm overflow-hidden border border-gray-200 my-6">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0B192C] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FolderTree size={20} className="text-amber-400" />
            <div>
              <h2 className="text-xs uppercase tracking-[0.25em] font-semibold text-white">
                {isEditing ? `Edit Collection: ${collection?.name}` : 'Create New Watch Collection'}
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {isEditing ? 'Modify category title, description, and storefront banner.' : 'Add a new category shelf to your luxury storefront.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* 1. Collection Name & Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-semibold text-gray-700 mb-1">
                Collection Name *
              </label>
              <input
                type="text"
                required
                value={formData.name || ''}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Master Chronographs, Limited Editions"
                className="w-full border border-gray-300 p-2.5 text-xs focus:border-[#0B192C] focus:outline-none font-medium"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Displayed on the storefront navigation, filter pills, and collection cards.
              </p>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-semibold text-gray-700 mb-1">
                URL Slug (Optional)
              </label>
              <input
                type="text"
                value={formData.slug || ''}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-') })}
                placeholder="e.g. master-chronographs"
                className="w-full border border-gray-300 p-2.5 text-xs focus:border-[#0B192C] focus:outline-none font-mono text-slate-700"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Used for URL filtering: /?collection={formData.slug || 'slug'}
              </p>
            </div>
          </div>

          {/* 2. Description */}
          <div>
            <label className="block text-[10px] uppercase font-semibold text-gray-700 mb-1">
              Collection Description
            </label>
            <textarea
              rows={3}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Handcrafted mechanical chronographs engineered with precision tachymeter scales and surgical steel casings."
              className="w-full border border-gray-300 p-2.5 text-xs focus:border-[#0B192C] focus:outline-none leading-relaxed"
            />
            <p className="text-[10px] text-gray-500 mt-0.5">
              Brief horological summary shown on category banners and Google SEO snippets.
            </p>
          </div>

          {/* 3. Cover Banner Image */}
          <div className="space-y-3 pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] uppercase font-semibold text-gray-700">
                Collection Banner / Cover Image
              </label>
              {formData.image && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                  className="text-[10px] text-rose-600 hover:text-rose-800 underline font-medium cursor-pointer"
                >
                  Remove Cover Image
                </button>
              )}
            </div>

            {/* Image Preview & Upload Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-5 aspect-[16/9] bg-slate-900 rounded overflow-hidden border border-slate-700 relative flex items-center justify-center">
                {formData.image ? (
                  <img
                    src={formData.image}
                    alt={formData.name || 'Collection Cover'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-3 text-center text-slate-500 space-y-1">
                    <ImageIcon size={28} className="text-amber-500/40" />
                    <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400">No Image Set</span>
                  </div>
                )}
              </div>

              <div className="sm:col-span-7 space-y-2.5">
                <div className="flex flex-wrap gap-2">
                  <label className={`cursor-pointer ${isUploading ? 'bg-amber-300' : 'bg-[#0B192C] hover:bg-slate-800'} text-white px-3.5 py-2 text-xs font-semibold uppercase tracking-wider rounded flex items-center gap-1.5 transition-colors shadow`}>
                    <Upload size={13} className="text-amber-400" />
                    <span>{isUploading ? 'Uploading...' : 'Upload Picture'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploading}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {mediaGallery.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsGalleryOpen(!isGalleryOpen)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded border border-gray-300 flex items-center gap-1.5"
                    >
                      <ImageIcon size={13} className="text-amber-600" />
                      <span>{isGalleryOpen ? 'Hide Gallery' : 'Choose from Media'}</span>
                    </button>
                  )}
                </div>

                {/* Direct Image URL input */}
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="Or paste direct image URL (https://...)"
                    className="flex-1 border border-gray-300 p-2 text-xs focus:border-[#0B192C] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="bg-gray-800 hover:bg-black text-white px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded flex items-center gap-1"
                  >
                    <LinkIcon size={12} />
                    <span>Apply</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Media Gallery Selector (Dropdown Picker) */}
            {isGalleryOpen && mediaGallery.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 p-3 rounded space-y-2">
                <span className="text-[10px] uppercase font-bold text-gray-700 block">
                  Select Cover from Store Media Gallery ({mediaGallery.length} assets)
                </span>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-40 overflow-y-auto p-1 bg-white border border-gray-200">
                  {mediaGallery.map((url, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, image: url }));
                        setIsGalleryOpen(false);
                      }}
                      className={`aspect-[4/3] bg-slate-900 rounded overflow-hidden cursor-pointer border-2 transition-all ${
                        formData.image === url ? 'border-amber-500 scale-95' : 'border-transparent hover:border-gray-400'
                      }`}
                    >
                      <img src={url} alt={`Media ${idx}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4. Display Settings: Sort Order & Featured */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-200">
            <div>
              <label className="block text-[10px] uppercase font-semibold text-gray-700 mb-1">
                Display Order Priority
              </label>
              <input
                type="number"
                min="1"
                max="99"
                value={formData.sortOrder ?? 1}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 1 })}
                className="w-full border border-gray-300 p-2.5 text-xs focus:border-[#0B192C] focus:outline-none font-mono"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Lower numbers appear first on the storefront (e.g. 1, 2, 3).
              </p>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2.5 text-xs font-semibold text-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.featured ?? true}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="w-4 h-4 rounded text-[#0B192C] focus:ring-[#0B192C]"
                />
                <span className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-600" />
                  <span>Featured Collection (Show on Homepage Showcase)</span>
                </span>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-5 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              {isEditing && onDelete && (
                confirmingDelete ? (
                  <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 p-1.5 rounded">
                    <span className="text-[11px] text-rose-800 font-medium">
                      Confirm delete? {productCount > 0 ? `(${productCount} items linked)` : ''}
                    </span>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={handleConfirmDelete}
                      className="bg-rose-700 hover:bg-rose-800 text-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded"
                    >
                      {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      className="text-gray-600 hover:text-black text-[10px] underline uppercase"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isDeleting || isSaving}
                    onClick={() => setConfirmingDelete(true)}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider rounded flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    <span>Delete Collection</span>
                  </button>
                )
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-xs font-semibold text-gray-700 uppercase tracking-wider hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving || isUploading}
                className="bg-[#0B192C] hover:bg-slate-800 text-white px-6 py-2 text-xs font-semibold uppercase tracking-wider rounded flex items-center gap-1.5 transition-colors shadow disabled:opacity-50"
              >
                <Save size={14} className="text-amber-400" />
                <span>{isSaving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Collection')}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
