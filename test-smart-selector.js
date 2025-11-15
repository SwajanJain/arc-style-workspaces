// Test Smart URL Selector with Real Browsing Data
// Analyzes top 20 sites and shows what URL would be selected

/**
 * Detect if a URL looks like a specific file/item (vs. a dashboard)
 */
function looksLikeSpecificItem(url) {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;

    // Pattern 1: Long alphanumeric IDs (20+ chars)
    const longIdPattern = /[a-zA-Z0-9_-]{20,}/;
    if (longIdPattern.test(path)) {
      return true;
    }

    // Pattern 2: UUID format (8-4-4-4-12)
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    if (uuidPattern.test(path)) {
      return true;
    }

    // Pattern 3: Common file/item path segments
    const itemKeywords = ['/d/', '/file/', '/document/', '/sheet/', '/c/', '/chat/', '/conversation/', '/edit', '/view'];
    if (itemKeywords.some(keyword => path.includes(keyword))) {
      return true;
    }

    // Pattern 4: Very deep paths (4+ segments usually means nested items)
    const pathDepth = path.split('/').filter(Boolean).length;
    if (pathDepth >= 4) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Analyze a domain's URLs and intelligently pick the best one
 */
function selectBestUrl(domainData) {
  const { hostname, totalVisits, urls } = domainData;
  const urlEntries = Object.entries(urls).map(([url, visits]) => ({
    url,
    visits,
    percentage: visits / totalVisits
  }));

  // Sort by visit count
  urlEntries.sort((a, b) => b.visits - a.visits);

  // Calculate fragmentation
  const uniqueUrls = urlEntries.length;
  const fragmentationRatio = uniqueUrls / totalVisits;
  const topUrlPercentage = urlEntries[0].percentage;

  const analysis = {
    totalVisits,
    uniqueUrls,
    fragmentationRatio: (fragmentationRatio * 100).toFixed(1) + '%',
    topUrlPercentage: (topUrlPercentage * 100).toFixed(1) + '%',
    reason: ''
  };

  // Step 1: Check if top URL is a clear winner (>50% of traffic)
  if (topUrlPercentage > 0.5) {
    analysis.reason = '✅ Clear winner (>50% traffic)';
    analysis.selectedUrl = urlEntries[0].url;
    return analysis;
  }

  // Step 2: Highly fragmented? Look for dashboard patterns
  if (fragmentationRatio > 0.6) {
    analysis.reason = '⚠️ Highly fragmented - searching for dashboard...';

    // Look for dashboard keywords
    const dashboardKeywords = [
      '/dashboard', '/home', '/inbox', '/feed', '/files',
      '/recent', '/workspace', '/projects', '/app', '/panel',
      '/admin', '/overview'
    ];

    for (const entry of urlEntries) {
      try {
        const urlObj = new URL(entry.url);
        const path = urlObj.pathname.toLowerCase();

        if (dashboardKeywords.some(keyword => path.includes(keyword))) {
          analysis.reason = `✅ Found dashboard keyword (${entry.visits} visits)`;
          analysis.selectedUrl = entry.url;
          return analysis;
        }
      } catch {}
    }

    // No dashboard keyword? Use the shortest path
    const shortestUrl = urlEntries.reduce((shortest, current) => {
      try {
        const shortestDepth = new URL(shortest.url).pathname.split('/').filter(Boolean).length;
        const currentDepth = new URL(current.url).pathname.split('/').filter(Boolean).length;
        return currentDepth < shortestDepth ? current : shortest;
      } catch {
        return shortest;
      }
    });

    analysis.reason = `✅ Using shortest path (depth: ${new URL(shortestUrl.url).pathname.split('/').filter(Boolean).length})`;
    analysis.selectedUrl = shortestUrl.url;
    return analysis;
  }

  // Step 3: Moderate fragmentation - check if top URL looks like a file/item
  const topUrl = urlEntries[0].url;
  if (looksLikeSpecificItem(topUrl)) {
    analysis.reason = '⚠️ Top URL is specific item - finding alternative...';

    // Try to find a dashboard-like URL
    for (const entry of urlEntries) {
      if (!looksLikeSpecificItem(entry.url)) {
        analysis.reason = `✅ Using dashboard-like URL (${entry.visits} visits)`;
        analysis.selectedUrl = entry.url;
        return analysis;
      }
    }
  }

  // Step 4: Default to most visited URL
  analysis.reason = '✅ Using most visited URL';
  analysis.selectedUrl = topUrl;
  return analysis;
}

/**
 * Should this domain be filtered out as noise?
 */
function isNoiseDomain(hostname, urls) {
  // Filter out login/auth pages
  if (hostname.includes('accounts.') ||
      hostname.includes('login.') ||
      hostname.includes('auth.')) {
    return true;
  }

  // Filter if all URLs are search/login pages
  const urlList = Object.keys(urls);
  const allNoise = urlList.every(url => {
    const path = url.toLowerCase();
    return path.includes('/search') ||
           path.includes('/login') ||
           path.includes('/signin') ||
           path.includes('/oauth');
  });

  return allNoise;
}

/**
 * Main function - analyze real browsing data
 */
async function testSmartSelector() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('SMART URL SELECTOR - TESTING WITH YOUR REAL DATA');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('🔍 Fetching last 14 days of browsing history...\n');

  const startTime = Date.now() - (14 * 24 * 60 * 60 * 1000);

  // Get history
  const history = await chrome.history.search({
    text: '',
    startTime: startTime,
    maxResults: 2000
  });

  console.log(`📊 Found ${history.length} history entries\n`);

  // Group by hostname
  const domainData = {};

  history.forEach(item => {
    try {
      const url = new URL(item.url);
      const hostname = url.hostname;

      // Skip noise
      if (hostname.startsWith('chrome://') ||
          hostname.startsWith('edge://') ||
          hostname.includes('localhost') ||
          hostname.includes('127.0.0.1') ||
          hostname === '') {
        return;
      }

      if (!domainData[hostname]) {
        domainData[hostname] = {
          hostname,
          totalVisits: 0,
          urls: {}
        };
      }

      domainData[hostname].totalVisits++;

      // Track each URL
      const fullUrl = `${url.origin}${url.pathname}`;
      domainData[hostname].urls[fullUrl] = (domainData[hostname].urls[fullUrl] || 0) + 1;

    } catch (err) {
      // Skip invalid URLs
    }
  });

  // Convert to array and sort by total visits
  const sites = Object.values(domainData)
    .sort((a, b) => b.totalVisits - a.totalVisits);

  // Analyze top 20 sites
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('ANALYZING TOP 20 SITES');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const results = [];

  sites.slice(0, 20).forEach((site, idx) => {
    console.log(`${idx + 1}. ${site.hostname}`);
    console.log(`   Visits: ${site.totalVisits} | Unique URLs: ${Object.keys(site.urls).length}`);

    // Check if it's noise
    if (isNoiseDomain(site.hostname, site.urls)) {
      console.log(`   ❌ FILTERED OUT - Noise domain (login/auth/search)\n`);
      return;
    }

    // Run the smart selector
    const result = selectBestUrl(site);

    console.log(`   Fragmentation: ${result.fragmentationRatio} | Top URL: ${result.topUrlPercentage} of traffic`);
    console.log(`   ${result.reason}`);
    console.log(`   📌 SELECTED: ${result.selectedUrl}\n`);

    results.push({
      rank: idx + 1,
      hostname: site.hostname,
      totalVisits: site.totalVisits,
      uniqueUrls: Object.keys(site.urls).length,
      selectedUrl: result.selectedUrl,
      reason: result.reason
    });
  });

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SUMMARY - FINAL SELECTIONS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  results.forEach(r => {
    console.log(`${r.rank}. ${r.hostname}`);
    console.log(`   → ${r.selectedUrl}`);
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return results;
}

// Run it
testSmartSelector();
