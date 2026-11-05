import * as cheerio from 'cheerio';
import { BaseAdapter } from './base.js';
import { Product } from '../types/index.js';

export class GenericFallbackAdapter extends BaseAdapter {
  readonly id = 'generic';
  readonly name = 'Universal Store Web Scraper';
  readonly domains = ['*'];

  public canHandle(_url: string): boolean {
    return true; // Fallback for any URL
  }

  public async search(_query: string): Promise<Product[]> {
    return [];
  }

  public async scrapeProduct(url: string): Promise<Product> {
    const html = await this.http.getHtml(url);
    const $ = cheerio.load(html);

    let title: string = '';
    let currentPrice = 0;
    let originalPrice: number | undefined;
    let imageUrl: string | undefined;
    let currency = 'INR';
    let inStock = true;

    // 1. Try JSON-LD Product Schema
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).text());
        const item = Array.isArray(json) ? json.find(i => i['@type'] === 'Product') : (json['@type'] === 'Product' ? json : null);
        if (item) {
          if (!title && item.name) title = item.name;
          if (!imageUrl && item.image) imageUrl = Array.isArray(item.image) ? item.image[0] : item.image;
          if (item.offers) {
            const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
            if (offer.price) currentPrice = Number(offer.price);
            if (offer.priceCurrency) currency = offer.priceCurrency;
            if (offer.availability && typeof offer.availability === 'string') {
              inStock = !offer.availability.toLowerCase().includes('outofstock');
            }
          }
        }
      } catch {
        // ignore parse error
      }
    });

    // 2. OpenGraph / Twitter Fallbacks
    if (!title) {
      title = $('meta[property="og:title"]').attr('content') ||
              $('meta[name="twitter:title"]').attr('content') ||
              $('title').text().trim() ||
              'Online Product';
    }

    if (!imageUrl) {
      imageUrl = $('meta[property="og:image"]').attr('content') ||
                 $('meta[name="twitter:image"]').attr('content');
    }

    // 3. Fallback Price Extraction from meta tags or common price classes
    if (!currentPrice) {
      const metaPrice = $('meta[property="product:price:amount"]').attr('content') ||
                        $('meta[property="og:price:amount"]').attr('content');
      if (metaPrice) {
        currentPrice = this.http.cleanPriceString(metaPrice);
      }
    }

    if (!currentPrice) {
      const commonPriceSelectors = [
        '[data-price]', '.price', '#price', '.product-price', '.pdp-price',
        '.offer-price', '.current-price', 'span:contains("₹")', 'span:contains("$")'
      ];
      for (const sel of commonPriceSelectors) {
        const text = $(sel).first().text();
        const parsed = this.http.cleanPriceString(text);
        if (parsed > 0) {
          currentPrice = parsed;
          break;
        }
      }
    }

    // Currency deduction
    if (url.includes('.in') || html.includes('₹') || html.includes('INR')) {
      currency = 'INR';
    } else if (url.includes('.com') && !html.includes('₹')) {
      currency = 'USD';
    }

    // Clean title (remove trailing store names like "| Flipkart", "- Amazon.in")
    title = title.replace(/\s*[|\-–—].*$/, '').trim();

    const domain = new URL(url).hostname.replace(/^www\./, '');
    const discountPct = originalPrice && originalPrice > currentPrice
      ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
      : undefined;

    return {
      id: `generic_${Date.now()}`,
      url: url.split('?')[0],
      platform: domain,
      title,
      currentPrice: currentPrice || 0,
      originalPrice,
      currency,
      discountPercentage: discountPct,
      inStock,
      imageUrl,
      offers: [],
      effectivePrice: currentPrice || 0,
      timestamp: new Date().toISOString()
    };
  }
}

