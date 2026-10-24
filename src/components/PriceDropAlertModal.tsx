import React, { useState } from 'react';
import { Product } from '../types';
import { Bell, Check, X, Sparkles, Shield, Mail, DollarSign } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { createPriceDropAlert } from '../services/api';

interface PriceDropAlertModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export const PriceDropAlertModal: React.FC<PriceDropAlertModalProps> = ({ product, isOpen, onClose }) => {
  const { formatPrice } = useCurrency();

  const [email, setEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedPercentage, setSelectedPercentage] = useState<number>(10);
  const [customPrice, setCustomPrice] = useState<string>(
    String(Math.round(product.price * 0.90))
  );
  const [isCustom, setIsCustom] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentPrice = product.price;
  const targetPriceNumber = isCustom
    ? Math.max(1, parseInt(customPrice.replace(/\D/g, ''), 10) || 0)
    : Math.round(currentPrice * (1 - selectedPercentage / 100));

  const handlePercentageSelect = (pct: number) => {
    setSelectedPercentage(pct);
    setIsCustom(false);
    setCustomPrice(String(Math.round(currentPrice * (1 - pct / 100))));
    setError(null);
  };

  const handleCustomChange = (val: string) => {
    const numeric = val.replace(/\D/g, '');
    setCustomPrice(numeric);
    setIsCustom(true);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid email address to receive alerts.');
      return;
    }

    if (!targetPriceNumber || targetPriceNumber >= currentPrice) {
      setError(`Target price must be lower than the current price (${formatPrice(currentPrice)}).`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const productImage = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : '';
      await createPriceDropAlert({
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        productImage,
        currentPrice: product.price,
        targetPrice: targetPriceNumber,
        email: cleanEmail,
        customerName: customerName.trim() || undefined
      });

      setIsSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to register price drop alert. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0B192C] text-white border border-amber-500/30 rounded-lg shadow-2xl overflow-hidden animate-scale-up">
        {/* Top Gradient Banner */}
        <div className="bg-gradient-to-r from-amber-900/60 via-amber-700/40 to-slate-900 px-6 py-4 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Bell size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-wider uppercase text-amber-300">
                Price Drop Alert
              </h3>
              <p className="text-[11px] text-slate-300">Notify me when price drops</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-6 sm:p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/50 rounded-full flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
              <Check size={32} />
            </div>
            <h4 className="text-lg font-serif font-semibold text-white">
              Price Drop Alert Activated!
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
              We have saved your request. As soon as the price for <strong className="text-amber-300">{product.name}</strong> drops to <strong className="text-emerald-400">{formatPrice(targetPriceNumber)}</strong> or lower, we will immediately send an email alert to <span className="font-mono text-slate-200 underline">{email}</span>.
            </p>
            <div className="pt-2">
              <button
                onClick={onClose}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-widest rounded transition-all shadow-lg"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Product Summary Card */}
            <div className="bg-[#070F1E] border border-slate-800 rounded p-3 flex items-center gap-3">
              {product.images && product.images[0] ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-12 h-12 object-contain bg-slate-900/50 rounded border border-slate-800 p-1"
                />
              ) : (
                <div className="w-12 h-12 bg-slate-800 rounded flex items-center justify-center text-xs font-serif text-slate-400">
                  VW
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold text-white truncate">{product.name}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-400">Current Price:</span>
                  <span className="text-xs font-bold text-amber-400">{formatPrice(currentPrice)}</span>
                </div>
              </div>
            </div>

            {/* Target Price Selectors */}
            <div className="space-y-2">
              <label className="block text-[11px] uppercase tracking-wider text-slate-300 font-semibold">
                Select Target Price:
              </label>

              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 15].map(pct => {
                  const calculated = Math.round(currentPrice * (1 - pct / 100));
                  const isSelected = !isCustom && selectedPercentage === pct;
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handlePercentageSelect(pct)}
                      className={`p-2 rounded text-center border transition-all ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                          : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <div className="text-[10px] font-semibold text-amber-400">-{pct}% OFF</div>
                      <div className="text-xs font-bold mt-0.5">{formatPrice(calculated)}</div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Target Price Input */}
              <div className="mt-2">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 text-xs">
                    PKR
                  </div>
                  <input
                    type="text"
                    value={customPrice}
                    onChange={e => handleCustomChange(e.target.value)}
                    placeholder="Custom target price (PKR)"
                    className="w-full bg-[#070F1E] border border-slate-700 focus:border-amber-400 pl-12 pr-4 py-2 text-xs rounded text-white focus:outline-none transition-colors font-mono"
                  />
                </div>
                {targetPriceNumber > 0 && targetPriceNumber < currentPrice && (
                  <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                    <Sparkles size={11} />
                    Alert triggers when price drops by PKR {(currentPrice - targetPriceNumber).toLocaleString()} ({Math.round(((currentPrice - targetPriceNumber) / currentPrice) * 100)}% discount)
                  </p>
                )}
              </div>
            </div>

            {/* Customer Contact Inputs */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-slate-300 font-semibold mb-1">
                  Your Email Address <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail size={14} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="w-full bg-[#070F1E] border border-slate-700 focus:border-amber-400 pl-9 pr-3 py-2 text-xs rounded text-white focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-slate-300 font-semibold mb-1">
                  Your Name (Optional)
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="e.g. Ali Khan"
                  className="w-full bg-[#070F1E] border border-slate-700 focus:border-amber-400 px-3 py-2 text-xs rounded text-white focus:outline-none transition-colors"
                />
              </div>
            </div>

            {error && (
              <div className="p-2.5 bg-rose-950/60 border border-rose-600/50 rounded text-rose-300 text-xs">
                {error}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-[#0B192C] font-bold text-xs uppercase tracking-widest rounded transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    <span>Saving Alert...</span>
                  </>
                ) : (
                  <>
                    <Bell size={15} />
                    <span>Activate Price Drop Alert</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
              <Shield size={11} className="text-amber-400" />
              We respect your privacy. No spam. Only legitimate price decrease notifications.
            </p>
          </form>
        )}
      </div>
    </div>
  );
};
