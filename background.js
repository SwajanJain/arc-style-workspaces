// Background Service Worker with Smart Tab Switching
import { TabCache } from "./services/tab-cache.js";
import { SmartSwitcher } from "./services/smart-switcher.js";

// Global instances
let tabCache;
let switcher;
let state = null; // Cached state

// Migration system
const STORAGE_KEY = 'state.v1';

/**
 * Run database migrations on the state
 * Each migration runs only once based on migrationVersion
 */
async function runMigrations() {
  const result = await chrome.storage.sync.get([STORAGE_KEY]);
  const currentState = result[STORAGE_KEY];

  if (!currentState) {
    console.log('[Migrations] No existing state, skipping migrations');
    return;
  }

  const currentVersion = currentState.migrationVersion || 0;

  // Migration 1: Enable showOpenTabs by default for existing users
  if (currentVersion < 1) {
    console.log('[Migration 1] Enabling Open Tabs list by default');
    currentState.preferences = currentState.preferences || {};
    currentState.preferences.showOpenTabs = true;
    currentState.migrationVersion = 1;
    currentState.tabAliases = currentState.tabAliases || {};

    await chrome.storage.sync.set({ [STORAGE_KEY]: currentState });
    console.log('[Migration 1] Completed');
  }

  // Future migrations go here...
  // if (currentVersion < 2) { ... }

  console.log(`[Migrations] All migrations complete. Current version: ${currentState.migrationVersion}`);
}

// Initialize services
async function initializeServices() {
  // Initialize tab cache
  tabCache = new TabCache();

  // Create state getter and updater functions for SmartSwitcher
  const getState = () => state;

  const updateFavorite = async (favoriteId, updates) => {
    // Load current state
    const result = await chrome.storage.sync.get(['state.v1']);
    const currentState = result['state.v1'];
    if (!currentState) return;

    // Update favorite
    const updatedState = {
      ...currentState,
      favorites: currentState.favorites.map(f =>
        f.id === favoriteId ? { ...f, ...updates } : f
      )
    };

    // Save back to storage
    await chrome.storage.sync.set({ 'state.v1': updatedState });
    state = updatedState;
  };

  // Initialize smart switcher
  switcher = new SmartSwitcher(tabCache, getState, updateFavorite);

  // Load state
  const result = await chrome.storage.sync.get(['state.v1']);
  state = result['state.v1'] || null;

  // Populate tab cache with all existing tabs
  const tabs = await chrome.tabs.query({});
  tabs.forEach(tab => tabCache.add(tab));

  console.log(`[SmartSwitcher] Initialized with ${tabs.length} tabs`);
}

// Toggle side panel on action click
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Handle keyboard commands
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-panel') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.sidePanel.open({ windowId: tab.windowId });
    }
  }
  // 'quick-open' command is handled in sidepanel.js
});

// Tab event listeners - Keep cache fresh
chrome.tabs.onCreated.addListener((tab) => {
  if (tabCache) {
    tabCache.add(tab);
  }
  notifyPanelUpdate();
});

chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  // Update tab cache
  if (tabCache) {
    tabCache.remove(tabId);
  }

  // Clear binding cache for this tab
  if (switcher) {
    await switcher.clearBindingsForTab(tabId);
  }

  notifyPanelUpdate();
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Update tab cache
  if (tabCache && changeInfo.url) {
    tabCache.update(tabId, changeInfo, tab);

    // Revalidate bindings when URL changes
    if (switcher) {
      await switcher.revalidateBindingsForTab(tabId, tab);
    }
  } else if (tabCache) {
    tabCache.update(tabId, changeInfo, tab);
  }

  notifyPanelUpdate();
});

// Listen for storage changes to update local state
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes['state.v1']) {
    state = changes['state.v1'].newValue;
  }
});

// Notify side panel of changes
function notifyPanelUpdate() {
  chrome.runtime.sendMessage({ type: 'tabs-updated' }).catch(() => {
    // Side panel may not be open, ignore error
  });
}

// Message handler for smart switching
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'favorite:switch') {
    if (!switcher || !state) {
      sendResponse({ ok: false, error: 'Switcher not initialized' });
      return;
    }

    const { favoriteId, modifiers } = message.payload;

    // Get favorite from state
    const favorite = state.favorites.find(f => f.id === favoriteId);

    if (!favorite) {
      sendResponse({ ok: false, error: 'Favorite not found' });
      return;
    }

    // Execute smart switch
    switcher.switch(favorite, modifiers || {})
      .then((result) => {
        sendResponse({ ok: true, ...result });
      })
      .catch((error) => {
        sendResponse({ ok: false, error: error?.message });
      });

    return true; // Keep channel open for async response
  }

  if (message.type === 'keep-alive') {
    sendResponse({ status: 'alive' });
    return;
  }
});

// Installation handler
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // New installation - Initialize with default state
    const result = await chrome.storage.sync.get(['state.v1']);
    if (!result['state.v1']) {
      const defaultState = {
        favorites: [],
        workspaces: {},
        preferences: {
          openBehavior: 'smart-switch',
          showOpenTabs: true, // Enabled by default for new users
          themeDensity: 'cozy',
          defaultMatchMode: 'prefix',
          multiWindowBehavior: 'focus',
          enableCycleOnReclick: true,
          cycleCooldown: 1500,
          stripTrackingParams: true
        },
        tabAliases: {},
        migrationVersion: 1 // New installs start at latest version
      };
      await chrome.storage.sync.set({ 'state.v1': defaultState });
      state = defaultState;
      console.log('[Install] Initialized with default state (migrationVersion: 1)');
    }
  } else if (details.reason === 'update') {
    // Extension updated - Run migrations for existing users
    console.log('[Update] Extension updated, running migrations...');
    await runMigrations();
  }

  // Initialize services after migration/install
  await initializeServices();
});

// Startup handler
chrome.runtime.onStartup.addListener(async () => {
  await initializeServices();
});

// Keep service worker alive if needed (MV3 can sleep)
let keepAliveInterval;

function startKeepAlive() {
  if (!keepAliveInterval) {
    keepAliveInterval = setInterval(() => {
      chrome.runtime.getPlatformInfo();
    }, 20000); // Every 20 seconds
  }
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

// Start keep-alive when extension is active
chrome.runtime.onConnect.addListener(() => {
  startKeepAlive();
});
