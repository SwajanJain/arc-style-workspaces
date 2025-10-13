// Storage Management
// Handles all chrome.storage.sync operations with local caching

const STORAGE_KEY = 'state.v1';

// Default state structure
const DEFAULT_STATE = {
  favorites: [],
  workspaces: {},
  preferences: {
    openBehavior: 'same-tab', // 'same-tab' | 'new-tab' | 'workspace-window'
    showOpenTabs: false,
    themeDensity: 'cozy' // 'compact' | 'cozy'
  }
};

// Local cache to avoid unnecessary storage reads
let stateCache = null;

// Storage API wrapper
const Storage = {
  // Get full state
  async getState() {
    if (stateCache) {
      return stateCache;
    }

    return new Promise((resolve) => {
      chrome.storage.sync.get([STORAGE_KEY], (result) => {
        const state = result[STORAGE_KEY] || DEFAULT_STATE;
        stateCache = state;
        resolve(state);
      });
    });
  },

  // Save full state
  async setState(state) {
    stateCache = state;
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [STORAGE_KEY]: state }, () => {
        resolve();
      });
    });
  },

  // Update specific part of state
  async updateState(updater) {
    const currentState = await this.getState();
    const newState = updater(currentState);
    await this.setState(newState);
    return newState;
  },

  // Favorites operations
  async addFavorite(fav) {
    return this.updateState(state => ({
      ...state,
      favorites: [...state.favorites, {
        id: crypto.randomUUID(),
        url: fav.url,
        title: fav.title || new URL(fav.url).hostname,
        icon: fav.icon || null
      }]
    }));
  },

  async removeFavorite(id) {
    return this.updateState(state => ({
      ...state,
      favorites: state.favorites.filter(f => f.id !== id)
    }));
  },

  async updateFavorite(id, updates) {
    return this.updateState(state => ({
      ...state,
      favorites: state.favorites.map(f =>
        f.id === id ? { ...f, ...updates } : f
      )
    }));
  },

  async reorderFavorites(newOrder) {
    return this.updateState(state => ({
      ...state,
      favorites: newOrder
    }));
  },

  // Workspace operations
  async addWorkspace(name) {
    const id = crypto.randomUUID();
    return this.updateState(state => ({
      ...state,
      workspaces: {
        ...state.workspaces,
        [id]: {
          id,
          name,
          items: [],
          collapsed: false
        }
      }
    }));
  },

  async removeWorkspace(id) {
    return this.updateState(state => {
      const { [id]: removed, ...rest } = state.workspaces;
      return { ...state, workspaces: rest };
    });
  },

  async updateWorkspace(id, updates) {
    return this.updateState(state => ({
      ...state,
      workspaces: {
        ...state.workspaces,
        [id]: { ...state.workspaces[id], ...updates }
      }
    }));
  },

  async toggleWorkspaceCollapsed(id) {
    return this.updateState(state => ({
      ...state,
      workspaces: {
        ...state.workspaces,
        [id]: {
          ...state.workspaces[id],
          collapsed: !state.workspaces[id].collapsed
        }
      }
    }));
  },

  // Workspace item operations
  async addWorkspaceItem(workspaceId, item) {
    const itemId = crypto.randomUUID();
    return this.updateState(state => ({
      ...state,
      workspaces: {
        ...state.workspaces,
        [workspaceId]: {
          ...state.workspaces[workspaceId],
          items: [
            ...state.workspaces[workspaceId].items,
            {
              id: itemId,
              url: item.url,
              alias: item.alias || null,
              icon: item.icon || null
            }
          ]
        }
      }
    }));
  },

  async removeWorkspaceItem(workspaceId, itemId) {
    return this.updateState(state => ({
      ...state,
      workspaces: {
        ...state.workspaces,
        [workspaceId]: {
          ...state.workspaces[workspaceId],
          items: state.workspaces[workspaceId].items.filter(i => i.id !== itemId)
        }
      }
    }));
  },

  async updateWorkspaceItem(workspaceId, itemId, updates) {
    return this.updateState(state => ({
      ...state,
      workspaces: {
        ...state.workspaces,
        [workspaceId]: {
          ...state.workspaces[workspaceId],
          items: state.workspaces[workspaceId].items.map(i =>
            i.id === itemId ? { ...i, ...updates } : i
          )
        }
      }
    }));
  },

  async moveWorkspaceItem(fromWorkspaceId, toWorkspaceId, itemId) {
    return this.updateState(state => {
      const item = state.workspaces[fromWorkspaceId].items.find(i => i.id === itemId);
      if (!item) return state;

      return {
        ...state,
        workspaces: {
          ...state.workspaces,
          [fromWorkspaceId]: {
            ...state.workspaces[fromWorkspaceId],
            items: state.workspaces[fromWorkspaceId].items.filter(i => i.id !== itemId)
          },
          [toWorkspaceId]: {
            ...state.workspaces[toWorkspaceId],
            items: [...state.workspaces[toWorkspaceId].items, item]
          }
        }
      };
    });
  },

  // Preferences
  async updatePreferences(prefs) {
    return this.updateState(state => ({
      ...state,
      preferences: { ...state.preferences, ...prefs }
    }));
  },

  // Export/Import
  async exportData() {
    const state = await this.getState();
    return JSON.stringify(state, null, 2);
  },

  async importData(jsonString) {
    try {
      const state = JSON.parse(jsonString);
      await this.setState(state);
      return true;
    } catch (error) {
      console.error('Import failed:', error);
      return false;
    }
  },

  // Clear cache (useful for forcing refresh)
  clearCache() {
    stateCache = null;
  }
};

// Listen for storage changes from other contexts
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes[STORAGE_KEY]) {
    stateCache = changes[STORAGE_KEY].newValue;
    // Dispatch custom event for UI to react
    window.dispatchEvent(new CustomEvent('storage-updated', {
      detail: stateCache
    }));
  }
});
