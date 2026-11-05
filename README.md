# 🎯 Deal Radar MCP Server
> **Universal E-Commerce Price Drop, Deals & Multi-Store Radar for AI Agents**  
> *Powered by the Model Context Protocol (MCP)*

[![MCP](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io/)
[![Node](https://img.shields.io/badge/Node-v20%2B-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-purple.svg)](LICENSE)

**Deal Radar MCP** empowers AI assistants (Claude, Cursor, Antigravity, Gemini, Zed) to monitor e-commerce prices, uncover trending discounts, calculate real effective prices (including bank/coupon offers), track historical lows, and fire alerts when prices drop to your target.

Built with an **extensible, plug-and-play adapter architecture**, Deal Radar works out-of-the-box with **Amazon**, **Flipkart**, **Croma**, **Myntra**, **Reliance Digital**, **Tata CLiQ**, **eBay**, plus a **universal Schema.org/OpenGraph fallback scraper** that extracts product details and prices from virtually any online store.

---

## 🌟 Key Features

- 🔍 **Multi-Store Price Comparison**: Search Amazon, Flipkart, Croma, Myntra, Reliance Digital, and eBay in parallel to find the lowest price in seconds.
- 💳 **Effective Price Intelligence**: Calculates true out-of-pocket costs by factoring in instant bank discounts (HDFC, ICICI, Axis), coupon codes, and delivery charges.
- 📉 **Persistent Watchlist & History**: Automatically snapshots prices over time to pinpoint all-time lows and detect artificial markup before sales.
- 🔔 **Autonomous Price Drop Alerts & Poller**: Background cron engine periodically audits watchlist items and dispatches desktop notifications and MCP alerts.
- 🖥️ **Interactive Web Dashboard**: Beautiful local web UI (`http://localhost:3333`) for visual tracking, price comparisons, and one-click alert management.
- ⌨️ **Command-Line Interface (CLI)**: Full-featured CLI tool (`deal-radar search`, `deal-radar track`, `deal-radar alert`, etc.).
- 🔌 **Dynamic Store Adapters**: Add any new store by dropping a JSON configuration in `stores/` or dynamically registering via MCP.

---

## 🌐 Supported Stores Out of the Box

| Store | ID | Supported Domains | Adapter Type |
|:---|:---|:---|:---|
| **Amazon** | `amazon` | `amazon.in`, `amazon.com`, `amazon.co.uk`, `amazon.de`, `amzn.in` | Native Scraper + Bank Offer Parser |
| **Flipkart** | `flipkart` | `flipkart.com`, `dl.flipkart.com` | Native Scraper + Bank Offer Parser |
| **Croma** | `croma` | `croma.com` | Declarative Selector Adapter |
| **eBay** | `ebay` | `ebay.com` | Declarative Selector Adapter |
| **Myntra** | `myntra` | `myntra.com` | Declarative Selector Adapter |
| **Reliance Digital** | `reliance_digital` | `reliancedigital.in` | Declarative Selector Adapter |
| **Tata CLiQ** | `tata_cliq` | `tatacliq.com` | Declarative Selector Adapter |
| **Universal Fallback** | `generic` | *Any URL on the web* | Schema.org JSON-LD & OpenGraph |

---

## 💻 CLI Usage

```bash
# Search deals across all stores
npm run cli -- search "Sony WH-1000XM5" --limit 5

# Inspect and track a specific product URL
npm run cli -- track "https://www.amazon.in/dp/B09XS7JWHH"

# Set a price drop alert
npm run cli -- alert "https://www.amazon.in/dp/B09XS7JWHH" 24999

# View your monitored watchlist
npm run cli -- watchlist

# Check price fluctuation history
npm run cli -- history "https://www.amazon.in/dp/B09XS7JWHH"

# Manually trigger an immediate price-drop poll
npm run cli -- poll

# Launch the visual Web Dashboard
npm run web
```

---

## 🖥️ Local Web Dashboard

Launch the web dashboard on port `3333`:
```bash
npm run web
```
Open **[http://localhost:3333](http://localhost:3333)** in your browser to:
- Browse live deals across multiple storefronts with instant filters.
- Visually monitor your tracked items and price drop alerts.
- Check price history and trigger one-click checks.

---

## 🛠️ MCP Tools Reference

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
| `start_alert_poller`| Start periodic background polling for price drops | `intervalMinutes` (default: 30) |
| `stop_alert_poller` | Stop background poller | *(none)* |
| `get_poller_status` | Retrieve poller status, interval, and total checks | *(none)* |
| `poll_alerts_now`   | Trigger immediate audit of all watchlist items | *(none)* |
| `add_store_adapter` | Register a new e-commerce store with declarative selectors | `id`, `name`, `domains`, `selectors` |
| `list_supported_stores` | List all built-in and user-configured store adapters | *(none)* |

---

## 🚀 Connecting to MCP Clients

### Claude Desktop
Add to your `claude_desktop_config.json`:
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

### Antigravity / Gemini CLI
Add to `~/.gemini/config/mcp_config.json`:
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

---

## 📄 License
MIT © Antigravity & Shri-Ram
