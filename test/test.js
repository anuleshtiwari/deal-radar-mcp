import { createServer } from '../dist/server.js';
import { defaultStorage } from '../dist/engine/storage.js';

async function runTests() {
  console.log('🧪 Running Deal Radar MCP verification tests...\n');

  const server = createServer();
  
  // Test 1: Add a test alert directly
  console.log('1. Testing Price Alert & Storage Engine...');
  const testAlert = {
    id: 'test_alert_1',
    productUrl: 'https://www.amazon.in/dp/B0D5BN52P3',
    platform: 'Amazon',
    title: 'Sony WH-1000XM5 Wireless Headphones',
    initialPrice: 28990,
    currentPrice: 26990,
    targetPrice: 25000,
    currency: 'INR',
    lowestSeenPrice: 26990,
    highestSeenPrice: 28990,
    createdAt: new Date().toISOString(),
    lastCheckedAt: new Date().toISOString(),
    triggered: false,
    history: [
      { timestamp: new Date().toISOString(), price: 28990, effectivePrice: 27990, inStock: true },
      { timestamp: new Date().toISOString(), price: 26990, effectivePrice: 25990, inStock: true }
    ]
  };

  defaultStorage.addAlert(testAlert);
  const allAlerts = defaultStorage.getAllAlerts();
  console.log(`   ✅ Saved alert. Total watchlist count: ${allAlerts.length}`);
  if (allAlerts.length === 0) throw new Error('Storage test failed');

  // Test 2: Price drop trigger logic
  console.log('\n2. Testing Price Drop trigger condition...');
  // Drop to 24000 (below target 25000)
  const updated = defaultStorage.updatePriceSnapshot(testAlert.id, 24000, 24000, true);
  if (!updated?.triggered) throw new Error('Alert failed to trigger when price dropped below target');
  console.log(`   ✅ Triggered status: ${updated.triggered} (Current: ₹${updated.currentPrice}, Target: ₹${updated.targetPrice})`);

  // Test 3: Declarative store configuration
  console.log('\n3. Testing Dynamic Store Adapter registration...');
  defaultStorage.addCustomStore({
    id: 'myntra',
    name: 'Myntra Fashion',
    domains: ['myntra.com'],
    searchUrlTemplate: 'https://www.myntra.com/{query}',
    selectors: {
      searchItem: 'li.product-base',
      searchTitle: 'h3.product-brand',
      searchPrice: 'span.product-discountedPrice',
      searchUrl: 'a[href*="/buy"]',
      productTitle: 'h1.pdp-title',
      productPrice: 'span.pdp-price'
    },
    currencyCode: 'INR'
  });

  const customStores = defaultStorage.getCustomStores();
  console.log(`   ✅ Custom stores registered: ${customStores.map(s => s.name).join(', ')}`);

  console.log('\n🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

