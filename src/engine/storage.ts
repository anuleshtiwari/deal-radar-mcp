import fs from 'fs';
import path from 'path';
import os from 'os';
import { PriceAlert, PriceSnapshot, DeclarativeStoreConfig } from '../types/index.js';

interface StorageSchema {
  version: number;
  alerts: Record<string, PriceAlert>;
  customStores: Record<string, DeclarativeStoreConfig>;
}

export class StorageEngine {
  private dataDir: string;
  private filePath: string;
  private state: StorageSchema;

  constructor(customDir?: string) {
    this.dataDir = customDir || path.join(os.homedir(), '.deal-radar');
    this.filePath = path.join(this.dataDir, 'deal-radar.json');
    this.state = {
      version: 1,
      alerts: {},
      customStores: {}
    };
    this.init();
  }

  private init(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.state = {
          version: parsed.version || 1,
          alerts: parsed.alerts || {},
          customStores: parsed.customStores || {}
        };
      } else {
        this.flush();
      }
    } catch (err) {
      console.error('Failed to initialize DealRadar storage, using memory state:', err);
    }
  }

  private flush(): void {
    try {
      const tempPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.state, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.filePath);
    } catch (err) {
      console.error('Failed to flush storage:', err);
    }
  }

  // --- Alert & Watchlist Operations ---

  public getAllAlerts(): PriceAlert[] {
    return Object.values(this.state.alerts);
  }

  public getAlert(id: string): PriceAlert | undefined {
    return this.state.alerts[id];
  }

  public findAlertByUrl(url: string): PriceAlert | undefined {
    return Object.values(this.state.alerts).find(a => a.productUrl === url);
  }

  public addAlert(alert: PriceAlert): void {
    this.state.alerts[alert.id] = alert;
    this.flush();
  }

  public removeAlert(id: string): boolean {
    if (this.state.alerts[id]) {
      delete this.state.alerts[id];
      this.flush();
      return true;
    }
    return false;
  }

  public updatePriceSnapshot(id: string, newPrice: number, effectivePrice: number, inStock: boolean): PriceAlert | undefined {
    const alert = this.state.alerts[id];
    if (!alert) return undefined;

    const now = new Date().toISOString();
    alert.currentPrice = newPrice;
    alert.lastCheckedAt = now;

    if (newPrice < alert.lowestSeenPrice && newPrice > 0) {
      alert.lowestSeenPrice = newPrice;
    }
    if (newPrice > alert.highestSeenPrice) {
      alert.highestSeenPrice = newPrice;
    }

    // Check trigger condition
    if (newPrice <= alert.targetPrice && newPrice > 0) {
      alert.triggered = true;
    }

    const snapshot: PriceSnapshot = {
      timestamp: now,
      price: newPrice,
      effectivePrice,
      inStock
    };

    alert.history.push(snapshot);
    // Keep last 100 historical snapshots per product
    if (alert.history.length > 100) {
      alert.history.shift();
    }

    this.flush();
    return alert;
  }

  // --- Custom Store Configuration Operations ---

  public getCustomStores(): DeclarativeStoreConfig[] {
    return Object.values(this.state.customStores);
  }

  public addCustomStore(store: DeclarativeStoreConfig): void {
    this.state.customStores[store.id] = store;
    this.flush();
  }

  public removeCustomStore(id: string): boolean {
    if (this.state.customStores[id]) {
      delete this.state.customStores[id];
      this.flush();
      return true;
    }
    return false;
  }
}

export const defaultStorage = new StorageEngine();
