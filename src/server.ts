import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { defaultTrackerEngine } from './engine/tracker.js';
import { defaultStorage } from './engine/storage.js';
import { defaultRegistry } from './adapters/registry.js';
import { DeclarativeStoreConfig } from './types/index.js';

export function createServer(): Server {
  const server = new Server(
    {
      name: 'deal-radar-mcp',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  // =========================================================================
  // MCP TOOLS
  // =========================================================================

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'search_deals',
          description: 'Search for products, discounts, and trending deals across e-commerce platforms (Amazon, Flipkart, etc.).',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Product name or search keyword (e.g. "Sony WH-1000XM5", "MacBook Air M2")'
              },
              stores: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional list of store IDs to search in (e.g. ["amazon", "flipkart"]). Defaults to all.'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results per store (default: 5)'
              }
            },
            required: ['query']
          }
        },
        {
          name: 'track_product',
          description: 'Scrape real-time details from an e-commerce product URL: price, discount %, bank offers, availability, and record in price history.',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'Direct URL to the product page on Amazon, Flipkart, or any supported store.'
              }
            },
            required: ['url']
          }
        },
        {
          name: 'set_price_alert',
          description: 'Set a target price alert on an e-commerce product. Notifies the agent when the price drops to or below target price.',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'Direct URL to the product page.'
              },
              targetPrice: {
                type: 'number',
                description: 'The target price you want to be alerted at.'
              },
              notes: {
                type: 'string',
                description: 'Optional reminder or context (e.g. "Birthday gift for brother")'
              }
            },
            required: ['url', 'targetPrice']
          }
        },
        {
          name: 'check_watchlist',
          description: 'Poll all active watchlist items for price drops and trigger notifications if any product reached its target price.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'get_price_history',
          description: 'View the recorded price history and price fluctuation timeline for a tracked product URL.',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'Product URL'
              }
            },
            required: ['url']
          }
        },
        {
          name: 'compare_prices',
          description: 'Compare a product query across all supported platforms to find the lowest effective price and potential savings.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Product name or model to compare (e.g., "Apple iPad 10th Gen 64GB")'
              }
            },
            required: ['query']
          }
        },
        {
          name: 'list_watchlist',
          description: 'List all currently tracked products, their initial, current, and target prices, and alert statuses.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'delete_price_alert',
          description: 'Remove a product from the price alert watchlist.',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'The alert ID to remove (from list_watchlist)'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'add_store_adapter',
          description: 'Dynamically register a new e-commerce website with declarative CSS selectors so the agent can track prices on it.',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique slug ID for the store (e.g., "croma")' },
              name: { type: 'string', description: 'Display name (e.g., "Croma")' },
              domains: {
                type: 'array',
                items: { type: 'string' },
                description: 'Domains handled by this store (e.g., ["croma.com"])'
              },
              searchUrlTemplate: {
                type: 'string',
                description: 'Search URL with {query} placeholder (e.g., "https://www.croma.com/searchB?q={query}")'
              },
              selectors: {
                type: 'object',
                description: 'CSS selector map for extracting data',
                properties: {
                  searchItem: { type: 'string' },
                  searchTitle: { type: 'string' },
                  searchPrice: { type: 'string' },
                  searchUrl: { type: 'string' },
                  searchOriginalPrice: { type: 'string' },
                  searchRating: { type: 'string' },
                  productTitle: { type: 'string' },
                  productPrice: { type: 'string' },
                  productOriginalPrice: { type: 'string' }
                },
                required: ['searchItem', 'searchTitle', 'searchPrice', 'searchUrl', 'productTitle', 'productPrice']
              },
              currencyCode: { type: 'string', description: 'Currency code like "INR", "USD"' }
            },
            required: ['id', 'name', 'domains', 'searchUrlTemplate', 'selectors']
          }
        },
        {
          name: 'list_supported_stores',
          description: 'List all currently supported built-in and user-added e-commerce stores.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        }
      ]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'search_deals': {
          const query = String(args?.query || '');
          const stores = Array.isArray(args?.stores) ? args?.stores.map(String) : undefined;
          const limit = typeof args?.limit === 'number' ? args.limit : 5;
          const results = await defaultTrackerEngine.searchAcrossStores(query, stores, { limit });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ count: results.length, products: results }, null, 2)
              }
            ]
          };
        }

        case 'track_product': {
          const url = String(args?.url || '');
          const data = await defaultTrackerEngine.trackProduct(url);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(data, null, 2)
              }
            ]
          };
        }

        case 'set_price_alert': {
          const url = String(args?.url || '');
          const targetPrice = Number(args?.targetPrice);
          const notes = args?.notes ? String(args.notes) : undefined;

          const alert = await defaultTrackerEngine.setAlert(url, targetPrice, notes);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  message: `Price alert activated for ${alert.title}`,
                  alert
                }, null, 2)
              }
            ]
          };
        }

        case 'check_watchlist': {
          const audit = await defaultTrackerEngine.checkWatchlist();

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  summary: `Checked ${audit.checkedCount} items. Found ${audit.priceDrops.length} price drops and ${audit.triggeredAlerts.length} triggered alerts.`,
                  audit
                }, null, 2)
              }
            ]
          };
        }

        case 'get_price_history': {
          const url = String(args?.url || '');
          const alert = defaultStorage.findAlertByUrl(url);

          if (!alert) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    error: 'Product is not in watchlist. Use set_price_alert or track_product first.'
                  }, null, 2)
                }
              ]
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  title: alert.title,
                  platform: alert.platform,
                  initialPrice: alert.initialPrice,
                  currentPrice: alert.currentPrice,
                  lowestSeenPrice: alert.lowestSeenPrice,
                  highestSeenPrice: alert.highestSeenPrice,
                  historyCount: alert.history.length,
                  history: alert.history
                }, null, 2)
              }
            ]
          };
        }

        case 'compare_prices': {
          const query = String(args?.query || '');
          const comparison = await defaultTrackerEngine.compareAcrossPlatforms(query);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(comparison, null, 2)
              }
            ]
          };
        }

        case 'list_watchlist': {
          const alerts = defaultStorage.getAllAlerts();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  totalAlerts: alerts.length,
                  activeAlerts: alerts.filter(a => !a.triggered).length,
                  triggeredAlerts: alerts.filter(a => a.triggered).length,
                  watchlist: alerts
                }, null, 2)
              }
            ]
          };
        }

        case 'delete_price_alert': {
          const id = String(args?.id || '');
          const success = defaultStorage.removeAlert(id);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success, message: success ? `Alert ${id} removed` : `Alert ${id} not found` })
              }
            ]
          };
        }

        case 'add_store_adapter': {
          const config = args as unknown as DeclarativeStoreConfig;
          defaultRegistry.registerStore(config);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  message: `Custom store adapter "${config.name}" registered successfully. Domains: ${config.domains.join(', ')}`
                }, null, 2)
              }
            ]
          };
        }

        case 'list_supported_stores': {
          const stores = defaultRegistry.getAllAdapters().map(a => ({
            id: a.id,
            name: a.name,
            domains: a.domains
          }));
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ count: stores.length, stores }, null, 2)
              }
            ]
          };
        }

        default:
          throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
      }
    } catch (error: any) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error executing ${name}: ${error.message || String(error)}`
          }
        ]
      };
    }
  });

  // =========================================================================
  // MCP RESOURCES
  // =========================================================================

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: 'deals://watchlist',
          name: 'Price Alert Watchlist',
          mimeType: 'application/json',
          description: 'Live inventory of all monitored products and their price alert states.'
        },
        {
          uri: 'deals://stores',
          name: 'Supported Stores Directory',
          mimeType: 'application/json',
          description: 'List of all built-in and user-configured e-commerce adapters.'
        }
      ]
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    if (uri === 'deals://watchlist') {
      const alerts = defaultStorage.getAllAlerts();
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(alerts, null, 2)
          }
        ]
      };
    }

    if (uri === 'deals://stores') {
      const stores = defaultRegistry.getAllAdapters().map(a => ({
        id: a.id,
        name: a.name,
        domains: a.domains
      }));
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(stores, null, 2)
          }
        ]
      };
    }

    throw new McpError(ErrorCode.InvalidRequest, `Unknown resource URI: ${uri}`);
  });

  // =========================================================================
  // MCP PROMPTS
  // =========================================================================

  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [
        {
          name: 'smart-deal-hunter',
          description: 'Search for a product across all stores, calculate effective prices, and recommend the best purchase deal.',
          arguments: [
            {
              name: 'product_query',
              description: 'The name or model of the item (e.g. "iPhone 15 128GB Black")',
              required: true
            }
          ]
        },
        {
          name: 'price-drop-audit',
          description: 'Audit your current price-drop watchlist and summarize any deals that crossed target thresholds.'
        }
      ]
    };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'smart-deal-hunter') {
      const query = args?.product_query || '';
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please use the "compare_prices" and "search_deals" tools to find the lowest effective price for "${query}" across Amazon, Flipkart, and other supported stores. Analyze active bank discounts, delivery terms, and advise me on where and when to buy.`
            }
          }
        ]
      };
    }

    if (name === 'price-drop-audit') {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please run "check_watchlist" to audit my tracked products. Highlight any items whose current price dropped or met their target price.`
            }
          }
        ]
      };
    }

    throw new McpError(ErrorCode.InvalidRequest, `Unknown prompt: ${name}`);
  });

  return server;
}

