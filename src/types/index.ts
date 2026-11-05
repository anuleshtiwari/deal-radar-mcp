export interface Offer {
  title: string;
  type: 'bank' | 'coupon' | 'cashback' | 'special';
  discountAmount?: number;
  discountPercentage?: number;
  description: string;
}

export interface Product {
  id: string;
  url: string;
  platform: string;
  title: string;
  currentPrice: number;
  originalPrice?: number;
  currency: string;
  discountPercentage?: number;
  rating?: number;
  reviewCount?: number;
  inStock: boolean;
  seller?: string;
  imageUrl?: string;
  offers: Offer[];
  effectivePrice: number; // Price after applicable best direct discount
  timestamp: string;
}

export interface PriceSnapshot {
  timestamp: string;
  price: number;
  effectivePrice: number;
  inStock: boolean;
}

export interface PriceAlert {
  id: string;
  productUrl: string;
  platform: string;
  title: string;
  initialPrice: number;
  currentPrice: number;
  targetPrice: number;
  currency: string;
  lowestSeenPrice: number;
  highestSeenPrice: number;
  createdAt: string;
  lastCheckedAt: string;
  triggered: boolean;
  notes?: string;
  history: PriceSnapshot[];
}

export interface SearchOptions {
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'relevance' | 'price_low_to_high' | 'price_high_to_low' | 'rating';
}

export interface DeclarativeStoreConfig {
  id: string;
  name: string;
  domains: string[];
  searchUrlTemplate: string; // e.g. "https://example.com/search?q={query}"
  selectors: {
    searchItem: string;
    searchTitle: string;
    searchPrice: string;
    searchOriginalPrice?: string;
    searchUrl: string;
    searchRating?: string;
    searchImage?: string;
    
    // Product page selectors
    productTitle: string;
    productPrice: string;
    productOriginalPrice?: string;
    productStockStatus?: string;
    productOutOfStockText?: string;
    productRating?: string;
    productOffers?: string;
  };
  currencySymbol?: string;
  currencyCode?: string;
}

export interface StoreAdapter {
  readonly id: string;
  readonly name: string;
  readonly domains: string[];
  
  canHandle(url: string): boolean;
  search(query: string, options?: SearchOptions): Promise<Product[]>;
  scrapeProduct(url: string): Promise<Product>;
}

