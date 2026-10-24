import React, { useState } from 'react';
import { Logo } from './Logo';
import { Mail, ArrowRight, Shield, Globe, Award, CheckCircle, MessageCircle, Instagram, Facebook, Search, Heart, ShoppingBag } from 'lucide-react';
import { CurrencySwitcher } from './CurrencySwitcher';
import { CMSData } from '../types';

interface FooterProps {
  onNavigate: (section: string) => void;
  onOpenAdmin?: () => void;
  cmsData?: CMSData;
  onOpenSearch?: () => void;
  wishlistCount?: number;
  cartCount?: number;
  onOpenCart?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigate,
  onOpenAdmin,
  cmsData,
  onOpenSearch,
  wishlistCount = 0,
  cartCount = 0,
  onOpenCart
}) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
    }
  };

  const whatsappUrl = cmsData?.whatsappLink || "https://wa.me/923192265524?text=Hi%20VW-Ventures%20Watches,%20I'm%20interested%20in%20your%20watch%20collection.";
  const instagramUrl = cmsData?.instagramLink || "https://www.instagram.com/ventures.watches/";
  const facebookUrl = cmsData?.facebookLink || "https://www.facebook.com/share/1CJGTYKA22/?mibextid=wwXIfr";

  return (
    <footer className="bg-[#0B192C] text-white pt-20 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Brand Value Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-16 border-b border-slate-800 text-center md:text-left">
          <div className="flex items-start gap-4 justify-center md:justify-start">
            <div className="p-3 bg-white/5 rounded-full text-amber-400">
              <Shield size={24} />
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-[0.2em] font-semibold text-white">
                {cmsData?.footerTrust1Title?.replace(/7-Day/g, '3-Day').replace(/7 days/gi, '3 days') || '3-Day Checking Warranty'}
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {(cmsData?.footerTrust1Desc?.replace(/7-day/gi, '3-day').replace(/7 days/gi, '3 days') || 'Each timepiece is backed by our full 3-day checking warranty and quality warranty.').replace(/guarantee/gi, 'warranty')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 justify-center md:justify-start">
            <div className="p-3 bg-white/5 rounded-full text-amber-400">
              <Globe size={24} />
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-[0.2em] font-semibold text-white">
                {cmsData?.footerTrust2Title || 'White-Glove Shipping'}
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {cmsData?.footerTrust2Desc || 'Insured worldwide delivery with recipient verification and luxury presentation box.'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 justify-center md:justify-start">
            <div className="p-3 bg-white/5 rounded-full text-amber-400">
              <Award size={24} />
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-[0.2em] font-semibold text-white">
                {cmsData?.footerTrust3Title || '100% Authentic & Clones'}
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {cmsData?.footerTrust3Desc || '100% Authentic Watches And High End Clones In Pakistan 🇵🇰 ⌚'}
              </p>
            </div>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 py-16 border-b border-slate-800">
          {/* Brand Info */}
          <div className="md:col-span-5 space-y-6">
            <Logo mode="light" size="lg" />
            <p className="text-xs text-slate-300 leading-relaxed max-w-sm tracking-wide font-light">
              {cmsData?.footerBio || 'VENTURES WATCHES (VW-VENTURES WATCHES) represents the pinnacle of luxury watches. 100% Authentic Watches And High End Clones In Pakistan.'}
            </p>

            {/* Social Concierge Buttons */}
            <div className="pt-2 space-y-2.5">
              <span className="text-[10px] text-amber-400 uppercase tracking-[0.2em] font-semibold block">
                Direct Concierge Buttons
              </span>
              <div className="flex flex-wrap gap-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded flex items-center gap-1.5 transition-colors shadow"
                >
                  <MessageCircle size={15} className="fill-current" />
                  <span>WhatsApp: {cmsData?.whatsappNumber || '0319 2265524'}</span>
                </a>

                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white text-xs font-semibold px-3 py-2 rounded flex items-center gap-1.5 transition-opacity hover:opacity-90 shadow"
                >
                  <Instagram size={15} />
                  <span>{cmsData?.instagramHandle || '@ventures.watches'}</span>
                </a>

                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-2 rounded flex items-center gap-1.5 transition-colors shadow"
                >
                  <Facebook size={15} />
                  <span>Facebook</span>
                </a>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="md:col-span-3 space-y-4">
            <h5 className="text-xs uppercase tracking-[0.25em] text-slate-400 font-semibold">Collections</h5>
            <ul className="space-y-2 text-xs font-light text-slate-300">
              <li><button onClick={() => onNavigate('collections')} className="hover:text-amber-400 transition-colors">{cmsData?.originalWatchesTitle || 'Original Watches'}</button></li>
              <li><button onClick={() => onNavigate('collections')} className="hover:text-amber-400 transition-colors">{cmsData?.cloneWatchesTitle || 'Clone Watches'}</button></li>
              <li><button onClick={() => onNavigate('collections')} className="hover:text-amber-400 transition-colors">{cmsData?.copyWatchesTitle || 'Copy Watches'}</button></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="md:col-span-4 space-y-4">
            <h5 className="text-xs uppercase tracking-[0.25em] text-slate-400 font-semibold">
              {cmsData?.footerNewsletterTitle || 'Stay Informed'}
            </h5>
            <p className="text-xs text-slate-300 font-light leading-relaxed">
              {cmsData?.footerNewsletterDesc || 'Receive private invitations to limited production drops, watch journal entries, and private watch previews.'}
            </p>

            {subscribed ? (
              <div className="flex items-center gap-2 text-xs text-amber-400 bg-white/5 p-3 rounded border border-amber-500/30">
                <CheckCircle size={16} />
                <span>Thank you. You are enrolled in the Ventures Private Gazette.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    className="w-full bg-slate-900 border border-slate-700 text-xs px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors rounded"
                  />
                  <Mail size={16} className="absolute right-3 top-3.5 text-slate-500" />
                </div>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs px-4 py-3 rounded transition-colors flex items-center gap-1 uppercase tracking-wider"
                >
                  <span>Join</span>
                  <ArrowRight size={14} />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Desktop Bottom Bar (Laptop / Desktop) */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between text-[11px] text-slate-500 gap-4">
          <div className="flex flex-col items-start gap-1">
            <span>{cmsData?.footerCopyright || `© ${new Date().getFullYear()} VENTURES WATCHES. All Rights Reserved. Crafted with precision engineering.`}</span>
            {onOpenAdmin && (
              <button
                id="footer-secret-dot-trigger"
                type="button"
                onClick={onOpenAdmin}
                title="Admin Console"
                aria-label="Admin Console"
                className="text-slate-600 hover:text-amber-400 text-xs leading-none p-0 cursor-pointer focus:outline-none transition-colors select-none"
              >
                •
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <button onClick={() => onNavigate('terms')} className="hover:text-slate-300 transition-colors">Privacy Policy</button>
            <button onClick={() => onNavigate('terms')} className="hover:text-slate-300 transition-colors">Terms of Service</button>
            {/* Desktop Currency Switcher - shown on Laptop/Desktop only */}
            <div className="vw-laptop-only">
              <CurrencySwitcher variant="footer" />
            </div>
          </div>
        </div>

        {/* Mobile Interface Only: Currency Changing Option at the End of Page, followed by Search, Favourites & Cart Buttons (Mobile Portrait & Landscape) */}
        <div className="vw-mobile-only pt-8 mt-6 border-t border-slate-800/80 space-y-4">
          {/* Currency Changing Option at End of Page */}
          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 shadow-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400">
                <Globe size={14} className="text-amber-400" />
                Select Currency
              </span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Rates
              </span>
            </div>
            <CurrencySwitcher variant="mobile" />
          </div>

          {/* After Currency Option: Search, Favourites, and Cart Buttons */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* Search Button */}
            <button
              type="button"
              onClick={onOpenSearch}
              className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 bg-slate-900/90 hover:bg-slate-800 active:scale-95 border border-slate-800 rounded-xl text-white transition-all shadow-sm group"
              title="Search Watches"
            >
              <Search size={18} className="text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium tracking-wide">Search</span>
            </button>

            {/* Favourites Button */}
            <button
              type="button"
              onClick={() => onNavigate('wishlist')}
              className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 bg-slate-900/90 hover:bg-slate-800 active:scale-95 border border-slate-800 rounded-xl text-white transition-all shadow-sm relative group"
              title="Favourites / Wishlist"
            >
              <Heart
                size={18}
                className={wishlistCount > 0 ? "text-rose-500 fill-rose-500/30" : "text-amber-400 group-hover:scale-110 transition-transform"}
              />
              <span className="text-xs font-medium tracking-wide">Favourites</span>
              {wishlistCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-pop-in">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Cart Button */}
            <button
              type="button"
              onClick={onOpenCart}
              className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-slate-950 font-bold rounded-xl transition-all shadow-md relative group"
              title="Shopping Cart / Collection Bag"
            >
              <ShoppingBag size={18} className="text-slate-950 group-hover:scale-110 transition-transform" />
              <span className="text-xs tracking-wide">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#0B192C] text-amber-400 border border-amber-400/50 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-pop-in">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
