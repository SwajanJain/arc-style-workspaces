// Main Side Panel Logic

let state = null;
let favoritesGrid = null;
let workspacesList = null;
let searchTimeout = null;

// Initialize
async function init() {
  state = await Storage.getState();
  renderUI();
  attachEventListeners();

  // Listen for storage updates from other contexts
  window.addEventListener('storage-updated', (e) => {
    state = e.detail;
    renderUI();
  });

  // Load open tabs if preference is enabled
  if (state.preferences.showOpenTabs) {
    loadOpenTabs();
  }
}

// Render entire UI
function renderUI() {
  renderFavorites();
  renderWorkspaces();
  updateOpenTabsVisibility();
  updateFooterStats();
}

// Render favorites grid
function renderFavorites() {
  const container = document.getElementById('favorites-grid');
  favoritesGrid = new FavoritesGrid(
    container,
    state,
    handleAddFavorite,
    handleRemoveFavorite,
    handleClickFavorite
  );
  favoritesGrid.render();
}

// Render workspaces
function renderWorkspaces() {
  const container = document.getElementById('workspaces-list');
  workspacesList = new WorkspacesList(container, state, {
    onToggleCollapse: handleToggleWorkspaceCollapse,
    onRenameWorkspace: handleRenameWorkspace,
    onDeleteWorkspace: handleDeleteWorkspace,
    onAddItem: handleAddWorkspaceItem,
    onOpenItem: handleOpenWorkspaceItem,
    onRenameItem: handleRenameWorkspaceItem,
    onMoveItem: handleMoveWorkspaceItem,
    onRemoveItem: handleRemoveWorkspaceItem
  });
  workspacesList.render();
}

// Update open tabs section visibility
function updateOpenTabsVisibility() {
  const section = document.getElementById('open-tabs-section');
  section.style.display = state.preferences.showOpenTabs ? 'block' : 'none';
}

// Event Listeners
function attachEventListeners() {
  // Search
  const searchInput = document.getElementById('quick-search');
  searchInput.addEventListener('input', handleSearch);
  searchInput.addEventListener('keydown', handleSearchKeydown);

  // Settings
  document.getElementById('settings-btn').addEventListener('click', showSettings);

  // Add workspace buttons
  document.getElementById('add-workspace-btn').addEventListener('click', handleAddWorkspace);
  document.getElementById('new-workspace-btn').addEventListener('click', handleAddWorkspace);
}

// Update footer stats
function updateFooterStats() {
  const favoritesCount = state.favorites.length;
  const tabsCount = Object.values(state.workspaces).reduce((sum, ws) => sum + ws.items.length, 0);
  document.getElementById('footer-stats').textContent = `${favoritesCount} favorites • ${tabsCount} tabs`;
}

// Favorites handlers
async function handleAddFavorite() {
  showModal('Add Favorite', `
    <form class="modal-form" id="add-fav-form">
      <div class="form-group">
        <label class="form-label">URL</label>
        <input type="url" class="form-input" id="fav-url" required placeholder="https://example.com" />
      </div>
      <div class="form-group">
        <label class="form-label">Title (optional)</label>
        <input type="text" class="form-input" id="fav-title" placeholder="My favorite site" />
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" id="cancel-add-fav">Cancel</button>
        <button type="submit" class="btn btn-primary">Add</button>
      </div>
    </form>
  `);

  document.getElementById('cancel-add-fav').addEventListener('click', hideModal);
  document.getElementById('add-fav-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = document.getElementById('fav-url').value;
    const title = document.getElementById('fav-title').value;

    state = await Storage.addFavorite({ url, title });
    renderFavorites();
    hideModal();
  });
}

async function handleRemoveFavorite(id) {
  state = await Storage.removeFavorite(id);
  renderFavorites();
}

