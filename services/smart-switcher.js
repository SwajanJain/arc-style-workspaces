import { MATCH_MODE, matchesUrl, rankMatches } from "./tab-matcher.js";

const MULTI_WINDOW_BEHAVIOR = {
  FOCUS: 'focus',        // Bring window to front
  ADOPT: 'adopt'         // Move tab to current window
};

/**
 * Smart Tab Switcher
 * Implements "focus-or-open" logic with binding cache and cycle detection
 */
export class SmartSwitcher {
  constructor(tabCache, getState, updateFavorite) {
    this.tabCache = tabCache;
    this.getState = getState;           // Function to get current state
    this.updateFavorite = updateFavorite; // Function to update favorite
    this.recentClicks = new Map();      // favoriteId -> timestamp for cycle detection
  }

  /**
   * Main entry point: focus existing tab or open new
   */
  async switch(favorite, modifiers = {}) {
    const { shift = false, cmd = false, alt = false } = modifiers;

    // Shift+Click: Always open new (bypass resolver)
    if (shift) {
      const tab = await this.openNew(favorite.url, { background: false });
      await this.updateBinding(favorite.id, tab.id);
      return { action: 'created', tabId: tab.id, url: favorite.url };
    }

    // Find matching tabs
    const currentWindow = await chrome.windows.getCurrent();
    let matches = this.findMatches(favorite, currentWindow.id);

    // Check binding cache first (fast path)
    if (favorite.lastBoundTabId) {
      const cachedTab = this.tabCache.get(favorite.lastBoundTabId);
      if (cachedTab && this.isValidBinding(cachedTab, favorite)) {
        // Move cached tab to front of matches
        matches = [cachedTab, ...matches.filter(t => t.id !== cachedTab.id)];
      } else {
        // Cache invalid, clear it
        await this.clearBinding(favorite.id);
      }
    }

    // No matches: Open new
    if (matches.length === 0) {
      const tab = await this.openNew(favorite.url, { background: cmd });
      await this.updateBinding(favorite.id, tab.id);
      return { action: 'created', tabId: tab.id, url: favorite.url };
    }

    // Alt+Click or cycle-on-reclick: Cycle through matches
    const shouldCycle = alt || this.detectReclick(favorite.id);
    if (shouldCycle && matches.length > 1) {
      const nextMatch = this.getNextMatch(matches, currentWindow.id);
      await this.focusTab(nextMatch, favorite);
      await this.updateBinding(favorite.id, nextMatch.id);
      return { action: 'cycled', tabId: nextMatch.id, url: nextMatch.url };
    }

    // Focus best match
    const bestMatch = matches[0];
    await this.focusTab(bestMatch, favorite);
    await this.updateBinding(favorite.id, bestMatch.id);

    return { action: 'focused', tabId: bestMatch.id, url: bestMatch.url };
  }

  /**
   * Find all tabs matching this favorite
   */
  findMatches(favorite, currentWindowId) {
    const state = this.getState();
    if (!state) return []; // Guard against null state

    const { url, matchMode, matchPattern } = favorite;

    // Use global default if favorite doesn't specify
    const effectiveMode = matchMode || state?.preferences?.defaultMatchMode || MATCH_MODE.PREFIX;

    // Query all tabs
    const allTabs = this.tabCache.getAll();

    // Filter by match mode
    const matches = allTabs.filter(tab => {
      // Skip chrome:// and edge:// URLs
      if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://')) {
        return false;
      }
      return matchesUrl(tab.url, url, effectiveMode, matchPattern);
    });

