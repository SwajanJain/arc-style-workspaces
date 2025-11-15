// Debug script to analyze browsing history
// Run this in DevTools console when sidepanel is open
// Usage: copy and paste this entire file into console

async function debugHistory() {
  console.log('🔍 Fetching last 30 days of browsing history...\n');

  const startTime = Date.now() - (30 * 24 * 60 * 60 * 1000);

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
          hostname.includes('127.0.0.1')) {
        return;
      }

      if (!domainData[hostname]) {
        domainData[hostname] = {
          hostname,
          totalVisits: 0,
          urls: {},
          lastVisit: 0
        };
      }

      domainData[hostname].totalVisits++;
      domainData[hostname].lastVisit = Math.max(
        domainData[hostname].lastVisit,
        item.lastVisitTime
      );

      // Track each URL
      const fullUrl = `${url.origin}${url.pathname}`;
      if (!domainData[hostname].urls[fullUrl]) {
        domainData[hostname].urls[fullUrl] = {
          url: fullUrl,
          visits: 0,
          title: item.title || ''
        };
      }
      domainData[hostname].urls[fullUrl].visits++;

    } catch (err) {
      // Skip invalid URLs
    }
  });

  // Convert to array and sort by total visits
  const sites = Object.values(domainData)
    .map(site => ({
      hostname: site.hostname,
      totalVisits: site.totalVisits,
      uniqueUrls: Object.keys(site.urls).length,
      lastVisit: new Date(site.lastVisit).toLocaleString(),
      topUrls: Object.values(site.urls)
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 5) // Top 5 URLs per domain
    }))
    .sort((a, b) => b.totalVisits - a.totalVisits);

  // Print summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TOP 20 SITES BY VISIT COUNT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  sites.slice(0, 20).forEach((site, idx) => {
    console.log(`${idx + 1}. ${site.hostname}`);
    console.log(`   Total visits: ${site.totalVisits} | Unique URLs: ${site.uniqueUrls} | Last: ${site.lastVisit}`);
    console.log(`   Top URLs:`);
    site.topUrls.forEach(urlData => {
      console.log(`      [${urlData.visits}x] ${urlData.url}`);
    });
    console.log('');
  });

  // Export full data as JSON
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('FULL DATA (copy this JSON):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const exportData = sites.slice(0, 30).map(site => ({
    hostname: site.hostname,
    totalVisits: site.totalVisits,
    uniqueUrls: site.uniqueUrls,
    urls: site.topUrls
  }));

  console.log(JSON.stringify(exportData, null, 2));

  return exportData;
}

// Run it
debugHistory();
