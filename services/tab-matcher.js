// URL Matching and Canonicalization for Smart Tab Switching

export const MATCH_MODE = {
  EXACT: 'exact',        // Full URL match
  PREFIX: 'prefix',      // URL prefix (best for SPAs)
  DOMAIN: 'domain',      // Domain-only match
  PATTERN: 'pattern'     // Custom regex/wildcard
};

/**
 * URL canonicalization - normalize for matching
 * Strips tracking params, normalizes host, and standardizes format
 */
export function canonicalizeUrl(url, options = {}) {
  const {
    stripTracking = true,
    stripHash = false,
    stripQuery = false,
  } = options;

  try {
    const u = new URL(url);

    // Lowercase host
    u.hostname = u.hostname.toLowerCase();

    // Strip tracking params
    if (stripTracking) {
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid',
        '_ga', '_gl', 'ref', 'source'
      ];

      trackingParams.forEach(param => {
        u.searchParams.delete(param);
      });
    }

    // Strip query entirely (optional)
    if (stripQuery) {
      u.search = '';
    }

    // Strip hash (optional)
    if (stripHash) {
      u.hash = '';
    }

    // Remove trailing slash from path
    const path = u.pathname.replace(/\/$/, '') || '/';

    return `${u.protocol}//${u.host}${path}${u.search}${u.hash}`;
  } catch {
    return url;
  }
}

/**
 * Match tab URL against favorite using configured match mode
 */
export function matchesUrl(tabUrl, favoriteUrl, matchMode = MATCH_MODE.PREFIX, pattern = null) {
  if (!tabUrl || !favoriteUrl) return false;

  // Canonicalize both URLs
  const canonicalTab = canonicalizeUrl(tabUrl);
  const canonicalFav = canonicalizeUrl(favoriteUrl);

  switch (matchMode) {
    case MATCH_MODE.EXACT:
      // Full URL match (including path and query)
      return canonicalTab === canonicalFav;

    case MATCH_MODE.PREFIX:
      // URL prefix match (best for SPAs)
      return canonicalTab.startsWith(canonicalFav);

    case MATCH_MODE.DOMAIN:
      // Domain-only match
      try {
        const tabDomain = new URL(tabUrl).hostname.toLowerCase();
        const favDomain = new URL(favoriteUrl).hostname.toLowerCase();
        return tabDomain === favDomain;
      } catch {
        return false;
      }

    case MATCH_MODE.PATTERN:
      // Custom regex/wildcard pattern
      if (!pattern) return false;
      try {
        const regex = new RegExp(pattern);
        return regex.test(canonicalTab);
      } catch {
        return false;
      }

    default:
      return false;
  }
}

/**
 * Rank matching tabs by priority
 * Priority:
 * 1. Exact URL over broader matches
 * 2. Current window over other windows
 * 3. Most recently active tab
 */
export function rankMatches(tabs, currentWindowId, favoriteUrl, matchMode) {
  return tabs
    .map(tab => ({
      tab,
      score: calculateMatchScore(tab, currentWindowId, favoriteUrl, matchMode)
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ tab }) => tab);
}

function calculateMatchScore(tab, currentWindowId, favoriteUrl, matchMode) {
  let score = 0;

  // Priority 1: Match mode quality (exact > prefix > domain)
  if (matchMode === MATCH_MODE.EXACT) {
    score += 1000;
  } else if (matchMode === MATCH_MODE.PREFIX) {
    score += 500;
  } else if (matchMode === MATCH_MODE.DOMAIN) {
    score += 100;
  }

  // Priority 2: Current window (bonus)
  if (tab.windowId === currentWindowId) {
    score += 100;
  }

  // Priority 3: Most recently active
  if (tab.lastAccessed) {
    // Normalize timestamp to prevent overflow
    score += tab.lastAccessed / 1000000;
  }

  return score;
}
