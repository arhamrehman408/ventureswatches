import React, { useEffect } from 'react';
import { Product } from '../types';

interface SEOProps {
  activeSection?: string;
  selectedProduct?: Product | null;
  searchQuery?: string;
}

export const SEO: React.FC<SEOProps> = ({
  activeSection = 'hero',
  selectedProduct,
  searchQuery
}) => {
  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ventureswatches.com';
    let title = 'Ventures Watches – Buy Luxury Watches Online in Pakistan';
    let description = 'Shop luxury watches in Pakistan at Ventures Watches. Buy authentic original, clone & copy timepieces with 3 days warranty, cash on delivery & nationwide shipping.';
    let canonicalUrl = origin;
    let ogImage = `${origin}/ventures-logo.svg`;
    let ogType = 'website';

    if (selectedProduct) {
      const priceStr = selectedProduct.price ? ` | PKR ${Number(selectedProduct.price).toLocaleString()}` : '';
      title = `${selectedProduct.name}${priceStr} – Ventures Watches Pakistan`;
      description = selectedProduct.shortDescription ||
        `Buy the exquisite ${selectedProduct.name} at Ventures Watches Pakistan. Warranted horological precision, 3 Days Warranty, and nationwide luxury delivery.`;
      canonicalUrl = `${origin}/?product=${encodeURIComponent(selectedProduct.slug || selectedProduct.id)}`;
      if (selectedProduct.images && selectedProduct.images.length > 0) {
        const firstImg = selectedProduct.images[0];
        ogImage = firstImg.startsWith('http') ? firstImg : `${origin}${firstImg}`;
      }
      ogType = 'product';
    } else if (searchQuery) {
      title = `Search: "${searchQuery}" – Luxury Watches Pakistan | Ventures Watches`;
      description = `Explore search results for "${searchQuery}" at Ventures Watches Pakistan. Premium chronographs, original watches, and 1:1 super clones.`;
      canonicalUrl = `${origin}/?search=${encodeURIComponent(searchQuery)}`;
    } else if (activeSection === 'watches') {
      title = 'Buy Luxury Watches in Pakistan – Original, Clone & Copy Watches | Ventures Watches';
      description = 'Browse our live inventory of luxury timepieces in Pakistan. Original watches, high-end clone chronographs, and curated copy watches with 3 days warranty.';
      canonicalUrl = `${origin}/#watches`;
    } else if (activeSection === 'craftsmanship') {
      title = 'Master Horology & Watch Craftsmanship – Ventures Watches';
      description = 'Discover our horological standards: 904L surgical stainless steel, anti-reflective sapphire crystals, and precision movement regulation.';
      canonicalUrl = `${origin}/#craftsmanship`;
    } else if (activeSection === 'editorial') {
      title = 'Collector Journal & Luxury Horology Guides – Ventures Watches';
      description = 'Expert watch reviews, collector guides, and luxury timepiece valuation insights from the Ventures Watches editorial desk.';
      canonicalUrl = `${origin}/#editorial`;
    } else if (activeSection === 'about') {
      title = 'About Ventures Watches – Pakistan Premier Luxury Watch Concierge';
      description = 'Learn about Ventures Watches: 100% verified timepieces, custom watch sourcing, 3-day warranty, and luxury customer service in Pakistan.';
      canonicalUrl = `${origin}/#about`;
    }

    // Set Document Title
    document.title = title;

    // Helper to safely set or create <meta> tag
    const setMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let tag = document.querySelector(`meta[${attr}="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    setMeta('description', description);
    setMeta('og:title', title, true);
    setMeta('og:description', description, true);
    setMeta('og:type', ogType, true);
    setMeta('og:url', canonicalUrl, true);
    setMeta('og:image', ogImage, true);
    setMeta('og:site_name', 'Ventures Watches', true);
    setMeta('og:locale', 'en_PK', true);

    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:image', ogImage);

    // Update <link rel="canonical">
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);

    // Dynamic Schema.org JSON-LD
    let scriptTag = document.getElementById('dynamic-seo-jsonld') as HTMLScriptElement | null;
    if (selectedProduct) {
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = 'dynamic-seo-jsonld';
        scriptTag.type = 'application/ld+json';
        document.head.appendChild(scriptTag);
      }

      const imageUrls = Array.isArray(selectedProduct.images)
        ? selectedProduct.images.map(img => img.startsWith('http') ? img : `${origin}${img}`)
        : [];

      const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
          {
            '@type': 'ListItem',
            'position': 1,
            'name': 'Home',
            'item': origin
          },
          {
            '@type': 'ListItem',
            'position': 2,
            'name': selectedProduct.collectionName || 'Watches',
            'item': `${origin}/?collection=${encodeURIComponent(selectedProduct.collectionName || 'All')}`
          },
          {
            '@type': 'ListItem',
            'position': 3,
            'name': selectedProduct.name,
            'item': canonicalUrl
          }
        ]
      };

      const productSchema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        'name': selectedProduct.name,
        'image': imageUrls,
        'description': selectedProduct.description || selectedProduct.shortDescription || `${selectedProduct.name} luxury timepiece from Ventures Watches.`,
        'sku': selectedProduct.sku || 'VW-WATCH',
        'mpn': selectedProduct.sku || selectedProduct.id,
        'brand': {
          '@type': 'Brand',
          'name': 'Ventures Watches'
        },
        'category': selectedProduct.collectionName || 'Watches',
        'offers': {
          '@type': 'Offer',
          'url': canonicalUrl,
          'priceCurrency': selectedProduct.currency || 'PKR',
          'price': selectedProduct.price,
          'priceValidUntil': '2027-12-31',
          'itemCondition': 'https://schema.org/NewCondition',
          'availability': selectedProduct.stock > 0
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          'seller': {
            '@type': 'Organization',
            'name': 'Ventures Watches',
            'url': origin
          },
          'hasMerchantReturnPolicy': {
            '@type': 'MerchantReturnPolicy',
            'applicableCountry': 'PK',
            'returnPolicyCategory': 'https://schema.org/MerchantReturnFiniteReturnWindow',
            'merchantReturnDays': 7,
            'returnMethod': 'https://schema.org/ReturnByMail',
            'returnFees': 'https://schema.org/FreeReturn'
          }
        }
      };

      scriptTag.text = JSON.stringify([breadcrumbSchema, productSchema]);
    } else if (scriptTag) {
      scriptTag.remove();
    }
  }, [activeSection, selectedProduct, searchQuery]);

  return null;
};
