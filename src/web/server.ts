import http from 'http';
import url from 'url';
import { defaultTrackerEngine } from '../engine/tracker.js';
import { defaultStorage } from '../engine/storage.js';
import { defaultRegistry } from '../adapters/registry.js';
import { defaultPoller } from '../engine/cron.js';

export function startWebServer(port: number = 3333): http.Server {
  const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url || '/', true);
    const pathname = parsedUrl.pathname || '/';

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      // API: Search
      if (pathname === '/api/search' && req.method === 'GET') {
        const query = String(parsedUrl.query.q || '');
        const limit = parseInt(String(parsedUrl.query.limit || '6'), 10);
        if (!query) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Query parameter q is required' }));
          return;
        }
        const results = await defaultTrackerEngine.searchAcrossStores(query, undefined, { limit });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ query, count: results.length, results }));
        return;
      }

      // API: Watchlist
      if (pathname === '/api/watchlist' && req.method === 'GET') {
        const watchlist = defaultStorage.getAllAlerts();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ watchlist }));
        return;
      }

      // API: Stores
      if (pathname === '/api/stores' && req.method === 'GET') {
        const stores = defaultRegistry.getAllAdapters().map(a => ({
          id: a.id,
          name: a.name,
          domains: a.domains
        }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ count: stores.length, stores }));
        return;
      }

      // API: Poller Status
      if (pathname === '/api/poller' && req.method === 'GET') {
        const status = defaultPoller.getStatus();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(status));
        return;
      }

      // API: Trigger Poll Now
      if (pathname === '/api/poller/poll' && req.method === 'POST') {
        const result = await defaultPoller.pollNow();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        return;
      }

      // API: Add Track/Alert
      if (pathname === '/api/alerts' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const data = JSON.parse(body);
            if (!data.url || !data.targetPrice) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'url and targetPrice are required' }));
              return;
            }
            const result = await defaultTrackerEngine.setAlert(data.url, Number(data.targetPrice), data.notes || 'Web Dashboard');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      // API: Delete Alert
      if (pathname === '/api/alerts' && req.method === 'DELETE') {
        const id = String(parsedUrl.query.id || '');
        if (!id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'id query param required' }));
          return;
        }
        const deleted = defaultStorage.removeAlert(id);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: deleted }));
        return;
      }

      // Serve HTML Dashboard
      if (pathname === '/' || pathname === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(getDashboardHtml());
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    } catch (err: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
    }
  });

  server.listen(port, () => {
    console.log(`\n🚀 Deal Radar Web Dashboard is live at: http://localhost:${port}`);
  });

  return server;
}

