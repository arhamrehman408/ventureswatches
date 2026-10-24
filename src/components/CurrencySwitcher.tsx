import React, { useState, useRef, useEffect } from 'react';
import { useCurrency, CURRENCIES, CurrencyCode } from '../context/CurrencyContext';
import { Globe, ChevronDown, Check, RefreshCw, Zap } from 'lucide-react';

interface CurrencySwitcherProps {
  isScrolled?: boolean;
  variant?: 'header' | 'mobile' | 'footer';
  className?: string;
}

export const CurrencySwitcher: React.FC<CurrencySwitcherProps> = ({
  isScrolled = false,
  variant = 'header',
  className = ''
}) => {
  const { currency, setCurrency, rates, isLoadingRates, refreshRates, lastUpdated } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRotating(true);
    await refreshRates();
    setTimeout(() => setIsRotating(false), 600);
  };

  const currencyList: CurrencyCode[] = ['PKR', 'USD', 'EUR'];

  // Mobile drawer variant (horizontal button selector)
  if (variant === 'mobile') {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400 font-semibold px-1">
          <div className="flex items-center gap-1.5">
            <Globe size={13} className="text-amber-400" />
            <span>Select Currency</span>
          </div>
          <span className="text-[10px] text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Live Rates
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
          {currencyList.map((code) => {
            const config = CURRENCIES[code];
            const isSelected = currency === code;
            return (
              <button
                key={code}
                onClick={() => setCurrency(code)}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{config.flag}</span>
                <span>{code}</span>
                <span className="opacity-75 text-[10px]">({config.symbol})</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Footer inline selector variant
  if (variant === 'footer') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-slate-400 text-xs flex items-center gap-1">
          <Globe size={13} className="text-amber-400" />
          Currency:
        </span>
        <div className="inline-flex rounded-md p-0.5 bg-slate-900 border border-slate-800">
          {currencyList.map((code) => {
            const config = CURRENCIES[code];
            const isSelected = currency === code;
            return (
              <button
                key={code}
                onClick={() => setCurrency(code)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                  isSelected
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {config.flag} {code} ({config.symbol})
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Luxury Header Dropdown variant
  const activeConfig = CURRENCIES[currency];

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 border ${
          isScrolled
            ? 'bg-gray-100/90 hover:bg-gray-200/90 text-[#0B192C] border-gray-200 shadow-sm'
            : 'bg-black/40 hover:bg-black/60 text-white border-white/20 backdrop-blur-md shadow-inner'
        } transform active:scale-95`}
        title={`Change Currency (Currently ${activeConfig.name})`}
        aria-label="Currency Switcher"
        aria-expanded={isOpen}
      >
        <span className="text-sm leading-none">{activeConfig.flag}</span>
        <span className="tracking-wider uppercase font-bold text-[11px]">{currency}</span>
        <span className={`text-[10px] font-bold opacity-80 ${isScrolled ? 'text-amber-700' : 'text-amber-300'}`}>
          {activeConfig.symbol}
        </span>
        <ChevronDown
          size={12}
          className={`opacity-70 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#0B192C]/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl z-50 overflow-hidden animate-slide-down text-white">
          {/* Header */}
          <div className="px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Globe size={13} className="text-amber-400" />
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-300">
                Display Currency
              </span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isLoadingRates}
              className="text-slate-400 hover:text-amber-400 transition-colors p-1 rounded hover:bg-white/5"
              title="Refresh Live Exchange Rates"
            >
              <RefreshCw
                size={12}
                className={`${isRotating || isLoadingRates ? 'animate-spin text-amber-400' : ''}`}
              />
            </button>
          </div>

          {/* Options */}
          <div className="p-1.5 space-y-1">
            {currencyList.map((code) => {
              const config = CURRENCIES[code];
              const isSelected = currency === code;

              // Calculate rate info relative to 1 PKR or 1 Unit
              let rateHint = 'Base Currency (PKR)';
              if (code === 'USD') {
                const pkrPerUsd = Math.round(1 / (rates.USD || 0.0036));
                rateHint = `1 USD ≈ ₨ ${pkrPerUsd.toLocaleString()}`;
              } else if (code === 'EUR') {
                const pkrPerEur = Math.round(1 / (rates.EUR || 0.00312));
                rateHint = `1 EUR ≈ ₨ ${pkrPerEur.toLocaleString()}`;
              }

              return (
                <button
                  key={code}
                  onClick={() => {
                    setCurrency(code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all duration-200 ${
                    isSelected
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : 'text-slate-200 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{config.flag}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs">{code}</span>
                        <span className="text-xs text-amber-400/90 font-semibold">({config.symbol})</span>
                      </div>
                      <div className="text-[10px] text-slate-400">{rateHint}</div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="px-3 py-2 bg-slate-950/70 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <Zap size={10} /> Live Central Exchange Rates
            </span>
            <span className="truncate max-w-[110px]" title="Auto-converts all watches">
              Instant Converter
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
