import React, { createContext, useContext, useState, useEffect } from 'react';

export type CurrencyCode = 'PKR' | 'USD' | 'EUR';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  flag: string;
  rateKey: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  PKR: {
    code: 'PKR',
    symbol: '₨',
    name: 'PKR - Pakistani Rupee',
    flag: '🇵🇰',
    rateKey: 'PKR'
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'USD - US Dollar',
    flag: '🇺🇸',
    rateKey: 'USD'
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'EUR - Euro',
    flag: '🇪🇺',
    rateKey: 'EUR'
  }
};

const DEFAULT_RATES: Record<CurrencyCode, number> = {
  PKR: 1,
  USD: 0.0036,
  EUR: 0.00312
};

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  rates: Record<CurrencyCode, number>;
  isLoadingRates: boolean;
  convertPrice: (amountInPKR: number) => number;
  formatPrice: (amountInPKR: number | undefined | null, options?: { showCode?: boolean; showDecimals?: boolean }) => string;
  activeCurrencyConfig: CurrencyConfig;
  lastUpdated: string | null;
  refreshRates: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const LOCAL_STORAGE_CURRENCY_KEY = 'vw_selected_currency_v1';
const LOCAL_STORAGE_RATES_KEY = 'vw_cached_exchange_rates_v1';

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CURRENCY_KEY);
      if (saved === 'USD' || saved === 'EUR' || saved === 'PKR') {
        return saved;
      }
    } catch {
      // Ignore localStorage error
    }
    return 'PKR';
  });

  const [rates, setRates] = useState<Record<CurrencyCode, number>>(() => {
    try {
      const savedRates = localStorage.getItem(LOCAL_STORAGE_RATES_KEY);
      if (savedRates) {
        const parsed = JSON.parse(savedRates);
        if (parsed && typeof parsed.USD === 'number' && typeof parsed.EUR === 'number') {
          return {
            PKR: 1,
            USD: parsed.USD,
            EUR: parsed.EUR
          };
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_RATES;
  });

  const [isLoadingRates, setIsLoadingRates] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchRates = async () => {
    setIsLoadingRates(true);
    try {
      // 1. Try internal backend proxy
      let fetched = false;
      try {
        const res = await fetch('/api/exchange-rates');
        if (res.ok) {
          const data = await res.json();
          if (data && data.rates) {
            const newRates: Record<CurrencyCode, number> = {
              PKR: 1,
              USD: Number(data.rates.USD) || DEFAULT_RATES.USD,
              EUR: Number(data.rates.EUR) || DEFAULT_RATES.EUR
            };
            setRates(newRates);
            setLastUpdated(data.lastUpdated || new Date().toISOString());
            localStorage.setItem(LOCAL_STORAGE_RATES_KEY, JSON.stringify(newRates));
            fetched = true;
          }
        }
      } catch {
        // Fallback to direct client API
      }

      // 2. Direct client fallback if proxy failed
      if (!fetched) {
        const directRes = await fetch('https://open.er-api.com/v6/latest/PKR');
        if (directRes.ok) {
          const directData = await directRes.json();
          if (directData && directData.rates) {
            const newRates: Record<CurrencyCode, number> = {
              PKR: 1,
              USD: Number(directData.rates.USD) || DEFAULT_RATES.USD,
              EUR: Number(directData.rates.EUR) || DEFAULT_RATES.EUR
            };
            setRates(newRates);
            setLastUpdated(directData.time_last_update_utc || new Date().toISOString());
            localStorage.setItem(LOCAL_STORAGE_RATES_KEY, JSON.stringify(newRates));
          }
        }
      }
    } catch (err) {
      console.warn('Live currency rates fallback active:', err);
    } finally {
      setIsLoadingRates(false);
    }
  };

  useEffect(() => {
    fetchRates();
    // Refresh exchange rates every 30 minutes
    const interval = setInterval(fetchRates, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const setCurrency = (newCurrency: CurrencyCode) => {
    setCurrencyState(newCurrency);
    try {
      localStorage.setItem(LOCAL_STORAGE_CURRENCY_KEY, newCurrency);
    } catch {
      // Ignore localStorage write error
    }
  };

  const convertPrice = (amountInPKR: number): number => {
    if (typeof amountInPKR !== 'number' || isNaN(amountInPKR)) return 0;
    const rate = rates[currency] || 1;
    return amountInPKR * rate;
  };

  const formatPrice = (
    amountInPKR: number | undefined | null,
    options?: { showCode?: boolean; showDecimals?: boolean }
  ): string => {
    if (amountInPKR === undefined || amountInPKR === null || isNaN(Number(amountInPKR))) {
      return '';
    }

    const numPkr = Number(amountInPKR);
    const config = CURRENCIES[currency] || CURRENCIES.PKR;
    const converted = convertPrice(numPkr);

    if (currency === 'PKR') {
      const formattedNumber = Math.round(converted).toLocaleString('en-US');
      return options?.showCode ? `₨ ${formattedNumber} PKR` : `₨ ${formattedNumber}`;
    }

    const shouldShowDecimals = options?.showDecimals !== false;
    const formattedNumber = converted.toLocaleString('en-US', {
      minimumFractionDigits: shouldShowDecimals ? 2 : 0,
      maximumFractionDigits: shouldShowDecimals ? 2 : 0
    });

    if (currency === 'USD') {
      return options?.showCode ? `$${formattedNumber} USD` : `$${formattedNumber}`;
    }

    if (currency === 'EUR') {
      return options?.showCode ? `€${formattedNumber} EUR` : `€${formattedNumber}`;
    }

    return `${config.symbol} ${formattedNumber}`;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        rates,
        isLoadingRates,
        convertPrice,
        formatPrice,
        activeCurrencyConfig: CURRENCIES[currency] || CURRENCIES.PKR,
        lastUpdated,
        refreshRates: fetchRates
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