async function handleClickFavorite(fav, mode = null, event = null) {
  const openMode = mode || state.preferences.openBehavior;

  // Smart switching enabled?
  if (openMode === 'smart-switch' && event) {
    // Shift+Click: Force new tab (clear binding)
    if (event.shiftKey) {
      const newTab = await chrome.tabs.create({ url: fav.url });
      await updateFavoriteBinding(fav.id, newTab.id);
      console.log(`[SmartSwitch] Force new tab for ${fav.title || 'favorite'}`);
      return;
    }

    try {
      // Check binding cache first (Arc way)
      if (fav.lastBoundTabId) {
        const boundTab = await chrome.tabs.get(fav.lastBoundTabId).catch(() => null);

        if (boundTab) {
          // Bound tab still exists - focus it (regardless of URL!)
          await chrome.tabs.update(boundTab.id, { active: true });

          // Bring window to front if needed
          if (boundTab.windowId) {
            await chrome.windows.update(boundTab.windowId, { focused: true });
          }

          console.log(`[SmartSwitch] Focused bound tab ${fav.title || 'favorite'} at ${boundTab.url}`);
          return;
        } else {
          // Bound tab was closed - clear binding
          await updateFavoriteBinding(fav.id, null);
        }
      }

      // No valid binding - try to find matching tab by URL (fallback)
      const tabs = await chrome.tabs.query({ currentWindow: true });
      const matchingTab = tabs.find(tab => {
        if (!tab.url) return false;
        const canonicalTab = canonicalizeUrl(tab.url);
        const canonicalFav = canonicalizeUrl(fav.url);
        return canonicalTab.startsWith(canonicalFav);
      });

      if (matchingTab) {
        // Found matching tab - focus it and bind it
        await chrome.tabs.update(matchingTab.id, { active: true });
        await updateFavoriteBinding(fav.id, matchingTab.id);
        console.log(`[SmartSwitch] Focused existing ${fav.title || 'favorite'}`);
      } else {
        // No match - create new tab and bind it
        const newTab = await chrome.tabs.create({ url: fav.url });
        await updateFavoriteBinding(fav.id, newTab.id);
        console.log(`[SmartSwitch] Created new ${fav.title || 'favorite'}`);
      }
    } catch (error) {
      console.warn('[SmartSwitch] Error, falling back:', error);
      openUrl(fav.url, 'new-tab');
    }
  } else {
    // Regular open behavior
    openUrl(fav.url, openMode);
  }
}

// Workspace handlers
async function handleAddWorkspace() {
  showModal('New Workspace', `
    <form class="modal-form" id="add-workspace-form">
      <div class="form-group">
        <label class="form-label">Workspace Name</label>
        <input type="text" class="form-input" id="workspace-name" required placeholder="e.g., Office, Personal" />
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" id="cancel-add-workspace">Cancel</button>
        <button type="submit" class="btn btn-primary">Create</button>
      </div>
    </form>
  `);

  document.getElementById('cancel-add-workspace').addEventListener('click', hideModal);
  document.getElementById('add-workspace-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('workspace-name').value;

    state = await Storage.addWorkspace(name);
    renderWorkspaces();
    hideModal();
  });
}

async function handleToggleWorkspaceCollapse(id) {
  state = await Storage.toggleWorkspaceCollapsed(id);
  renderWorkspaces();
}

async function handleRenameWorkspace(id) {
  const workspace = state.workspaces[id];

  showModal('Rename Workspace', `
    <form class="modal-form" id="rename-workspace-form">
      <div class="form-group">
        <label class="form-label">Workspace Name</label>
        <input type="text" class="form-input" id="workspace-name" required value="${escapeHtml(workspace.name)}" />
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" id="cancel-rename-workspace">Cancel</button>
        <button type="submit" class="btn btn-primary">Rename</button>
      </div>
    </form>
  `);

  document.getElementById('cancel-rename-workspace').addEventListener('click', hideModal);
  document.getElementById('rename-workspace-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('workspace-name').value;

    state = await Storage.updateWorkspace(id, { name });
    renderWorkspaces();
    hideModal();
  });
}

async function handleDeleteWorkspace(id) {
  if (confirm('Delete this workspace and all its items?')) {
    state = await Storage.removeWorkspace(id);
    renderWorkspaces();
  }
}

// Workspace item handlers
async function handleAddWorkspaceItem(workspaceId) {
  showModal('Add Tab', `
    <form class="modal-form" id="add-item-form">
      <div class="form-group">
        <label class="form-label">URL</label>
        <input type="url" class="form-input" id="item-url" required placeholder="https://example.com" />
      </div>
      <div class="form-group">
        <label class="form-label">Alias (optional)</label>
        <input type="text" class="form-input" id="item-alias" placeholder="Custom name for this link" />
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" id="cancel-add-item">Cancel</button>
        <button type="submit" class="btn btn-primary">Add</button>
      </div>
    </form>
  `);

  document.getElementById('cancel-add-item').addEventListener('click', hideModal);
  document.getElementById('add-item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = document.getElementById('item-url').value;
    const alias = document.getElementById('item-alias').value;

    state = await Storage.addWorkspaceItem(workspaceId, { url, alias });
    renderWorkspaces();
    hideModal();
  });
}

