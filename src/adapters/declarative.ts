import * as cheerio from 'cheerio';
import { BaseAdapter } from './base.js';
import { Product, SearchOptions, DeclarativeStoreConfig } from '../types/index.js';

export class DeclarativeAdapter extends BaseAdapter {
  readonly id: string;
  readonly name: string;
  readonly domains: string[];
  public config: DeclarativeStoreConfig;

  constructor(config: DeclarativeStoreConfig) {
    super();
    this.config = config;
    this.id = config.id;
    this.name = config.name;
    this.domains = config.domains;
  }

  public async search(query: string, options?: SearchOptions): Promise<Product[]> {
    const searchUrl = this.config.searchUrlTemplate.replace('{query}', encodeURIComponent(query));
    const html = await this.http.getHtml(searchUrl);
    const $ = cheerio.load(html);
    const products: Product[] = [];
    const limit = options?.limit || 5;

    const { selectors } = this.config;

    $(selectors.searchItem).each((_, el) => {
      if (products.length >= limit) return false;
      const $el = $(el);

      const title = $el.find(selectors.searchTitle).first().text().trim();
      const relativeLink = $el.find(selectors.searchUrl).first().attr('href') || '';
      if (!relativeLink || !title) return;

      const mainDomain = this.domains[0] || 'store.com';
      const url = relativeLink.startsWith('http') ? relativeLink : `https://${mainDomain}${relativeLink}`;

      const priceText = $el.find(selectors.searchPrice).first().text();
      const currentPrice = this.http.cleanPriceString(priceText);

      let originalPrice: number | undefined;
      if (selectors.searchOriginalPrice) {
        const origText = $el.find(selectors.searchOriginalPrice).first().text();
        const parsed = this.http.cleanPriceString(origText);
        if (parsed > currentPrice) originalPrice = parsed;
      }

      let rating: number | undefined;
      if (selectors.searchRating) {
        const ratingText = $el.find(selectors.searchRating).first().text();
        const match = ratingText.match(/([0-9.]+)/);
        if (match) rating = parseFloat(match[1]);
      }

      let imageUrl: string | undefined;
      if (selectors.searchImage) {
        imageUrl = $el.find(selectors.searchImage).first().attr('src') || $el.find(selectors.searchImage).first().attr('data-src');
      }

      if (currentPrice > 0) {
        const discountPct = originalPrice && originalPrice > currentPrice
          ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
          : undefined;

        products.push({
          id: `${this.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          url: url.split('?')[0],
          platform: this.name,
          title,
          currentPrice,
          originalPrice,
          currency: this.config.currencyCode || 'INR',
          discountPercentage: discountPct,
          rating,
          inStock: true,
          imageUrl,
          offers: [],
          effectivePrice: currentPrice,
          timestamp: new Date().toISOString()
        });
      }
    });

    return products;
  }

  public async scrapeProduct(url: string): Promise<Product> {
    const html = await this.http.getHtml(url);
    const $ = cheerio.load(html);
    const { selectors } = this.config;

    const title = $(selectors.productTitle).first().text().trim() || `${this.name} Product`;
    const priceText = $(selectors.productPrice).first().text();
    const currentPrice = this.http.cleanPriceString(priceText);

    let originalPrice: number | undefined;
    if (selectors.productOriginalPrice) {
      const origText = $(selectors.productOriginalPrice).first().text();
      const parsed = this.http.cleanPriceString(origText);
      if (parsed > currentPrice) originalPrice = parsed;
    }

    let inStock = true;
    if (selectors.productStockStatus && selectors.productOutOfStockText) {
      const statusText = $(selectors.productStockStatus).text().toLowerCase();
      if (statusText.includes(selectors.productOutOfStockText.toLowerCase())) {
        inStock = false;
      }
    }

    let rating: number | undefined;
    if (selectors.productRating) {
      const ratingText = $(selectors.productRating).first().text();
      const match = ratingText.match(/([0-9.]+)/);
      if (match) rating = parseFloat(match[1]);
    }

    const discountPct = originalPrice && originalPrice > currentPrice
      ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
      : undefined;

    return {
      id: `${this.id}_${Date.now()}`,
      url: url.split('?')[0],
      platform: this.name,
      title,
      currentPrice,
      originalPrice,
      currency: this.config.currencyCode || 'INR',
      discountPercentage: discountPct,
      rating,
      inStock,
      offers: [],
      effectivePrice: currentPrice,
      timestamp: new Date().toISOString()
    };
  }
}

