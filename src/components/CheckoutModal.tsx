import React, { useState, useEffect } from 'react';
import { CartItem, Order, CustomerInfo } from '../types';
import { X, ShieldCheck, CheckCircle2, ArrowRight, Landmark, MessageCircle, Copy, Check, Upload, Smartphone, AlertTriangle, Mail } from 'lucide-react';
import { createOrder, uploadMediaFile, processBankPayment } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onOrderCompleted: (order: Order) => void;
}

type WalletBrand = 'easypaisa' | 'jazzcash' | 'sadapay' | 'nayapay' | 'raast';

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cart,
  onOrderCompleted
}) => {
  const [step, setStep] = useState<'form' | 'processing' | 'success'>('form');
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  // Customer Information State with Auto-prefill
  const [customer, setCustomer] = useState<CustomerInfo>(() => {
    try {
      const savedUser = localStorage.getItem('vw_current_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        return {
          name: u.name || '',
          email: u.email || '',
          phone: u.phone || '',
          address: u.address || '',
          city: u.city || 'Karachi',
          country: 'Pakistan',
          postalCode: ''
        };
      }
      const lastCust = localStorage.getItem('vw_last_customer');
      if (lastCust) {
        const c = JSON.parse(lastCust);
        return {
          name: c.name || '',
          email: c.email || '',
          phone: c.phone || '',
          address: c.address || '',
          city: c.city || 'Karachi',
          country: 'Pakistan',
          postalCode: ''
        };
      }
    } catch {}
    return {
      name: '',
      email: '',
      phone: '',
      address: '',
      city: 'Karachi',
      country: 'Pakistan',
      postalCode: ''
    };
  });

  // Payment Selection
  const [selectedWallet, setSelectedWallet] = useState<WalletBrand>('easypaisa');

  // Payment Status & Error State
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Wallet Payment Details State
  const [walletSenderPhone, setWalletSenderPhone] = useState('');
  const [walletProofUrl, setWalletProofUrl] = useState('');
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  // Copy Feedback State
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { formatPrice, currency } = useCurrency();

  // Reset to form view whenever checkout modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setPaymentError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const subtotal = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const shipping = subtotal === 0 ? 0 : 300;
  const total = subtotal + shipping;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingProof(true);
    try {
      const url = await uploadMediaFile(file);
      setWalletProofUrl(url);
    } catch (err) {
      console.warn('Proof upload error:', err);
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);

    const cleanEmail = (customer.email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setPaymentError('Please enter a valid email address (e.g. yourname@gmail.com) so we can send your order confirmation and dispatch updates.');
      return;
    }

    // Save customer details for subsequent visits
    try {
      localStorage.setItem('vw_last_customer', JSON.stringify({
        ...customer,
        email: cleanEmail
      }));
    } catch {}

    setStep('processing');
    try {
      const bankRes = await processBankPayment({
        paymentMethod: selectedWallet,
        amount: total,
        walletData: {
          senderPhone: walletSenderPhone || customer.phone,
          proofUrl: walletProofUrl
        },
        customer: {
          ...customer,
          email: cleanEmail
        }
      });

      executeOrderCreation({
        paymentMethod: selectedWallet,
        paymentDetails: {
          walletType: selectedWallet.toUpperCase(),
          senderPhone: walletSenderPhone || customer.phone,
          trxId: bankRes.transactionId || `SDP-WAL-${Date.now()}`,
          proofUrl: walletProofUrl,
          gateway: bankRes.gateway || 'SadaPay Direct Bank Ledger',
          destinationBank: 'SadaPay',
          destinationAccount: '03192265524',
          destinationTitle: 'Muhammad Tayyab Asghar',
          isAdvancePaid: true
        },
        paymentStatus: 'Paid'
      });
    } catch (err: any) {
      setStep('form');
      setPaymentError(err?.message || 'Wallet transaction verification failed.');
    }
  };

  const executeOrderCreation = async (extraPayload: { paymentMethod: string; paymentDetails: any; paymentStatus: 'Paid' | 'Pending' }) => {
    setStep('processing');

    const orderPayload = {
      customer,
      items: cart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        sku: item.product.sku,
        price: item.product.price,
        quantity: item.quantity,
        image: item.product.images[0]
      })),
      subtotal,
      shipping,
      total,
      currency: 'PKR',
      paymentMethod: extraPayload.paymentMethod,
      paymentDetails: extraPayload.paymentDetails,
      paymentStatus: extraPayload.paymentStatus
    };

    setTimeout(async () => {
      const result = await createOrder(orderPayload);
      setCreatedOrder(result);
      setStep('success');
      onOrderCompleted(result);
    }, 1500);
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 lg:p-6 animate-fade-in overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-5xl h-full sm:h-[88vh] max-h-[100dvh] sm:max-h-[90vh] bg-white text-[#0B192C] shadow-2xl rounded-none sm:rounded-xl overflow-hidden border border-slate-200 flex flex-col min-h-0 my-auto modal-enter">
        {/* Top Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#0B192C] text-white flex items-center justify-between border-b border-slate-800 flex-shrink-0 z-20">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={20} className="text-amber-400 shrink-0" />
            <div>
              <h2 className="text-xs uppercase tracking-[0.25em] font-semibold text-white">
                Ventures Watches Checkout
              </h2>
              <div className="text-[10px] text-amber-400 font-mono">
                ⚡ Raast & Mobile Wallet Transfer (SadaPay)
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-semibold font-sans transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer border border-slate-700 shadow-sm"
            title="Exit Checkout"
          >
            <X size={18} />
            <span className="hidden sm:inline">Exit / Close</span>
          </button>
        </div>

        {/* Processing Spinner */}
        {step === 'processing' && (
          <div className="flex-1 overflow-y-auto p-12 sm:p-16 text-center space-y-6 flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-[#0B192C] border-t-amber-500 rounded-full animate-spin mx-auto" />
            <h3 className="text-lg font-serif text-[#0B192C]">Processing Your Order...</h3>
            <p className="text-xs text-gray-500 font-light max-w-md mx-auto">
              Please hold on while we confirm your transfer details and prepare your watch order dispatch.
            </p>
          </div>
        )}

        {/* Success Confirmation Screen */}
        {step === 'success' && createdOrder && (
          <div className="flex-1 overflow-y-auto overscroll-contain p-6 sm:p-10 md:p-12 text-center space-y-6 bg-gradient-to-b from-slate-50 to-white">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-200">
              <CheckCircle2 size={44} />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                Order Placed Successfully
              </span>
              <h3 className="text-2xl sm:text-3xl font-serif text-[#0B192C]">
                Thank you for your order, {createdOrder.customer.name}!
              </h3>
              <p className="text-xs text-gray-600 max-w-lg mx-auto font-light">
                Your luxury timepiece order <strong className="font-mono text-[#0B192C]">{createdOrder.orderNumber}</strong> has been confirmed and placed in high-priority dispatch.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="max-w-md mx-auto bg-white border border-gray-200 p-6 rounded-lg text-left space-y-4 shadow-md text-xs">
              <div className="flex justify-between border-b pb-3 border-gray-100 font-semibold text-[#0B192C]">
                <span>Order Reference</span>
                <span className="font-mono text-amber-700 font-bold">{createdOrder.orderNumber}</span>
              </div>

              <div className="space-y-2">
                {createdOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-gray-600">
                    <span>{item.quantity}x {item.productName}</span>
                    <span className="font-semibold text-[#0B192C]">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 border-gray-100 space-y-1 font-medium">
                <div className="flex justify-between text-gray-500">
                  <span>Standard Delivery</span>
                  <span>{createdOrder.shipping === 0 ? 'Free' : formatPrice(createdOrder.shipping)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#0B192C] pt-2 border-t border-gray-200">
                  <span>Total Payable</span>
                  <span className="text-emerald-700">{formatPrice(createdOrder.total)}</span>
                </div>
              </div>

              {createdOrder.paymentDetails && (
                <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1 text-[11px]">
                  <div className="text-gray-500 font-semibold uppercase text-[10px]">Payment Receiving Bank Details:</div>
                  <div className="text-gray-800 space-y-0.5 font-sans">
                    <div>🏦 Bank Name: <strong className="text-[#0B192C]">SadaPay</strong></div>
                    <div>👤 Account Title: <strong className="text-[#0B192C]">Muhammad Tayyab Asghar</strong></div>
                    <div>🔢 Account / Mobile Number: <code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold text-[#0B192C]">03192265524</code></div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto pt-2">
              <a
                href={`https://wa.me/923192265524?text=${encodeURIComponent(
                  `Hi VW-Ventures Watches, I have placed order ${createdOrder.orderNumber}.\n\n*Amount:* PKR ${createdOrder.total.toLocaleString()}\n*Bank Name:* SadaPay\n*Account Title:* Muhammad Tayyab Asghar\n*Account Number:* 03192265524\n*Payment Method:* ${createdOrder.paymentMethod?.toUpperCase()}\n*Customer:* ${createdOrder.customer.name}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white text-xs uppercase tracking-wider font-semibold py-3.5 px-6 rounded transition-colors flex items-center justify-center gap-2 shadow"
              >
                <MessageCircle size={16} className="fill-current" />
                <span>Confirm on WhatsApp</span>
              </a>

              <button
                onClick={onClose}
                className="w-full sm:w-auto bg-[#0B192C] hover:bg-amber-600 text-white text-xs uppercase tracking-wider font-semibold py-3.5 px-6 rounded transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}

        {/* Main Checkout Form */}
        {step === 'form' && (
          <form onSubmit={handleFormSubmit} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Left: Customer & Payment Form */}
            <div className="lg:col-span-7 space-y-6 w-full min-w-0">
              {/* Payment Error / Rejection Banner */}
              {paymentError && (
                <div className="bg-rose-50 border-2 border-rose-500 text-rose-950 p-4 rounded-lg flex items-start gap-3 shadow-md animate-in fade-in duration-200">
                  <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={22} />
                  <div className="space-y-1.5 text-xs">
                    <strong className="font-bold text-rose-800 text-sm block">
                      ❌ Order Processing Notice
                    </strong>
                    <p className="leading-relaxed font-semibold text-rose-900 bg-rose-100 p-2 rounded border border-rose-200 font-mono">
                      {paymentError}
                    </p>
                  </div>
                </div>
              )}

              {/* 1. Customer Details */}
              <div className="bg-white border border-gray-200 p-4 sm:p-5 rounded-lg shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-2.5 border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#0B192C] text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                    <h3 className="text-xs uppercase tracking-[0.2em] font-semibold text-[#0B192C]">
                      Customer & Shipping Details
                    </h3>
                  </div>
                  <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-medium border border-amber-200">
                    Required
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-600 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      autoComplete="name"
                      value={customer.name}
                      onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                      placeholder="e.g. Muhammad Ali"
                      className="w-full border border-gray-300 p-2.5 sm:p-3 text-base sm:text-xs text-[#0B192C] focus:border-[#0B192C] focus:ring-1 focus:ring-[#0B192C] focus:outline-none rounded bg-white shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-600 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Mail size={12} className="text-amber-600" />
                        <span>Email Address *</span>
                      </span>
                      <span className="text-[9px] text-gray-400 font-normal">For tracking & invoice</span>
                    </label>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={customer.email}
                      onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                      placeholder="e.g. ali@example.com"
                      className="w-full border border-gray-300 p-2.5 sm:p-3 text-base sm:text-xs text-[#0B192C] focus:border-[#0B192C] focus:ring-1 focus:ring-[#0B192C] focus:outline-none rounded bg-white shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-600 mb-1">
                      WhatsApp / Mobile Number *
                    </label>
                    <input
                      type="tel"
                      required
                      autoComplete="tel"
                      value={customer.phone}
                      onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                      placeholder="e.g. 0300 1234567"
                      className="w-full border border-gray-300 p-2.5 sm:p-3 text-base sm:text-xs text-[#0B192C] focus:border-[#0B192C] focus:ring-1 focus:ring-[#0B192C] focus:outline-none rounded bg-white shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-600 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      autoComplete="address-level2"
                      value={customer.city}
                      onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
                      placeholder="e.g. Karachi / Lahore / Islamabad"
                      className="w-full border border-gray-300 p-2.5 sm:p-3 text-base sm:text-xs text-[#0B192C] focus:border-[#0B192C] focus:ring-1 focus:ring-[#0B192C] focus:outline-none rounded bg-white shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-600 mb-1">
                    Complete Shipping Address *
                  </label>
                  <textarea
                    required
                    rows={2}
                    autoComplete="street-address"
                    value={customer.address}
                    onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                    placeholder="House / Apartment / Street / Area address..."
                    className="w-full border border-gray-300 p-2.5 sm:p-3 text-base sm:text-xs text-[#0B192C] focus:border-[#0B192C] focus:ring-1 focus:ring-[#0B192C] focus:outline-none rounded bg-white resize-none shadow-sm"
                  />
                </div>
              </div>

              {/* 2. Mobile Wallets & Raast Section */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase tracking-[0.2em] font-semibold text-[#0B192C] border-b pb-2 border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#0B192C] text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                    <span>Payment via Raast / Mobile Wallet</span>
                  </div>
                  <Smartphone size={16} className="text-teal-600" />
                </h3>

                <div className="bg-slate-50 border border-slate-200 p-3.5 sm:p-4 rounded-lg space-y-4">
                  {/* Wallet Option Pills */}
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-center">
                    {[
                      { id: 'easypaisa', name: 'EasyPaisa', color: 'bg-emerald-600' },
                      { id: 'jazzcash', name: 'JazzCash', color: 'bg-rose-600' },
                      { id: 'sadapay', name: 'SadaPay', color: 'bg-teal-600' },
                      { id: 'nayapay', name: 'NayaPay', color: 'bg-orange-600' },
                      { id: 'raast', name: 'Raast / Bank', color: 'bg-[#0B192C]' }
                    ].map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setSelectedWallet(w.id as WalletBrand)}
                        className={`p-2 rounded text-[10px] font-bold transition-all truncate ${
                          selectedWallet === w.id
                            ? `${w.color} text-white shadow-sm ring-2 ring-amber-400`
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {w.name}
                      </button>
                    ))}
                  </div>

                  {/* Account Details Box for Selected Wallet */}
                  <div className="bg-white border-2 border-slate-800 p-3.5 rounded space-y-2 text-xs shadow-sm">
                    <div className="flex items-center justify-between border-b pb-2 border-gray-100">
                      <span className="font-bold text-[#0B192C] uppercase text-[11px]">
                        Payment Receiving Account ({selectedWallet.toUpperCase()}):
                      </span>
                      <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                        Verified
                      </span>
                    </div>

                    <div className="space-y-1.5 text-gray-800 pt-1">
                      <div>Bank Name: <strong className="text-[#0B192C]">SadaPay</strong></div>
                      <div>Account Title: <strong className="text-[#0B192C]">Muhammad Tayyab Asghar</strong></div>
                      <div className="flex items-center justify-between bg-slate-100 p-2 rounded border border-slate-200 gap-2">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-500 block">
                            {selectedWallet === 'raast' ? 'Raast ID / Account Number' : 'Account / Mobile Number'}
                          </span>
                          <strong className="font-mono text-base text-[#0B192C] tracking-wider">03192265524</strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy('03192265524', selectedWallet)}
                          className="bg-[#0B192C] text-amber-400 hover:bg-amber-500 hover:text-slate-950 px-3 py-1.5 rounded text-[10px] font-bold flex items-center gap-1 transition-colors shrink-0"
                        >
                          {copiedField === selectedWallet ? <Check size={12} /> : <Copy size={12} />}
                          <span>{copiedField === selectedWallet ? 'Copied' : 'Copy Number'}</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-700 bg-slate-100 border border-slate-200 p-2 rounded leading-relaxed mt-2 font-medium">
                        💡 Select <strong>SadaPay</strong> in your app ({selectedWallet === 'easypaisa' ? 'EasyPaisa' : selectedWallet === 'jazzcash' ? 'JazzCash' : selectedWallet === 'nayapay' ? 'NayaPay' : selectedWallet === 'raast' ? 'Raast / Bank App' : 'SadaPay'}), send payment to account <strong>03192265524</strong>, and verify title shows <strong>Muhammad Tayyab Asghar</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Sender Details & Screenshot Upload */}
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-600 mb-1">
                        Your Sender Account Name / Phone (Optional)
                      </label>
                      <input
                        type="text"
                        value={walletSenderPhone}
                        onChange={(e) => setWalletSenderPhone(e.target.value)}
                        placeholder="e.g. 03001234567 or Ali Khan"
                        className="w-full border border-gray-300 p-2.5 sm:p-3 text-base sm:text-xs text-[#0B192C] focus:outline-none focus:border-[#0B192C] rounded bg-white shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-600 mb-1">
                        Attach Payment Screenshot / Receipt Proof (Optional)
                      </label>
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="cursor-pointer bg-white border border-gray-300 hover:border-[#0B192C] text-gray-700 px-3 py-2 rounded text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm">
                          <Upload size={14} className="text-amber-600" />
                          <span>{isUploadingProof ? 'Uploading...' : 'Upload Receipt Screenshot'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleProofUpload}
                            className="hidden"
                          />
                        </label>
                        {walletProofUrl && (
                          <div className="flex items-center gap-2 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                            <CheckCircle2 size={14} />
                            <span>Proof Attached!</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Order Summary Sidebar */}
            <div className="lg:col-span-5 bg-[#F9FAFB] p-4 sm:p-6 border border-gray-200 flex flex-col justify-between space-y-6 rounded-lg w-full min-w-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2 border-gray-200">
                  <h3 className="text-xs uppercase tracking-[0.2em] font-semibold text-[#0B192C]">
                    Order Summary ({cart.length})
                  </h3>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {cart.reduce((sum, i) => sum + i.quantity, 0)} timepiece{cart.reduce((sum, i) => sum + i.quantity, 0) !== 1 ? 's' : ''}
                  </span>
                </div>

                {cart.length === 0 ? (
                  <div className="py-6 text-center text-gray-500 text-xs">
                    <p>Your bag is currently empty.</p>
                    <button
                      type="button"
                      onClick={onClose}
                      className="mt-2 text-amber-700 hover:text-amber-800 underline font-semibold cursor-pointer"
                    >
                      Browse Timepieces
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                    {cart.map(item => (
                      <div key={item.product.id} className="flex gap-3 text-xs bg-white p-2 rounded border border-gray-100 shadow-sm">
                        <img src={item.product.images[0]} alt="" className="w-11 h-13 object-contain bg-white border border-gray-200 p-1 rounded" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[#0B192C] truncate">{item.product.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono">Qty: {item.quantity}</p>
                        </div>
                        <span className="font-semibold text-[#0B192C] self-center">{formatPrice(item.product.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-gray-200 pt-3 space-y-1 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Standard Delivery</span>
                    <span>{shipping === 0 ? <span className="text-emerald-700 font-semibold">Free</span> : formatPrice(shipping)}</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 flex justify-between text-sm font-bold text-[#0B192C]">
                    <span>Total Amount</span>
                    <div className="text-right">
                      <span className="text-emerald-700 block">{formatPrice(total)}</span>
                      {currency !== 'PKR' && (
                        <span className="text-[10px] text-gray-500 font-normal block">
                          ≈ ₨ {total.toLocaleString()} PKR
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-[10px] text-gray-600 bg-white p-2.5 rounded border border-gray-200">
                  <ShieldCheck size={16} className="text-amber-600 flex-shrink-0" />
                  <span>256-Bit Encrypted Transfer Gateway</span>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#0B192C] hover:bg-amber-600 text-white text-xs uppercase tracking-[0.2em] font-bold py-3.5 sm:py-4 rounded transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  <span>Complete Order ({formatPrice(total)})</span>
                  <ArrowRight size={16} />
                </button>

                {/* Instant Order on WhatsApp */}
                <a
                  href={`https://wa.me/923192265524?text=${encodeURIComponent(
                    `Hi VW-Ventures Watches, I want to place an order via WhatsApp:\n\n*Items:*\n${cart
                      .map(i => `• ${i.product.name} (x${i.quantity}) - PKR ${(i.product.price * i.quantity).toLocaleString()}`)
                      .join('\n')}\n\n*Total Amount:* PKR ${total.toLocaleString()}\n*Customer Name:* ${customer.name || 'Not provided'}\n*Phone:* ${customer.phone || 'Not provided'}\n*City:* ${customer.city}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs uppercase tracking-[0.18em] font-semibold py-3 rounded transition-colors flex items-center justify-center gap-2 shadow"
                >
                  <MessageCircle size={16} className="fill-current" />
                  <span>Order via WhatsApp (0319 2265524)</span>
                </a>

                {/* Cancel & Exit Order Button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-300 text-xs font-semibold uppercase tracking-wider py-2.5 rounded transition-colors flex items-center justify-center gap-2 mt-2 cursor-pointer"
                >
                  <X size={16} />
                  <span>Cancel & Exit Order</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

