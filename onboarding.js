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
 * Extract bookmark folders and their bookmarks
 * @param {boolean} filterByRecency - If true, only include folders with bookmarks visited in last 30 days
 */
async function extractBookmarkFolders(filterByRecency = false) {
  console.log('[extractBookmarkFolders] Starting extraction, filterByRecency:', filterByRecency);

  const bookmarkTree = await chrome.bookmarks.getTree();
  console.log('[extractBookmarkFolders] Bookmark tree:', bookmarkTree);

  const folders = [];
  const systemFolders = ['mobile bookmarks', 'other bookmarks', 'reading list'];

  // Get recent history if filtering by recency
  let recentUrls = new Set();
  if (filterByRecency) {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const history = await chrome.history.search({
      text: '',
      startTime: thirtyDaysAgo,
      maxResults: 10000
    });
    recentUrls = new Set(history.map(item => item.url));
    console.log('[extractBookmarkFolders] Recent URLs (30 days):', recentUrls.size);
  }

  function traverseBookmarks(nodes, depth = 0) {
    console.log(`[traverseBookmarks] Depth ${depth}, processing ${nodes.length} nodes`);
    for (const node of nodes) {
      console.log(`[traverseBookmarks] Node at depth ${depth}:`, node.title || '(root/no title)', 'has children:', !!node.children);

      if (node.children) {
        // Handle folders with titles
        if (node.title) {
          console.log(`[traverseBookmarks] Depth ${depth}: "${node.title}", has ${node.children.length} children`);

          // Import all folders at depth 2+ (these are user folders)
          // System folders only exist at depth 1, so we don't need to check for them at deeper levels
          if (depth >= 2) {
            const bookmarks = [];
            collectBookmarks(node, bookmarks);
            console.log(`[traverseBookmarks] Found user folder "${node.title}" with ${bookmarks.length} bookmarks`);

            if (bookmarks.length > 0) {
              // If filtering by recency, check if at least one bookmark was visited recently
              if (filterByRecency) {
                const hasRecentVisit = bookmarks.some(bm => recentUrls.has(bm.url));
                console.log(`[traverseBookmarks] Folder "${node.title}" has recent visit: ${hasRecentVisit}`);
                if (!hasRecentVisit) {
                  continue; // Skip this folder, but continue processing other nodes
                }
              }

              console.log(`[traverseBookmarks] ✅ Adding folder "${node.title}" with ${bookmarks.length} bookmarks`);
              folders.push({
                name: node.title,
                bookmarks: bookmarks
              });
            }
          }
        }

        // Always recurse into children (even for root nodes without titles)
        traverseBookmarks(node.children, depth + 1);
      }
    }
  }

  function collectBookmarks(node, bookmarks) {
    if (node.children) {
      for (const child of node.children) {
        if (child.url) {
          bookmarks.push({
            title: child.title,
            url: child.url
          });
        } else if (child.children) {
          collectBookmarks(child, bookmarks);
        }
      }
    }
  }

  traverseBookmarks(bookmarkTree);
  console.log(`[extractBookmarkFolders] Extraction complete. Found ${folders.length} folders total.`);
  folders.forEach(f => console.log(`  - ${f.name}: ${f.bookmarks.length} bookmarks`));
  return folders;
}

/**
 * Quick import: Analyze history and auto-populate favorites + workspaces
 */