async function handleOpenWorkspaceItem(item, mode = null, event = null) {
  const openMode = mode || state.preferences.openBehavior;

  // Smart switching enabled?
  if (openMode === 'smart-switch' && event) {
    // Shift+Click: Force new tab (clear binding)
    if (event.shiftKey) {
      const newTab = await chrome.tabs.create({ url: item.url });
      await updateWorkspaceItemBinding(item.id, newTab.id);
      console.log(`[SmartSwitch] Force new tab for ${item.alias || 'workspace item'}`);
      return;
    }

    try {
      // Check binding cache first (Arc way)
      if (item.lastBoundTabId) {
        const boundTab = await chrome.tabs.get(item.lastBoundTabId).catch(() => null);

        if (boundTab) {
          // Bound tab still exists - focus it (regardless of URL!)
          await chrome.tabs.update(boundTab.id, { active: true });

          // Bring window to front if needed
          if (boundTab.windowId) {
            await chrome.windows.update(boundTab.windowId, { focused: true });
          }

          console.log(`[SmartSwitch] Focused bound tab ${item.alias || 'workspace item'} at ${boundTab.url}`);
          return;
        } else {
          // Bound tab was closed - clear binding
          await updateWorkspaceItemBinding(item.id, null);
        }
      }

      // No valid binding - try to find matching tab by URL (fallback)
      const tabs = await chrome.tabs.query({ currentWindow: true });
      const matchingTab = tabs.find(tab => {
        if (!tab.url) return false;
        const canonicalTab = canonicalizeUrl(tab.url);
        const canonicalItem = canonicalizeUrl(item.url);
        return canonicalTab.startsWith(canonicalItem);
      });

      if (matchingTab) {
        // Found matching tab - focus it and bind it
        await chrome.tabs.update(matchingTab.id, { active: true });
        await updateWorkspaceItemBinding(item.id, matchingTab.id);
        console.log(`[SmartSwitch] Focused existing ${item.alias || 'workspace item'}`);
      } else {
        // No match - create new tab and bind it
        const newTab = await chrome.tabs.create({ url: item.url });
        await updateWorkspaceItemBinding(item.id, newTab.id);
        console.log(`[SmartSwitch] Created new ${item.alias || 'workspace item'}`);
      }
    } catch (error) {
      console.warn('[SmartSwitch] Error, falling back:', error);
      openUrl(item.url, 'new-tab');
    }
  } else {
    // Regular open behavior
    openUrl(item.url, openMode);
  }
}

// Helper to update workspace item binding
async function updateFavoriteBinding(favId, tabId) {
  await Storage.updateFavorite(favId, {
    lastBoundTabId: tabId,
    lastBoundAt: tabId ? Date.now() : null
  });
  // Refresh state
  state = await Storage.getState();
  // Re-render favorites so next click uses updated binding
  renderFavorites();
}

async function updateWorkspaceItemBinding(itemId, tabId) {
  // Find which workspace contains this item
  for (const [workspaceId, workspace] of Object.entries(state.workspaces)) {
    const itemIndex = workspace.items.findIndex(i => i.id === itemId);
    if (itemIndex !== -1) {
      await Storage.updateWorkspaceItem(workspaceId, itemId, {
        lastBoundTabId: tabId,
        lastBoundAt: tabId ? Date.now() : null
      });
      // Refresh state
      state = await Storage.getState();
      // Re-render workspaces so next click uses updated binding
      renderWorkspaces();
      return;
    }
  }
}

// Helper function to canonicalize URLs (same logic as in tab-matcher.js)
function canonicalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hostname = u.hostname.toLowerCase();

    // Strip tracking params
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid', '_ga', '_gl', 'ref', 'source'];
    trackingParams.forEach(param => u.searchParams.delete(param));

    const path = u.pathname.replace(/\/$/, '') || '/';
    return `${u.protocol}//${u.host}${path}${u.search}${u.hash}`;
  } catch {
    return url;
  }
}

