import React, { useState, useEffect } from 'react';
import { Search, ShoppingBag, Heart, Menu, X, MessageCircle, Instagram, Radio, Crown } from 'lucide-react';
import { Logo } from './Logo';
import { CurrencySwitcher } from './CurrencySwitcher';
import { CMSData } from '../types';

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenCart: () => void;
  cartCount: number;
  wishlistCount: number;
  activeSection: string;
  onNavigate: (section: string, filterParam?: string) => void;
  onOpenChatbot?: () => void;
  onOpenLiveCall?: () => void;
  cmsData?: CMSData;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onOpenCart,
  cartCount,
  wishlistCount,
  activeSection,
  onNavigate,
  onOpenChatbot,
  onOpenLiveCall,
  cmsData
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'collections', label: 'Collections' },
    { id: 'about', label: 'About' },
    { id: 'contact', label: 'Contact' }
  ];

  const handleNavClick = (id: string) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  const whatsappUrl = cmsData?.whatsappLink || "https://wa.me/923192265524?text=Hi%20VW-Ventures%20Watches,%20I'm%20interested%20in%20your%20watch%20collection.";
  const instagramUrl = cmsData?.instagramLink || "https://www.instagram.com/ventures.watches/";

  return (
    <header className="fixed top-0 left-0 right-0 z-40">
      {/* Main Navbar */}
      <div
        className={`transition-all duration-500 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-sm py-3 border-b border-gray-100 text-[#0B192C]'
            : 'bg-gradient-to-b from-black/85 via-black/45 to-transparent py-4 text-white'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Left: Mobile Menu Button & Brand Logo */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="vw-mobile-only p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-all duration-300 transform active:scale-95"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={24} className="animate-pop-in" /> : <Menu size={24} />}
            </button>

            <button
              onClick={() => handleNavClick('home')}
              className="group flex items-center gap-2 text-left focus:outline-none transition-transform duration-300 hover:scale-[1.02]"
            >
              <Logo
                mode={isScrolled ? 'navy' : 'light'}
                size="md"
              />
            </button>
          </div>

          {/* Center: Desktop Navigation Links (Laptop / Desktop only) */}
          <nav className="vw-laptop-only-flex items-center space-x-8">
            {navLinks.map(link => {
              const isActive = activeSection === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  className={`text-xs uppercase tracking-[0.22em] font-medium transition-all duration-300 relative py-1 group/link ${
                    isActive
                      ? isScrolled
                        ? 'text-amber-600 font-bold'
                        : 'text-amber-400 font-bold'
                      : isScrolled
                        ? 'text-[#0B192C] hover:text-amber-600'
                        : 'text-white/90 hover:text-amber-400'
                  }`}
                >
                  {link.label}
                  <span
                    className={`absolute bottom-0 left-0 h-[2px] transition-all duration-300 ${
                      isActive
                        ? 'w-full bg-amber-500'
                        : 'w-0 group-hover/link:w-full bg-amber-400/60'
                    }`}
                  />
                </button>
              );
            })}
          </nav>

          {/* Right Action Icons: On mobile (portrait & landscape), ONLY Search, Favourites, and Cart are shown */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Currency exchange button: shown on Laptop/Desktop only; hidden on mobile portrait & landscape */}
            <div className="vw-laptop-only">
              <CurrencySwitcher />
            </div>

            <button
              onClick={onOpenSearch}
              className={`p-2 rounded-full transition-all duration-300 transform hover:scale-110 active:scale-95 ${
                isScrolled ? 'hover:bg-gray-100 text-[#0B192C]' : 'hover:bg-white/10 text-white'
              }`}
              title="Search Watches"
            >
              <Search size={19} />
            </button>

            <button
              onClick={() => onNavigate('wishlist')}
              className={`p-2 rounded-full transition-all duration-300 transform hover:scale-110 active:scale-95 relative ${
                isScrolled ? 'hover:bg-gray-100 text-[#0B192C]' : 'hover:bg-white/10 text-white'
              }`}
              title="Wishlist"
            >
              <Heart size={19} className={wishlistCount > 0 ? "text-rose-500 fill-rose-500/20" : ""} />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-rose-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pop-in shadow-md">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Collection Bag / Cart Button */}
            <button
              onClick={onOpenCart}
              className={`p-2 rounded-full transition-all duration-300 transform hover:scale-110 active:scale-95 relative ${
                isScrolled ? 'hover:bg-gray-100 text-[#0B192C]' : 'hover:bg-white/10 text-white'
              }`}
              title="Collection Bag"
            >
              <ShoppingBag size={19} />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-amber-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pop-in shadow-md">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Laptop Only: AI Chatbot & Live Call Option Button. On mobile portrait and landscape, it is placed in the three lines menu on the left */}
            <div className={`vw-laptop-only-flex items-center gap-1 p-0.5 rounded-full border shadow-sm transition-all duration-300 ${
              isScrolled
                ? 'bg-[#0B192C] border-amber-500/40 text-amber-300'
                : 'bg-black/60 backdrop-blur-md border-amber-500/50 text-amber-300'
            }`}>
              <button
                onClick={onOpenChatbot}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:text-white hover:bg-amber-500/20 rounded-full transition-all"
                title="Ask AI Watch Assistant"
              >
                <Crown size={13} className="text-amber-400" />
                <span className="text-[11px] font-medium tracking-wide">AI Assistant</span>
              </button>

              <button
                onClick={onOpenLiveCall}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 hover:bg-emerald-500/50 text-emerald-300 transition-all shadow-[0_0_8px_rgba(16,185,129,0.3)] active:scale-95"
                title="Live Voice Call with AI Assistant"
              >
                <Radio size={10} className="animate-pulse" />
                <span className="hidden sm:inline">Live Call</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Slide-down Menu (The Three Lines on Left - Mobile Portrait & Landscape only) */}
        {mobileMenuOpen && (
          <div className="vw-mobile-only bg-[#0B192C] text-white border-b border-slate-800 px-6 py-6 shadow-2xl space-y-5 animate-slide-down max-h-[85vh] overflow-y-auto">
            {/* Mobile AI Assistant & Live Call Option Cards (placed alongside Collection Bag) */}
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-800">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenChatbot?.();
                }}
                className="bg-amber-950/50 hover:bg-amber-900/50 border border-amber-500/40 text-amber-300 p-2.5 rounded-xl text-left flex flex-col justify-between gap-1 shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <Crown size={14} className="text-amber-400" />
                  <span className="text-[9px] bg-amber-500/20 px-1.5 py-0.2 rounded font-mono">AI</span>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-white">AI Assistant</div>
                  <div className="text-[9px] text-slate-400">Prices & Recommendations</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenLiveCall?.();
                }}
                className="bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 p-2.5 rounded-xl text-left flex flex-col justify-between gap-1 shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <Radio size={14} className="animate-pulse text-emerald-400" />
                  <span className="text-[9px] bg-emerald-500/20 px-1.5 py-0.2 rounded font-mono">LIVE</span>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-white">Live Voice Call</div>
                  <div className="text-[9px] text-slate-400">Speak with AI Desk</div>
                </div>
              </button>
            </div>

            {/* Currency Selector inside Mobile Menu */}
            <CurrencySwitcher variant="mobile" />

            <div className="flex flex-col space-y-3">
              {navLinks.map((link, idx) => (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  style={{ animationDelay: `${idx * 60}ms` }}
                  className={`text-left text-xs uppercase tracking-widest font-medium py-2.5 border-b border-slate-800/80 transition-all duration-300 animate-slide-right ${
                    activeSection === link.id ? 'text-amber-400 font-bold pl-3 border-l-2 border-amber-400 bg-white/5' : 'text-slate-300 hover:text-white hover:pl-2'
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* Quick Action Contact Buttons in Mobile Menu */}
            <div className="pt-2 space-y-2.5 border-t border-slate-800 animate-fade-in delay-200">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-3 px-4 rounded flex items-center justify-center gap-2 transition-all duration-300 transform hover:scale-[1.01] active:scale-98 shadow-md"
              >
                <MessageCircle size={16} className="fill-current" />
                <span>WhatsApp: 0319 2265524</span>
              </a>

              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-90 text-white text-xs font-semibold py-3 px-4 rounded flex items-center justify-center gap-2 transition-all duration-300 transform hover:scale-[1.01] active:scale-98 shadow-md"
              >
                <Instagram size={16} />
                <span>Instagram: @ventures.watches</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
