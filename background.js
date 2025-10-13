// Background Service Worker
// Minimal logic - handles panel toggle and storage sync

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

// Optional: Track tab changes to update open tabs list
chrome.tabs.onCreated.addListener(() => {
  notifyPanelUpdate();
});

chrome.tabs.onRemoved.addListener(() => {
  notifyPanelUpdate();
});

chrome.tabs.onUpdated.addListener(() => {
  notifyPanelUpdate();
});

// Notify side panel of changes
function notifyPanelUpdate() {
  chrome.runtime.sendMessage({ type: 'tabs-updated' }).catch(() => {
    // Side panel may not be open, ignore error
  });
}

// Installation handler
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Initialize with default state on first install
    chrome.storage.sync.get(['state.v1'], (result) => {
      if (!result['state.v1']) {
        const defaultState = {
          favorites: [],
          workspaces: {},
          preferences: {
            openBehavior: 'same-tab',
            showOpenTabs: false,
            themeDensity: 'cozy'
          }
        };
        chrome.storage.sync.set({ 'state.v1': defaultState });
      }
    });
  }
});

// Keep service worker alive if needed (MV3 can sleep)
// This is minimal - only wakes when needed
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'keep-alive') {
    sendResponse({ status: 'alive' });
  }
});