async function handleRenameWorkspaceItem(workspaceId, itemId) {
  const item = state.workspaces[workspaceId].items.find(i => i.id === itemId);

  showModal('Rename Alias', `
    <form class="modal-form" id="rename-item-form">
      <div class="form-group">
        <label class="form-label">Alias</label>
        <input type="text" class="form-input" id="item-alias" value="${escapeHtml(item.alias || '')}" placeholder="Custom name" />
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" id="cancel-rename-item">Cancel</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>
  `);

  document.getElementById('cancel-rename-item').addEventListener('click', hideModal);
  document.getElementById('rename-item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const alias = document.getElementById('item-alias').value;

    state = await Storage.updateWorkspaceItem(workspaceId, itemId, { alias });
    renderWorkspaces();
    hideModal();
  });
}

async function handleMoveWorkspaceItem(fromWorkspaceId, toWorkspaceId, itemId) {
  state = await Storage.moveWorkspaceItem(fromWorkspaceId, toWorkspaceId, itemId);
  renderWorkspaces();
}

async function handleRemoveWorkspaceItem(workspaceId, itemId) {
  state = await Storage.removeWorkspaceItem(workspaceId, itemId);
  renderWorkspaces();
}

// Search functionality
function handleSearch(e) {
  clearTimeout(searchTimeout);
  const query = e.target.value.trim().toLowerCase();

  if (!query) {
    hideSearchResults();
    return;
  }

  searchTimeout = setTimeout(() => {
    performSearch(query);
  }, 150);
}

function performSearch(query) {
  const results = [];

  // Search favorites
  state.favorites.forEach(fav => {
    const title = (fav.title || '').toLowerCase();
    const url = fav.url.toLowerCase();
    if (title.includes(query) || url.includes(query)) {
      results.push({
        type: 'favorite',
        title: fav.title || new URL(fav.url).hostname,
        url: fav.url,
        data: fav,
        badge: 'Favorite'
      });
    }
  });

  // Search workspace items
  Object.values(state.workspaces).forEach(workspace => {
    workspace.items.forEach(item => {
      const alias = (item.alias || '').toLowerCase();
      const url = item.url.toLowerCase();
      if (alias.includes(query) || url.includes(query)) {
        results.push({
          type: 'workspace-item',
          title: item.alias || new URL(item.url).hostname,
          url: item.url,
          data: item,
          badge: workspace.name
        });
      }
    });
  });

  showSearchResults(results);
}

function showSearchResults(results) {
  let container = document.querySelector('.search-results');

  if (!container) {
    container = document.createElement('div');
    container.className = 'search-results';
    document.querySelector('.search-container').appendChild(container);
  }

  if (results.length === 0) {
    container.innerHTML = '<div class="empty-state">No results found</div>';
    return;
  }

  container.innerHTML = results.map((result, index) => `
    <div class="search-result-item ${index === 0 ? 'highlighted' : ''}" data-index="${index}">
      <div class="search-result-icon">${createFaviconElement(result.url, 18).outerHTML}</div>
      <div class="search-result-content">
        <div class="search-result-title">${escapeHtml(result.title)}</div>
        <div class="search-result-badge">${escapeHtml(result.badge)}</div>
      </div>
    </div>
  `).join('');

  // Attach click handlers
  container.querySelectorAll('.search-result-item').forEach((el, index) => {
    el.addEventListener('click', () => {
      openUrl(results[index].url, state.preferences.openBehavior);
      hideSearchResults();
      document.getElementById('quick-search').value = '';
    });
  });
}

function hideSearchResults() {
  const container = document.querySelector('.search-results');
  if (container) {
    container.remove();
  }
}

function handleSearchKeydown(e) {
  const container = document.querySelector('.search-results');
  if (!container) return;

  const items = container.querySelectorAll('.search-result-item');
  const highlighted = container.querySelector('.highlighted');
  let currentIndex = highlighted ? parseInt(highlighted.dataset.index) : 0;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    currentIndex = Math.min(currentIndex + 1, items.length - 1);
    updateHighlight(items, currentIndex);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    currentIndex = Math.max(currentIndex - 1, 0);
    updateHighlight(items, currentIndex);
  } else if (e.key === 'Enter' && highlighted) {
    e.preventDefault();
    highlighted.click();
  } else if (e.key === 'Escape') {
    hideSearchResults();
    e.target.value = '';
  }
}

