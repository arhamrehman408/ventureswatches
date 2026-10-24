import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { Search, X, ArrowRight } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  isOpen,
  onClose,
  products,
  onSelectProduct
}) => {
  const [query, setQuery] = useState('');
  const { formatPrice } = useCurrency();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredProducts = query.trim()
    ? products.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.sku.toLowerCase().includes(query.toLowerCase()) ||
        p.collectionName.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase()) ||
        (p.specifications?.caseMaterial && p.specifications.caseMaterial.toLowerCase().includes(query.toLowerCase())) ||
        (p.specifications?.movement && p.specifications.movement.toLowerCase().includes(query.toLowerCase()))
      )
    : [];

  const categories = ['Original Watches', 'Clone Watches', 'Copy Watches'];

  return (
    <div className="fixed inset-0 z-50 bg-[#0B192C]/95 backdrop-blur-md text-white overflow-y-auto animate-fade-in duration-300">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 modal-enter">
        {/* Close & Header */}
        <div className="flex items-center justify-between pb-8 border-b border-white/10">
          <div className="text-xs uppercase tracking-[0.3em] font-semibold text-amber-400">
            Watch Search Engine
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-all duration-200 transform hover:scale-110 active:scale-95"
          >
            <X size={24} />
          </button>
        </div>

        {/* Input Bar */}
        <div className="py-8 relative">
          <Search size={32} className="absolute left-0 top-1/2 -translate-y-1/2 text-amber-400 animate-pulse-glow" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by watch name, caliber, material, or reference (e.g. Navy, Automatic, Titanium)..."
            autoFocus
            className="w-full bg-transparent border-b-2 border-white/20 pl-12 pr-4 py-4 text-xl sm:text-2xl font-serif text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-all duration-300"
          />
        </div>

        {/* Category Quick Chips */}
        {!query && (
          <div className="space-y-4 py-6 animate-fade-in">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold">
              Popular Collections & Categories
            </p>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat, idx) => (
                <button
                  key={cat}
                  onClick={() => setQuery(cat)}
                  style={{ animationDelay: `${idx * 80}ms` }}
                  className="bg-white/5 hover:bg-white/15 border border-white/10 text-xs px-4 py-2 rounded text-slate-200 transition-all duration-200 hover:text-amber-300 hover:border-amber-300/40 transform hover:-translate-y-0.5 animate-slide-up"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results Grid */}
        {query && (
          <div className="py-8 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-white/10 pb-4">
              <span>Search Results ({filteredProducts.length})</span>
              <span>Showing matches for "{query}"</span>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 text-slate-400 space-y-2 animate-fade-in">
                <p className="text-base font-serif text-slate-300">No timepieces matching "{query}" found.</p>
                <p className="text-xs text-slate-500">Try searching for "Automatic", "Gold", or "Chronograph".</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {filteredProducts.map((p, idx) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelectProduct(p);
                      onClose();
                    }}
                    style={{ animationDelay: `${idx * 60}ms` }}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/50 p-4 rounded transition-all duration-300 cursor-pointer group flex items-center gap-4 hover-luxury-scale animate-slide-up"
                  >
                    <div className="w-16 h-20 bg-white/10 rounded flex-shrink-0 p-1 flex items-center justify-center overflow-hidden">
                      <img src={p.images[0]} alt={p.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] uppercase tracking-widest text-amber-400 block font-medium">
                        {p.collectionName}
                      </span>
                      <h4 className="text-xs font-serif font-semibold text-white truncate group-hover:text-amber-300 transition-colors">
                        {p.name}
                      </h4>
                      <p className="text-xs font-semibold text-amber-300 mt-1">
                        {formatPrice(p.price)}
                      </p>
                    </div>
                    <ArrowRight size={16} className="text-slate-500 group-hover:text-amber-300 group-hover:translate-x-1.5 transition-all duration-300" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