async function quickImport() {
  try {
    const summary = {
      favorites: 0,
      workspaces: []
    };

    // 1. Import favorites from history (top 20, last 14 days)
    const topSites = await analyzeHistory(14);
    const qualified = topSites.filter(site => site.visits >= 3);
    const favoritesToImport = qualified.slice(0, 20);

    for (const site of favoritesToImport) {
      await Storage.addFavorite({
        url: site.bestUrl,
        title: cleanTitle(site.hostname)
      });
    }

    summary.favorites = favoritesToImport.length;

    // Track favorite URLs to avoid duplicates (exact URL matching)
    const favoriteUrls = new Set(
      favoritesToImport.map(s => s.bestUrl)
    );

    // 2. Get bookmark folders (only those used in last 30 days during onboarding)
    const bookmarkFolders = await extractBookmarkFolders(true);

    // 3. Track if we found Work/Personal folders
    let hasWorkFolder = false;
    let hasPersonalFolder = false;
    const workspaceUrls = new Set();

    // 4. Create workspaces from bookmark folders
    for (const folder of bookmarkFolders) {
      const lowerName = folder.name.toLowerCase();

      // Check if this is Work or Personal related (word boundary matching)
      if (/\bwork\b/.test(lowerName)) {
        hasWorkFolder = true;
      }
      if (/\b(personal|home)\b/.test(lowerName)) {
        hasPersonalFolder = true;
      }

      // Create workspace
      const emoji = guessEmojiForFolder(folder.name);
      const workspace = await Storage.addWorkspace(folder.name, emoji);

      let addedCount = 0;

      // Add bookmarks (exclude if exact URL already in favorites)
      for (const bookmark of folder.bookmarks) {
        try {
          if (!favoriteUrls.has(bookmark.url)) {
            const hostname = new URL(bookmark.url).hostname;
            await Storage.addWorkspaceItem(workspace.id, {
              url: bookmark.url,
              title: bookmark.title || cleanTitle(hostname)
            });
            workspaceUrls.add(bookmark.url);
            addedCount++;
          }
        } catch (err) {
          // Skip invalid URLs
        }
      }

      summary.workspaces.push({
        name: folder.name,
        emoji: emoji,
        tabs: addedCount
      });
    }

    // 5. Create Work workspace if not found in bookmarks
    if (!hasWorkFolder) {
      await Storage.addWorkspace('Work', '💼');
      summary.workspaces.push({
        name: 'Work',
        emoji: '💼',
        tabs: 0
      });
    }

    // 6. Create Personal workspace if not found in bookmarks
    if (!hasPersonalFolder) {
      await Storage.addWorkspace('Personal', '🏠');
      summary.workspaces.push({
        name: 'Personal',
        emoji: '🏠',
        tabs: 0
      });
    }

    // 7. Create Random workspace for loose bookmarks (not in folders, visited in last 30 days)
    // Collect all loose bookmarks from the bookmark tree
    const looseBookmarks = [];
    const bookmarkTree = await chrome.bookmarks.getTree();

    // Get recent history URLs (30 days) for filtering
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentHistory = await chrome.history.search({
      text: '',
      startTime: thirtyDaysAgo,
      maxResults: 10000
    });
    const recentUrls = new Set(recentHistory.map(item => item.url));

    function collectLooseBookmarks(nodes, depth = 0) {
      for (const node of nodes) {
        // At depth 2, collect bookmarks (nodes with URL) that are NOT folders
        if (depth === 2 && node.url && !node.children) {
          looseBookmarks.push({
            title: node.title,
            url: node.url
          });
        }

        // Recurse into folders
        if (node.children) {
          collectLooseBookmarks(node.children, depth + 1);
        }
      }
    }

    collectLooseBookmarks(bookmarkTree);
    console.log(`[quickImport] Found ${looseBookmarks.length} loose bookmarks (not in folders)`);

    // Filter to only those visited in last 30 days
    const recentLooseBookmarks = looseBookmarks.filter(bm => recentUrls.has(bm.url));
    console.log(`[quickImport] ${recentLooseBookmarks.length} loose bookmarks visited in last 30 days`);

    // Create Random workspace if there are recent loose bookmarks
    if (recentLooseBookmarks.length > 0) {
      const randomWorkspace = await Storage.addWorkspace('Random', '🎲');
      let addedCount = 0;

      for (const bookmark of recentLooseBookmarks) {
        try {
          // Add if not already in favorites or other workspaces
          if (!favoriteUrls.has(bookmark.url) && !workspaceUrls.has(bookmark.url)) {
            const hostname = new URL(bookmark.url).hostname;
            await Storage.addWorkspaceItem(randomWorkspace.id, {
              url: bookmark.url,
              title: bookmark.title || cleanTitle(hostname)
            });
            addedCount++;
          }
        } catch (err) {
          // Skip invalid URLs
        }
      }

      if (addedCount > 0) {
        summary.workspaces.push({
          name: 'Random',
          emoji: '🎲',
          tabs: addedCount
        });
      }
    }

    return {
      success: true,
      summary: summary
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
 * Guess emoji for folder name
 */
function guessEmojiForFolder(name) {
  const lower = name.toLowerCase();

  if (lower.includes('work') || lower.includes('job') || lower.includes('office')) return '💼';
  if (lower.includes('personal') || lower.includes('home')) return '🏠';
  if (lower.includes('dev') || lower.includes('code') || lower.includes('programming')) return '💻';
  if (lower.includes('read') || lower.includes('article') || lower.includes('news')) return '📰';
  if (lower.includes('shop') || lower.includes('buy') || lower.includes('store')) return '🛒';
  if (lower.includes('travel') || lower.includes('trip')) return '✈️';
  if (lower.includes('recipe') || lower.includes('food') || lower.includes('cooking')) return '🍳';
  if (lower.includes('music')) return '🎵';
  if (lower.includes('video') || lower.includes('youtube')) return '📺';
  if (lower.includes('learn') || lower.includes('study') || lower.includes('education')) return '📚';

  return '📁';
}

/**
 * Create Google Workspace with all Google services
 */
async function createGoogleWorkspace() {
  const workspace = await Storage.addWorkspace('Google Workspace', '🌐');

  const googleServices = [
    { url: 'https://mail.google.com/mail', alias: 'Gmail', icon: 'https://www.google.com/gmail/about/static-2.0/images/logo-gmail.png' },
    { url: 'https://calendar.google.com/calendar', alias: 'Calendar', icon: 'https://calendar.google.com/googlecalendar/images/favicons_2020q4/calendar_2020q4.ico' },
    { url: 'https://drive.google.com/drive', alias: 'Drive', icon: 'https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png' },
    { url: 'https://docs.google.com/document/u/0/', alias: 'Docs', icon: 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico' },
    { url: 'https://docs.google.com/spreadsheets/u/0/', alias: 'Sheets', icon: 'https://ssl.gstatic.com/docs/spreadsheets/favicon3.ico' },
    { url: 'https://docs.google.com/presentation/u/0/', alias: 'Slides', icon: 'https://ssl.gstatic.com/docs/presentations/images/favicon5.ico' },
    { url: 'https://meet.google.com/', alias: 'Meet', icon: 'https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/web-512dp/logo_meet_2020q4_color_2x_web_512dp.png' },
    { url: 'https://mail.google.com/chat', alias: 'Chat', icon: 'https://www.gstatic.com/images/branding/product/2x/chat_2020q4_48dp.png' }
  ];

  for (const service of googleServices) {
    await Storage.addWorkspaceItem(workspace.id, service);
  }

  return workspace;
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

      <div style="margin: 20px 0; padding: 12px; background: var(--bg-subtle); border-radius: var(--radius-md); border: 1px solid var(--border-medium);">
        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none;">
          <input type="checkbox" id="add-google-workspace-checkbox" checked style="width: 16px; height: 16px; cursor: pointer;" />
          <div>
            <div style="font-size: 13px; font-weight: 500; color: var(--text-primary);">📦 Add Google Workspace</div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">Gmail, Calendar, Drive, Docs, Sheets, Slides, Meet, Chat</div>
          </div>
        </label>
      </div>

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

    // Check if Google Workspace should be added
    const shouldAddGoogleWorkspace = document.getElementById('add-google-workspace-checkbox').checked;

    // Add Google Workspace FIRST (so it appears at top)
    if (shouldAddGoogleWorkspace) {
      await createGoogleWorkspace();
    }

    // Run import (creates workspaces after Google Workspace)
    const result = await quickImport();

    if (result.success) {
      hideModal();
      showSuccessModal(result.summary, shouldAddGoogleWorkspace);
      if (onComplete) onComplete();
    } else {
      alert('Import failed. Please try again or start empty.');
      btn.disabled = false;
      btn.innerHTML = '<span>🚀 Quick Setup (2 seconds)</span><span class="btn-subtitle">Import your most-visited sites</span>';
    }
  });

  // Skip handler
  document.getElementById('skip-onboarding-btn').addEventListener('click', async () => {
    // Check if Google Workspace should be added
    const shouldAddGoogleWorkspace = document.getElementById('add-google-workspace-checkbox').checked;

    // Add Google Workspace FIRST (so it appears at top)
    if (shouldAddGoogleWorkspace) {
      await createGoogleWorkspace();
    }

    // Create empty workspaces
    await Storage.addWorkspace('Work', '💼');
    await Storage.addWorkspace('Personal', '🏠');

    hideModal();
    if (onComplete) onComplete();
  });
}

/**
 * Show success modal after import
 */
function showSuccessModal(summary, hasGoogleWorkspace = false) {
  // Build workspace list
  const workspacesList = summary.workspaces
    .map(ws => `${ws.emoji} ${ws.name} (${ws.tabs} tab${ws.tabs !== 1 ? 's' : ''})`)
    .join('<br>');

  // Check if there are empty workspaces
  const hasEmptyWorkspaces = summary.workspaces.some(ws => ws.tabs === 0);
  const emptyWorkspaceHint = hasEmptyWorkspaces ? `
    <div style="margin-top: 12px; padding: 8px 12px; background: var(--bg-tertiary); border-radius: 6px; font-size: 12px; color: var(--text-secondary);">
      💡 Empty workspaces? Go to Settings → Import Bookmarks to add all your bookmarks folders
    </div>
  ` : '';

  // Google Workspace mention
  const googleWorkspaceInfo = hasGoogleWorkspace ? `
    <div style="margin-top: 16px; padding: 10px 12px; background: rgba(66, 133, 244, 0.1); border: 1px solid rgba(66, 133, 244, 0.3); border-radius: 6px; font-size: 12px; color: var(--text-secondary);">
      🌐 <strong style="color: var(--text-primary);">Google Workspace</strong> added with Gmail, Calendar, Drive, Docs, Sheets, Slides, Meet & Chat
    </div>
  ` : '';

  // Calculate total workspaces (including Google Workspace if added)
  const totalWorkspaces = summary.workspaces.length + (hasGoogleWorkspace ? 1 : 0);

  showModal('You\'re All Set!', `
    <div class="onboarding-success">
      <div class="onboarding-icon">✅</div>
      <h2 class="onboarding-title">Ready to go!</h2>

      <div class="onboarding-summary">
        <p><strong>✨ Added ${summary.favorites} favorites</strong></p>
        <p style="color: var(--text-tertiary); font-size: 13px; margin-top: 4px;">
          Your most-visited sites, ready for quick access
        </p>

        <p style="margin-top: 20px;"><strong>📁 Created ${totalWorkspaces} workspace${totalWorkspaces !== 1 ? 's' : ''}:</strong></p>
        ${googleWorkspaceInfo}
        <div style="margin-top: 8px; line-height: 1.8; color: var(--text-secondary); font-size: 13px;">
          ${workspacesList}
        </div>
        ${emptyWorkspaceHint}
      </div>

      <div class="onboarding-tip">
        <div class="tip-icon">🎯</div>
        <div class="tip-content">
          <strong>Smart Tab Switching</strong><br>
          Click any favorite or workspace item - we'll instantly switch to your existing tab instead of opening duplicates. No more tab clutter!
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

/**
 * Import all bookmark folders (for Settings - no 30-day filter)
 * @returns {Promise<Object>} - Summary of imported workspaces
 */
async function importAllBookmarks() {
  try {
    console.log('[importAllBookmarks] Starting import...');

    const summary = {
      workspaces: [],
      skipped: 0
    };

    // Get current state
    const state = await Storage.getState();
    console.log('[importAllBookmarks] Current state:', {
      favorites: state.favorites.length,
      workspaces: Object.keys(state.workspaces).length
    });

    // Track existing URLs in favorites and workspaces
    const existingUrls = new Set();

    // Add favorite URLs
    state.favorites.forEach(fav => existingUrls.add(fav.url));
    console.log('[importAllBookmarks] Existing favorite URLs:', existingUrls.size);

    // Add workspace URLs
    Object.values(state.workspaces).forEach(ws => {
      ws.items.forEach(item => existingUrls.add(item.url));
    });
    console.log('[importAllBookmarks] Total existing URLs (favorites + workspaces):', existingUrls.size);

    // Get ALL bookmark folders (no recency filter)
    const bookmarkFolders = await extractBookmarkFolders(false);
    console.log('[importAllBookmarks] Got bookmark folders:', bookmarkFolders.length);

    // Create workspaces from bookmark folders
    for (const folder of bookmarkFolders) {
      console.log(`[importAllBookmarks] Processing folder "${folder.name}" with ${folder.bookmarks.length} bookmarks`);
      const emoji = guessEmojiForFolder(folder.name);

      // Check if workspace with this name already exists
      const existingWorkspace = Object.values(state.workspaces).find(
        ws => ws.name.toLowerCase() === folder.name.toLowerCase()
      );

      let workspace;
      if (existingWorkspace) {
        console.log(`[importAllBookmarks] Workspace "${folder.name}" already exists, adding to it`);
        workspace = existingWorkspace;
      } else {
        console.log(`[importAllBookmarks] Creating new workspace "${folder.name}"`);
        workspace = await Storage.addWorkspace(folder.name, emoji);
      }

      let addedCount = 0;
      let skippedCount = 0;

      // Add bookmarks (exclude if already exists)
      for (const bookmark of folder.bookmarks) {
        try {
          if (!existingUrls.has(bookmark.url)) {
            console.log(`[importAllBookmarks]   ✅ Adding: ${bookmark.title}`);
            const hostname = new URL(bookmark.url).hostname;
            await Storage.addWorkspaceItem(workspace.id, {
              url: bookmark.url,
              title: bookmark.title || cleanTitle(hostname)
            });
            existingUrls.add(bookmark.url);
            addedCount++;
          } else {
            console.log(`[importAllBookmarks]   ⏭️  Skipping (already exists): ${bookmark.title}`);
            skippedCount++;
          }
        } catch (err) {
          console.log(`[importAllBookmarks]   ❌ Error adding bookmark:`, err);
        }
      }

      console.log(`[importAllBookmarks] Folder "${folder.name}": added ${addedCount}, skipped ${skippedCount}`);

      if (addedCount > 0 || !existingWorkspace) {
        summary.workspaces.push({
          name: folder.name,
          emoji: emoji,
          tabs: addedCount,
          existing: !!existingWorkspace
        });
      }
    }

    // Import loose bookmarks (not in folders) to Random workspace
    console.log('[importAllBookmarks] Collecting loose bookmarks...');
    const looseBookmarks = [];
    const bookmarkTree = await chrome.bookmarks.getTree();

    function collectLooseBookmarks(nodes, depth = 0) {
      for (const node of nodes) {
        // At depth 2, collect bookmarks (nodes with URL) that are NOT folders
        if (depth === 2 && node.url && !node.children) {
          looseBookmarks.push({
            title: node.title,
            url: node.url
          });
        }

        // Recurse into folders
        if (node.children) {
          collectLooseBookmarks(node.children, depth + 1);
        }
      }
    }

    collectLooseBookmarks(bookmarkTree);
    console.log(`[importAllBookmarks] Found ${looseBookmarks.length} loose bookmarks (not in folders)`);

    // Create or use existing Random workspace for loose bookmarks
    if (looseBookmarks.length > 0) {
      let randomWorkspace = Object.values(state.workspaces).find(
        ws => ws.name.toLowerCase() === 'random'
      );

      if (!randomWorkspace) {
        console.log('[importAllBookmarks] Creating Random workspace for loose bookmarks');
        randomWorkspace = await Storage.addWorkspace('Random', '🎲');
      } else {
        console.log('[importAllBookmarks] Using existing Random workspace');
      }

      let addedCount = 0;
      let skippedCount = 0;

      for (const bookmark of looseBookmarks) {
        try {
          if (!existingUrls.has(bookmark.url)) {
            console.log(`[importAllBookmarks]   ✅ Adding loose bookmark: ${bookmark.title}`);
            const hostname = new URL(bookmark.url).hostname;
            await Storage.addWorkspaceItem(randomWorkspace.id, {
              url: bookmark.url,
              title: bookmark.title || cleanTitle(hostname)
            });
            existingUrls.add(bookmark.url);
            addedCount++;
          } else {
            console.log(`[importAllBookmarks]   ⏭️  Skipping (already exists): ${bookmark.title}`);
            skippedCount++;
          }
        } catch (err) {
          console.log(`[importAllBookmarks]   ❌ Error adding loose bookmark:`, err);
        }
      }

      console.log(`[importAllBookmarks] Random workspace: added ${addedCount}, skipped ${skippedCount}`);

      if (addedCount > 0 || !Object.values(state.workspaces).find(ws => ws.name.toLowerCase() === 'random')) {
        summary.workspaces.push({
          name: 'Random',
          emoji: '🎲',
          tabs: addedCount,
          existing: !!Object.values(state.workspaces).find(ws => ws.name.toLowerCase() === 'random')
        });
      }
    }

    return {
      success: true,
      summary: summary
    };

  } catch (error) {
    console.error('[Import Bookmarks] Failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
