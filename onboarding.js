// Onboarding System
// Handles first-launch experience and quick import

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
 * Check if URL is a login/auth page that should never be selected
 */
function isLoginOrAuthUrl(url) {
  try {
    const lowerUrl = url.toLowerCase();
    const authPatterns = ['/login', '/signin', '/auth', '/oauth', '/signup', '/register'];
    return authPatterns.some(pattern => lowerUrl.includes(pattern));
  } catch {
    return false;
  }
}

/**
 * Smart URL selector - picks the best URL for a domain
 * Works for any productivity tool without hardcoding
 */
function selectBestUrl(domainData) {
  const { urls, totalVisits } = domainData;

  // Convert to array and sort by visit count
  const urlEntries = Object.entries(urls)
    .map(([url, visits]) => ({
      url,
      visits,
      percentage: visits / totalVisits
    }))
    .sort((a, b) => b.visits - a.visits);

  // Filter out login/auth URLs
  const nonAuthUrls = urlEntries.filter(entry => !isLoginOrAuthUrl(entry.url));

  // If all URLs were auth URLs, fallback to first entry
  const validUrls = nonAuthUrls.length > 0 ? nonAuthUrls : urlEntries;

  // Calculate fragmentation
  const uniqueUrls = validUrls.length;
  const fragmentationRatio = uniqueUrls / totalVisits;
  const topUrlPercentage = validUrls[0].percentage;

  // Step 1: Clear winner (>50% of traffic)
  if (topUrlPercentage > 0.5) {
    return validUrls[0].url;
  }

  // Step 2: Highly fragmented? Look for dashboard patterns
  if (fragmentationRatio > 0.6) {
    // Look for dashboard keywords
    const dashboardKeywords = [
      '/dashboard', '/home', '/inbox', '/feed', '/files',
      '/recent', '/workspace', '/projects', '/app', '/panel',
      '/admin', '/overview'
    ];

    for (const entry of validUrls) {
      try {
        const urlObj = new URL(entry.url);
        const path = urlObj.pathname.toLowerCase();

        if (dashboardKeywords.some(keyword => path.includes(keyword))) {
          return entry.url;
        }
      } catch {}
    }

    // No dashboard keyword? Use the shortest path
    const shortestUrl = validUrls.reduce((shortest, current) => {
      try {
        const shortestDepth = new URL(shortest.url).pathname.split('/').filter(Boolean).length;
        const currentDepth = new URL(current.url).pathname.split('/').filter(Boolean).length;
        return currentDepth < shortestDepth ? current : shortest;
      } catch {
        return shortest;
      }
    });

    return shortestUrl.url;
  }

  // Step 3: Check if top URL looks like a file/item
  const topUrl = validUrls[0].url;
  if (looksLikeSpecificItem(topUrl)) {
    // Try to find a dashboard-like URL
    for (const entry of validUrls) {
      if (!looksLikeSpecificItem(entry.url)) {
        return entry.url;
      }
    }
  }

  // Step 4: Default to most visited URL
  return topUrl;
}

/**
 * Check if domain should be filtered out as noise
 */
function isNoiseDomain(hostname) {
  // Filter out login/auth pages
  if (hostname.includes('accounts.') ||
      hostname.includes('login.') ||
      hostname.includes('auth.')) {
    return true;
  }

  return false;
}

/**
 * Analyze browsing history and return top sites
 * @param {number} days - Number of days to analyze
 * @returns {Promise<Array>} - Top sites sorted by visit count
 */
async function analyzeHistory(days = 14) {
  const startTime = Date.now() - (days * 24 * 60 * 60 * 1000);

  // Get history
  const history = await chrome.history.search({
    text: '',
    startTime: startTime,
    maxResults: 2000
  });

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
          hostname === '' ||
          isNoiseDomain(hostname)) {
        return;
      }

      if (!domainData[hostname]) {
        domainData[hostname] = {
          hostname,
          totalVisits: 0,
          lastVisit: 0,
          urls: {}
        };
      }

      domainData[hostname].totalVisits++;
      domainData[hostname].lastVisit = Math.max(
        domainData[hostname].lastVisit,
        item.lastVisitTime
      );

      // Track individual URLs (not normalized)
      const fullUrl = `${url.origin}${url.pathname}`;
      domainData[hostname].urls[fullUrl] = (domainData[hostname].urls[fullUrl] || 0) + 1;
    } catch (err) {
      // Skip invalid URLs
    }
  });

  // Use smart selector to pick best URL for each domain
  const sites = Object.values(domainData).map(site => {
    const bestUrl = selectBestUrl(site);

    return {
      hostname: site.hostname,
      bestUrl: bestUrl,
      visits: site.totalVisits,
      lastVisit: site.lastVisit
    };
  });

  // Sort by visit count
  sites.sort((a, b) => b.visits - a.visits);

  return sites;
}

