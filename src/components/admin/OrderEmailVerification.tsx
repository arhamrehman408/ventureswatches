import React, { useState, useEffect } from 'react';
import { Order } from '../../types';
import {
  Check,
  X,
  Eye,
  Mail,
  MessageCircle,
  ExternalLink,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Send,
  Sparkles,
  Smartphone,
  Copy,
  AlertCircle,
  Building2,
  HelpCircle,
  CreditCard,
  ShieldCheck,
  RefreshCw,
  LogIn,
  LogOut,
  UserCheck,
  CheckCheck,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import {
  sendOrderConfirmationEmail,
  declineOrderPayment,
  generateOrderConfirmationEmailHtml,
  fetchEmailSettings,
  saveEmailSettings,
  testEmailSettings
} from '../../services/api';
import {
  connectGmail,
  disconnectGmail,
  sendOrderConfirmationViaGmail,
  initGmailAuth,
  getCachedGmailToken,
  getCachedGmailUser
} from '../../services/gmail';
import { User as FirebaseUser } from 'firebase/auth';

interface OrderEmailVerificationProps {
  orders: Order[];
  onRefreshData: () => void;
  showToast: (msg: string) => void;
}

export const OrderEmailVerification: React.FC<OrderEmailVerificationProps> = ({
  orders,
  onRefreshData,
  showToast
}) => {
  const { formatPrice } = useCurrency();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'declined'>('pending');
  const [localOrders, setLocalOrders] = useState<Order[]>(orders);
  const [selectedOrderForEmail, setSelectedOrderForEmail] = useState<Order | null>(null);
  const [selectedOrderForDecline, setSelectedOrderForDecline] = useState<Order | null>(null);
  const [selectedScreenshotUrl, setSelectedScreenshotUrl] = useState<{ url: string; orderNumber: string; total: number; customer: string } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isConnectingGmail, setIsConnectingGmail] = useState(false);
  const [showDeveloperPermGuide, setShowDeveloperPermGuide] = useState(false);

  useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

  // Gmail Auth State
  const [gmailUser, setGmailUser] = useState<FirebaseUser | null>(getCachedGmailUser());
  const [gmailToken, setGmailToken] = useState<string | null>(getCachedGmailToken());

  // Email Sender Configuration State
  const [emailSettings, setEmailSettings] = useState<{ senderEmail: string; hasAppPassword: boolean; isActive: boolean }>({
    senderEmail: 'ventureswatches@gmail.com',
    hasAppPassword: false,
    isActive: true
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [senderEmailInput, setSenderEmailInput] = useState('ventureswatches@gmail.com');
  const [appPasswordInput, setAppPasswordInput] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);

  useEffect(() => {
    fetchEmailSettings().then(s => {
      setEmailSettings(s);
      setSenderEmailInput(s.senderEmail || 'ventureswatches@gmail.com');
    }).catch(() => {});
  }, []);

  const handleSaveEmailSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await saveEmailSettings({
        senderEmail: senderEmailInput.trim() || 'ventureswatches@gmail.com',
        appPassword: appPasswordInput.trim() || undefined
      });
      if (res.success) {
        setEmailSettings(prev => ({
          ...prev,
          senderEmail: senderEmailInput.trim() || 'ventureswatches@gmail.com',
          hasAppPassword: Boolean(appPasswordInput.trim() || prev.hasAppPassword)
        }));
        showToast('✅ Sender settings & automated SMTP delivery configured!');
        setShowSettingsModal(false);
      } else {
        showToast('❌ ' + (res.error || 'Failed to update email settings.'));
      }
    } catch {
      showToast('❌ Error updating email settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleTestEmail = async () => {
    setIsTestingEmail(true);
    try {
      const res = await testEmailSettings(senderEmailInput.trim() || undefined);
      if (res.success) {
        showToast(`✅ ${res.message || 'Test email dispatched successfully!'}`);
      } else {
        showToast(`❌ ${res.error || 'Failed to dispatch test email.'}`);
      }
    } catch {
      showToast('❌ Error dispatching test email.');
    } finally {
      setIsTestingEmail(false);
    }
  };

  // Email Customization Form State
  const [customNote, setCustomNote] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courierName, setCourierName] = useState('TCS Express Insured');
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Decline Reason Form State
  const [declineReason, setDeclineReason] = useState('Payment screenshot is illegible or amount does not match bank record.');
  const [customDeclineNote, setCustomDeclineNote] = useState('');

  // Screenshot Zoom & Rotation state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const unsubscribe = initGmailAuth((user, token) => {
      setGmailUser(user);
      setGmailToken(token);
    });
    return () => unsubscribe();
  }, []);

  const handleConnectGmail = async () => {
    setIsConnectingGmail(true);
    try {
      const res = await connectGmail();
      setGmailUser(res.user);
      setGmailToken(res.accessToken);
      showToast(`🟢 Gmail connected: ${res.user.email}`);
    } catch (err: any) {
      console.error('Gmail connect error:', err);
      if (err.message && err.message.includes('permission')) {
        setShowDeveloperPermGuide(true);
      }
      showToast(err.message || 'Google OAuth: Account needs Test User permission or use Gmail Web.');
    } finally {
      setIsConnectingGmail(false);
    }
  };

  const handleDisconnectGmail = async () => {
    try {
      await disconnectGmail();
      setGmailUser(null);
      setGmailToken(null);
      showToast('Disconnected Gmail account.');
    } catch (err) {
      showToast('Error disconnecting Gmail.');
    }
  };

  // Sort orders descending (latest first)
  const sortedOrders = [...localOrders].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );

  // Filter orders
  // Helper to determine accurate normalized approval status for any order
  const getOrderStatus = (o: Order) => {
    if (o.orderStatus === 'Cancelled' || o.emailApprovalStatus === 'Rejected / Declined') {
      return 'Rejected / Declined';
    }
    if (o.emailApprovalStatus === 'Approved & Sent' || o.orderStatus === 'Confirmed' || o.emailConfirmationSent) {
      return 'Approved & Sent';
    }
    return o.emailApprovalStatus || 'Pending Review';
  };

  // Filter orders
  const filteredOrders = sortedOrders.filter(order => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      order.orderNumber.toLowerCase().includes(q) ||
      order.customer.name.toLowerCase().includes(q) ||
      order.customer.email.toLowerCase().includes(q) ||
      order.customer.phone.includes(q) ||
      (order.paymentDetails?.trxId && order.paymentDetails.trxId.toLowerCase().includes(q));

    const status = getOrderStatus(order);

    if (statusFilter === 'pending') {
      return matchesSearch && status === 'Pending Review';
    }
    if (statusFilter === 'approved') {
      return matchesSearch && status === 'Approved & Sent';
    }
    if (statusFilter === 'declined') {
      return matchesSearch && status === 'Rejected / Declined';
    }
    return matchesSearch;
  });

  // Calculate statistics accurately
  const pendingCount = sortedOrders.filter(o => getOrderStatus(o) === 'Pending Review').length;
  const approvedCount = sortedOrders.filter(o => getOrderStatus(o) === 'Approved & Sent').length;
  const declinedCount = sortedOrders.filter(o => getOrderStatus(o) === 'Rejected / Declined').length;

  const handleApproveAndSendEmail = async (order: Order) => {
    setIsSending(true);
    // Optimistic instantaneous UI transition
    setLocalOrders(prev => prev.map(o => o.id === order.id ? {
      ...o,
      emailApprovalStatus: 'Approved & Sent',
      emailConfirmationSent: true,
      emailSentAt: new Date().toISOString(),
      orderStatus: 'Confirmed',
      paymentStatus: 'Paid'
    } : o));

    try {
      // 1. Try sending via connected Gmail API if token available
      if (gmailToken) {
        const gmailRes = await sendOrderConfirmationViaGmail(order, {
          customNote: customNote.trim() || undefined,
          trackingNumber: trackingNumber.trim() || undefined,
          courier: courierName
        });

        if (gmailRes.success) {
          // Persist approved confirmation state to cloud database and server
          await sendOrderConfirmationEmail(order.id, {
            customNote: customNote.trim() || undefined,
            trackingNumber: trackingNumber.trim() || undefined,
            courier: courierName
          });
          showToast(`✅ Official Confirmation Email sent from ${gmailUser?.email || 'ventureswatches@gmail.com'} to ${order.customer.email} via Gmail!`);
          setSelectedOrderForEmail(null);
          setCustomNote('');
          setTrackingNumber('');
          await onRefreshData();
          return;
        } else {
          console.warn('Gmail API sending failed, falling back to server dispatcher:', gmailRes.error);
        }
      }

      // 2. Fallback to server database update & dispatcher
      const res = await sendOrderConfirmationEmail(order.id, {
        customNote: customNote.trim() || undefined,
        trackingNumber: trackingNumber.trim() || undefined,
        courier: courierName
      });

      if (res.success) {
        showToast(`✅ Order #${order.orderNumber} Approved & Confirmation Registered!`);
        setSelectedOrderForEmail(null);
        setCustomNote('');
        setTrackingNumber('');
        await onRefreshData();
      } else {
        showToast('❌ Failed to update order status.');
      }
    } catch (err) {
      showToast('❌ Error confirming order.');
    } finally {
      setIsSending(false);
    }
  };

  const getEmailDetailsForOrder = (order: Order, note?: string, tracking?: string, courier?: string) => {
    const curNote = note !== undefined ? note : customNote;
    const curTracking = tracking !== undefined ? tracking : trackingNumber;
    const curCourier = courier || courierName;

    const emailSubject = `Order Confirmation #${order.orderNumber} - Ventures Watches Verified`;
    const emailBody = `Dear ${order.customer.name},\n\nWe are pleased to inform you that your online advance payment for Order #${order.orderNumber} has been verified and approved by Ventures Watches Concierge.\n\n` +
      `ORDER SUMMARY:\n` +
      `Order Reference: ${order.orderNumber}\n` +
      `Total Paid: PKR ${order.total.toLocaleString()}\n` +
      `Payment Method: ${order.paymentMethod?.toUpperCase() || 'Advance Transfer'} (Verified)\n` +
      (order.paymentDetails?.trxId ? `Transaction TRX: ${order.paymentDetails.trxId}\n` : '') +
      `\nPURCHASED TIMEPIECES:\n` +
      order.items.map(i => `• ${i.quantity}x ${i.productName} - PKR ${(i.price * i.quantity).toLocaleString()}`).join('\n') +
      `\n\nSHIPPING DESTINATION:\n` +
      `${order.customer.address}, ${order.customer.city}, ${order.customer.country}\n` +
      `Contact Phone: ${order.customer.phone}\n` +
      (curTracking ? `\nCourier Tracking: ${curTracking} (${curCourier})\n` : '') +
      (curNote ? `\nConcierge Note: ${curNote}\n` : '') +
      `\nWARRANTY & INSPECTION:\n` +
      `Your timepiece includes our 3 Days Warranty. For concierge assistance, WhatsApp 03192265524.\n\n` +
      `Warm regards,\nVentures Watches Concierge\nventureswatches@gmail.com`;

    const gmailWebUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(order.customer.email)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    const mailtoUrl = `mailto:${encodeURIComponent(order.customer.email)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

    return { emailSubject, emailBody, gmailWebUrl, mailtoUrl };
  };

  const handleMarkApprovedAndProceed = async (order: Order) => {
    // Optimistic instantaneous UI transition
    setLocalOrders(prev => prev.map(o => o.id === order.id ? {
      ...o,
      emailApprovalStatus: 'Approved & Sent',
      emailConfirmationSent: true,
      emailSentAt: new Date().toISOString(),
      orderStatus: 'Confirmed',
      paymentStatus: 'Paid'
    } : o));

    try {
      await sendOrderConfirmationEmail(order.id, {
        customNote: customNote.trim() || undefined,
        trackingNumber: trackingNumber.trim() || undefined,
        courier: courierName
      });
      showToast(`✅ Order #${order.orderNumber} Approved & Confirmation Dispatched!`);
      setSelectedOrderForEmail(null);
      await onRefreshData();
    } catch {}
  };

  const handleOpenGmailWebAndApprove = (order: Order) => {
    const { gmailWebUrl } = getEmailDetailsForOrder(order);
    try {
      window.open(gmailWebUrl, '_blank', 'noopener,noreferrer');
    } catch {}
    handleMarkApprovedAndProceed(order);
  };

  const handleConfirmDecline = async () => {
    if (!selectedOrderForDecline) return;
    setIsSending(true);
    const declinedId = selectedOrderForDecline.id;
    const finalReason = customDeclineNote.trim() ? `${declineReason} - ${customDeclineNote.trim()}` : declineReason;

    // Optimistic instantaneous UI transition
    setLocalOrders(prev => prev.map(o => o.id === declinedId ? {
      ...o,
      emailApprovalStatus: 'Rejected / Declined',
      emailRejectionReason: finalReason,
      orderStatus: 'Cancelled',
      paymentStatus: 'Failed'
    } : o));

    try {
      const res = await declineOrderPayment(declinedId, finalReason);
      if (res.success) {
        showToast(`❌ Payment for Order #${selectedOrderForDecline.orderNumber} declined.`);
        setSelectedOrderForDecline(null);
        setDeclineReason('Payment screenshot is illegible or amount does not match bank record.');
        setCustomDeclineNote('');
        await onRefreshData();
      } else {
        showToast('❌ Failed to update order status.');
      }
    } catch (err) {
      showToast('❌ Error declining order payment.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('📋 Copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      {/* Top Header with Gmail Account Status Banner */}
      <div className="bg-[#0B192C] p-6 rounded-lg border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 bg-amber-500/20 text-amber-400 rounded border border-amber-500/30">
                <Mail size={18} />
              </span>
              <h2 className="text-xl sm:text-2xl font-serif text-white font-light tracking-wide">
                Gmail Confirmation & Screenshot Verification Desk
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Inspect customer online payment transfer screenshots (SadaPay, Raast, EasyPaisa, JazzCash).
              Click <span className="text-emerald-400 font-semibold font-mono">Tick (✔)</span> to approve payment and dispatch official confirmation emails from <span className="text-amber-300 font-semibold font-mono">ventureswatches@gmail.com</span>, or <span className="text-rose-400 font-semibold font-mono">Cross (✖)</span> to decline.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowDeveloperPermGuide(!showDeveloperPermGuide)}
              className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs px-3.5 py-2 rounded transition-colors"
            >
              <Info size={14} />
              <span>Permission Guide</span>
              {showDeveloperPermGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <button
              onClick={onRefreshData}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-2 rounded border border-slate-700 transition-colors"
            >
              <RefreshCw size={13} className="text-amber-400" />
              <span>Refresh Orders</span>
            </button>
          </div>
        </div>

        {/* Permission Needed / Developer Guide Dropdown */}
        {showDeveloperPermGuide && (
          <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-lg text-xs space-y-3 animate-fade-in">
            <div className="flex items-start gap-2.5 text-amber-300 font-semibold">
              <Info size={16} className="flex-shrink-0 mt-0.5" />
              <span>Why does Google show: "You need permission from the developer"?</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Google Cloud places unverified apps in <b>"Testing Mode"</b> for high-security scopes like Gmail. When you sign in, Google requires your email (<code>ventureswatches@gmail.com</code> or <code>arhamrehman408@gmail.com</code>) to be registered under <b>Test Users</b> in the Google Cloud Console.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-1">
                <div className="text-emerald-400 font-bold">✅ Instant Solution (No Setup Needed):</div>
                <p className="text-slate-400">
                  When you click <b className="text-white">Tick (✔)</b>, click <b className="text-amber-300">"🚀 Send via Gmail Web"</b>. It directly opens your browser's Gmail with the customer's email, subject, and receipt pre-filled so you can send in 1 click!
                </p>
              </div>
              <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-1">
                <div className="text-blue-400 font-bold">⚙️ Developer Fix (Google Cloud Console):</div>
                <p className="text-slate-400">
                  Go to <b>Google Cloud Console &gt; APIs & Services &gt; OAuth consent screen &gt; Test Users &gt; Add Users</b> and add <code>ventureswatches@gmail.com</code>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Official Sender Account Connection Bar */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 font-bold text-base flex-shrink-0">
              G
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-white">Official Concierge Sender:</span>
                <code className="bg-slate-950 px-2 py-0.5 rounded text-amber-300 font-mono text-xs border border-slate-800 font-bold">
                  {emailSettings.senderEmail || 'ventureswatches@gmail.com'}
                </code>
                <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Email Desk Active</span>
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {emailSettings.hasAppPassword ? (
                  <span className="text-emerald-400 font-medium">
                    ⚡ Direct automated SMTP dispatch connected. Verification emails are delivered straight to customers' inboxes.
                  </span>
                ) : (
                  <span className="text-slate-300">
                    Ready to send verification emails to customers via <b>1-Click Gmail Web</b> (opens pre-filled in 1 click), <b>Mail Client</b>, or automated direct dispatch.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow cursor-pointer"
            >
              <span>🚀 {emailSettings.hasAppPassword ? 'Email Desk Connected (Edit SMTP)' : 'Start / Configure Email Desk (SMTP & Sender)'}</span>
            </button>

            {gmailUser ? (
              <div className="flex items-center gap-1.5 bg-emerald-500/15 text-emerald-300 px-3 py-1.5 rounded-lg border border-emerald-500/30">
                <UserCheck size={13} />
                <span>{gmailUser.email}</span>
                <button
                  type="button"
                  onClick={handleDisconnectGmail}
                  className="ml-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                  title="Disconnect Google Account"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isConnectingGmail}
                onClick={handleConnectGmail}
                className="bg-red-600/90 hover:bg-red-600 text-white font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow cursor-pointer"
                title="Optional Google Account Sign-In"
              >
                {isConnectingGmail ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <LogIn size={13} />
                    <span>Sign in with Google</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter('pending')}
          className={`p-4 rounded-lg border text-left transition-all ${
            statusFilter === 'pending'
              ? 'bg-amber-500/20 border-amber-400 ring-1 ring-amber-400'
              : 'bg-[#0B192C] border-slate-800 hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Awaiting Verification</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-amber-400 mt-2">
            {pendingCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Pending Screenshot Review</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('approved')}
          className={`p-4 rounded-lg border text-left transition-all ${
            statusFilter === 'approved'
              ? 'bg-emerald-500/20 border-emerald-400 ring-1 ring-emerald-400'
              : 'bg-[#0B192C] border-slate-800 hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Approved & Emailed</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-emerald-400 mt-2">
            {approvedCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Confirmation Email Dispatched</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('declined')}
          className={`p-4 rounded-lg border text-left transition-all ${
            statusFilter === 'declined'
              ? 'bg-rose-500/20 border-rose-400 ring-1 ring-rose-400'
              : 'bg-[#0B192C] border-slate-800 hover:border-rose-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Declined / Rejected</span>
            <XCircle size={16} className="text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-rose-400 mt-2">
            {declinedCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Payment Unverified</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-lg border text-left transition-all ${
            statusFilter === 'all'
              ? 'bg-blue-500/20 border-blue-400 ring-1 ring-blue-400'
              : 'bg-[#0B192C] border-slate-800 hover:border-blue-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Total Orders</span>
            <FileText size={16} className="text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-white mt-2">
            {orders.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">All Recorded Store Orders</div>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-[#0B192C] p-3 rounded-lg border border-slate-800">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order #, Customer Name, Email, Phone or TRX ID..."
            className="w-full bg-slate-900 border border-slate-700 text-xs pl-9 pr-4 py-2 rounded text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded text-xs whitespace-nowrap transition-colors ${
              statusFilter === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All ({orders.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              statusFilter === 'pending' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
            }`}
          >
            <Clock size={12} />
            <span>Awaiting Review ({pendingCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1.5 rounded text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              statusFilter === 'approved' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 text-emerald-300 hover:bg-slate-700'
            }`}
          >
            <Check size={12} />
            <span>Approved & Emailed ({approvedCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('declined')}
            className={`px-3 py-1.5 rounded text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              statusFilter === 'declined' ? 'bg-rose-500 text-white font-bold' : 'bg-slate-800 text-rose-300 hover:bg-slate-700'
            }`}
          >
            <X size={12} />
            <span>Declined ({declinedCount})</span>
          </button>
        </div>
      </div>

      {/* Orders Verification Cards List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-[#0B192C] border border-slate-800 rounded-xl p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-amber-400/70 shadow-inner">
            <Mail size={24} />
          </div>
          <h3 className="text-base font-serif text-white">No Confirmation Emails Pending</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {searchQuery
              ? 'No orders match your search criteria. Try a different keyword or clear the search filter.'
              : 'All mock orders have been cleared. When new customer purchases arrive on your live store, their payment receipts and confirmation email approvals will appear here automatically.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => {
            const status = getOrderStatus(order);
            const proofUrl = order.paymentDetails?.proofUrl;
            const hasProof = Boolean(proofUrl && proofUrl.trim().length > 0);

            return (
              <div
                key={order.id}
                className={`bg-[#0B192C] rounded-lg border transition-all shadow-md overflow-hidden ${
                  status === 'Pending Review'
                    ? 'border-amber-500/40 hover:border-amber-400 ring-1 ring-amber-500/20'
                    : status === 'Approved & Sent'
                    ? 'border-slate-800 hover:border-emerald-500/40'
                    : 'border-rose-900/40 hover:border-rose-700/60 opacity-80'
                }`}
              >
                {/* Order Top Bar */}
                <div className="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-amber-400 text-sm tracking-wider">
                      {order.orderNumber}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Placed on: {new Date(order.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {status === 'Pending Review' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/40 animate-pulse">
                        <Clock size={12} />
                        <span>⏳ Awaiting Screenshot Review</span>
                      </span>
                    )}
                    {status === 'Approved & Sent' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
                        <CheckCircle2 size={12} />
                        <span>✓ Email Approved & Confirmed</span>
                      </span>
                    )}
                    {status === 'Rejected / Declined' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/40">
                        <XCircle size={12} />
                        <span>✖ Payment Declined</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Main Content Grid: Customer Dossier, Items, Screenshot Proof & Action Buttons */}
                <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left Column (5 cols): Customer Info & Ordered Items */}
                  <div className="lg:col-span-5 space-y-4">
                    {/* Customer Dossier */}
                    <div className="bg-slate-900/60 p-3.5 rounded border border-slate-800/80 space-y-2">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 flex items-center justify-between">
                        <span>Customer Details</span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(`${order.customer.name} | ${order.customer.email} | ${order.customer.phone}`)}
                          className="text-amber-400 hover:text-amber-300 text-[10px] flex items-center gap-1"
                        >
                          <Copy size={11} />
                          <span>Copy</span>
                        </button>
                      </div>

                      <div className="text-sm font-semibold text-white">
                        {order.customer.name}
                      </div>

                      <div className="text-xs text-slate-300 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">Email:</span>
                          <span className="font-mono text-amber-300 select-all">{order.customer.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">Phone:</span>
                          <span className="font-mono text-slate-200">{order.customer.phone}</span>
                          <a
                            href={`https://wa.me/${(order.customer.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${order.customer.name}, Ventures Watches regarding your Order #${order.orderNumber}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1 ml-auto"
                          >
                            <MessageCircle size={11} />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                        <div className="flex items-start gap-2 pt-1 border-t border-slate-800 text-[11px] text-slate-400">
                          <span className="text-slate-500 whitespace-nowrap">Shipping:</span>
                          <span>{order.customer.address}, {order.customer.city}, {order.customer.country}</span>
                        </div>
                      </div>
                    </div>

                    {/* Ordered Items Summary */}
                    <div className="bg-slate-900/60 p-3.5 rounded border border-slate-800/80 space-y-2">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                        Purchased Watch Items ({order.items.length})
                      </div>
                      <div className="space-y-2 divide-y divide-slate-800">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                            <div className="flex-1 pr-2">
                              <div className="font-medium text-white line-clamp-1">{item.productName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">Qty: {item.quantity} • SKU: {item.sku || 'N/A'}</div>
                            </div>
                            <div className="font-semibold text-amber-400 font-mono text-right">
                              {formatPrice(item.price * item.quantity)}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-400 uppercase tracking-wider text-[10px]">Grand Total (PKR)</span>
                        <span className="text-base font-bold text-amber-400 font-mono">{formatPrice(order.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Column (4 cols): Payment Transfer Info & Screenshot Examiner */}
                  <div className="lg:col-span-4 bg-slate-900/60 p-3.5 rounded border border-slate-800/80 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400 flex items-center gap-1.5">
                          <CreditCard size={13} />
                          <span>Payment Transfer Details</span>
                        </span>
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold uppercase">
                          {order.paymentMethod || 'Online Transfer'}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-300 space-y-1.5 bg-slate-950 p-2.5 rounded border border-slate-800/90 font-mono">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Channel:</span>
                          <span className="text-emerald-400 font-semibold">{order.paymentDetails?.walletType || (order.paymentMethod || '').toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">TRX ID:</span>
                          <span className="text-white font-bold select-all">{order.paymentDetails?.trxId || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Sender Phone:</span>
                          <span className="text-slate-300">{order.paymentDetails?.senderPhone || order.customer.phone || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Destination:</span>
                          <span className="text-slate-300">03192265524 (SadaPay)</span>
                        </div>
                      </div>
                    </div>

                    {/* Screenshot Thumbnail & Zoom Launcher */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] uppercase text-slate-400 font-bold">
                        <span>Payment Screenshot Proof</span>
                        {hasProof && (
                          <button
                            type="button"
                            onClick={() => setSelectedScreenshotUrl({
                              url: proofUrl!,
                              orderNumber: order.orderNumber,
                              total: order.total,
                              customer: order.customer.name
                            })}
                            className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
                          >
                            <Maximize2 size={11} />
                            <span>Zoom & Inspect</span>
                          </button>
                        )}
                      </div>

                      {hasProof ? (
                        <div
                          onClick={() => setSelectedScreenshotUrl({
                            url: proofUrl!,
                            orderNumber: order.orderNumber,
                            total: order.total,
                            customer: order.customer.name
                          })}
                          className="group relative h-40 bg-slate-950 rounded border border-slate-800 hover:border-amber-500/60 overflow-hidden cursor-pointer flex items-center justify-center transition-all shadow-inner"
                        >
                          <img
                            src={proofUrl}
                            alt="Payment Transfer Proof"
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity gap-1 p-2 text-center">
                            <Eye size={22} className="text-amber-400" />
                            <span className="text-[11px] font-bold">Click to Examine Full Screen</span>
                            <span className="text-[9px] text-slate-300">Inspect amounts, timestamps & bank titles</span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-32 bg-slate-950/80 rounded border border-dashed border-slate-800 flex flex-col items-center justify-center p-3 text-center text-slate-500">
                          <AlertCircle size={24} className="text-slate-600 mb-1" />
                          <span className="text-[11px] text-slate-400 font-semibold">No Screenshot Attached</span>
                          <span className="text-[9px] text-slate-500 mt-0.5">Customer placed order with bank reference</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column (3 cols): Big Tick & Cross Action Hub */}
                  <div className="lg:col-span-3 bg-slate-900/80 p-4 rounded border border-slate-800 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">
                        Verification Actions
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        After inspecting the transfer screenshot and verifying funds in your SadaPay ledger, approve to trigger customer email from <b className="text-amber-300">ventureswatches@gmail.com</b>.
                      </p>
                    </div>

                    {/* Action Buttons: Tick (✔) & Cross (✖) */}
                    <div className="space-y-2.5">
                      {/* Big Green Tick Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOrderForEmail(order);
                          setCustomNote('');
                          setTrackingNumber('');
                        }}
                        className={`w-full py-3 px-4 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all transform active:scale-95 cursor-pointer ${
                          status === 'Approved & Sent'
                            ? 'bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/50'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold shadow-emerald-500/20 hover:shadow-emerald-500/40'
                        }`}
                      >
                        <span className="p-1 rounded-full bg-slate-950/20">
                          <Check size={16} strokeWidth={3} />
                        </span>
                        <span>{status === 'Approved & Sent' ? 'Review / Resend Email (✔)' : 'Approve & Send Verification Email (✔)'}</span>
                      </button>

                      {/* Quick Direct 1-Click Launch in Gmail Web & Mail App */}
                      {(() => {
                        const emailData = getEmailDetailsForOrder(order);
                        return (
                          <div className="space-y-1.5">
                            <a
                              href={emailData.gmailWebUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => handleMarkApprovedAndProceed(order)}
                              className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold text-amber-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-amber-500/40 flex items-center justify-center gap-2 transition-all shadow cursor-pointer text-center"
                              title={`Open Gmail Web to email ${order.customer.email}`}
                            >
                              <ExternalLink size={13} className="text-amber-400 flex-shrink-0" />
                              <span>🚀 1-Click Send via Gmail Web</span>
                            </a>
                            <a
                              href={emailData.mailtoUrl}
                              onClick={() => handleMarkApprovedAndProceed(order)}
                              className="w-full py-1.5 px-2 rounded text-[11px] font-medium text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800 flex items-center justify-center gap-1.5 transition-all cursor-pointer text-center"
                              title={`Open default email client to email ${order.customer.email}`}
                            >
                              <Mail size={12} className="text-slate-400 flex-shrink-0" />
                              <span>✉️ Send via Default Mail App</span>
                            </a>
                          </div>
                        );
                      })()}

                      {/* Big Red Cross Button */}
                      <button
                        type="button"
                        onClick={() => setSelectedOrderForDecline(order)}
                        className="w-full py-2 px-4 rounded-lg font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 bg-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-300 border border-rose-500/30 transition-all active:scale-95 cursor-pointer"
                      >
                        <span className="p-0.5 rounded-full bg-rose-950/40">
                          <X size={14} strokeWidth={2.5} />
                        </span>
                        <span>Decline Payment (✖)</span>
                      </button>
                    </div>

                    {/* Email Log Details */}
                    {order.emailSentAt && (
                      <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 font-mono">
                        Dispatched: {new Date(order.emailSentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 1. SCREENSHOT ZOOM & INSPECTION MODAL */}
      {/* ------------------------------------------------------------- */}
      {selectedScreenshotUrl && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in">
          <div className="relative w-full max-w-5xl bg-[#091424] rounded-lg border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-[#0B192C] border-b border-slate-800 flex items-center justify-between text-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded">
                  <Maximize2 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-wide">
                    Payment Screenshot Inspection — Order #{selectedScreenshotUrl.orderNumber}
                  </h3>
                  <div className="text-[11px] text-slate-400">
                    Customer: <span className="text-white font-medium">{selectedScreenshotUrl.customer}</span> • Expected Total: <span className="text-amber-400 font-bold font-mono">{formatPrice(selectedScreenshotUrl.total)}</span>
                  </div>
                </div>
              </div>

              {/* Controls & Close */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 3))}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation(prev => (prev + 90) % 360)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors"
                  title="Rotate 90deg"
                >
                  <RotateCw size={16} />
                </button>
                <a
                  href={selectedScreenshotUrl.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 rounded text-xs transition-colors"
                  title="Open Original in New Tab"
                >
                  <ExternalLink size={16} />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedScreenshotUrl(null);
                    setZoomLevel(1);
                    setRotation(0);
                  }}
                  className="p-2 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs transition-colors ml-2"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Image Body with Zoom & Pan */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/60 min-h-[400px]">
              <div
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease-out'
                }}
                className="max-w-full max-h-[70vh] flex items-center justify-center"
              >
                <img
                  src={selectedScreenshotUrl.url}
                  alt="Customer Transfer Screenshot"
                  className="max-h-[65vh] w-auto object-contain rounded shadow-2xl border border-slate-700"
                />
              </div>
            </div>

            {/* Modal Bottom Guidance Footer */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <div>
                💡 Verify: 1) Account title matches <b>Muhammad Tayyab Asghar (03192265524)</b>. 2) Amount matches <b>{formatPrice(selectedScreenshotUrl.total)}</b>.
              </div>
              <button
                type="button"
                onClick={() => {
                  const ord = orders.find(o => o.orderNumber === selectedScreenshotUrl.orderNumber);
                  setSelectedScreenshotUrl(null);
                  if (ord) setSelectedOrderForEmail(ord);
                }}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 rounded text-xs flex items-center gap-1.5"
              >
                <Check size={14} />
                <span>Screenshot Verified (Proceed to Approve)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. EMAIL PREVIEW & DISPATCH MODAL */}
      {/* ------------------------------------------------------------- */}
      {selectedOrderForEmail && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in">
          <div className="relative w-full max-w-4xl bg-[#091424] rounded-lg border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="px-6 py-4 bg-[#0B192C] border-b border-slate-800 flex items-center justify-between text-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded">
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    Official Order Confirmation Email Dispatch
                  </h3>
                  <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                    <span>Sender: <strong className="text-amber-300 font-mono">ventureswatches@gmail.com</strong></span>
                    <span>•</span>
                    <span>Recipient: <strong className="text-white font-mono">{selectedOrderForEmail.customer.email}</strong></span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrderForEmail(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Dispatch Channel Options Banner */}
              <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="text-slate-300">
                    Sender: <strong className="text-amber-300 font-semibold font-mono">ventureswatches@gmail.com</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-slate-400">Choose preferred dispatch method below:</span>
                </div>
              </div>

              {/* Optional Custom Notes & Tracking */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/80 p-4 rounded-lg border border-slate-800">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-amber-400 mb-1">
                    Personalized Concierge Note (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="e.g. Your timepiece has passed 48hr water resistance inspection and is packed in our luxury collector box..."
                    className="w-full bg-slate-950 border border-slate-700 text-xs p-2.5 rounded text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-amber-400 mb-1">
                      Courier Tracking Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="e.g. TCS-982148201 or LEOPARDS-84729"
                      className="w-full bg-slate-950 border border-slate-700 text-xs p-2.5 rounded text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">
                      Courier Partner
                    </label>
                    <select
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-xs p-2 rounded text-white focus:outline-none"
                    >
                      <option value="TCS Express Insured">TCS Express Insured</option>
                      <option value="Leopards Courier Service">Leopards Courier Service</option>
                      <option value="Trax Courier">Trax Courier</option>
                      <option value="M&P Express">M&P Express</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Email Live Preview Container */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-bold text-slate-400">
                  <span>Live Rendered Email Preview (From: ventureswatches@gmail.com)</span>
                  <button
                    type="button"
                    onClick={() => {
                      const html = generateOrderConfirmationEmailHtml(selectedOrderForEmail, customNote, trackingNumber);
                      handleCopyText(html);
                      setCopiedEmail(true);
                      setTimeout(() => setCopiedEmail(false), 2000);
                    }}
                    className="text-amber-400 hover:text-amber-300 text-xs flex items-center gap-1"
                  >
                    <Copy size={12} />
                    <span>{copiedEmail ? 'Copied HTML!' : 'Copy Email HTML'}</span>
                  </button>
                </div>

                <div className="border border-slate-800 rounded-lg overflow-hidden bg-white text-slate-900 max-h-80 overflow-y-auto">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: generateOrderConfirmationEmailHtml(selectedOrderForEmail, customNote, trackingNumber)
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Modal Action Footer */}
            <div className="p-4 bg-[#0B192C] border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`https://wa.me/${(selectedOrderForEmail.customer.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`*VENTURES WATCHES — ORDER CONFIRMED* ⌚✨\n\nDear ${selectedOrderForEmail.customer.name},\n\nYour advance payment for Order *#${selectedOrderForEmail.orderNumber}* has been verified and confirmed!\n\n*Amount Paid:* PKR ${selectedOrderForEmail.total.toLocaleString()}\n*Items:* ${selectedOrderForEmail.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}\n*Shipping Address:* ${selectedOrderForEmail.customer.address}, ${selectedOrderForEmail.customer.city}\n\nYour order has been handed over for high-priority dispatch. Thank you for choosing Ventures Watches!`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-xs rounded border border-emerald-500/40 flex items-center gap-1.5"
                >
                  <MessageCircle size={13} />
                  <span>Send on WhatsApp</span>
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Method 1: Instant Launch in Gmail Web */}
                <button
                  type="button"
                  onClick={() => handleOpenGmailWebAndApprove(selectedOrderForEmail)}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold px-3.5 py-2.5 rounded-lg text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"
                  title="Opens Gmail in browser with pre-filled message and marks order confirmed"
                >
                  <ExternalLink size={14} />
                  <span>🚀 Send via Gmail Web</span>
                </button>

                {/* Method 2: Open in Mail App */}
                {(() => {
                  const data = getEmailDetailsForOrder(selectedOrderForEmail);
                  return (
                    <a
                      href={data.mailtoUrl}
                      onClick={() => handleMarkApprovedAndProceed(selectedOrderForEmail)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-3 py-2.5 rounded-lg text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                      title="Open default email application"
                    >
                      <Mail size={13} />
                      <span>Mail App</span>
                    </a>
                  );
                })()}

                {/* Method 3: Direct Database Approval & Automated Dispatch */}
                <button
                  type="button"
                  disabled={isSending}
                  onClick={() => handleApproveAndSendEmail(selectedOrderForEmail)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                >
                  <CheckCheck size={15} />
                  <span>Approve & Dispatch (✔)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. DECLINE / REJECT PAYMENT MODAL */}
      {/* ------------------------------------------------------------- */}
      {selectedOrderForDecline && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#091424] rounded-lg border border-rose-800/80 shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 bg-rose-950/60 border-b border-rose-900/60 flex items-center justify-between text-white">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-rose-500/20 text-rose-400 rounded">
                  <XCircle size={18} />
                </div>
                <h3 className="text-sm font-bold tracking-wide">
                  Decline Payment — Order #{selectedOrderForDecline.orderNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderForDecline(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-300">
              <p className="text-slate-400 leading-relaxed">
                Please select the reason why this transfer could not be verified. The order will be marked as cancelled in the database.
              </p>

              <div>
                <label className="block text-[10px] uppercase font-bold text-rose-400 mb-1.5">
                  Select Rejection Reason:
                </label>
                <select
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-xs p-2.5 rounded text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="Payment screenshot is illegible or blurry.">Payment screenshot is illegible or blurry.</option>
                  <option value="Transferred amount does not match the order total.">Transferred amount does not match the order total.</option>
                  <option value="Transaction ID / reference not found in bank ledger.">Transaction ID / reference not found in bank ledger.</option>
                  <option value="Duplicate screenshot / already used for another order.">Duplicate screenshot / already used for another order.</option>
                  <option value="Funds reversed or transaction failed at bank.">Funds reversed or transaction failed at bank.</option>
                  <option value="Other / custom reason.">Other / custom reason.</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                  Additional Note for Customer (Optional):
                </label>
                <textarea
                  rows={2}
                  value={customDeclineNote}
                  onChange={(e) => setCustomDeclineNote(e.target.value)}
                  placeholder="e.g. Please share fresh clear screenshot of SadaPay transfer on WhatsApp 03192265524 to proceed."
                  className="w-full bg-slate-900 border border-slate-700 text-xs p-2.5 rounded text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 bg-[#0B192C] border-t border-slate-800 flex items-center justify-between gap-3">
              <a
                href={`https://wa.me/${(selectedOrderForDecline.customer.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${selectedOrderForDecline.customer.name}, Ventures Watches regarding Order #${selectedOrderForDecline.orderNumber}. We could not verify your payment screenshot (${declineReason}). Please contact us to resolve.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
              >
                <MessageCircle size={13} />
                <span>Notify Customer via WhatsApp</span>
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForDecline(null)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSending}
                  onClick={handleConfirmDecline}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded transition-colors"
                >
                  {isSending ? 'Updating...' : 'Decline & Cancel Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. EMAIL SENDER CONFIGURATION & START EMAIL MODAL */}
      {/* ------------------------------------------------------------- */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fade-in">
          <div className="relative w-full max-w-xl bg-[#091424] rounded-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="px-6 py-4 bg-[#0B192C] border-b border-slate-800 flex items-center justify-between text-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Start & Configure Email Desk
                  </h3>
                  <p className="text-xs text-slate-400">
                    Connect official sender email for customer verification
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEmailSettings} className="p-6 space-y-5 overflow-y-auto">
              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-amber-400 mb-1.5">
                  Official Concierge Sender Email:
                </label>
                <input
                  type="email"
                  required
                  value={senderEmailInput}
                  onChange={(e) => setSenderEmailInput(e.target.value)}
                  placeholder="ventureswatches@gmail.com"
                  className="w-full bg-slate-950 border border-slate-700 text-sm px-3 py-2.5 rounded-lg text-white font-mono focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Default sender address displayed in customer receipts and Gmail messages.
                </p>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-amber-400 mb-1.5 flex items-center justify-between">
                  <span>Google / Gmail App Password (Optional for Background Direct SMTP):</span>
                  {emailSettings.hasAppPassword && (
                    <span className="text-emerald-400 text-[10px] font-normal">✓ App Password Active</span>
                  )}
                </label>
                <input
                  type="password"
                  value={appPasswordInput}
                  onChange={(e) => setAppPasswordInput(e.target.value)}
                  placeholder={emailSettings.hasAppPassword ? "•••••••••••••••• (Leave blank to keep current)" : "16-character Google App Password (e.g. abcd efgh ijkl mnop)"}
                  className="w-full bg-slate-950 border border-slate-700 text-sm px-3 py-2.5 rounded-lg text-white font-mono focus:outline-none focus:border-amber-400"
                />
                <div className="mt-2.5 bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-1.5 text-xs text-slate-300">
                  <div className="text-amber-300 font-semibold flex items-center gap-1.5">
                    <Info size={13} />
                    <span>How to generate a Gmail App Password in 60 seconds:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
                    <li>Go to your Google Account at <b>myaccount.google.com</b> &gt; <b>Security</b>.</li>
                    <li>Ensure <b>2-Step Verification</b> is turned ON.</li>
                    <li>Search for <b>App passwords</b> (or visit <b>myaccount.google.com/apppasswords</b>).</li>
                    <li>Enter App name (e.g. <code>Ventures Watches</code>) and click <b>Create</b>.</li>
                    <li>Paste the 16-character code into the field above and save!</li>
                  </ol>
                </div>
              </div>

              {/* Delivery Methods Overview */}
              <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800 space-y-2 text-xs">
                <span className="text-slate-300 font-bold block">Available Verification Delivery Channels:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
                    <b className="text-white block mb-0.5">🚀 1-Click Gmail Web:</b>
                    Always works with 0 setup. Opens Gmail in browser with customer email, receipt, and subject ready to send.
                  </div>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
                    <b className="text-white block mb-0.5">⚡ Automated Direct Dispatch:</b>
                    Sends verification directly in the background using the App Password.
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={isTestingEmail}
                  onClick={handleTestEmail}
                  className="px-3.5 py-2.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  {isTestingEmail ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>Send Test Verification Email</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(false)}
                    className="px-3.5 py-2.5 rounded-lg text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    {isSavingSettings ? (
                      <>
                        <div className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} strokeWidth={2.5} />
                        <span>Save & Activate Email Desk</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
