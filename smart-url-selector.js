// Smart URL Selection Algorithm
// Works for ANY productivity tool without hardcoding

/**
 * Analyze a domain's URLs and intelligently pick the best one
 * @param {Object} domainData - { hostname, totalVisits, urls: { url: visits } }
 * @returns {string} - Best URL to use for this domain
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

  console.log(`\n🔍 Analyzing: ${hostname}`);
  console.log(`   Total visits: ${totalVisits} | Unique URLs: ${uniqueUrls}`);
  console.log(`   Fragmentation: ${(fragmentationRatio * 100).toFixed(1)}%`);
  console.log(`   Top URL has: ${(topUrlPercentage * 100).toFixed(1)}% of visits`);

  // Step 1: Check if top URL is a clear winner (>50% of traffic)
  if (topUrlPercentage > 0.5) {
    console.log(`   ✅ Clear winner: ${urlEntries[0].url}`);
    return urlEntries[0].url;
  }

  // Step 2: Highly fragmented? Look for dashboard patterns
  if (fragmentationRatio > 0.6) {
    console.log(`   ⚠️ Highly fragmented - looking for dashboard...`);

    // Look for dashboard keywords
    const dashboardKeywords = [
      '/dashboard', '/home', '/inbox', '/feed', '/files',
      '/recent', '/workspace', '/projects', '/app', '/panel',
      '/admin', '/overview'
    ];

    for (const entry of urlEntries) {
      const urlObj = new URL(entry.url);
      const path = urlObj.pathname.toLowerCase();

      if (dashboardKeywords.some(keyword => path.includes(keyword))) {
        console.log(`   ✅ Found dashboard: ${entry.url}`);
        return entry.url;
      }
    }

    // No dashboard keyword? Use the shortest path
    const shortestUrl = urlEntries.reduce((shortest, current) => {
      const shortestDepth = new URL(shortest.url).pathname.split('/').filter(Boolean).length;
      const currentDepth = new URL(current.url).pathname.split('/').filter(Boolean).length;
      return currentDepth < shortestDepth ? current : shortest;
    });

    console.log(`   ✅ Using shortest path: ${shortestUrl.url}`);
    return shortestUrl.url;
  }

  // Step 3: Moderate fragmentation - check if top URL looks like a file/item
  const topUrl = urlEntries[0].url;
  if (looksLikeSpecificItem(topUrl)) {
    console.log(`   ⚠️ Top URL looks like specific item - finding alternative...`);

    // Try to find a dashboard-like URL
    for (const entry of urlEntries) {
      if (!looksLikeSpecificItem(entry.url)) {
        console.log(`   ✅ Using: ${entry.url}`);
        return entry.url;
      }
    }
  }

  // Step 4: Default to most visited URL
  console.log(`   ✅ Using most visited: ${topUrl}`);
  return topUrl;
}

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
 * Test with your actual data
 */
function testWithRealData() {
  const testCases = [
    // Docs.google.com - fragmented across files
    {
      hostname: 'docs.google.com',
      totalVisits: 114,
      urls: {
        'https://docs.google.com/spreadsheets/d/1V09pRAbRRWubZgcCKQTrNGLu4aQIv0hhzAr68YKxxes/edit': 13,
        'https://docs.google.com/spreadsheets/d/1b1LzElDeDuJD9NaxBOiqZHuguGjeODYovleqID6FR-o/edit': 9,
        'https://docs.google.com/spreadsheets/': 2,
        'https://docs.google.com/document/d/abc123/edit': 3
      }
    },
    // news.almaconnect.com - clear winner
    {
      hostname: 'news.almaconnect.com',
      totalVisits: 114,
      urls: {
        'https://news.almaconnect.com/admin/smart_publish': 46,
        'https://news.almaconnect.com/feed': 4,
        'https://news.almaconnect.com/admin/panel': 1
      }
    },
    // Slack - highly fragmented
    {
      hostname: 'app.slack.com',
      totalVisits: 40,
      urls: {
        'https://app.slack.com/client/T082F9EG5/C04C7U64BRS': 1,
        'https://app.slack.com/client/T082F9EG5/later': 1,
        'https://app.slack.com/client/T082F9EG5/activity': 1,
        'https://app.slack.com/client/T082F9EG5': 5
      }
    },
    // Figma - specific files
    {
      hostname: 'www.figma.com',
      totalVisits: 6,
      urls: {
        'https://www.figma.com/design/6nVTXUKu1sNE9aGyIIz246/Almaconnect-News-product-2023': 4,
        'https://www.figma.com/files/team/1236203303047615966/recents-and-sharing': 1,
        'https://www.figma.com/files/recent': 1
      }
    },
    // Gmail - clear winner
    {
      hostname: 'mail.google.com',
      totalVisits: 28,
      urls: {
        'https://mail.google.com/mail/u/0/': 27,
        'https://mail.google.com/mail/u/1/': 1
      }
    }
  ];

  console.log('═══════════════════════════════════════════════');
  console.log('TESTING SMART URL SELECTOR');
  console.log('═══════════════════════════════════════════════');

  testCases.forEach(testCase => {
    const result = selectBestUrl(testCase);
    console.log(`\n➡️  FINAL SELECTION: ${result}\n`);
    console.log('───────────────────────────────────────────────');
  });
}

// Run the test
testWithRealData();
