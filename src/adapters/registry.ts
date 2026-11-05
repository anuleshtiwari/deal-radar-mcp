import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { StoreAdapter, DeclarativeStoreConfig } from '../types/index.js';
import { AmazonAdapter } from './amazon.js';
import { FlipkartAdapter } from './flipkart.js';
import { DeclarativeAdapter } from './declarative.js';
import { GenericFallbackAdapter } from './generic.js';
import { defaultStorage } from '../engine/storage.js';

export class AdapterRegistry {
  private adapters: Map<string, StoreAdapter> = new Map();
  private fallbackAdapter = new GenericFallbackAdapter();

  constructor() {
    this.registerBuiltInAdapters();
    this.loadBuiltInStoreConfigs();
    this.loadCustomAdapters();
  }

  private registerBuiltInAdapters(): void {
    const amazon = new AmazonAdapter();
    const flipkart = new FlipkartAdapter();

    this.adapters.set(amazon.id, amazon);
    this.adapters.set(flipkart.id, flipkart);
  }

  private loadBuiltInStoreConfigs(): void {
    try {
      const currentDir = path.dirname(fileURLToPath(import.meta.url));
      const storesDir = path.resolve(currentDir, '../../stores');
      if (fs.existsSync(storesDir)) {
        const files = fs.readdirSync(storesDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
          try {
            const raw = fs.readFileSync(path.join(storesDir, file), 'utf-8');
            const config = JSON.parse(raw) as DeclarativeStoreConfig;
            if (config.id && !this.adapters.has(config.id)) {
              this.adapters.set(config.id, new DeclarativeAdapter(config));
            }
          } catch (e) {
            console.error(`Failed loading store file ${file}:`, e);
          }
        }
      }
    } catch {
      // Ignore if directory not accessible
    }
  }

  private loadCustomAdapters(): void {
    const customConfigs = defaultStorage.getCustomStores();
    for (const config of customConfigs) {
      const adapter = new DeclarativeAdapter(config);
      this.adapters.set(adapter.id, adapter);
    }
  }

  public registerStore(config: DeclarativeStoreConfig): void {
    const adapter = new DeclarativeAdapter(config);
    this.adapters.set(adapter.id, adapter);
    defaultStorage.addCustomStore(config);
  }

  public getAdapterById(id: string): StoreAdapter | undefined {
    return this.adapters.get(id.toLowerCase());
  }

  public findAdapterForUrl(url: string): StoreAdapter | undefined {
    for (const adapter of this.adapters.values()) {
      if (adapter.canHandle(url)) {
        return adapter;
      }
    }
    return this.fallbackAdapter;
  }

  public getAllAdapters(): StoreAdapter[] {
    return Array.from(this.adapters.values());
  }
}

export const defaultRegistry = new AdapterRegistry();

