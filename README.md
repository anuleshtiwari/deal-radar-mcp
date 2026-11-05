# 🎯 Deal Radar MCP Server
> **Universal E-Commerce Price Drop, Deals & Multi-Store Radar for AI Agents**  
> *Powered by the Model Context Protocol (MCP)*

[![MCP](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io/)
[![Node](https://img.shields.io/badge/Node-v20%2B-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-purple.svg)](LICENSE)

**Deal Radar MCP** empowers AI assistants (Claude, Cursor, Antigravity, Gemini, Zed) to monitor e-commerce prices, uncover trending discounts, calculate real effective prices (including bank/coupon offers), track historical lows, and fire alerts when prices drop to your target.

Built with an **extensible, plug-and-play adapter architecture**, Deal Radar works out-of-the-box with **Amazon** and **Flipkart**, while allowing users and agents to add support for *any e-commerce website on the internet* via simple declarative JSON configs.

---

## 🌟 Key Features

- 🔍 **Multi-Store Price Comparison**: Search Amazon, Flipkart, and custom stores in parallel to find the lowest price in seconds.
- 💳 **Effective Price Intelligence**: Calculates true out-of-pocket costs by factoring in instant bank discounts (HDFC, ICICI, Axis), coupon codes, and delivery charges.
- 📉 **Persistent Watchlist & History**: Automatically snapshots prices over time to pinpoint all-time lows and detect artificial markup before sales.
- 🔔 **Autonomous Price Drop Alerts**: Set target price thresholds; the server flags drops and alerts your agent whenever an item hits your desired price.
- 🔌 **Dynamic Store Adapters**: Add any new retail store (Croma, Myntra, Reliance Digital, Walmart, eBay) on the fly without writing code—just define CSS selectors.

---

## 🛠️ MCP Tools

| Tool | Description | Key Arguments |
|:---|:---|:---|
| `search_deals` | Search for products and active deals across multiple storefronts | `query`, `stores` (optional), `limit` |
| `track_product` | Scrape real-time details, price, discount %, and bank offers from a URL | `url` |
| `set_price_alert` | Set a target price notification for a product URL | `url`, `targetPrice`, `notes` |
| `check_watchlist` | Poll all active watchlist items, compute price changes, and trigger alerts | *(none)* |
| `get_price_history` | Retrieve price fluctuation timeline, lowest, and highest recorded prices | `url` |
| `compare_prices` | Compare a product query across all stores side-by-side with savings | `query` |
| `list_watchlist` | List all currently monitored products and alert statuses | *(none)* |
| `delete_price_alert`| Remove a product from the alert watchlist | `id` |
| `add_store_adapter` | Register a new e-commerce store with declarative selectors | `id`, `name`, `domains`, `selectors` |
| `list_supported_stores` | List all built-in and user-configured store adapters | *(none)* |

---

## 📦 MCP Resources & Prompts

### Resources
- `deals://watchlist` — Real-time JSON inventory of all monitored products and alert states.
- `deals://stores` — Directory of all active store adapters and supported domains.

### Pre-Built Prompts
- **`smart-deal-hunter`**: Analyzes a product query across all storefronts, checks bank promotions, and recommends where and when to buy.
- **`price-drop-audit`**: Audits your active watchlist and summarizes any products that recently met or exceeded target discounts.

---

## 🚀 Quickstart & Installation

### 1. Build from Source
```bash
git clone https://github.com/your-username/deal-radar-mcp.git
cd deal-radar-mcp
npm install
npm run build
```

### 2. Connect to Your AI Client

#### Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "deal-radar": {
      "command": "node",
      "args": ["/home/shri-ram/deal-radar-mcp/dist/index.js"]
    }
  }
}
```

#### Antigravity / Gemini CLI (`~/.gemini/config/mcp_config.json`)
```json
{
  "mcpServers": {
    "deal-radar": {
      "command": "node",
      "args": ["/home/shri-ram/deal-radar-mcp/dist/index.js"]
    }
  }
}
```

#### Cursor (`Settings` ➔ `Features` ➔ `MCP Servers`)
- **Name**: `deal-radar`
- **Type**: `command`
- **Command**: `node /home/shri-ram/deal-radar-mcp/dist/index.js`

---

## 🔌 Adding Any New E-Commerce Website

You or your AI agent can add a new store dynamically by invoking `add_store_adapter` or saving a JSON file in `stores/`:

```json
{
  "id": "croma",
  "name": "Croma Electronics",
  "domains": ["croma.com", "www.croma.com"],
  "searchUrlTemplate": "https://www.croma.com/searchB?q={query}%3Arelevance&text={query}",
  "selectors": {
    "searchItem": "li.product-item",
    "searchTitle": "h3.product-title a",
    "searchPrice": "span.amount",
    "searchOriginalPrice": "span.amount.old-price",
    "searchUrl": "h3.product-title a",
    "productTitle": "h1.pd-title",
    "productPrice": "span.pdp-cp",
    "productOriginalPrice": "span.pdp-mrp"
  },
  "currencyCode": "INR"
}
```

---

## 📂 Architecture

```
deal-radar-mcp/
├── src/
│   ├── index.ts               # Stdio MCP entry point
│   ├── server.ts              # Tool, Resource, and Prompt definitions
│   ├── engine/
│   │   ├── tracker.ts         # Deal comparison, watchlist & price drop detection
│   │   ├── storage.ts         # Persistent JSON/SQLite snapshot storage
│   │   └── httpClient.ts      # HTTP client with rotating UA & headers
│   ├── adapters/
│   │   ├── base.ts            # Abstract StoreAdapter interface
│   │   ├── registry.ts        # Dynamic adapter loader & store manager
│   │   ├── amazon.ts          # Amazon (India & Global) parser & bank offer scraper
│   │   ├── flipkart.ts        # Flipkart parser & instant discount extractor
│   │   └── declarative.ts     # Universal CSS selector adapter for community sites
│   └── types/
│       └── index.ts           # TypeScript interfaces & MCP schemas
├── stores/                    # Declarative community store definitions
│   └── croma.json
└── test/
    └── test.js                # Integration test suite
```

---

## 📄 License
MIT © Antigravity & Shri-Ram

