import React, { useState, useEffect } from 'react';
import { Product, PriceDropAlert } from '../../types';
import {
  Bell, Mail, MessageCircle, Check, Trash2, Search, ExternalLink,
  Sparkles, RefreshCw, Send, CheckCircle2, AlertCircle, Copy, Clock, Filter
} from 'lucide-react';
import {
  fetchPriceDropAlerts,
  updatePriceDropAlert,
  deletePriceDropAlert,
  generatePriceDropEmailHtml
} from '../../services/api';
import { useCurrency } from '../../context/CurrencyContext';

interface PriceAlertsManagerProps {
  products: Product[];
}

export const PriceAlertsManager: React.FC<PriceAlertsManagerProps> = ({ products }) => {
  const { formatPrice } = useCurrency();
  const [alerts, setAlerts] = useState<PriceDropAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'ready' | 'active' | 'notified'>('all');
  const [selectedAlertForNotification, setSelectedAlertForNotification] = useState<PriceDropAlert | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [overridePrice, setOverridePrice] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadAlerts = async () => {
    setIsLoading(true);
    try {
      const data = await fetchPriceDropAlerts();
      setAlerts(data);
    } catch (err) {
      console.error('Failed to load price drop alerts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const handleCopyEmail = (email: string, id: string) => {
    navigator.clipboard.writeText(email);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showFeedback(`📋 Copied "${email}" to clipboard`);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove the price alert for ${name}?`)) return;
    try {
      await deletePriceDropAlert(id);
      setAlerts(prev => prev.filter(a => a.id !== id));
      showFeedback('🗑️ Price drop alert removed.');
    } catch (err) {
      showFeedback('❌ Failed to delete alert.');
    }
  };

  const handleOpenNotifyModal = (alert: PriceDropAlert) => {
    const liveProd = products.find(p => p.id === alert.productId);
    const livePrice = liveProd ? liveProd.price : alert.currentPrice;
    setSelectedAlertForNotification(alert);
    setOverridePrice(String(livePrice));
    setCustomMessage('This timepiece is now in stock at your desired target price with complimentary insured express courier!');
  };

  const handleMarkNotified = async (alert: PriceDropAlert) => {
    try {
      const now = new Date().toISOString();
      await updatePriceDropAlert(alert.id, {
        status: 'notified',
        notifiedAt: now
      });
      setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, status: 'notified', notifiedAt: now } : a));
      showFeedback(`✅ Alert for ${alert.email} marked as notified.`);
    } catch (err) {
      showFeedback('❌ Failed to update alert status.');
    }
  };

  const handleSendNotification = async () => {
    if (!selectedAlertForNotification) return;
    setIsSending(true);
    try {
      const numericPrice = parseInt(overridePrice.replace(/\D/g, ''), 10) || selectedAlertForNotification.targetPrice;
      const now = new Date().toISOString();

      await updatePriceDropAlert(selectedAlertForNotification.id, {
        status: 'notified',
        notifiedAt: now
      });

      setAlerts(prev => prev.map(a => a.id === selectedAlertForNotification.id ? {
        ...a,
        status: 'notified',
        notifiedAt: now
      } : a));

      // Compose 1-Click Gmail Link
      const emailSubject = encodeURIComponent(`🎉 Price Drop Alert: ${selectedAlertForNotification.productName} is now PKR ${numericPrice.toLocaleString()}!`);
      const emailBody = encodeURIComponent(
        `Dear ${selectedAlertForNotification.customerName || 'Valued Collector'},\n\n` +
        `Exciting news! The luxury timepiece "${selectedAlertForNotification.productName}" (SKU: ${selectedAlertForNotification.productSku || 'VW-WATCH'}) has dropped to PKR ${numericPrice.toLocaleString()} (Your target was PKR ${selectedAlertForNotification.targetPrice.toLocaleString()}).\n\n` +
        `${customMessage}\n\n` +
        `Order now via WhatsApp: https://wa.me/923192265524\n\n` +
        `Best regards,\n` +
        `Ventures Watches Concierge Desk\n` +
        `Karachi, Pakistan`
      );
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(selectedAlertForNotification.email)}&su=${emailSubject}&body=${emailBody}`;

      window.open(gmailUrl, '_blank');
      showFeedback(`✉️ Gmail Composer opened for ${selectedAlertForNotification.email}!`);
      setSelectedAlertForNotification(null);
    } catch (err) {
      showFeedback('❌ Failed to dispatch notification.');
    } finally {
      setIsSending(false);
    }
  };

  // Enhance alerts with latest store price
  const enrichedAlerts = alerts.map(alert => {
    const matchedProduct = products.find(p => p.id === alert.productId);
    const livePrice = matchedProduct ? matchedProduct.price : alert.currentPrice;
    const isTargetMet = livePrice <= alert.targetPrice;
    return {
      ...alert,
      livePrice,
      isTargetMet,
      productImage: alert.productImage || (matchedProduct?.images?.[0] ?? '')
    };
  });

  const filteredAlerts = enrichedAlerts.filter(alert => {
    const matchesSearch =
      alert.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (alert.productSku || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (alert.customerName || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterStatus === 'ready') return alert.isTargetMet && alert.status !== 'notified';
    if (filterStatus === 'active') return alert.status === 'active';
    if (filterStatus === 'notified') return alert.status === 'notified';
    return true;
  });

  const readyCount = enrichedAlerts.filter(a => a.isTargetMet && a.status !== 'notified').length;
  const activeCount = enrichedAlerts.filter(a => a.status === 'active').length;
  const notifiedCount = enrichedAlerts.filter(a => a.status === 'notified').length;

  return (
    <div className="space-y-6">
      {/* Toast feedback */}
      {actionFeedback && (
        <div className="fixed bottom-6 right-6 z-60 bg-amber-500 text-slate-950 font-bold px-4 py-3 rounded-lg shadow-2xl flex items-center gap-2 animate-bounce">
          <Sparkles size={18} />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-[#0B192C] border border-amber-500/20 rounded-xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Bell size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                Price Drop Alert Subscribers
              </h2>
              <p className="text-xs text-slate-400">
                Manage customer price drop requests saved to Firestore & dispatch real-time email notifications
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadAlerts}
          disabled={isLoading}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin text-amber-400' : ''} />
          <span>Refresh Firestore Alerts</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0B192C] border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
              Total Alerts
            </div>
            <div className="text-2xl font-bold text-white font-mono mt-1">
              {enrichedAlerts.length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-300">
            <Bell size={18} />
          </div>
        </div>

        <div className={`border rounded-xl p-4 flex items-center justify-between ${
          readyCount > 0
            ? 'bg-amber-950/30 border-amber-500/60 ring-1 ring-amber-500/40'
            : 'bg-[#0B192C] border-slate-800'
        }`}>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-amber-400 flex items-center gap-1">
              <span>Ready to Notify</span>
              {readyCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />}
            </div>
            <div className="text-2xl font-bold text-amber-300 font-mono mt-1">
              {readyCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
            🎯
          </div>
        </div>

        <div className="bg-[#0B192C] border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
              Already Notified
            </div>
            <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
              {notifiedCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 size={18} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0B192C] border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search alerts by timepiece name, SKU, email, or customer name..."
            className="w-full bg-[#070F1E] border border-slate-700 pl-10 pr-4 py-2 text-xs rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              filterStatus === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All ({enrichedAlerts.length})
          </button>
          <button
            onClick={() => setFilterStatus('ready')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-1 ${
              filterStatus === 'ready'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30'
            }`}
          >
            <span>🎯 Target Met</span>
            {readyCount > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 text-[10px] font-bold rounded-full">
                {readyCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              filterStatus === 'active'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setFilterStatus('notified')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              filterStatus === 'notified'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Notified ({notifiedCount})
          </button>
        </div>
      </div>

      {/* Alerts Table / List */}
      {isLoading ? (
        <div className="bg-[#0B192C] border border-slate-800 rounded-xl p-12 text-center">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Loading alerts from Cloud Firestore...</p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="bg-[#0B192C] border border-slate-800 rounded-xl p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
            <Bell size={24} />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">No Price Drop Alerts Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery || filterStatus !== 'all'
              ? 'No alerts match your current filter or search criteria.'
              : 'When customers click "Notify me on price drop" on any timepiece modal, their alert subscription will appear here.'}
          </p>
        </div>
      ) : (
        <div className="bg-[#0B192C] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070F1E] text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Watch / SKU</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Current Price</th>
                  <th className="py-3 px-4">Target Price</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date Saved</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredAlerts.map(alert => (
                  <tr
                    key={alert.id}
                    className={`hover:bg-slate-900/60 transition-colors ${
                      alert.isTargetMet && alert.status !== 'notified' ? 'bg-amber-950/15' : ''
                    }`}
                  >
                    {/* Product & SKU */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {alert.productImage ? (
                          <img
                            src={alert.productImage}
                            alt=""
                            className="w-10 h-10 object-contain rounded bg-slate-950/60 border border-slate-800 p-1 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center text-[10px] font-serif text-slate-400 flex-shrink-0">
                            VW
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate max-w-[200px]" title={alert.productName}>
                            {alert.productName}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {alert.productSku || 'VW-WATCH'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <div>
                        {alert.customerName && (
                          <div className="font-semibold text-slate-200">
                            {alert.customerName}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 font-mono text-amber-300 text-[11px]">
                          <span>{alert.email}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyEmail(alert.email, alert.id)}
                            className="text-slate-500 hover:text-amber-400 transition-colors"
                            title="Copy email"
                          >
                            {copiedId === alert.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Current Price */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-300">
                      {formatPrice(alert.livePrice)}
                    </td>

                    {/* Target Price */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-amber-400">
                        {formatPrice(alert.targetPrice)}
                      </div>
                      {alert.currentPrice > alert.targetPrice && (
                        <div className="text-[10px] text-slate-400">
                          -{Math.round(((alert.currentPrice - alert.targetPrice) / alert.currentPrice) * 100)}% Drop
                        </div>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {alert.status === 'notified' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-500/40">
                          <CheckCircle2 size={12} />
                          <span>Notified</span>
                        </span>
                      ) : alert.isTargetMet ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/50 animate-pulse">
                          <Sparkles size={12} />
                          <span>Target Met!</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          <Clock size={12} />
                          <span>Monitoring</span>
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-slate-400 text-[11px] font-mono whitespace-nowrap">
                      {new Date(alert.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Notify / Send Email Button */}
                        <button
                          onClick={() => handleOpenNotifyModal(alert)}
                          className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                            alert.isTargetMet && alert.status !== 'notified'
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                          }`}
                          title="Open Notification Dispatcher"
                        >
                          <Send size={12} />
                          <span>Notify</span>
                        </button>

                        {/* WhatsApp Direct Option */}
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(
                            `Hello! Great news from Ventures Watches: "${alert.productName}" is now available at your target price of PKR ${alert.targetPrice.toLocaleString()}!`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-700/40 rounded transition-colors"
                          title="Share on WhatsApp"
                        >
                          <MessageCircle size={14} />
                        </a>

                        {/* Mark Notified toggle */}
                        {alert.status !== 'notified' && (
                          <button
                            onClick={() => handleMarkNotified(alert)}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded transition-colors"
                            title="Mark as Notified"
                          >
                            <Check size={14} />
                          </button>
                        )}

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(alert.id, alert.productName)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-800/80 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-700/50 rounded transition-colors"
                          title="Delete Alert"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Notification Dispatch Modal */}
      {selectedAlertForNotification && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0B192C] border border-amber-500/40 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Mail size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    Dispatch Price Drop Notification
                  </h3>
                  <p className="text-[11px] text-slate-400">To: {selectedAlertForNotification.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAlertForNotification(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#070F1E] border border-slate-800 rounded-lg p-3 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Timepiece:</span>
                <span className="font-semibold text-white">{selectedAlertForNotification.productName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Customer Target Price:</span>
                <span className="font-mono text-amber-400 font-bold">{formatPrice(selectedAlertForNotification.targetPrice)}</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-slate-300 font-semibold mb-1">
                Announced Offer Price (PKR):
              </label>
              <input
                type="text"
                value={overridePrice}
                onChange={e => setOverridePrice(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-[#070F1E] border border-slate-700 focus:border-amber-400 px-3 py-2 text-xs rounded text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-slate-300 font-semibold mb-1">
                Personalized Message / Note:
              </label>
              <textarea
                rows={3}
                value={customMessage}
                onChange={e => setCustomMessage(e.target.value)}
                className="w-full bg-[#070F1E] border border-slate-700 focus:border-amber-400 p-3 text-xs rounded text-white resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedAlertForNotification(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>

              <button
                onClick={handleSendNotification}
                disabled={isSending}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2 text-xs uppercase tracking-wider rounded-lg shadow-lg flex items-center gap-2"
              >
                {isSending ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <ExternalLink size={14} />
                )}
                <span>Open in Gmail & Notify</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