    // Rank by priority
    return rankMatches(matches, currentWindowId, url, effectiveMode);
  }

  /**
   * Check if cached binding is still valid
   */
  isValidBinding(tab, favorite) {
    if (!tab || !tab.url) return false;

    // Skip chrome:// URLs
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
      return false;
    }

    const state = this.getState();
    if (!state) return false; // Guard against null state

    const effectiveMode = favorite.matchMode || state?.preferences?.defaultMatchMode || MATCH_MODE.PREFIX;

    // Check if tab still matches favorite
    return matchesUrl(tab.url, favorite.url, effectiveMode, favorite.matchPattern);
  }

  /**
   * Detect if this is a re-click (for cycling)
   */
  detectReclick(favoriteId) {
    const state = this.getState();
    if (!state || !state.preferences) return false; // Guard against null state

    const prefs = state.preferences;
    if (!prefs.enableCycleOnReclick) return false;

    const now = Date.now();
    const lastClick = this.recentClicks.get(favoriteId);

    this.recentClicks.set(favoriteId, now);

    if (!lastClick) return false;

    const elapsed = now - lastClick;
    const cooldown = prefs.cycleCooldown || 1500;
    return elapsed < cooldown;
  }

  /**
   * Get next match in cycle (round-robin)
   */
  getNextMatch(matches, currentWindowId) {
    // Find currently active tab in matches
    const activeIndex = matches.findIndex(t => t.active && t.windowId === currentWindowId);

    if (activeIndex === -1) {
      return matches[0]; // None active, return first
    }

    // Return next in cycle (wrap around)
    return matches[(activeIndex + 1) % matches.length];
  }

  /**
   * Focus a tab (with window handling)
   */
  async focusTab(tab, favorite) {
    const state = this.getState();
    if (!state || !state.preferences) {
      // If no state, just focus the tab in current window
      await chrome.tabs.update(tab.id, { active: true });
      return;
    }

    const prefs = state.preferences;
    const multiWindowBehavior = favorite.multiWindowBehavior || prefs.multiWindowBehavior || MULTI_WINDOW_BEHAVIOR.FOCUS;

    const currentWindow = await chrome.windows.getCurrent();

    if (tab.windowId !== currentWindow.id) {
      if (multiWindowBehavior === MULTI_WINDOW_BEHAVIOR.FOCUS) {
        // Bring window to front
        await chrome.windows.update(tab.windowId, { focused: true });
      } else if (multiWindowBehavior === MULTI_WINDOW_BEHAVIOR.ADOPT) {
        // Move tab to current window
        await chrome.tabs.move(tab.id, {
          windowId: currentWindow.id,
          index: -1  // Append to end
        });
      }
    }

    // Activate the tab
    await chrome.tabs.update(tab.id, { active: true });
  }

  /**
   * Open new tab
   */
  async openNew(url, options = {}) {
    const { background = false } = options;
    const currentWindow = await chrome.windows.getCurrent();

    const tab = await chrome.tabs.create({
      url,
      active: !background,
      windowId: currentWindow.id
    });

    // Immediately add to cache with correct URL
    // (Don't wait for onCreated/onUpdated events which may have wrong URL initially)
    this.tabCache.add(tab);

    return tab;
  }

  /**
   * Update binding cache
   */
  async updateBinding(favoriteId, tabId) {
    await this.updateFavorite(favoriteId, {
      lastBoundTabId: tabId,
      lastBoundAt: Date.now()
    });
  }

  /**
   * Clear binding cache for a favorite
   */
  async clearBinding(favoriteId) {
    await this.updateFavorite(favoriteId, {
      lastBoundTabId: null,
      lastBoundAt: null
    });
  }

  /**
   * Clear bindings for a specific tab (when tab is closed)
   */
  async clearBindingsForTab(tabId) {
    const state = this.getState();
    if (!state || !state.favorites) return; // Guard against null state

    const favorites = state.favorites;

    for (const fav of favorites) {
      if (fav.lastBoundTabId === tabId) {
        await this.clearBinding(fav.id);
      }
    }
  }

  /**
   * Revalidate bindings for a tab (when URL changes)
   */
  async revalidateBindingsForTab(tabId, tab) {
    const state = this.getState();
    if (!state || !state.favorites) return; // Guard against null state

    const favorites = state.favorites;

    for (const fav of favorites) {
      if (fav.lastBoundTabId === tabId) {
        if (!this.isValidBinding(tab, fav)) {
          await this.clearBinding(fav.id);
        }
      }
    }
  }
}
