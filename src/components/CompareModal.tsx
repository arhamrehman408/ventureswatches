import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import { X, ArrowLeftRight, Check, ShoppingBag, MessageCircle, Sparkles, ChevronDown, Search, ShieldCheck } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  primaryProduct: Product;
  allProducts: Product[];
  onAddToCart: (product: Product, quantity?: number) => void;
  onBuyNow: (product: Product, quantity?: number) => void;
  onSelectProductToView?: (product: Product) => void;
}

export const CompareModal: React.FC<CompareModalProps> = ({
  isOpen,
  onClose,
  primaryProduct,
  allProducts,
  onAddToCart,
  onBuyNow,
  onSelectProductToView
}) => {
  const { formatPrice } = useCurrency();

  // Watch 1 & Watch 2 state
  const [watch1, setWatch1] = useState<Product>(primaryProduct);
  const [watch2, setWatch2] = useState<Product | null>(() => {
    // Find first other watch that isn't watch 1
    const other = allProducts.find(p => p.id !== primaryProduct.id);
    return other || null;
  });

  // Selector state for replacing watch 1 or watch 2
  const [activeSlotSelecting, setActiveSlotSelecting] = useState<1 | 2 | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollectionFilter, setSelectedCollectionFilter] = useState('all');
  const [highlightDifferences, setHighlightDifferences] = useState(false);
  const [addedSlot1, setAddedSlot1] = useState(false);
  const [addedSlot2, setAddedSlot2] = useState(false);

  // Available collections for filter
  const collections = useMemo(() => {
    const set = new Set<string>();
    allProducts.forEach(p => {
      if (p.collectionName) set.add(p.collectionName);
    });
    return Array.from(set);
  }, [allProducts]);

  // Filtered products list for selector modal
  const selectableProducts = useMemo(() => {
    return allProducts.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.collectionName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCollection = selectedCollectionFilter === 'all' || p.collectionName === selectedCollectionFilter;
      return matchesSearch && matchesCollection;
    });
  }, [allProducts, searchQuery, selectedCollectionFilter]);

  if (!isOpen) return null;

  const handleSwap = () => {
    if (!watch2) return;
    const temp = watch1;
    setWatch1(watch2);
    setWatch2(temp);
  };

  const handleSelectWatch = (product: Product) => {
    if (activeSlotSelecting === 1) {
      setWatch1(product);
    } else if (activeSlotSelecting === 2) {
      setWatch2(product);
    }
    setActiveSlotSelecting(null);
    setSearchQuery('');
  };

  const handleAddSlot1 = () => {
    onAddToCart(watch1, 1);
    setAddedSlot1(true);
    setTimeout(() => setAddedSlot1(false), 2000);
  };

  const handleAddSlot2 = () => {
    if (!watch2) return;
    onAddToCart(watch2, 1);
    setAddedSlot2(true);
    setTimeout(() => setAddedSlot2(false), 2000);
  };

  // Comparison Rows Definition
  interface SpecRow {
    label: string;
    key: keyof typeof watch1.specifications | 'price' | 'collection' | 'stock' | 'sku';
    getValue: (p: Product) => string;
  }

  const specRows: SpecRow[] = [
    {
      label: 'Price',
      key: 'price',
      getValue: (p) => formatPrice(p.price)
    },
    {
      label: 'Collection',
      key: 'collection',
      getValue: (p) => {
        const name = p.collectionName || 'Ventures Series';
        const lower = name.toLowerCase();
        if (lower.includes('automatic') || lower === 'col-1') return 'Original Watches';
        if (lower.includes('chrono') || lower === 'col-2') return 'Clone Watches';
        if (lower.includes('classic') || lower === 'col-3') return 'Copy Watches';
        return name;
      }
    },
    {
      label: 'Case Material',
      key: 'caseMaterial',
      getValue: (p) => p.specifications?.caseMaterial || '316L Stainless Steel'
    },
    {
      label: 'Case Diameter',
      key: 'caseSize',
      getValue: (p) => p.specifications?.caseSize || p.specifications?.diameter || '—'
    },
    {
      label: 'Case Thickness',
      key: 'caseThickness',
      getValue: (p) => p.specifications?.caseThickness || p.specifications?.thickness || '—'
    },
    {
      label: 'Dial Finish & Color',
      key: 'dialColor',
      getValue: (p) => p.specifications?.dialColor || 'Sunburst Finish'
    },
    {
      label: 'Crystal Glass',
      key: 'crystal',
      getValue: (p) => p.specifications?.crystal || 'Sapphire Crystal'
    },
    {
      label: 'Strap / Bracelet',
      key: 'strapMaterial',
      getValue: (p) => p.specifications?.strapMaterial || 'Stainless Steel / Italian Leather'
    },
    {
      label: 'Power Reserve',
      key: 'powerReserve',
      getValue: (p) => p.specifications?.powerReserve || '40 - 48 Hours'
    },
    {
      label: 'Warranty',
      key: 'warranty',
      getValue: (p) => (p.specifications?.warranty || '3 Days Warranty').replace(/guarantee/gi, 'Warranty')
    },
    {
      label: 'Stock Status',
      key: 'stock',
      getValue: (p) => (p.stock > 0 ? `In Stock (${p.stock} Available)` : 'Out of Stock')
    },
    {
      label: 'SKU Model',
      key: 'sku',
      getValue: (p) => p.sku || 'VW-GEN'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl bg-white text-[#0B192C] shadow-2xl rounded-sm overflow-hidden border border-slate-700/50 max-h-[94vh] flex flex-col">
        {/* Modal Top Header */}
        <div className="px-5 py-4 bg-[#0B192C] text-white border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ArrowLeftRight size={16} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-serif font-bold tracking-wider text-amber-300 uppercase">
                Timepiece Comparison Matrix
              </h2>
              <p className="text-[11px] text-slate-400">
                Side-by-side technical watch specifications & dynamic pricing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Highlight Differences Toggle */}
            <button
              onClick={() => setHighlightDifferences(!highlightDifferences)}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                highlightDifferences
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-bold'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              <Sparkles size={13} />
              <span>Highlight Differences</span>
            </button>

            {/* Swap Button */}
            {watch2 && (
              <button
                onClick={handleSwap}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800/80 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-all hover:text-amber-400"
                title="Swap Left and Right Watches"
              >
                <ArrowLeftRight size={13} />
                <span className="hidden sm:inline">Swap</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
              aria-label="Close Comparison"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Comparison Content */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 bg-slate-50">
          {/* Main Visual Comparison Header Cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-6 mb-6">
            {/* Slot 1: Watch 1 */}
            <div className="bg-white rounded-lg p-3 sm:p-5 border-2 border-slate-200 shadow-sm relative flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-amber-100 text-amber-900 rounded">
                    Watch A
                  </span>
                  <button
                    onClick={() => setActiveSlotSelecting(1)}
                    className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 hover:underline"
                  >
                    <span>Change Watch</span>
                    <ChevronDown size={12} />
                  </button>
                </div>

                <div className="aspect-[4/4] sm:aspect-[4/3] bg-slate-50 rounded p-2 sm:p-4 mb-3 flex items-center justify-center overflow-hidden border border-slate-100">
                  {watch1.images && watch1.images[0] ? (
                    <img
                      src={watch1.images[0]}
                      alt={watch1.name}
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.src.includes('vw-media-1791470009099-2584.jpeg')) {
                          target.src = '/uploads/vw-media-1791470009099-2584.jpeg';
                        }
                      }}
                      className="max-h-full max-w-full object-contain transition-transform duration-300 hover:scale-105"
                    />
                  ) : (
                    <img
                      src="/uploads/vw-media-1791470009099-2584.jpeg"
                      alt={watch1.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                </div>

                <h3 className="text-xs sm:text-base font-serif font-bold text-[#0B192C] leading-snug line-clamp-2">
                  {watch1.name}
                </h3>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-sm sm:text-lg font-bold text-emerald-800">
                    {formatPrice(watch1.price)}
                  </span>
                  {watch1.compareAtPrice && (
                    <span className="text-xs text-slate-400 line-through">
                      {formatPrice(watch1.compareAtPrice)}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons for Watch 1 */}
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                <button
                  onClick={handleAddSlot1}
                  disabled={watch1.stock <= 0}
                  className={`w-full py-2.5 px-3 text-xs uppercase tracking-wider font-bold rounded flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                    watch1.stock <= 0
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : addedSlot1
                      ? 'bg-emerald-700 text-white'
                      : 'bg-[#0B192C] hover:bg-amber-600 text-white'
                  }`}
                >
                  {addedSlot1 ? <Check size={14} /> : <ShoppingBag size={14} />}
                  <span>{watch1.stock <= 0 ? 'Out of Stock' : addedSlot1 ? 'Added to Bag' : 'Add Watch A to Bag'}</span>
                </button>

                <a
                  href={`https://wa.me/923192265524?text=${encodeURIComponent(
                    `Hi VW-Ventures Watches, I am inquiring about *Watch A (${watch1.name})* from the Comparison matrix.\nPrice: PKR ${watch1.price.toLocaleString()}\nSKU: ${watch1.sku}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-800 text-[11px] font-semibold flex items-center justify-center gap-1 rounded transition-colors"
                >
                  <MessageCircle size={13} />
                  <span>WhatsApp Inquire</span>
                </a>
              </div>
            </div>

            {/* Slot 2: Watch 2 */}
            <div className="bg-white rounded-lg p-3 sm:p-5 border-2 border-slate-200 shadow-sm relative flex flex-col justify-between">
              {watch2 ? (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-blue-100 text-blue-900 rounded">
                        Watch B
                      </span>
                      <button
                        onClick={() => setActiveSlotSelecting(2)}
                        className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 hover:underline"
                      >
                        <span>Change Watch</span>
                        <ChevronDown size={12} />
                      </button>
                    </div>

                    <div className="aspect-[4/4] sm:aspect-[4/3] bg-slate-50 rounded p-2 sm:p-4 mb-3 flex items-center justify-center overflow-hidden border border-slate-100">
                      {watch2.images && watch2.images[0] ? (
                        <img
                          src={watch2.images[0]}
                          alt={watch2.name}
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.src.includes('vw-media-1791470009099-2584.jpeg')) {
                              target.src = '/uploads/vw-media-1791470009099-2584.jpeg';
                            }
                          }}
                          className="max-h-full max-w-full object-contain transition-transform duration-300 hover:scale-105"
                        />
                      ) : (
                        <img
                          src="/uploads/vw-media-1791470009099-2584.jpeg"
                          alt={watch2.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      )}
                    </div>

                    <h3 className="text-xs sm:text-base font-serif font-bold text-[#0B192C] leading-snug line-clamp-2">
                      {watch2.name}
                    </h3>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-sm sm:text-lg font-bold text-emerald-800">
                        {formatPrice(watch2.price)}
                      </span>
                      {watch2.compareAtPrice && (
                        <span className="text-xs text-slate-400 line-through">
                          {formatPrice(watch2.compareAtPrice)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons for Watch 2 */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    <button
                      onClick={handleAddSlot2}
                      disabled={watch2.stock <= 0}
                      className={`w-full py-2.5 px-3 text-xs uppercase tracking-wider font-bold rounded flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                        watch2.stock <= 0
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : addedSlot2
                          ? 'bg-emerald-700 text-white'
                          : 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold'
                      }`}
                    >
                      {addedSlot2 ? <Check size={14} /> : <ShoppingBag size={14} />}
                      <span>{watch2.stock <= 0 ? 'Out of Stock' : addedSlot2 ? 'Added to Bag' : 'Add Watch B to Bag'}</span>
                    </button>

                    <a
                      href={`https://wa.me/923192265524?text=${encodeURIComponent(
                        `Hi VW-Ventures Watches, I am inquiring about *Watch B (${watch2.name})* from the Comparison matrix.\nPrice: PKR ${watch2.price.toLocaleString()}\nSKU: ${watch2.sku}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-800 text-[11px] font-semibold flex items-center justify-center gap-1 rounded transition-colors"
                    >
                      <MessageCircle size={13} />
                      <span>WhatsApp Inquire</span>
                    </a>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3 border border-slate-200">
                    <ArrowLeftRight size={24} />
                  </div>
                  <h4 className="font-serif font-bold text-sm text-slate-700">Select Second Watch</h4>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Choose any timepiece from our catalog to compare side-by-side
                  </p>
                  <button
                    onClick={() => setActiveSlotSelecting(2)}
                    className="py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold uppercase tracking-wider rounded shadow"
                  >
                    Browse & Select Watch
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Technical Specifications Comparison Table */}
          {watch2 && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-[#0B192C]/5 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Detailed Technical Comparison
                </span>
                <span className="text-[11px] text-slate-500">
                  {highlightDifferences ? '✨ Highlighting differing specifications' : 'All specifications listed'}
                </span>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {specRows.map((row) => {
                  const val1 = row.getValue(watch1);
                  const val2 = row.getValue(watch2);
                  const isDifferent = val1.toLowerCase().trim() !== val2.toLowerCase().trim();

                  if (highlightDifferences && !isDifferent) {
                    return null;
                  }

                  return (
                    <div
                      key={row.label}
                      className={`grid grid-cols-12 py-3 px-3 sm:px-4 items-center transition-colors ${
                        isDifferent ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="col-span-4 sm:col-span-3 font-semibold text-slate-600 pr-2 flex items-center gap-1.5">
                        <span>{row.label}</span>
                        {isDifferent && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" title="Different in both watches" />
                        )}
                      </div>

                      <div
                        className={`col-span-4 sm:col-span-4.5 px-2 font-medium text-slate-900 break-words ${
                          isDifferent ? 'text-amber-950 font-bold' : ''
                        }`}
                      >
                        {val1}
                      </div>

                      <div
                        className={`col-span-4 sm:col-span-4.5 px-2 font-medium text-slate-900 border-l border-slate-100 break-words ${
                          isDifferent ? 'text-amber-950 font-bold' : ''
                        }`}
                      >
                        {val2}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Warranty Bar */}
        <div className="px-5 py-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-600 flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-amber-600" />
            <span>All timepieces include 3 Days Warranty, Velvet Vault Box & Authenticity Seal</span>
          </div>
          <button
            onClick={onClose}
            className="py-1.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded transition-colors"
          >
            Close Comparison
          </button>
        </div>
      </div>

      {/* Embedded Watch Selector Popup Overlay */}
      {activeSlotSelecting && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden">
            {/* Selector Header */}
            <div className="p-4 bg-[#0B192C] text-white flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-sm tracking-wider text-amber-300 uppercase">
                  Select Watch for {activeSlotSelecting === 1 ? 'Watch A (Left)' : 'Watch B (Right)'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Pick any timepiece from the catalog to place into the comparison matrix
                </p>
              </div>
              <button
                onClick={() => setActiveSlotSelecting(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search & Collection Filter Bar */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by watch name, SKU, or collection..."
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#0B192C]"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  onClick={() => setSelectedCollectionFilter('all')}
                  className={`px-2.5 py-1 text-[11px] rounded-full whitespace-nowrap font-medium transition-colors ${
                    selectedCollectionFilter === 'all'
                      ? 'bg-[#0B192C] text-white'
                      : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  All Watches ({allProducts.length})
                </button>
                {collections.map((col) => (
                  <button
                    key={col}
                    onClick={() => setSelectedCollectionFilter(col)}
                    className={`px-2.5 py-1 text-[11px] rounded-full whitespace-nowrap font-medium transition-colors ${
                      selectedCollectionFilter === col
                        ? 'bg-[#0B192C] text-white'
                        : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {col}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid */}
            <div className="overflow-y-auto p-4 flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {selectableProducts.map((p) => {
                const isCurrent1 = watch1?.id === p.id;
                const isCurrent2 = watch2?.id === p.id;

                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectWatch(p)}
                    className={`text-left p-2.5 rounded-lg border transition-all duration-200 flex flex-col justify-between group ${
                      (activeSlotSelecting === 1 && isCurrent1) || (activeSlotSelecting === 2 && isCurrent2)
                        ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
                        : 'border-slate-200 hover:border-[#0B192C] hover:shadow-md bg-white'
                    }`}
                  >
                    <div>
                      <div className="aspect-[4/3] bg-slate-50 rounded mb-2 flex items-center justify-center p-1 overflow-hidden border border-slate-100">
                        {p.images && p.images[0] ? (
                          <img
                            src={p.images[0]}
                            alt={p.name}
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (!target.src.includes('vw-media-1791470009099-2584.jpeg')) {
                                target.src = '/uploads/vw-media-1791470009099-2584.jpeg';
                              }
                            }}
                            className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <img
                            src="/uploads/vw-media-1791470009099-2584.jpeg"
                            alt={p.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        )}
                      </div>
                      <h4 className="text-xs font-serif font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-amber-700">
                        {p.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{p.sku}</p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800">{formatPrice(p.price)}</span>
                      <span className="text-[10px] text-amber-700 font-semibold group-hover:underline">
                        Select →
                      </span>
                    </div>
                  </button>
                );
              })}

              {selectableProducts.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                  No watches found matching your query.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