function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deal Radar — E-Commerce Deal & Price Drop Radar</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    body { font-family: 'Inter', sans-serif; background-color: #0b0f19; color: #f3f4f6; }
    .glass { background: rgba(17, 24, 39, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); }
  </style>
</head>
<body class="min-h-screen">
  <header class="border-b border-gray-800 bg-gray-950/80 sticky top-0 z-50 backdrop-blur-md">
    <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <span class="text-3xl">📡</span>
        <div>
          <h1 class="text-xl font-bold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">Deal Radar</h1>
          <p class="text-xs text-gray-400">Universal Price Drop & Deal Radar MCP</p>
        </div>
      </div>
      <div class="flex items-center space-x-4">
        <button onclick="pollNow()" id="poll-btn" class="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg text-sm font-semibold shadow flex items-center space-x-2 transition">
          <span>⚡ Poll Alerts Now</span>
        </button>
        <a href="https://github.com/anuleshtiwari/deal-radar-mcp" target="_blank" class="text-xs px-3 py-1.5 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 flex items-center space-x-1">
          <span>GitHub</span>
        </a>
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-6 py-8 space-y-8">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="glass p-5 rounded-xl">
        <div class="text-xs text-gray-400 font-medium">Tracked Watchlist</div>
        <div id="stat-tracked" class="text-3xl font-extrabold text-cyan-400 mt-1">0</div>
        <div class="text-xs text-gray-500 mt-1">Products actively monitored</div>
      </div>
      <div class="glass p-5 rounded-xl">
        <div class="text-xs text-gray-400 font-medium">Triggered Deals</div>
        <div id="stat-triggered" class="text-3xl font-extrabold text-emerald-400 mt-1">0</div>
        <div class="text-xs text-gray-500 mt-1">Price drop targets hit</div>
      </div>
      <div class="glass p-5 rounded-xl">
        <div class="text-xs text-gray-400 font-medium">Supported Stores</div>
        <div id="stat-stores" class="text-3xl font-extrabold text-indigo-400 mt-1">7</div>
        <div class="text-xs text-gray-500 mt-1">Amazon, Flipkart, Croma, Myntra...</div>
      </div>
      <div class="glass p-5 rounded-xl">
        <div class="text-xs text-gray-400 font-medium">Poller Status</div>
        <div id="stat-poller" class="text-3xl font-extrabold text-amber-400 mt-1">Active</div>
        <div class="text-xs text-gray-500 mt-1">Ready for periodic checks</div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 glass p-6 rounded-2xl space-y-4">
        <h2 class="text-lg font-bold text-gray-100 flex items-center space-x-2">
          <span>🔎</span> <span>Live Cross-Store Deal Finder</span>
        </h2>
        <div class="flex space-x-2">
          <input id="search-input" type="text" placeholder="Search product (e.g. Sony WH-1000XM5, iPhone 16, MacBook)..."
                 class="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-400 text-white placeholder-gray-500">
          <button onclick="searchDeals()" class="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-sm font-semibold transition text-white">
            Search
          </button>
        </div>
        <div id="search-results" class="space-y-3 pt-2 max-h-[350px] overflow-y-auto pr-1">
          <div class="text-sm text-gray-500 text-center py-6">Enter a keyword to compare prices across stores.</div>
        </div>
      </div>

      <div class="glass p-6 rounded-2xl space-y-4">
        <h2 class="text-lg font-bold text-gray-100 flex items-center space-x-2">
          <span>🎯</span> <span>Track Product / Set Alert</span>
        </h2>
        <div class="space-y-3">
          <div>
            <label class="text-xs text-gray-400 block mb-1">Product URL</label>
            <input id="alert-url" type="url" placeholder="https://amazon.in/... or flipkart.com/..."
                   class="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan-400 text-white">
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-1">Target Price</label>
            <input id="alert-price" type="number" placeholder="e.g. 19999"
                   class="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan-400 text-white">
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-1">Reminder Notes (Optional)</label>
            <input id="alert-notes" type="text" placeholder="e.g. Buy on sale"
                   class="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan-400 text-white">
          </div>
          <button onclick="createAlert()" class="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl text-xs font-semibold transition text-white shadow">
            Save Price Alert
          </button>
        </div>
      </div>
    </div>

    <div class="glass p-6 rounded-2xl space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-bold text-gray-100 flex items-center space-x-2">
          <span>📋</span> <span>Monitored Watchlist</span>
        </h2>
        <button onclick="loadWatchlist()" class="text-xs text-cyan-400 hover:underline">Refresh</button>
      </div>
      <div id="watchlist-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div class="text-sm text-gray-500 py-8 text-center col-span-full">Loading watchlist...</div>
      </div>
    </div>
  </main>

  <script>
    async function loadStats() {
      try {
        const [wRes, sRes, pRes] = await Promise.all([
          fetch('/api/watchlist').then(r => r.json()),
          fetch('/api/stores').then(r => r.json()),
          fetch('/api/poller').then(r => r.json())
        ]);
        const watchlist = wRes.watchlist || [];
        document.getElementById('stat-tracked').innerText = watchlist.length;
        document.getElementById('stat-triggered').innerText = watchlist.filter(w => w.status === 'triggered').length;
        document.getElementById('stat-stores').innerText = sRes.count || 7;
        document.getElementById('stat-poller').innerText = pRes.isRunning ? 'Running' : 'Ready';
      } catch (e) {
        console.error(e);
      }
    }

    async function loadWatchlist() {
      try {
        const res = await fetch('/api/watchlist');
        const data = await res.json();
        const container = document.getElementById('watchlist-container');
        if (!data.watchlist || data.watchlist.length === 0) {
          container.innerHTML = '<div class="text-sm text-gray-500 py-8 text-center col-span-full">No products tracked yet. Add one above!</div>';
          return;
        }
        container.innerHTML = data.watchlist.map(item => \`
          <div class="p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-3 relative flex flex-col justify-between">
            <div>
              <div class="flex justify-between items-start">
                <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full \${item.status === 'triggered' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-cyan-950 text-cyan-400 border border-cyan-800'}">
                  \${item.status === 'triggered' ? '🔥 Target Hit' : '👀 Active'}
                </span>
                <button onclick="deleteAlert('\${item.alertId}')" class="text-gray-500 hover:text-red-400 text-xs">✕</button>
              </div>
              <h3 class="text-sm font-semibold text-gray-200 mt-2 line-clamp-2" title="\${item.title}">\${item.title}</h3>
            </div>
            <div class="pt-2 border-t border-gray-800/80 space-y-1">
              <div class="flex justify-between text-xs">
                <span class="text-gray-400">Current:</span>
                <span class="font-bold text-cyan-400">\${item.currency} \${item.currentPrice?.toLocaleString()}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-gray-400">Target:</span>
                <span class="font-bold text-purple-400">\${item.currency} \${item.targetPrice?.toLocaleString()}</span>
              </div>
              <a href="\${item.url}" target="_blank" class="block text-center text-xs text-cyan-400 hover:underline pt-2 font-medium">View on Store →</a>
            </div>
          </div>
        \`).join('');
      } catch (err) {
        console.error(err);
      }
    }

    async function searchDeals() {
      const q = document.getElementById('search-input').value.trim();
      if (!q) return;
      const resContainer = document.getElementById('search-results');
      resContainer.innerHTML = '<div class="text-sm text-gray-400 text-center py-6">Searching across e-commerce platforms...</div>';
      try {
        const res = await fetch('/api/search?q=' + encodeURIComponent(q));
        const data = await res.json();
        if (!data.results || data.results.length === 0) {
          resContainer.innerHTML = '<div class="text-sm text-gray-500 text-center py-6">No matching deals found.</div>';
          return;
        }
        resContainer.innerHTML = data.results.map(prod => \`
          <div class="p-3.5 bg-gray-900/80 rounded-xl border border-gray-800 flex items-center justify-between hover:border-gray-700 transition">
            <div class="flex-1 min-w-0 pr-4">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-800 text-gray-300 uppercase">\${prod.platform}</span>
              <p class="text-xs font-semibold text-gray-200 truncate mt-1">\${prod.title}</p>
              <div class="flex items-center space-x-2 mt-1">
                <span class="text-sm font-bold text-emerald-400">\${prod.currency} \${prod.currentPrice?.toLocaleString()}</span>
                \${prod.originalPrice ? \`<span class="text-xs text-gray-500 line-through">\${prod.currency} \${prod.originalPrice?.toLocaleString()}</span>\` : ''}
                \${prod.discountPercentage ? \`<span class="text-[10px] font-bold text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded">\${prod.discountPercentage}% OFF</span>\` : ''}
              </div>
            </div>
            <div class="flex space-x-2">
              <button onclick="setFastAlert('\${prod.url}', \${prod.currentPrice})" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium">Track</button>
              <a href="\${prod.url}" target="_blank" class="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs">Store</a>
            </div>
          </div>
        \`).join('');
      } catch (e) {
        resContainer.innerHTML = '<div class="text-sm text-red-400 text-center py-6">Error fetching deals.</div>';
      }
    }

    function setFastAlert(url, currentPrice) {
      document.getElementById('alert-url').value = url;
      document.getElementById('alert-price').value = Math.round(currentPrice * 0.9);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function createAlert() {
      const url = document.getElementById('alert-url').value.trim();
      const targetPrice = document.getElementById('alert-price').value.trim();
      const notes = document.getElementById('alert-notes').value.trim();
      if (!url || !targetPrice) { alert('Please enter URL and Target Price'); return; }
      try {
        const res = await fetch('/api/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, targetPrice, notes })
        });
        const result = await res.json();
        if (result.error) { alert('Error: ' + result.error); return; }
        alert('Alert successfully saved for: ' + (result.product?.title || url));
        document.getElementById('alert-url').value = '';
        document.getElementById('alert-price').value = '';
        document.getElementById('alert-notes').value = '';
        loadWatchlist();
        loadStats();
      } catch (e) {
        alert('Failed to save alert');
      }
    }

    async function deleteAlert(id) {
      if (!confirm('Remove this alert from watchlist?')) return;
      try {
        await fetch('/api/alerts?id=' + id, { method: 'DELETE' });
        loadWatchlist();
        loadStats();
      } catch (e) {
        console.error(e);
      }
    }

    async function pollNow() {
      const btn = document.getElementById('poll-btn');
      btn.innerText = '⏳ Polling...';
      try {
        const res = await fetch('/api/poller/poll', { method: 'POST' });
        const data = await res.json();
        alert(\`Checked \${data.checked} alert(s). \${data.alerts?.length || 0} price drop(s) triggered!\`);
        loadWatchlist();
        loadStats();
      } catch (e) {
        alert('Poll failed.');
      } finally {
        btn.innerText = '⚡ Poll Alerts Now';
      }
    }

    loadStats();
    loadWatchlist();
  </script>
</body>
</html>`;
}
