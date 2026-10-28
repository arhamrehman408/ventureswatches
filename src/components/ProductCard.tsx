import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { ShoppingBag, Eye, Heart, Check } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (product: Product) => void;
  isWishlisted: boolean;
  index?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelect,
  onAddToCart,
  onToggleWishlist,
  isWishlisted,
  index = 0
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [loadedImageSrc, setLoadedImageSrc] = useState('');
  const [added, setAdded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const rawImages = Array.isArray(product.images)
    ? product.images.filter(img => Boolean(img && typeof img === 'string' && img.trim().length > 0))
    : [];
const mainImage = rawImages[0] || '';
const hoverImage = rawImages[1] || mainImage;
const currentImage = isHovered ? hoverImage : mainImage;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const { formatPrice } = useCurrency();

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleWishlist(product);
  };

  const formattedPrice = formatPrice(product.price);
  const formattedCompare = product.compareAtPrice ? formatPrice(product.compareAtPrice) : null;

  return (
    <div
      ref={cardRef}
      onClick={() => onSelect(product)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative bg-white border border-gray-100 rounded-sm overflow-hidden hover-luxury-card transition-all duration-300 cursor-pointer flex flex-col justify-between opacity-100"
    >
      {/* Card Header Media Area */}
      <div className="relative aspect-[1/1] sm:aspect-[4/5] bg-[#F9FAFB] overflow-hidden flex items-center justify-center p-3 sm:p-6">
        {/* Badges */}
        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-10 flex flex-col gap-1">
          {product.stock <= 0 && (
            <span className="bg-rose-700 text-white text-[8px] sm:text-[9px] uppercase tracking-[0.15em] sm:tracking-[0.2em] font-semibold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-none shadow-sm animate-pop-in">
              Sold Out
            </span>
          )}
          {product.newArrival && product.stock > 0 && (
            <span className="bg-[#0B192C] text-white text-[8px] sm:text-[9px] uppercase tracking-[0.15em] sm:tracking-[0.2em] font-semibold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-none shadow-sm animate-pop-in">
              New
            </span>
          )}
          {product.featured && product.stock > 0 && (
            <span className="bg-amber-500 text-slate-950 text-[8px] sm:text-[9px] uppercase tracking-[0.15em] sm:tracking-[0.2em] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-none shadow-sm animate-pop-in">
              Featured
            </span>
          )}
        </div>

        {/* Wishlist Toggle Button */}
        <button
          onClick={handleWishlistClick}
          className={`absolute top-2 sm:top-3 right-2 sm:right-3 z-10 p-1.5 sm:p-2 rounded-full transition-all duration-300 transform active:scale-90 ${
            isWishlisted
              ? 'bg-rose-50 text-rose-600 shadow-md scale-105'
              : 'bg-white/80 text-gray-500 hover:text-[#0B192C] hover:bg-white hover:scale-110'
          }`}
          title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <Heart size={15} fill={isWishlisted ? 'currentColor' : 'none'} className={isWishlisted ? 'animate-pop-in' : ''} />
        </button>
      
{/* Watch Images */}
{mainImage && (
  <img
    key={isHovered ? hoverImage : mainImage}
    src={isHovered ? hoverImage : mainImage}
    alt={`${product.name} – Luxury Watch in Pakistan | Ventures Watches`}
    loading={index < 4 ? 'eager' : 'lazy'}
    decoding="async"
    onLoad={(e) => {
      e.currentTarget.style.opacity = '1';
    }}
    onError={(e) => {
      e.currentTarget.style.display = 'none';
    }}
    style={{ opacity: 0 }}
    className="w-full h-full object-contain object-center transition-opacity duration-300"
  />
)}


        {/* Quick Action Overlay Bar (Desktop Hover & Mobile Accessible) */}
        <div className="hidden sm:flex absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 items-center justify-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(product);
            }}
            className="flex-1 bg-white/95 hover:bg-white text-[#0B192C] text-[10px] uppercase tracking-wider font-semibold py-2 px-3 rounded-none transition-all duration-200 transform active:scale-95 flex items-center justify-center gap-1.5 shadow-md"
          >
            <Eye size={13} />
            <span>View</span>
          </button>

          <button
            onClick={handleQuickAdd}
            disabled={product.stock <= 0}
            className={`flex-1 ${
              product.stock <= 0
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : added
                ? 'bg-emerald-600 text-white'
                : 'bg-[#0B192C] hover:bg-amber-600 text-white'
            } text-[10px] uppercase tracking-wider font-semibold py-2 px-3 rounded-none transition-all duration-200 transform active:scale-95 flex items-center justify-center gap-1.5 shadow-md`}
          >
            {added ? <Check size={13} className="animate-pop-in" /> : <ShoppingBag size={13} />}
            <span>{product.stock <= 0 ? 'Sold Out' : added ? 'Added!' : 'Add'}</span>
          </button>
        </div>
      </div>

      {/* Product Information */}
      <div className="p-3 sm:p-5 flex flex-col justify-between flex-1 bg-white space-y-1.5 sm:space-y-2">
        <div>
          <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-amber-700 font-medium">
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
          </div>
          <h3 className="text-xs sm:text-sm font-serif font-medium text-[#0B192C] group-hover:text-amber-600 transition-colors line-clamp-1 mt-0.5">
            {product.name}
          </h3>
          <p className="text-[11px] sm:text-xs text-gray-500 line-clamp-1 mt-0.5 font-light">
            {product.specifications?.caseSize ? `${product.specifications.caseSize} • ` : ''}{(product.specifications?.warranty || '3 Days Warranty').replace(/guarantee/gi, 'Warranty')}
          </p>
        </div>

        {/* Price & Stock */}
        <div className="pt-2 sm:pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs sm:text-sm font-semibold text-[#0B192C] tracking-tight">
              {formattedPrice}
            </span>
            {formattedCompare && (
              <span className="text-[10px] sm:text-xs text-gray-400 line-through font-light">
                {formattedCompare}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-1.5">
            <span
              className={`text-[8px] sm:text-[10px] font-medium tracking-wider uppercase px-1.5 sm:px-2 py-0.5 rounded-full ${
                product.stock <= 0
                  ? 'bg-rose-50 text-rose-700 font-bold border border-rose-200'
                  : product.stock <= 3
                  ? 'bg-amber-50 text-amber-800 font-semibold border border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 font-medium'
              }`}
            >
              {product.stock <= 0
                ? 'Sold Out'
                : product.stock <= 3
                ? `${product.stock} Left`
                : `${product.stock} In Stock`}
            </span>

            {/* Mobile Quick Add Icon Button */}
            <button
              onClick={handleQuickAdd}
              disabled={product.stock <= 0}
              aria-label="Add to cart"
              className={`sm:hidden p-1.5 rounded-full transition-all duration-200 transform active:scale-90 ${
                product.stock <= 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : added
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#0B192C] text-white hover:bg-amber-600 shadow-sm'
              }`}
            >
              {added ? <Check size={12} className="animate-pop-in" /> : <ShoppingBag size={12} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
