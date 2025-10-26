import { canonicalizeUrl } from "./tab-matcher.js";

/**
 * In-memory cache for fast tab lookups
 * Maintains multiple indexes for efficient queries
 */
export class TabCache {
  constructor() {
    this.byId = new Map();           // tabId -> tab object
    this.byUrl = new Map();          // normalizedUrl -> Set<tabId>
    this.byWindow = new Map();       // windowId -> Set<tabId>
  }

  /**
   * Add a tab to the cache
   */
  add(tab) {
    if (!tab || !tab.id) return;

    this.byId.set(tab.id, tab);

    // Index by normalized URL
    if (tab.url) {
      const normalized = canonicalizeUrl(tab.url);
      if (!this.byUrl.has(normalized)) {
        this.byUrl.set(normalized, new Set());
      }
      this.byUrl.get(normalized).add(tab.id);
    }

    // Index by window
    if (tab.windowId) {
      if (!this.byWindow.has(tab.windowId)) {
        this.byWindow.set(tab.windowId, new Set());
      }
      this.byWindow.get(tab.windowId).add(tab.id);
    }
  }

  /**
   * Remove a tab from the cache
   */
  remove(tabId) {
    const tab = this.byId.get(tabId);
    if (!tab) return;

    // Remove from URL index
    if (tab.url) {
      const normalized = canonicalizeUrl(tab.url);
      const urlSet = this.byUrl.get(normalized);
      if (urlSet) {
        urlSet.delete(tabId);
        if (urlSet.size === 0) {
          this.byUrl.delete(normalized);
        }
      }
    }

    // Remove from window index
    if (tab.windowId) {
      const windowSet = this.byWindow.get(tab.windowId);
      if (windowSet) {
        windowSet.delete(tabId);
        if (windowSet.size === 0) {
          this.byWindow.delete(tab.windowId);
        }
      }
    }

    // Remove from main index
    this.byId.delete(tabId);
  }

  /**
   * Update a tab in the cache
   */
  update(tabId, changeInfo, tab) {
    if (changeInfo.url) {
      // URL changed - need to remap
      this.remove(tabId);
      this.add(tab);
    } else {
      // Just update metadata
      this.byId.set(tabId, tab);
    }
  }

  /**
   * Get tab by ID
   */
  get(tabId) {
    return this.byId.get(tabId);
  }

  /**
   * Find tabs by normalized URL
   */
  findByUrl(url, windowId = null) {
    const normalized = canonicalizeUrl(url);
    const tabIds = this.byUrl.get(normalized) || new Set();

    if (windowId !== null) {
      // Filter by window
      const windowTabs = this.byWindow.get(windowId) || new Set();
      return Array.from(tabIds)
        .filter(id => windowTabs.has(id))
        .map(id => this.byId.get(id))
        .filter(Boolean);
    }

    return Array.from(tabIds)
      .map(id => this.byId.get(id))
      .filter(Boolean);
  }

  /**
   * Get all tabs in a window
   */
  getByWindow(windowId) {
    const tabIds = this.byWindow.get(windowId) || new Set();
    return Array.from(tabIds)
      .map(id => this.byId.get(id))
      .filter(Boolean);
  }

  /**
   * Get all tabs
   */
  getAll() {
    return Array.from(this.byId.values());
  }

  /**
   * Clear all cache
   */
  clear() {
    this.byId.clear();
    this.byUrl.clear();
    this.byWindow.clear();
  }

  /**
   * Get cache statistics (for debugging)
   */
  getStats() {
    return {
      totalTabs: this.byId.size,
      uniqueUrls: this.byUrl.size,
      windows: this.byWindow.size
    };
  }
}
