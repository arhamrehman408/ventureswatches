import React, { useState } from 'react';
import { Product } from '../types';
import { X, ShieldCheck, Truck, RotateCcw, Heart, ShoppingBag, ZoomIn, Check, ChevronDown, ChevronUp, MessageCircle, ArrowLeftRight, Bell, Video } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { CompareModal } from './CompareModal';
import { PriceDropAlertModal } from './PriceDropAlertModal';

interface ProductDetailModalProps {
  product: Product | null;
  allProducts?: Product[];
  onClose: () => void;
  onAddToCart: (product: Product, quantity?: number) => void;
  onToggleWishlist: (product: Product) => void;
  isWishlisted: boolean;
  onBuyNow: (product: Product, quantity?: number) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  allProducts = [],
  onClose,
  onAddToCart,
  onToggleWishlist,
  isWishlisted,
  onBuyNow
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isPriceAlertOpen, setIsPriceAlertOpen] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string | null>('specs');
  const [added, setAdded] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const { formatPrice } = useCurrency();

  // Reset image and quantity when viewing a different product
  React.useEffect(() => {
    setSelectedImageIndex(0);
    setSelectedQuantity(1);
  }, [product?.id]);

  // Prevent background scroll thrashing while modal is open
  React.useEffect(() => {
    if (!product) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [product]);

  if (!product) return null;

  const rawImages = Array.isArray(product.images)
    ? product.images.filter(img => img && !img.includes('unsplash.com') && !img.includes('photo-1522335789203') && !img.includes('photo-1524805444758'))
    : [];
  const images = rawImages;

  const stock = typeof product.stock === 'number' ? Math.max(0, product.stock) : 99;
  const isOutOfStock = stock <= 0;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    onAddToCart(product, selectedQuantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const formattedPrice = formatPrice(product.price);
  const formattedCompare = product.compareAtPrice ? formatPrice(product.compareAtPrice) : null;

  const toggleAccordion = (id: string) => {
    setActiveAccordion(activeAccordion === id ? null : id);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="relative w-full max-w-5xl bg-white text-[#0B192C] shadow-2xl rounded-sm overflow-hidden border border-gray-200 max-h-[92vh] flex flex-col modal-enter">
        {/* Sticky Header Bar */}
        <div className="px-6 py-4 bg-[#F9FAFB] border-b border-gray-100 flex items-center justify-between z-10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.25em] text-amber-700 font-semibold">
              {(() => {
                const name = product.collectionName || '';
                const lower = name.toLowerCase().trim();
                if (lower === 'col-1' || lower === 'ventures automatic' || lower === 'automatic' || lower.includes('ventures automatic')) {
                  return 'Original Watches';
                }
                if (lower === 'col-2' || lower === 'ventures chrono' || lower === 'chrono' || lower === 'chronograph' || lower.includes('ventures chrono')) {
                  return 'Clone Watches';
                }
                if (lower === 'col-3' || lower === 'ventures classic' || lower === 'classic' || lower.includes('ventures classic')) {
                  return 'Copy Watches';
                }
                return name;
              })()}
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-xs text-gray-500 font-mono">SKU: {product.sku}</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {allProducts && allProducts.length > 1 && (
              <button
                onClick={() => setIsCompareOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0B192C] bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 rounded-full transition-all duration-200 shadow-sm"
                title="Compare with another timepiece"
              >
                <ArrowLeftRight size={13} className="text-amber-800" />
                <span className="hidden sm:inline">Compare</span>
              </button>
            )}
            <button
              onClick={() => onToggleWishlist(product)}
              className={`p-2 rounded-full transition-all duration-300 transform hover:scale-110 active:scale-90 ${
                isWishlisted ? 'text-rose-600 bg-rose-50 shadow-sm' : 'text-gray-400 hover:text-[#0B192C]'
              }`}
            >
              <Heart size={20} fill={isWishlisted ? 'currentColor' : 'none'} className={isWishlisted ? 'animate-pop-in' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-[#0B192C] rounded-full hover:bg-gray-200 transition-all duration-200 transform hover:scale-110 active:scale-95"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body - Ultra Smooth High-Performance Scrolling */}
        <div className="overflow-y-auto overscroll-contain flex-1 p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 [transform:translateZ(0)] isolate">
          {/* Left Column: Gallery (Sticky on PC / Laptop so viewing remains pinned while scrolling description) */}
          <div className="md:col-span-6 space-y-4 md:sticky md:top-0 md:self-start">
            <div className="relative aspect-[4/5] bg-[#F9FAFB] border border-gray-100 p-6 flex items-center justify-center group overflow-hidden">
              {images.length > 0 && images[selectedImageIndex] ? (
                <>
                  <img
                    src={images[selectedImageIndex]}
                    alt={product.name}
                    decoding="async"
                    loading="eager"
                    className="w-full h-full object-contain cursor-zoom-in transition-transform duration-300 group-hover:scale-105"
                    onClick={() => setIsZoomOpen(true)}
                  />
                  <button
                    onClick={() => setIsZoomOpen(true)}
                    className="absolute bottom-4 right-4 bg-white/90 hover:bg-white text-[#0B192C] p-2.5 rounded-full shadow-md text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <ZoomIn size={16} />
                    <span className="hidden sm:inline text-[10px] uppercase tracking-wider">Inspect</span>
                  </button>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/5 text-slate-400 p-6 text-center">
                  <div className="w-16 h-16 rounded-full border border-slate-300 flex items-center justify-center mb-3">
                    <span className="text-base font-serif font-bold tracking-widest text-slate-600">VW</span>
                  </div>
                  <span className="text-xs uppercase tracking-widest text-slate-500 font-medium">Ventures Timepiece</span>
                  <span className="text-[10px] text-slate-400 mt-1">Upload pictures via Admin Console</span>
                </div>
              )}
            </div>

            {/* Gallery Thumbnails */}
            {images.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`w-16 h-20 bg-[#F9FAFB] border flex-shrink-0 p-1 transition-all ${
                      selectedImageIndex === idx ? 'border-[#0B192C] ring-1 ring-[#0B192C]' : 'border-gray-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" loading="lazy" decoding="async" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Information & Actions */}
          <div className="md:col-span-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <h1 className="text-2xl sm:text-3xl font-serif text-[#0B192C] font-semibold leading-tight">
                {product.name}
              </h1>

              <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-gray-100">
                <span className="text-2xl font-semibold text-[#0B192C]">
                  {formattedPrice}
                </span>
                {formattedCompare && (
                  <span className="text-base text-gray-400 line-through">
                    {formattedCompare}
                  </span>
                )}
                {isOutOfStock ? (
                  <span className="text-xs text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 font-semibold uppercase tracking-wider">
                    Out of Stock
                  </span>
                ) : stock <= 3 ? (
                  <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 font-semibold uppercase tracking-wider">
                    Only {stock} Left in Stock
                  </span>
                ) : (
                  <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 font-semibold uppercase tracking-wider">
                    In Stock ({stock} Available)
                  </span>
                )}
              </div>

              {/* Short Summary Description */}
              {product.shortDescription && (
                <div className="bg-[#F9FAFB] border-l-2 border-amber-600 px-3.5 py-2.5 rounded-r text-left">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 block mb-0.5">
                    Short Description
                  </span>
                  <p className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed">
                    {product.shortDescription}
                  </p>
                </div>
              )}

              {/* Full Watch Story Description */}
              {product.description && (
                <p className="text-xs text-gray-600 leading-relaxed font-light">
                  {product.description}
                </p>
              )}

              {/* Quantity Selector */}
              {!isOutOfStock && (
                <div className="flex items-center gap-4 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#0B192C]">
                    Select Quantity:
                  </span>
                  <div className="flex items-center border border-gray-300 rounded bg-gray-50">
                    <button
                      type="button"
                      onClick={() => setSelectedQuantity(q => Math.max(1, q - 1))}
                      disabled={selectedQuantity <= 1}
                      className="px-3 py-1 text-gray-700 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold text-sm"
                      title="Decrease quantity"
                    >
                      -
                    </button>
                    <span className="px-4 py-1 text-xs font-bold text-[#0B192C]">
                      {selectedQuantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedQuantity(q => Math.min(stock, q + 1))}
                      disabled={selectedQuantity >= stock}
                      className="px-3 py-1 text-gray-700 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold text-sm"
                      title={selectedQuantity >= stock ? `Maximum stock (${stock}) reached` : 'Increase quantity'}
                    >
                      +
                    </button>
                  </div>
                  <span className="text-[11px] text-gray-500 font-medium">
                    (Max {stock} in stock)
                  </span>
                </div>
              )}

              {/* Purchase Action Buttons */}
              <div className="pt-2 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleAddToCart}
                    disabled={isOutOfStock}
                    className={`flex-1 py-3.5 px-5 text-xs uppercase tracking-[0.2em] font-semibold rounded-none transition-all duration-300 flex items-center justify-center gap-2 ${
                      isOutOfStock
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                        : added
                        ? 'bg-emerald-700 text-white'
                        : 'bg-[#0B192C] hover:bg-amber-600 text-white shadow-lg'
                    }`}
                  >
                    {added ? <Check size={18} /> : <ShoppingBag size={18} />}
                    <span>{isOutOfStock ? 'Out of Stock' : added ? 'Added to Bag' : 'Add to Bag'}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (isOutOfStock) return;
                      onBuyNow(product, selectedQuantity);
                      onClose();
                    }}
                    disabled={isOutOfStock}
                    className={`flex-1 py-3.5 px-5 text-xs uppercase tracking-[0.2em] font-semibold transition-colors shadow-md ${
                      isOutOfStock
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                        : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                    }`}
                  >
                    Checkout Now
                  </button>
                </div>

                {/* Direct WhatsApp Instant Inquiry Button */}
                <a
                  href={`https://wa.me/923192265524?text=${encodeURIComponent(
                    `Hi VW-Ventures Watches, I am interested in inquiring/ordering:\n\n*${product.name}*\nSKU: ${product.sku}\nPrice: PKR ${product.price.toLocaleString()}\nLink: https://ventures.watches`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs uppercase tracking-[0.18em] flex items-center justify-center gap-2 shadow-md transition-colors rounded-none"
                >
                  <MessageCircle size={18} className="fill-current" />
                  <span>Inquire / Order on WhatsApp (0319 2265524)</span>
                </a>

                {/* Notify Me On Price Drop Button */}
                <button
                  type="button"
                  onClick={() => setIsPriceAlertOpen(true)}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all rounded-none shadow-sm group"
                >
                  <Bell size={15} className="text-amber-400 group-hover:animate-bounce" />
                  <span>Notify Me On Price Drop</span>
                </button>

                {/* Compare Feature Banner Button */}
                {allProducts && allProducts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setIsCompareOpen(true)}
                    className="w-full py-2.5 px-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-500/30 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all rounded-none shadow-sm"
                  >
                    <ArrowLeftRight size={15} className="text-amber-700" />
                    <span>Compare With Another Timepiece</span>
                  </button>
                )}

                <div className="grid grid-cols-3 gap-2 pt-2 text-[10px] text-gray-500 text-center border-t border-gray-100">
                  <div className="flex flex-col items-center gap-1 p-2 bg-gray-50">
                    <ShieldCheck size={16} className="text-amber-700" />
                    <span>3 Days Warranty</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-2 bg-gray-50">
                    <Truck size={16} className="text-amber-700" />
                    <span>White-Glove Courier</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-2 bg-gray-50">
                    <RotateCcw size={16} className="text-amber-700" />
                    <span>3-Day Returns</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Accordion Specs & Details */}
            <div className="border-t border-gray-200 pt-4 space-y-2">
              {/* Specs Accordion */}
              <div className="border border-gray-200 rounded-none overflow-hidden">
                <button
                  onClick={() => toggleAccordion('specs')}
                  className="w-full px-4 py-3 bg-[#F9FAFB] flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#0B192C]"
                >
                  <span>Technical Specifications</span>
                  {activeAccordion === 'specs' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {activeAccordion === 'specs' && (
                  <div className="p-4 bg-white text-xs space-y-2 border-t border-gray-100 font-light">
                    {product.specifications?.caseMaterial && (
                      <div className="grid grid-cols-2 gap-2 py-1 border-b border-gray-50">
                        <span className="text-gray-400">Case Material</span>
                        <span className="font-medium text-[#0B192C]">{product.specifications.caseMaterial}</span>
                      </div>
                    )}
                    {(product.specifications?.caseSize || product.specifications?.diameter) && (
                      <div className="grid grid-cols-2 gap-2 py-1 border-b border-gray-50">
                        <span className="text-gray-400">Case Diameter</span>
                        <span className="font-medium text-[#0B192C]">
                          {product.specifications?.caseSize || product.specifications?.diameter}
                        </span>
                      </div>
                    )}
                    {(product.specifications?.caseThickness || product.specifications?.thickness) && (
                      <div className="grid grid-cols-2 gap-2 py-1 border-b border-gray-50">
                        <span className="text-gray-400">Case Thickness</span>
                        <span className="font-medium text-[#0B192C]">
                          {product.specifications?.caseThickness || product.specifications?.thickness}
                        </span>
                      </div>
                    )}
                    {product.specifications?.dialColor && (
                      <div className="grid grid-cols-2 gap-2 py-1 border-b border-gray-50">
                        <span className="text-gray-400">Dial Finish</span>
                        <span className="font-medium text-[#0B192C]">{product.specifications.dialColor}</span>
                      </div>
                    )}
                    {product.specifications?.crystal && (
                      <div className="grid grid-cols-2 gap-2 py-1 border-b border-gray-50">
                        <span className="text-gray-400">Crystal Glass</span>
                        <span className="font-medium text-[#0B192C]">{product.specifications.crystal}</span>
                      </div>
                    )}
                    {product.specifications?.strapMaterial && (
                      <div className="grid grid-cols-2 gap-2 py-1 border-b border-gray-50">
                        <span className="text-gray-400">Strap / Bracelet</span>
                        <span className="font-medium text-[#0B192C]">{product.specifications.strapMaterial}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 py-1 border-b border-gray-50">
                      <span className="text-gray-400">Warranty</span>
                      <span className="font-semibold text-emerald-700">
                        {(product.specifications?.warranty || '3 Days Warranty').replace(/guarantee/gi, 'Warranty')}
                      </span>
                    </div>
                    {/* Additional Custom Specifications */}
                    {Object.entries(product.specifications || {}).map(([k, v]) => {
                      const excludedKeys = [
                        'movement', 'caseMaterial', 'caseSize', 'caseThickness', 'thickness', 'diameter',
                        'dialColor', 'crystal', 'strapMaterial', 'waterResistance',
                        'powerReserve', 'warranty'
                      ];
                      if (excludedKeys.includes(k) || !v) return null;
                      return (
                        <div key={k} className="grid grid-cols-2 gap-2 py-1 border-b border-gray-50">
                          <span className="text-gray-400 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="font-medium text-[#0B192C]">{String(v)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Product Video Showcase if present */}
              {product.videos && product.videos.length > 0 && (
                <div className="border border-gray-200 rounded-none overflow-hidden">
                  <div className="p-3 bg-[#F9FAFB] border-b border-gray-100 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#0B192C]">
                    <span className="flex items-center gap-1.5 text-amber-700">
                      <Video size={14} /> Motion Video Showcase
                    </span>
                  </div>
                  <div className="p-3 bg-black space-y-2">
                    {product.videos.map((vid, idx) => (
                      <video key={idx} src={vid} controls className="w-full max-h-48 rounded bg-black" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen High-Res Zoom Viewer */}
      {isZoomOpen && (
        <div className="fixed inset-0 z-60 bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in">
          <button
            onClick={() => setIsZoomOpen(false)}
            className="absolute top-6 right-6 text-white p-3 rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={28} />
          </button>
          <img
            src={images[selectedImageIndex]}
            alt={product.name}
            className="max-w-full max-h-[85vh] object-contain"
          />
          <p className="text-xs text-slate-300 font-serif tracking-widest mt-4">
            {product.name} — High Precision Detail Inspector
          </p>
        </div>
      )}

      {/* Side-by-Side Timepiece Compare Modal */}
      {isCompareOpen && (
        <CompareModal
          isOpen={isCompareOpen}
          onClose={() => setIsCompareOpen(false)}
          primaryProduct={product}
          allProducts={allProducts}
          onAddToCart={onAddToCart}
          onBuyNow={onBuyNow}
        />
      )}

      {/* Price Drop Notification Modal */}
      {isPriceAlertOpen && (
        <PriceDropAlertModal
          product={product}
          isOpen={isPriceAlertOpen}
          onClose={() => setIsPriceAlertOpen(false)}
        />
      )}
    </div>
  );
};