/**
 * Clean hostname for display title
 * gmail.com → Gmail
 * acme-corp.slack.com → Slack
 */
function cleanTitle(hostname) {
  // Remove common prefixes
  let clean = hostname.replace(/^www\./, '');

  // Extract main name (before first dot or hyphen in subdomain)
  const parts = clean.split('.');

  // For subdomains like acme-corp.slack.com, use the main domain
  if (parts.length > 2) {
    // Get the domain before TLD (slack from acme-corp.slack.com)
    clean = parts[parts.length - 2];
  } else {
    // Simple domain like github.com
    clean = parts[0];
  }

  // Capitalize first letter
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Quick import: Analyze history and auto-populate favorites + workspaces
 */
async function quickImport() {
  try {
    // 1. Analyze last 14 days
    const topSites = await analyzeHistory(14);

    // 2. Filter minimum visits
    const qualified = topSites.filter(site => site.visits >= 3);

    // 3. Import top 20 as favorites
    const toImport = qualified.slice(0, 20);

    for (const site of toImport) {
      await Storage.addFavorite({
        url: site.bestUrl,
        title: cleanTitle(site.hostname)
      });
    }

    // 4. Create default workspaces (empty - user organizes later)
    await Storage.addWorkspace('Work', '💼');
    await Storage.addWorkspace('Personal', '🏠');

    return {
      success: true,
      imported: toImport.length,
      sites: toImport
    };

  } catch (error) {
    console.error('[Onboarding] Quick import failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check if this is first launch (no favorites, no workspaces)
 */
function isFirstLaunch(state) {
  return state.favorites.length === 0 &&
         Object.keys(state.workspaces).length === 0;
}

/**
 * Show onboarding welcome modal
 */
function showOnboardingModal(onComplete) {
  showModal('Welcome to Arc-Style Workspaces', `
    <div class="onboarding-welcome">
      <div class="onboarding-icon">🎯</div>
      <h2 class="onboarding-title">Smart Tab Switching for Chrome</h2>
      <p class="onboarding-description">
        Experience Arc's magic: click a favorite, and we'll find your existing tab
        instead of opening a new one.
      </p>

      <div class="onboarding-cta">
        <button class="btn btn-primary btn-large" id="quick-import-btn">
          <span>🚀 Quick Setup (2 seconds)</span>
          <span class="btn-subtitle">Import your most-visited sites</span>
        </button>

        <button class="btn btn-secondary" id="skip-onboarding-btn">
          Start Empty
        </button>
      </div>
    </div>
  `);

  // Quick import handler
  document.getElementById('quick-import-btn').addEventListener('click', async () => {
    // Show loading state
    const btn = document.getElementById('quick-import-btn');
    btn.disabled = true;
    btn.innerHTML = '<span>⚡ Setting up...</span>';

    // Run import
    const result = await quickImport();

    if (result.success) {
      hideModal();
      showSuccessModal(result.sites);
      if (onComplete) onComplete();
    } else {
      alert('Import failed. Please try again or start empty.');
      btn.disabled = false;
      btn.innerHTML = '<span>🚀 Quick Setup (2 seconds)</span><span class="btn-subtitle">Import your most-visited sites</span>';
    }
  });

  // Skip handler
  document.getElementById('skip-onboarding-btn').addEventListener('click', async () => {
    // Just create empty workspaces
    await Storage.addWorkspace('Work', '💼');
    await Storage.addWorkspace('Personal', '🏠');

    hideModal();
    if (onComplete) onComplete();
  });
}

/**
 * Show success modal after import
 */
function showSuccessModal(importedSites) {
  const sitesList = importedSites.map(s => cleanTitle(s.hostname)).join(', ');

  showModal('You\'re All Set!', `
    <div class="onboarding-success">
      <div class="onboarding-icon">✅</div>
      <h2 class="onboarding-title">Ready to go!</h2>

      <div class="onboarding-summary">
        <p><strong>Added ${importedSites.length} favorites:</strong></p>
        <p class="sites-list">${sitesList}</p>

        <p style="margin-top: 16px;"><strong>Created 2 workspaces:</strong></p>
        <p>💼 Work • 🏠 Personal</p>
      </div>

      <div class="onboarding-tip">
        <div class="tip-icon">💡</div>
        <div class="tip-content">
          <strong>Try it now!</strong><br>
          Click any favorite above - it'll find your existing tab instead of opening a new one.
        </div>
      </div>

      <button class="btn btn-primary btn-large" id="start-using-btn">
        Start Using →
      </button>
    </div>
  `);

  document.getElementById('start-using-btn').addEventListener('click', () => {
    hideModal();
  });
}
