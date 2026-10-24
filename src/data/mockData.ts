import { Product, Collection, CMSData, Order, MediaItem } from '../types';

export const initialCollections: Collection[] = [
  {
    id: 'col-1',
    name: 'Original Watches',
    slug: 'original-watches',
    description: 'Precision mechanical timepieces driven by the motion of your wrist.',
    image: '',
    featured: true,
    sortOrder: 1
  },
  {
    id: 'col-2',
    name: 'Clone Watches',
    slug: 'clone-watches',
    description: 'High-performance chronographs built for measurement and high-precision timing.',
    image: '',
    featured: true,
    sortOrder: 2
  },
  {
    id: 'col-3',
    name: 'Copy Watches',
    slug: 'copy-watches',
    description: 'Timeless dress watches designed with pure architectural elegance.',
    image: '',
    featured: true,
    sortOrder: 3
  },
  {
    id: 'col-4',
    name: 'Pouches & Accessories',
    slug: 'pouches-accessories',
    description: 'Handcrafted leather pouches, luxury watch rolls, and luxury watch travel accessories.',
    image: '',
    featured: true,
    sortOrder: 4
  }
];

// No default/example mock products - only real products uploaded by the store admin will be shown
export const initialProducts: Product[] = [];

export const initialCMSData: CMSData = {
  // 1. Header & Announcement Bar
  announcementEnabled: false,
  announcementText: '',
  announcementLinkText: '',
  announcementLinkUrl: '',
  headerTagline: 'HAUTE HORLOGERIE & 1:1 SUPER CLONES',
  whatsappNumber: '0319 2265524',
  whatsappLink: "https://wa.me/923192265524?text=Hi%20VW-Ventures%20Watches,%20I'm%20interested%20in%20your%20watch%20collection.",
  instagramHandle: '@ventures.watches',
  instagramLink: 'https://www.instagram.com/ventures.watches/',
  facebookLink: 'https://www.facebook.com/share/1CJGTYKA22/?mibextid=wwXIfr',

  // 2. Hero Section
  heroTitle: 'VENTURES WATCHES',
  heroSubtitle: '100% Authentic Watches & High-End Clones',
  heroVideoUrl: '/uploads/vw-media-1791799307947-7910.mp4',
  heroImageUrl: '',
  heroCtaText: 'DISCOVER COLLECTION',
  heroSecondaryCtaText: 'OUR CATEGORIES',
  heroBadgeText: '100% AUTHENTIC WATCHES & HIGH-END CLONES',
  heroBackgroundType: 'video',
  heroVideoOverlay: 'transparent',
  heroVideoOpacity: 0,
  heroShowTitle: true,
  heroShowSubtitle: true,
  heroShowStatement: true,
  heroShowPrimaryCta: true,
  heroShowSecondaryCta: true,

  // 3. Brand Manifesto
  brandStatement: 'Featuring Timepieces from the World’s Finest Brands. ⌚✨',
  brandAuthor: 'VW-Ventures Watches Pakistan',

  // 4. Curated Timepieces / Editorial Story Section
  editorialEyebrow: 'CURATED TIMEPIECES',
  editorialTitle: 'TIMEPIECES WORTH DISCOVERING',
  editorialText: 'From authentic luxury watches to meticulously selected high-end alternatives, Ventures Watches brings together an exceptional range of timepieces from renowned names in luxury watches.',
  editorialImage: '/uploads/vw-media-1787123090324-6787.jpeg',
  editorialBadgeTitle: 'FIND YOUR TIMEPIECE',
  editorialBadgeText: 'Explore our collection and discover a watch that matches your style.',
  editorialFeature1Title: 'AUTHENTIC WATCHES',
  editorialFeature1Text: 'Genuine timepieces from established and sought-after brands.',
  editorialFeature2Title: 'HIGH-END COLLECTION',
  editorialFeature2Text: '1:1 Super Clone Engineering matching authentic dimensions down to the micron.',
  editorialFeature3Title: 'CHECKING WARRANTY',
  editorialFeature3Text: 'Comprehensive 3-day verification warranty backing every timepiece.',
  editorialCtaText: 'EXPLORE CURATED CATALOGUE',

  // 5. Watch Categories / Craftsmanship Standards Section
  craftsmanshipEyebrow: 'WATCHMAKING STANDARDS',
  craftsmanshipTitle: 'OUR WATCH CATEGORIES',
  craftsmanshipText: 'Discover our carefully graded selection of luxury watches, offering clear transparency across authentic luxury timepieces, master super clones, and accessible homage designs.',
  craftsmanshipImage: '',
  originalWatchesTitle: 'Original Watches',
  originalWatchesSubtitle: 'Authentic Luxury Watches',
  originalWatchesDesc: 'Genuine, manufacturer-verified timepieces sourced directly from world-renowned heritage houses. Every piece includes authenticated serial numbers, official documentation, and factory warranty.',
  originalWatchesImage: '/uploads/vw-media-1787123150539-6407.jpeg',
  cloneWatchesTitle: 'Clone Watches',
  cloneWatchesSubtitle: '1:1 Super Clone Engineering',
  cloneWatchesDesc: 'Meticulously crafted 1:1 super clones built with exact weight, genuine 904L stainless steel, ceramic bezel inserts, and clone-calibrated movements matching authentic dimensions down to the micron.',
  cloneWatchesImage: '/uploads/vw-media-1787123202086-8261.jpeg',
  copyWatchesTitle: 'Copy Watches',
  copyWatchesSubtitle: 'Accessible Style & Everyday Elegance',
  copyWatchesDesc: 'Stylish, high-value tribute designs combining iconic luxury aesthetics with reliable daily movements, durable stainless steel cases, and scratch-resistant crystals at accessible price points.',
  copyWatchesImage: '/uploads/vw-media-1787123229539-987.jpeg',

  // 6. Catalog Section
  catalogTitle: 'THE HOROLOGICAL ARCHIVE',
  catalogSubtitle: 'Explore our exclusive roster of luxury chronometers, super clones, and timeless classics.',

  // 7. About Us Page
  aboutTitle: 'The Story of Ventures Watches',
  aboutSubtitle: 'Curating Horological Excellence Since 2026',
  aboutText: 'Founded with a vision to bring refined watchmaking to a modern generation, VENTURES WATCHES represents a commitment to timeless design, precision, and uncompromising craftsmanship.\n\nEvery timepiece is thoughtfully selected to balance sophisticated aesthetics with dependable performance. From elegant detailing to carefully considered materials, each watch is created to become a lasting part of the journeys, moments, and achievements that define its wearer.',
  aboutImage: '/uploads/vw-media-1787123315922-8585.jpg',
  aboutImageUrl: '/uploads/vw-media-1787123315922-8585.jpg',
  aboutPillar1Title: 'Obsessive Quality Curation',
  aboutPillar1Text: 'Every piece is personally evaluated for case polishing, crystal clarity, and movement rate stability.',
  aboutPillar2Title: 'Uncompromising Transparency',
  aboutPillar2Text: 'We maintain absolute honesty across our authentic timepieces, 1:1 clone grades, and tribute editions.',
  aboutPillar3Title: 'Direct VIP Concierge',
  aboutPillar3Text: 'One-on-one personal guidance via WhatsApp from initial selection through to secure home delivery.',

  // 8. Contact Concierge Page
  contactTitle: 'Contact VW-Ventures Watches',
  contactSubtitle: 'Direct WhatsApp chat, official Instagram channel, or private email inquiry.',
  contactPhone: '+92 319 2265524',
  contactEmail: 'concierge@ventureswatches.com',
  contactAddress: 'Karachi, Pakistan (Insured Express Delivery Nationwide)',
  contactHours: 'Mon - Sun: 11:00 AM - 11:00 PM PKT',

  // 9. Footer & Policies
  footerBio: 'VENTURES WATCHES (VW-VENTURES WATCHES) represents the pinnacle of luxury horology. 100% Authentic Watches And High End Clones In Pakistan. 🇵🇰 ⌚',
  footerTrust1Title: '3-Day Checking Warranty',
  footerTrust1Desc: 'Each timepiece is backed by our full 3-day checking warranty and quality warranty.',
  footerTrust2Title: 'White-Glove Shipping',
  footerTrust2Desc: 'Insured nationwide delivery with recipient verification and luxury presentation box.',
  footerTrust3Title: '100% Authentic & Clones',
  footerTrust3Desc: '100% Authentic Watches And High End Clones In Pakistan 🇵🇰 ⌚',
  footerNewsletterTitle: 'Stay Informed',
  footerNewsletterDesc: 'Receive private invitations to limited production drops, watch journal entries, and private previews.',
  footerCopyright: '© 2026 VENTURES WATCHES. All Rights Reserved. Crafted with precision horology.',
  privacyPolicy: 'We respect your absolute discretion. All client identities, phone numbers, and delivery details are confidential and encrypted.',
  termsOfService: 'All purchases are subject to our verified 3-day checking warranty and physical inspection upon delivery.',
  returnPolicy: 'We offer an immediate 3-day exchange or refund if your timepiece exhibits any mechanical defect or condition variance upon arrival.',
  shippingPolicy: 'Dispatched via TCS Express Insured Priority Courier across all major cities of Pakistan within 24 to 48 hours.'
};

export const initialOrders: Order[] = [];

export const initialMedia: MediaItem[] = [];
