import * as cheerio from 'cheerio';
import { BaseAdapter } from './base.js';
import { Product, SearchOptions, Offer } from '../types/index.js';

export class FlipkartAdapter extends BaseAdapter {
  readonly id = 'flipkart';
  readonly name = 'Flipkart';
  readonly domains = ['flipkart.com', 'dl.flipkart.com'];

  public async search(query: string, options?: SearchOptions): Promise<Product[]> {
    const searchUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`;
    const html = await this.http.getHtml(searchUrl);
    const $ = cheerio.load(html);
    const products: Product[] = [];
    const limit = options?.limit || 5;

    // Flipkart uses two primary layout models: List view (mobiles/electronics) & Grid view (fashion/lifestyle)
    // Common card selectors
    const cardSelectors = ['div.tUxRFH', 'div._75nlfW', 'div.slAVV4', 'div._2kHMtA', 'div._1sdMkc'];
    const selectorStr = cardSelectors.join(', ');

    $(selectorStr).each((_, el) => {
      if (products.length >= limit) return false;

      const $el = $(el);
      
      // Title
      const title = $el.find('div.KzDlHZ, a.wjcEIp, a.IRpwTa, div._4rR01T').first().text().trim();
      
      // Link
      const linkEl = $el.find('a[href*="/p/"], a._1fQZEK, a.VJA3rP, a.CGtC5Q').first();
      const relativeLink = linkEl.attr('href') || $el.find('a').first().attr('href') || '';
      if (!relativeLink) return;
      const url = relativeLink.startsWith('http') ? relativeLink : `https://www.flipkart.com${relativeLink}`;

      // Current Price
      const priceText = $el.find('div.Nx9bqj, div._30jeq3').first().text();
      const currentPrice = this.http.cleanPriceString(priceText);

      // Original Price
      const origPriceText = $el.find('div.yRaY8j, div._3I9_wc').first().text();
      const originalPrice = this.http.cleanPriceString(origPriceText);

      // Discount %
      const discountText = $el.find('div.UkUFwK, div._3Ay6Sb').first().text();
      const discountMatch = discountText.match(/([0-9]+)%\s*off/i);
      const discountPercentage = discountMatch ? parseInt(discountMatch[1], 10) : undefined;

      // Rating
      const ratingText = $el.find('div.XQDdHH, div._3LWZlK').first().text();
      const rating = ratingText ? parseFloat(ratingText) : undefined;

      // Image
      const imageUrl = $el.find('img.DByuf4, img._396cs4').attr('src');

      // Product ID / FSN
      const fsnMatch = url.match(/pid=([A-Z0-9]+)/i);
      const id = fsnMatch ? fsnMatch[1] : `fk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      if (title && currentPrice > 0) {
        products.push({
          id,
          url: url.split('?')[0],
          platform: 'Flipkart',
          title,
          currentPrice,
          originalPrice: originalPrice > currentPrice ? originalPrice : undefined,
          currency: 'INR',
          discountPercentage,
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

    // Title
    const title = $('span.B_NuCI, h1.VU-ZEz, span._35KyD6').first().text().trim();

    // Price
    const priceText = $('div.Nx9bqj.CxhGGd, div._30jeq3._16Jk6d').first().text();
    const currentPrice = this.http.cleanPriceString(priceText);

    // Original Price
    const origPriceText = $('div.yRaY8j.A6+E6v, div._3I9_wc._2p6cR5').first().text();
    const originalPrice = this.http.cleanPriceString(origPriceText);

    // Discount percentage
    const discountText = $('div.UkUFwK.WW8yVX, div._3Ay6Sb._31Dcoz').first().text();
    const discountMatch = discountText.match(/([0-9]+)%\s*off/i);
    const discountPercentage = discountMatch ? parseInt(discountMatch[1], 10) : undefined;

    // Rating
    const ratingText = $('div.XQDdHH, div._3LWZlK').first().text();
    const rating = ratingText ? parseFloat(ratingText) : undefined;

    // In Stock
    const outOfStock = $('div._16FRp0, div._1V3wBu').text().toLowerCase().includes('out of stock');
    const inStock = !outOfStock;

    // Image
    const imageUrl = $('img._396cs4._2amPTt, img.DByuf4').first().attr('src');

    // Bank & Special Offers
    const offers: Offer[] = [];
    let bestDirectDiscount = 0;

    $('li.k7msKJ, span.row._19A_Cw, div.x7797t').each((_, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      if (text.length > 10) {
        let type: Offer['type'] = 'special';
        if (text.toLowerCase().includes('bank') || text.toLowerCase().includes('credit') || text.toLowerCase().includes('debit')) {
          type = 'bank';
        } else if (text.toLowerCase().includes('cashback')) {
          type = 'cashback';
        } else if (text.toLowerCase().includes('coupon')) {
          type = 'coupon';
        }

        // Try extracting flat discount amount if mentioned (e.g., "Flat ₹1,250 Off on HDFC")
        const flatDiscountMatch = text.match(/(?:flat|instant discount of|off of|worth)\s*(?:₹|rs\.?)\s*([0-9,]+)/i);
        let discountAmount: number | undefined;
        if (flatDiscountMatch) {
          discountAmount = this.http.cleanPriceString(flatDiscountMatch[1]);
          if (discountAmount > bestDirectDiscount) {
            bestDirectDiscount = discountAmount;
          }
        }

        offers.push({
          title: text.slice(0, 50),
          type,
          discountAmount,
          description: text
        });
      }
    });

    const fsnMatch = url.match(/pid=([A-Z0-9]+)/i);
    const id = fsnMatch ? fsnMatch[1] : `fk_${Date.now()}`;

    // Compute effective price taking into account top bank offer
    const effectivePrice = Math.max(0, currentPrice - bestDirectDiscount);

    return {
      id,
      url: url.split('?')[0],
      platform: 'Flipkart',
      title: title || 'Flipkart Product',
      currentPrice,
      originalPrice: originalPrice > currentPrice ? originalPrice : undefined,
      currency: 'INR',
      discountPercentage,
      rating,
      inStock,
      imageUrl,
      offers: offers.slice(0, 6),
      effectivePrice: effectivePrice > 0 ? effectivePrice : currentPrice,
      timestamp: new Date().toISOString()
    };
  }
}

