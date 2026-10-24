export interface WatchSpecs {
  movement?: string;
  caseMaterial?: string;
  caseSize?: string;
  caseThickness?: string;
  diameter?: string;
  thickness?: string;
  dialColor?: string;
  crystal?: string;
  strapMaterial?: string;
  waterResistance?: string;
  powerReserve?: string;
  warranty: string;
  [key: string]: any;
}

export interface SEOData {
  metaTitle?: string;
  metaDescription?: string;
  slug?: string;
  altText?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  shortDescription: string;
  price: number;
  compareAtPrice?: number | null;
  currency: string;
  collectionId: string;
  collectionName: string;
  category: string;
  stock: number;
  status: 'published' | 'draft';
  featured: boolean;
  newArrival: boolean;
  images: string[];
  videos?: string[];
  specifications: WatchSpecs;
  seo?: SEOData;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  video?: string;
  featured: boolean;
  sortOrder: number;
  seo?: SEOData;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CustomerInfo {
  id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: CustomerInfo;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
  paymentMethod?: 'card' | 'easypaisa' | 'jazzcash' | 'sadapay' | 'nayapay' | 'raast' | string;
  paymentDetails?: {
    cardBrand?: string;
    cardLast4?: string;
    cardHolder?: string;
    bankName?: string;
    trxId?: string;
    walletType?: string;
    senderPhone?: string;
    proofUrl?: string;
    gateway?: string;
    destinationBank?: string;
    destinationAccount?: string;
    destinationTitle?: string;
    isAdvancePaid?: boolean;
    otpVerified?: boolean;
  };
  paymentStatus: 'Pending' | 'Paid' | 'Failed';
  orderStatus: 'Pending' | 'Confirmed' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  emailApprovalStatus?: 'Pending Review' | 'Approved & Sent' | 'Rejected / Declined';
  emailConfirmationSent?: boolean;
  emailSentAt?: string;
  emailRejectionReason?: string;
  createdAt: string;
}

export interface CMSData {
  // 1. Header & Announcement Bar
  announcementEnabled?: boolean;
  announcementText?: string;
  announcementLinkText?: string;
  announcementLinkUrl?: string;
  headerTagline?: string;
  whatsappNumber?: string;
  whatsappLink?: string;
  instagramHandle?: string;
  instagramLink?: string;
  facebookLink?: string;

  // 2. Hero Section
  heroTitle: string;
  heroSubtitle: string;
  heroVideoUrl: string;
  heroImageUrl: string;
  heroCtaText: string;
  heroSecondaryCtaText?: string;
  heroBadgeText?: string;
  heroBackgroundType?: 'video' | 'image' | 'gradient';
  heroVideoOverlay?: 'transparent' | 'translucent' | 'dark';
  heroVideoOpacity?: number;
  heroShowTitle?: boolean;
  heroShowSubtitle?: boolean;
  heroShowStatement?: boolean;
  heroShowPrimaryCta?: boolean;
  heroShowSecondaryCta?: boolean;

  // 3. Brand Manifesto
  brandStatement: string;
  brandAuthor?: string;

  // 4. Curated Timepieces / Editorial Story Section
  editorialEyebrow?: string;
  editorialTitle: string;
  editorialText: string;
  editorialImage: string;
  editorialBadgeTitle?: string;
  editorialBadgeText?: string;
  editorialFeature1Title?: string;
  editorialFeature1Text?: string;
  editorialFeature2Title?: string;
  editorialFeature2Text?: string;
  editorialFeature3Title?: string;
  editorialFeature3Text?: string;
  editorialCtaText?: string;

  // 5. Watch Categories / Craftsmanship Standards Section
  craftsmanshipEyebrow?: string;
  craftsmanshipTitle: string;
  craftsmanshipText: string;
  craftsmanshipImage: string;
  originalWatchesTitle?: string;
  originalWatchesSubtitle?: string;
  originalWatchesDesc?: string;
  originalWatchesImage?: string;
  cloneWatchesTitle?: string;
  cloneWatchesSubtitle?: string;
  cloneWatchesDesc?: string;
  cloneWatchesImage?: string;
  copyWatchesTitle?: string;
  copyWatchesSubtitle?: string;
  copyWatchesDesc?: string;
  copyWatchesImage?: string;

  // 6. Catalog Section
  catalogTitle?: string;
  catalogSubtitle?: string;

  // 7. About Us Page
  aboutTitle?: string;
  aboutSubtitle?: string;
  aboutText?: string;
  aboutImage?: string;
  aboutImageUrl?: string;
  aboutPillar1Title?: string;
  aboutPillar1Text?: string;
  aboutPillar2Title?: string;
  aboutPillar2Text?: string;
  aboutPillar3Title?: string;
  aboutPillar3Text?: string;

  // 8. Contact Concierge Page
  contactTitle?: string;
  contactSubtitle?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactAddress?: string;
  contactHours?: string;

  // 9. Footer & Policies
  footerBio?: string;
  footerTrust1Title?: string;
  footerTrust1Desc?: string;
  footerTrust2Title?: string;
  footerTrust2Desc?: string;
  footerTrust3Title?: string;
  footerTrust3Desc?: string;
  footerNewsletterTitle?: string;
  footerNewsletterDesc?: string;
  footerCopyright?: string;
  privacyPolicy?: string;
  termsOfService?: string;
  returnPolicy?: string;
  shippingPolicy?: string;
}

export interface MediaItem {
  id: string;
  url: string;
  name: string;
  type: 'image' | 'video';
  category: string;
  size?: string;
  createdAt?: string;
  uploadedAt?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'customer' | 'admin';
  createdAt?: string;
  lastLoginAt?: string;
}

export interface PriceDropAlert {
  id: string;
  productId: string;
  productName: string;
  productSku?: string;
  productImage?: string;
  currentPrice: number;
  targetPrice: number;
  email: string;
  customerName?: string;
  phone?: string;
  status: 'active' | 'notified' | 'cancelled';
  createdAt: string;
  notifiedAt?: string;
}
