import { Product, PriceAlert, SearchOptions } from '../types/index.js';
import { defaultRegistry } from '../adapters/registry.js';
import { defaultStorage } from './storage.js';

export interface WatchlistAuditResult {
  totalWatched: number;
  checkedCount: number;
  triggeredAlerts: {
    alert: PriceAlert;
    previousPrice: number;
    currentPrice: number;
    dropAmount: number;
    dropPercentage: number;
  }[];
  priceDrops: {
    alert: PriceAlert;
    previousPrice: number;
    currentPrice: number;
    dropAmount: number;
    dropPercentage: number;
  }[];
  errors: { url: string; error: string }[];
}

export class DealTrackerEngine {
  public async searchAcrossStores(query: string, storeIds?: string[], options?: SearchOptions): Promise<Product[]> {
    const allAdapters = defaultRegistry.getAllAdapters();
    const targetAdapters = storeIds && storeIds.length > 0
      ? allAdapters.filter(a => storeIds.includes(a.id))
      : allAdapters;

    const results = await Promise.allSettled(
      targetAdapters.map(adapter => adapter.search(query, options))
    );

    const mergedProducts: Product[] = [];
    for (const res of results) {
      if (res.status === 'fulfilled') {
        mergedProducts.push(...res.value);
      }
    }

    // Default sort by lowest effective price
    return mergedProducts.sort((a, b) => a.effectivePrice - b.effectivePrice);
  }

  public async trackProduct(url: string): Promise<{ product: Product; alert?: PriceAlert }> {
    const adapter = defaultRegistry.findAdapterForUrl(url);
    if (!adapter) {
      throw new Error(`No adapter found supporting URL: ${url}. Use add_store_adapter to add support for this domain.`);
    }

    const product = await adapter.scrapeProduct(url);
    
    // Check if item already exists in watchlist
    let existingAlert = defaultStorage.findAlertByUrl(url);
    if (existingAlert) {
      existingAlert = defaultStorage.updatePriceSnapshot(
        existingAlert.id,
        product.currentPrice,
        product.effectivePrice,
        product.inStock
      );
    }

    return { product, alert: existingAlert };
  }

  public async setAlert(url: string, targetPrice: number, notes?: string): Promise<PriceAlert> {
    const { product, alert: existing } = await this.trackProduct(url);

    if (existing) {
      existing.targetPrice = targetPrice;
      if (notes) existing.notes = notes;
      if (product.currentPrice <= targetPrice && product.currentPrice > 0) {
        existing.triggered = true;
      }
      defaultStorage.addAlert(existing);
      return existing;
    }

    const newAlert: PriceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      productUrl: url,
      platform: product.platform,
      title: product.title,
      initialPrice: product.currentPrice,
      currentPrice: product.currentPrice,
      targetPrice,
      currency: product.currency,
      lowestSeenPrice: product.currentPrice,
      highestSeenPrice: product.currentPrice,
      createdAt: new Date().toISOString(),
      lastCheckedAt: new Date().toISOString(),
      triggered: product.currentPrice <= targetPrice && product.currentPrice > 0,
      notes,
      history: [
        {
          timestamp: new Date().toISOString(),
          price: product.currentPrice,
          effectivePrice: product.effectivePrice,
          inStock: product.inStock
        }
      ]
    };

    defaultStorage.addAlert(newAlert);
    return newAlert;
  }

  public async checkWatchlist(): Promise<WatchlistAuditResult> {
    const alerts = defaultStorage.getAllAlerts();
    const result: WatchlistAuditResult = {
      totalWatched: alerts.length,
      checkedCount: 0,
      triggeredAlerts: [],
      priceDrops: [],
      errors: []
    };

    for (const alert of alerts) {
      try {
        const adapter = defaultRegistry.findAdapterForUrl(alert.productUrl);
        if (!adapter) {
          result.errors.push({ url: alert.productUrl, error: 'No adapter available for site' });
          continue;
        }

        const freshProduct = await adapter.scrapeProduct(alert.productUrl);
        result.checkedCount++;

        const previousPrice = alert.currentPrice;
        const newPrice = freshProduct.currentPrice;

        const updated = defaultStorage.updatePriceSnapshot(
          alert.id,
          newPrice,
          freshProduct.effectivePrice,
          freshProduct.inStock
        );

        if (!updated) continue;

        // Check if price dropped
        if (newPrice < previousPrice && newPrice > 0) {
          const dropAmount = previousPrice - newPrice;
          const dropPercentage = Math.round((dropAmount / previousPrice) * 100);

          const dropInfo = {
            alert: updated,
            previousPrice,
            currentPrice: newPrice,
            dropAmount,
            dropPercentage
          };

          result.priceDrops.push(dropInfo);

          if (newPrice <= alert.targetPrice) {
            result.triggeredAlerts.push(dropInfo);
          }
        } else if (newPrice <= alert.targetPrice && !alert.triggered && newPrice > 0) {
          result.triggeredAlerts.push({
            alert: updated,
            previousPrice,
            currentPrice: newPrice,
            dropAmount: 0,
            dropPercentage: 0
          });
        }
      } catch (err: any) {
        result.errors.push({ url: alert.productUrl, error: err.message });
      }
    }

    return result;
  }

  public async compareAcrossPlatforms(query: string): Promise<{
    query: string;
    cheapest: Product | null;
    comparison: {
      platform: string;
      title: string;
      price: number;
      effectivePrice: number;
      differenceFromCheapest: number;
      url: string;
      rating?: number;
    }[];
  }> {
    const products = await this.searchAcrossStores(query);
    if (products.length === 0) {
      return { query, cheapest: null, comparison: [] };
    }

    const cheapest = products[0];

    // Pick top 1 from each unique platform for concise comparison
    const platformMap = new Map<string, Product>();
    for (const p of products) {
      if (!platformMap.has(p.platform)) {
        platformMap.set(p.platform, p);
      }
    }

    const comparison = Array.from(platformMap.values()).map(p => ({
      platform: p.platform,
      title: p.title,
      price: p.currentPrice,
      effectivePrice: p.effectivePrice,
      differenceFromCheapest: p.effectivePrice - cheapest.effectivePrice,
      url: p.url,
      rating: p.rating
    }));

    return {
      query,
      cheapest,
      comparison
    };
  }
}

export const defaultTrackerEngine = new DealTrackerEngine();