function updateHighlight(items, index) {
  items.forEach(item => item.classList.remove('highlighted'));
  items[index].classList.add('highlighted');
  items[index].scrollIntoView({ block: 'nearest' });
}

// Settings
function showSettings() {
  showModal('Settings', `
    <div class="settings-panel">
      <div class="settings-group">
        <div class="settings-group-title">BEHAVIOR</div>
        <div class="setting-item">
          <label class="setting-label">Open links in</label>
          <div class="setting-control">
            <select id="open-behavior">
              <option value="smart-switch" ${state.preferences.openBehavior === 'smart-switch' ? 'selected' : ''}>Smart switch (Arc-style)</option>
              <option value="same-tab" ${state.preferences.openBehavior === 'same-tab' ? 'selected' : ''}>Same tab</option>
              <option value="new-tab" ${state.preferences.openBehavior === 'new-tab' ? 'selected' : ''}>New tab</option>
            </select>
          </div>
        </div>
      </div>

      <div class="settings-group">
        <div class="settings-group-title">DISPLAY</div>
        <div class="setting-item">
          <label class="setting-label">Show open tabs list</label>
          <div class="setting-control">
            <label class="toggle-switch">
              <input type="checkbox" id="show-open-tabs" ${state.preferences.showOpenTabs ? 'checked' : ''} />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
    <div class="form-actions">
      <button type="button" class="btn btn-secondary" id="cancel-settings">Cancel</button>
      <button type="button" class="btn btn-primary" id="save-settings">Save</button>
    </div>
  `);

  document.getElementById('cancel-settings').addEventListener('click', hideModal);
  document.getElementById('save-settings').addEventListener('click', async () => {
    const openBehavior = document.getElementById('open-behavior').value;
    const showOpenTabs = document.getElementById('show-open-tabs').checked;

    state = await Storage.updatePreferences({
      openBehavior,
      showOpenTabs
    });

    renderUI();
    hideModal();
  });
}

// Export/Import
async function handleExport() {
  const json = await Storage.exportData();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `arc-workspaces-backup-${Date.now()}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

function handleImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';

  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const text = await file.text();
    const success = await Storage.importData(text);

    if (success) {
      state = await Storage.getState();
      renderUI();
      alert('Import successful!');
    } else {
      alert('Import failed. Please check the file format.');
    }
  });

  input.click();
}

// Open Tabs
async function loadOpenTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const container = document.getElementById('open-tabs-list');

  if (tabs.length === 0) {
    container.innerHTML = '<div class="empty-state">No open tabs</div>';
    return;
  }

  container.innerHTML = tabs.map(tab => `
    <div class="tab-item" data-tab-id="${tab.id}">
      <div class="tab-item-icon">${createFaviconElement(tab.url, 18).outerHTML}</div>
      <div class="tab-item-title">${escapeHtml(tab.title)}</div>
    </div>
  `).join('');

  container.querySelectorAll('.tab-item').forEach(el => {
    el.addEventListener('click', () => {
      const tabId = parseInt(el.dataset.tabId);
      chrome.tabs.update(tabId, { active: true });
    });
  });
}

// Utilities
function openUrl(url, mode) {
  if (mode === 'new-tab') {
    chrome.tabs.create({ url });
  } else {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.update(tabs[0].id, { url });
      } else {
        chrome.tabs.create({ url });
      }
    });
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);

// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'quick-open') {
    document.getElementById('quick-search').focus();
  }
});

// Clear workspace item bindings when tabs are closed
chrome.tabs.onRemoved.addListener(async (closedTabId) => {
  if (!state) return;

  // Check if any favorite was bound to this tab
  if (state.favorites) {
    for (const fav of state.favorites) {
      if (fav.lastBoundTabId === closedTabId) {
        // Clear the binding
        await updateFavoriteBinding(fav.id, null);
        console.log(`[SmartSwitch] Cleared binding for ${fav.title || 'favorite'} (tab closed)`);
      }
    }
  }

  // Check if any workspace item was bound to this tab
  if (state.workspaces) {
    for (const [workspaceId, workspace] of Object.entries(state.workspaces)) {
      for (const item of workspace.items) {
        if (item.lastBoundTabId === closedTabId) {
          // Clear the binding
          await updateWorkspaceItemBinding(item.id, null);
          console.log(`[SmartSwitch] Cleared binding for ${item.alias || 'workspace item'} (tab closed)`);
        }
      }
    }
  }
});
