import React from 'react';
import { CartItem } from '../types';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, ShieldCheck } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout
}) => {
  const { formatPrice } = useCurrency();

  if (!isOpen) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shipping = subtotal === 0 ? 0 : 300;
  const total = subtotal + shipping;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-sm transition-opacity animate-fade-in duration-300"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white text-[#0B192C] shadow-2xl flex flex-col justify-between border-l border-gray-200 drawer-enter">
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-[#F9FAFB]">
            <div className="flex items-center gap-2">
              <ShoppingBag size={20} className="text-[#0B192C]" />
              <h2 className="text-sm uppercase tracking-[0.2em] font-semibold text-[#0B192C]">
                Your Shopping Bag ({cart.reduce((s, i) => s + i.quantity, 0)})
              </h2>
            </div>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-gray-200 hover:bg-rose-600 hover:text-white text-gray-700 text-xs font-semibold rounded-full flex items-center gap-1 transition-all duration-200 transform hover:scale-105 active:scale-95"
              title="Close Bag"
            >
              <X size={16} />
              <span>Exit</span>
            </button>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 divide-y divide-gray-100">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                  <ShoppingBag size={32} />
                </div>
                <h3 className="text-base font-serif text-[#0B192C]">Your collection is empty</h3>
                <p className="text-xs text-gray-500 max-w-xs font-light">
                  Explore our luxury watch catalog to discover timeless masterworks.
                </p>
                <button
                  onClick={onClose}
                  className="mt-4 bg-[#0B192C] text-white text-xs uppercase tracking-widest px-6 py-3 rounded-none font-semibold hover:bg-amber-600 transition-colors"
                >
                  Explore Timepieces
                </button>
              </div>
            ) : (
              cart.map(item => {
                const maxStock = typeof item.product.stock === 'number' ? Math.max(0, item.product.stock) : 99;
                const isAtMaxStock = item.quantity >= maxStock;

                return (
                  <div key={item.product.id} className="pt-6 first:pt-0 flex gap-4">
                    <div className="w-20 h-24 bg-[#F9FAFB] border border-gray-100 flex-shrink-0 p-2 flex items-center justify-center relative">
                      {item.product.images && item.product.images[0] ? (
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.src.includes('vw-media-1791470009099-2584.jpeg')) {
                              target.src = '/uploads/vw-media-1791470009099-2584.jpeg';
                            }
                          }}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <img
                          src="/uploads/vw-media-1791470009099-2584.jpeg"
                          alt={item.product.name}
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-serif font-semibold text-[#0B192C] line-clamp-1">
                            {item.product.name}
                          </h4>
                          <button
                            onClick={() => onRemoveItem(item.product.id)}
                            className="text-gray-400 hover:text-rose-600 transition-colors"
                            title="Remove item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">
                          SKU: {item.product.sku}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs font-semibold text-[#0B192C]">
                            {formatPrice(item.product.price)}
                          </p>
                          <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            Stock: {maxStock}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-end justify-between pt-2">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center border border-gray-200 rounded-none bg-gray-50">
                            <button
                              onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                              className="p-1.5 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-30"
                              disabled={item.quantity <= 1}
                              title="Decrease quantity"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="px-3 text-xs font-semibold text-[#0B192C]">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                              className={`p-1.5 transition-colors ${
                                isAtMaxStock
                                  ? 'text-gray-300 cursor-not-allowed bg-gray-100'
                                  : 'text-gray-600 hover:bg-gray-200'
                              }`}
                              disabled={isAtMaxStock}
                              title={isAtMaxStock ? `Max available stock reached (${maxStock} units)` : 'Increase quantity'}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          {isAtMaxStock && (
                            <span className="text-[9px] font-semibold text-amber-700 uppercase tracking-tight">
                              Max Stock ({maxStock}) Reached
                            </span>
                          )}
                        </div>

                        <span className="text-xs font-bold text-[#0B192C]">
                          {formatPrice(item.product.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Summary & Checkout CTA */}
          {cart.length > 0 && (
            <div className="p-6 bg-[#F9FAFB] border-t border-gray-200 space-y-4">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#0B192C]">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Standard Delivery</span>
                  <span>{shipping === 0 ? <span className="text-emerald-700 font-semibold">Free</span> : formatPrice(shipping)}</span>
                </div>
                <div className="pt-2 border-t border-gray-200 flex justify-between text-sm font-bold text-[#0B192C]">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-gray-500 bg-white p-2.5 rounded border border-gray-200">
                <ShieldCheck size={16} className="text-amber-600 flex-shrink-0" />
                <span>Includes 3 Days Warranty & Quality Assurance.</span>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onProceedToCheckout();
                }}
                className="w-full bg-[#0B192C] hover:bg-amber-600 text-white text-xs uppercase tracking-[0.25em] font-semibold py-4 rounded-none transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
