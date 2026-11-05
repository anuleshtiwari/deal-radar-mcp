import { StoreAdapter, DeclarativeStoreConfig } from '../types/index.js';
import { AmazonAdapter } from './amazon.js';
import { FlipkartAdapter } from './flipkart.js';
import { DeclarativeAdapter } from './declarative.js';
import { defaultStorage } from '../engine/storage.js';

export class AdapterRegistry {
  private adapters: Map<string, StoreAdapter> = new Map();

  constructor() {
    this.registerBuiltInAdapters();
    this.loadCustomAdapters();
  }

  private registerBuiltInAdapters(): void {
    const amazon = new AmazonAdapter();
    const flipkart = new FlipkartAdapter();

    this.adapters.set(amazon.id, amazon);
    this.adapters.set(flipkart.id, flipkart);
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
    return undefined;
  }

  public getAllAdapters(): StoreAdapter[] {
    return Array.from(this.adapters.values());
  }
}

export const defaultRegistry = new AdapterRegistry();
