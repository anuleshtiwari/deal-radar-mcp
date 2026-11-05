import * as cheerio from 'cheerio';
import { BaseAdapter } from './base.js';
import { Product, SearchOptions, Offer } from '../types/index.js';

export class AmazonAdapter extends BaseAdapter {
  readonly id = 'amazon';
  readonly name = 'Amazon';
  readonly domains = ['amazon.in', 'amazon.com', 'amazon.co.uk', 'amazon.de', 'amzn.in', 'amzn.to'];

  public async search(query: string, options?: SearchOptions): Promise<Product[]> {
    const isIndia = true; // default to amazon.in for regional deals
    const baseUrl = isIndia ? 'https://www.amazon.in' : 'https://www.amazon.com';
    const searchUrl = `${baseUrl}/s?k=${encodeURIComponent(query)}`;

    const html = await this.http.getHtml(searchUrl);
    const $ = cheerio.load(html);
    const products: Product[] = [];

    const limit = options?.limit || 5;

    $('div[data-component-type="s-search-result"]').each((_, el) => {
      if (products.length >= limit) return false;

      const $el = $(el);
      const asin = $el.attr('data-asin') || '';
      if (!asin) return;

      const title = $el.find('h2 a span').text().trim();
      const relativeLink = $el.find('h2 a').attr('href') || '';
      const url = relativeLink.startsWith('http') ? relativeLink : `${baseUrl}${relativeLink}`;

      // Extract price
      const priceWhole = $el.find('.a-price .a-price-whole').first().text().replace(/[^0-9]/g, '');
      const priceFraction = $el.find('.a-price .a-price-fraction').first().text().replace(/[^0-9]/g, '') || '0';
      const currentPrice = priceWhole ? parseFloat(`${priceWhole}.${priceFraction}`) : 0;

      // Extract original/strikethrough price
      const originalPriceText = $el.find('.a-text-price span.a-offscreen').first().text();
      const originalPrice = this.http.cleanPriceString(originalPriceText);

      // Extract rating
      const ratingText = $el.find('.a-icon-alt').first().text();
      const ratingMatch = ratingText.match(/([0-9.]+)\s+out of/);
      const rating = ratingMatch ? parseFloat(ratingMatch[1]) : undefined;

      // Extract reviews count
      const reviewText = $el.find('span.a-size-base.s-underline-text').first().text().replace(/[^0-9]/g, '');
      const reviewCount = reviewText ? parseInt(reviewText, 10) : undefined;

      // Image
      const imageUrl = $el.find('img.s-image').attr('src');

      if (title && currentPrice > 0) {
        const discountPct = originalPrice > currentPrice 
          ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) 
          : 0;

        products.push({
          id: asin,
          url: url.split('?')[0], // clean URL
          platform: 'Amazon',
          title,
          currentPrice,
          originalPrice: originalPrice > currentPrice ? originalPrice : undefined,
          currency: isIndia ? 'INR' : 'USD',
          discountPercentage: discountPct > 0 ? discountPct : undefined,
          rating,
          reviewCount,
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

    // Title
    const title = $('#productTitle').text().trim() || $('h1.a-size-large').text().trim();

    // Price extraction with fallbacks
    let priceText = $('#corePriceDisplay_desktop_feature_div .a-price-whole').first().text();
    if (!priceText) {
      priceText = $('.a-price .a-price-whole').first().text();
    }
    if (!priceText) {
      priceText = $('#priceblock_ourprice').text() || $('#priceblock_dealprice').text();
    }
    const currentPrice = this.http.cleanPriceString(priceText);

    // Original price (MRP / Basis price)
    const originalPriceText = $('.basisPrice .a-offscreen, span.a-price.a-text-price span.a-offscreen').first().text();
    const originalPrice = this.http.cleanPriceString(originalPriceText);

    // Stock check
    const availText = $('#availability').text().toLowerCase();
    const inStock = !availText.includes('currently unavailable') && !availText.includes('out of stock');

    // Rating & reviews
    const ratingText = $('#acrPopover, span.a-icon-alt').first().text();
    const ratingMatch = ratingText.match(/([0-9.]+)\s+out of/);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : undefined;

    const reviewText = $('#acrCustomerReviewText').first().text().replace(/[^0-9]/g, '');
    const reviewCount = reviewText ? parseInt(reviewText, 10) : undefined;

    // Image
    const imageUrl = $('#landingImage, #imgBlkFront').attr('src');

    // Bank offers & promotions extraction
    const offers: Offer[] = [];
    $('#cardOffer_feature_div, #applicable_promotion_list_sec, div[data-feature-name="item-promotions"]').find('li, .a-list-item').each((_, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      if (text.length > 8 && text.length < 200) {
        offers.push({
          title: text.slice(0, 60),
          type: text.toLowerCase().includes('bank') ? 'bank' : 'coupon',
          description: text
        });
      }
    });

    // Calculate discount
    const discountPct = originalPrice > currentPrice 
      ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) 
      : 0;

    // Detect currency (INR vs USD)
    const currency = url.includes('.in') ? 'INR' : 'USD';

    // Parse ASIN
    const asinMatch = url.match(/\/([A-Z0-9]{10})(?:[/?]|$)/);
    const id = asinMatch ? asinMatch[1] : `amz_${Date.now()}`;

    return {
      id,
      url: url.split('?')[0],
      platform: 'Amazon',
      title: title || 'Amazon Product',
      currentPrice,
      originalPrice: originalPrice > currentPrice ? originalPrice : undefined,
      currency,
      discountPercentage: discountPct > 0 ? discountPct : undefined,
      rating,
      reviewCount,
      inStock,
      imageUrl,
      offers: offers.slice(0, 5),
      effectivePrice: currentPrice,
      timestamp: new Date().toISOString()
    };
  }
}

