import { Product, SearchOptions, StoreAdapter } from '../types/index.js';
import { HttpClient, defaultHttpClient } from '../engine/httpClient.js';

export abstract class BaseAdapter implements StoreAdapter {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly domains: string[];

  protected http: HttpClient;

  constructor(httpClient?: HttpClient) {
    this.http = httpClient || defaultHttpClient;
  }

  public canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return this.domains.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
    } catch {
      return false;
    }
  }

  abstract search(query: string, options?: SearchOptions): Promise<Product[]>;
  abstract scrapeProduct(url: string): Promise<Product>;
}

