import { defaultTrackerEngine } from './engine/tracker.js';
import { defaultStorage } from './engine/storage.js';
import { defaultRegistry } from './adapters/registry.js';
import { defaultPoller } from './engine/cron.js';
import { startWebServer } from './web/server.js';

function printHelp(): void {
  console.log(`
🔍 Deal Radar CLI — Universal E-Commerce Price & Deal Radar
Usage:
  deal-radar search <query> [--limit <n>]    Search deals across Amazon, Flipkart, etc.
  deal-radar track <url>                     Inspect & track a product URL in real time
  deal-radar alert <url> <targetPrice>       Set a price alert trigger on a product
  deal-radar watchlist                       List all tracked products and alerts
  deal-radar history <url>                   Show price fluctuation timeline for product
  deal-radar poll                            Run immediate price-drop poll across watchlist
  deal-radar stores                          List all supported and registered stores
  deal-radar web [--port <port>]             Launch the local Web Dashboard (default: 3333)
  deal-radar help                            Show this help menu
  `);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  switch (command) {
    case 'search': {
      const query = args[1];
      if (!query) {
        console.error('❌ Please provide a search query: deal-radar search "MacBook Air"');
        process.exit(1);
      }
      let limit = 5;
      const limitIdx = args.indexOf('--limit');
      if (limitIdx !== -1 && args[limitIdx + 1]) {
        limit = parseInt(args[limitIdx + 1], 10) || 5;
      }

      console.log(`\n🔎 Searching for "${query}" across stores (limit: ${limit})...\n`);
      const results = await defaultTrackerEngine.searchAcrossStores(query, undefined, { limit });

      if (results.length === 0) {
        console.log('No deals found for query.');
      } else {
        console.log(`Found ${results.length} deal(s):`);
        for (const item of results) {
          const discount = item.discountPercentage ? ` (${item.discountPercentage}% OFF)` : '';
          const orig = item.originalPrice ? ` [MRP: ${item.currency} ${item.originalPrice.toLocaleString()}]` : '';
          console.log(`\n🛒 [${item.platform}] ${item.title}`);
          console.log(`   💰 Price: ${item.currency} ${item.currentPrice.toLocaleString()}${orig}${discount}`);
          console.log(`   🔗 URL:   ${item.url}`);
        }
      }
      break;
    }

    case 'track': {
      const url = args[1];
      if (!url) {
        console.error('❌ Please provide a product URL: deal-radar track <url>');
        process.exit(1);
      }
      console.log(`\n📡 Fetching product details for ${url}...`);
      const result = await defaultTrackerEngine.trackProduct(url);
      const product = result.product;
      console.log(`\n📦 Product:     ${product.title}`);
      console.log(`🏪 Store:       ${product.platform}`);
      console.log(`💵 Price:       ${product.currency} ${product.currentPrice.toLocaleString()}`);
      if (product.originalPrice) {
        console.log(`🏷️  Original:    ${product.currency} ${product.originalPrice.toLocaleString()} (${product.discountPercentage}% OFF)`);
      }
      console.log(`📦 In Stock:    ${product.inStock ? '✅ Yes' : '❌ Out of Stock'}`);
      if (product.offers && product.offers.length > 0) {
        console.log(`🎁 Offers:      ${product.offers.join(' | ')}`);
      }
      console.log(`✅ Recorded in price tracking history.`);
      break;
    }

    case 'alert': {
      const url = args[1];
      const targetPrice = parseFloat(args[2]);
      if (!url || isNaN(targetPrice)) {
        console.error('❌ Usage: deal-radar alert <url> <targetPrice>');
        process.exit(1);
      }
      console.log(`\n🎯 Setting alert for ${url} at target price ${targetPrice}...`);
      const alert = await defaultTrackerEngine.setAlert(url, targetPrice, 'Created via CLI');
      console.log(`✅ Alert set! ID: ${alert.id}`);
      console.log(`   Product:      ${alert.title}`);
      console.log(`   Current Price: ${alert.currency} ${alert.currentPrice.toLocaleString()}`);
      console.log(`   Target Price:  ${alert.currency} ${targetPrice.toLocaleString()}`);
      break;
    }

    case 'watchlist': {
      const watchlist = defaultStorage.getAllAlerts();
      console.log(`\n📋 Active Watchlist (${watchlist.length} items):\n`);
      if (watchlist.length === 0) {
        console.log('No tracked products in watchlist yet. Add one with: deal-radar track <url>');
      } else {
        for (const item of watchlist) {
          const statusIcon = item.triggered ? '🔥 TRIGGERED' : '👀 ACTIVE';
          console.log(`• [${statusIcon}] ${item.title}`);
          console.log(`   Current: ${item.currency} ${item.currentPrice.toLocaleString()} | Target: ${item.currency} ${item.targetPrice.toLocaleString()}`);
          console.log(`   URL: ${item.productUrl}`);
          console.log(`   Alert ID: ${item.id}\n`);
        }
      }
      break;
    }

    case 'history': {
      const url = args[1];
      if (!url) {
        console.error('❌ Please provide a product URL: deal-radar history <url>');
        process.exit(1);
      }
      const alert = defaultStorage.findAlertByUrl(url);
      console.log(`\n📈 Price History for ${url}:\n`);
      if (!alert || alert.history.length === 0) {
        console.log('No history recorded yet for this URL.');
      } else {
        console.log(`Product: ${alert.title}`);
        console.log(`Current Price: ${alert.currency} ${alert.currentPrice.toLocaleString()}`);
        console.log(`\nTimeline:`);
        for (const snap of alert.history) {
          console.log(`  [${new Date(snap.timestamp).toLocaleString()}] ${alert.currency} ${snap.price.toLocaleString()} (Effective: ${alert.currency} ${snap.effectivePrice.toLocaleString()})`);
        }
      }
      break;
    }

    case 'poll': {
      console.log(`\n⚡ Polling all active alerts for price drops...\n`);
      const result = await defaultPoller.pollNow();
      console.log(`✅ Checked ${result.checkedCount} active alert(s).`);
      if (result.priceDrops.length > 0) {
        console.log(`\n🔥 ${result.priceDrops.length} PRICE DROP(S) DETECTED!`);
        for (const drop of result.priceDrops) {
          console.log(`   • ${drop.alert.title}`);
          console.log(`     Old: ${drop.alert.currency} ${drop.previousPrice} -> New: ${drop.alert.currency} ${drop.currentPrice} (-${drop.dropPercentage}%)`);
          console.log(`     Link: ${drop.alert.productUrl}`);
        }
      } else {
        console.log('No new price drops detected below current prices.');
      }
      break;
    }

    case 'stores': {
      const adapters = defaultRegistry.getAllAdapters();
      console.log(`\n🏪 Registered Stores (${adapters.length}):\n`);
      for (const a of adapters) {
        console.log(`• ${a.name} (id: ${a.id})`);
        console.log(`  Domains: ${a.domains.join(', ')}`);
      }
      break;
    }

    case 'web': {
      let port = 3333;
      const portIdx = args.indexOf('--port');
      if (portIdx !== -1 && args[portIdx + 1]) {
        port = parseInt(args[portIdx + 1], 10) || 3333;
      }
      startWebServer(port);
      break;
    }

    default:
      console.error(`Unknown command: "${command}". Run "deal-radar help" for options.`);
      process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
