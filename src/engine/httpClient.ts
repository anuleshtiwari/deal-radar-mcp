import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:124.0) Gecko/20100101 Firefox/124.0'
];

export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export class HttpClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      timeout: 15000,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Upgrade-Insecure-Requests': '1',
      }
    });
  }

  public async getHtml(url: string, customConfig?: AxiosRequestConfig): Promise<string> {
    const config: AxiosRequestConfig = {
      ...customConfig,
      headers: {
        'User-Agent': getRandomUserAgent(),
        ...customConfig?.headers,
      }
    };

    try {
      const response = await this.client.get(url, config);
      return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    } catch (error: any) {
      if (error.response) {
        throw new Error(`HTTP ${error.response.status} from ${url}: ${error.response.statusText}`);
      }
      throw new Error(`Network error requesting ${url}: ${error.message}`);
    }
  }

  public cleanPriceString(raw: string): number {
    if (!raw) return 0;
    // Strip currency symbols (₹, $, €, £), commas, whitespace
    const cleaned = raw.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
}

export const defaultHttpClient = new HttpClient();

