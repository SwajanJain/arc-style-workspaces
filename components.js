// UI Components and Helpers

// Favicon helpers
function getFaviconUrl(url) {
  try {
    const urlObj = new URL(url);
    return `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(url)}&size=32`;
  } catch {
    return null;
  }
}

function getDomainInitial(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.charAt(0).toUpperCase();
  } catch {
    return '?';
  }
}

// Create favicon element with fallback
function createFaviconElement(url, size = 20) {
  const container = document.createElement('div');
  container.className = 'workspace-item-icon';

  const faviconUrl = getFaviconUrl(url);

  if (faviconUrl) {
    const img = document.createElement('img');
    img.src = faviconUrl;
    img.onerror = () => {
      // Fallback to initial
      container.innerHTML = `<div class="fallback-icon">${getDomainInitial(url)}</div>`;
    };
    container.appendChild(img);
  } else {
    container.innerHTML = `<div class="fallback-icon">${getDomainInitial(url)}</div>`;
  }

  return container;
}

// Favorites Grid Component
class FavoritesGrid {
  constructor(container, state, onAdd, onRemove, onClick, tabStates = {}) {
    this.container = container;
    this.state = state;
    this.onAdd = onAdd;
    this.onRemove = onRemove;
    this.onClick = onClick;
    this.tabStates = tabStates;
  }

  render() {
    this.container.innerHTML = '';

    // Render favorite items
    this.state.favorites.forEach(fav => {
      const item = document.createElement('button');
      item.className = 'fav-item';
      item.title = fav.title || new URL(fav.url).hostname;
      item.dataset.id = fav.id;

      // Add indicator classes based on tab state
      const tabState = this.tabStates[fav.id];
      if (tabState) {
        if (tabState.isActive) {
          item.classList.add('is-active');
        } else if (tabState.tabCount > 1) {
          item.classList.add('has-multiple-tabs');
          item.setAttribute('data-tab-count', tabState.tabCount);
        } else if (tabState.tabCount === 1) {
          item.classList.add('is-open');
        }
      }

      const faviconUrl = getFaviconUrl(fav.url);

      if (faviconUrl) {
        const img = document.createElement('img');
        img.src = faviconUrl;
        img.onerror = () => {
          item.innerHTML = `<div class="fallback-icon">${getDomainInitial(fav.url)}</div>`;
        };
        item.appendChild(img);
      } else {
        item.innerHTML = `<div class="fallback-icon">${getDomainInitial(fav.url)}</div>`;
      }

      // Add close button
      const closeBtn = document.createElement('div');
      closeBtn.className = 'close-btn';
      closeBtn.innerHTML = `
        <svg viewBox="0 0 10 10" fill="none">
          <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      `;
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onRemove(fav.id);
      });
      item.appendChild(closeBtn);

      item.addEventListener('click', (e) => this.onClick(fav, null, e));

      // Right-click for context menu
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, [
          {
            label: 'Open in new tab',
            onClick: () => this.onClick(fav, 'new-tab')
          },
          { divider: true },
          {
            label: 'Remove from favorites',
            onClick: () => this.onRemove(fav.id),
            danger: true
          }
        ]);
      });

      this.container.appendChild(item);
    });

    // Add button - always visible as last item
    const addBtn = document.createElement('button');
    addBtn.className = 'fav-add-btn';
    addBtn.title = 'Add favorite';
    addBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 4V16M4 10H16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    `;
    addBtn.addEventListener('click', this.onAdd);
    this.container.appendChild(addBtn);
  }
}

// Workspace Component
class WorkspacesList {
  constructor(container, state, callbacks, tabStates = {}) {
    this.container = container;
    this.state = state;
    this.callbacks = callbacks;
    this.tabStates = tabStates;
  }

  render() {
    this.container.innerHTML = '';

    const workspaces = Object.values(this.state.workspaces);

    if (workspaces.length === 0) {
      this.container.innerHTML = `
        <div class="empty-state">
          No workspaces yet. Click + to create one.
        </div>
      `;
      return;
    }

    workspaces.forEach(workspace => {
      const workspaceEl = this.createWorkspaceElement(workspace);
      this.container.appendChild(workspaceEl);
    });
  }

  createWorkspaceElement(workspace) {
    const div = document.createElement('div');
    div.className = `workspace ${workspace.collapsed ? 'collapsed' : ''}`;
    div.dataset.id = workspace.id;

    // Header
    const header = document.createElement('div');
    header.className = 'workspace-header';

    // Get workspace icon (could be customizable later)
    const workspaceIcons = {
      'Office': '🏢',
      'Alma': '🎓',
      'Job Update': '💼',
      'Personal': '🏠',
      'Work': '💻',
      'default': '📁'
    };
    const icon = workspaceIcons[workspace.name] || workspaceIcons['default'];

    header.innerHTML = `
      <svg class="workspace-chevron" viewBox="0 0 20 20" fill="none">
        <path d="M7 4L13 10L7 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="workspace-icon">${icon}</span>
      <span class="workspace-name">${this.escapeHtml(workspace.name)}</span>
      <span class="workspace-count">${workspace.items.length}</span>
    `;
    header.addEventListener('click', () => {
      this.callbacks.onToggleCollapse(workspace.id);
    });

    // Context menu for workspace
    header.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showContextMenu(e.clientX, e.clientY, [
        {
          label: 'Rename',
          onClick: () => this.callbacks.onRenameWorkspace(workspace.id)
        },
        { divider: true },
        {
          label: 'Delete workspace',
          onClick: () => this.callbacks.onDeleteWorkspace(workspace.id),
          danger: true
        }
      ]);
    });

    div.appendChild(header);

    // Items container
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'workspace-items';

    // Render items
    workspace.items.forEach(item => {
      const itemEl = this.createWorkspaceItem(workspace.id, item);
      itemsContainer.appendChild(itemEl);
    });

    // Add item button
    const addBtn = document.createElement('button');
    addBtn.className = 'add-item-btn';
    addBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 2V12M2 7H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <span>Add tab</span>
    `;
    addBtn.addEventListener('click', () => {
      this.callbacks.onAddItem(workspace.id);
    });
    itemsContainer.appendChild(addBtn);

    div.appendChild(itemsContainer);

    return div;
  }

  createWorkspaceItem(workspaceId, item) {
    const div = document.createElement('div');
    div.className = 'workspace-item';
    div.dataset.id = item.id;

    // Add indicator classes based on tab state
    const tabState = this.tabStates[item.id];
    if (tabState) {
      if (tabState.isActive) {
        div.classList.add('is-active');
      } else if (tabState.tabCount > 1) {
        div.classList.add('has-multiple-tabs');
      } else if (tabState.tabCount === 1) {
        div.classList.add('is-open');
      }
    }

    // Icon
    const icon = createFaviconElement(item.url);

    // Add badge count attribute for CSS to display
    if (tabState && tabState.tabCount > 1) {
      icon.setAttribute('data-tab-count', tabState.tabCount);
    }

    div.appendChild(icon);

    // Content
    const content = document.createElement('div');
    content.className = 'workspace-item-content';

    const title = document.createElement('div');
    title.className = 'workspace-item-title';
    title.textContent = item.alias || this.getUrlTitle(item.url);

    content.appendChild(title);
    div.appendChild(content);

    // Click handler
    div.addEventListener('click', (e) => {
      this.callbacks.onOpenItem(item, null, e);
    });

    // Context menu
    div.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showItemContextMenu(e, workspaceId, item);
    });

    return div;
  }

  showItemContextMenu(e, workspaceId, item) {
    const workspaces = Object.values(this.state.workspaces);
    const otherWorkspaces = workspaces.filter(w => w.id !== workspaceId);

    const menuItems = [
      {
        label: 'Open',
        onClick: () => this.callbacks.onOpenItem(item)
      },
      {
        label: 'Open in new tab',
        onClick: () => this.callbacks.onOpenItem(item, 'new-tab')
      },
      { divider: true },
      {
        label: 'Rename alias',
        onClick: () => this.callbacks.onRenameItem(workspaceId, item.id)
      }
    ];

    if (otherWorkspaces.length > 0) {
      menuItems.push({
        label: 'Move to...',
        submenu: otherWorkspaces.map(w => ({
          label: w.name,
          onClick: () => this.callbacks.onMoveItem(workspaceId, w.id, item.id)
        }))
      });
    }

    menuItems.push(
      { divider: true },
      {
        label: 'Remove',
        onClick: () => this.callbacks.onRemoveItem(workspaceId, item.id),
        danger: true
      }
    );

    showContextMenu(e.clientX, e.clientY, menuItems);
  }

  getUrlTitle(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }

  getUrlDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Context Menu
function showContextMenu(x, y, items) {
  const menu = document.getElementById('context-menu');
  menu.innerHTML = '';

  items.forEach(item => {
    if (item.divider) {
      const divider = document.createElement('div');
      divider.className = 'context-menu-divider';
      menu.appendChild(divider);
    } else {
      const menuItem = document.createElement('div');
      menuItem.className = `context-menu-item ${item.danger ? 'danger' : ''}`;
      menuItem.textContent = item.label;
      menuItem.addEventListener('click', () => {
        item.onClick();
        hideContextMenu();
      });
      menu.appendChild(menuItem);
    }
  });

  menu.style.display = 'block';
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;

  // Adjust if off-screen
  setTimeout(() => {
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menu.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = `${y - rect.height}px`;
    }
  }, 0);

  // Close on click outside
  const closeHandler = (e) => {
    if (!menu.contains(e.target)) {
      hideContextMenu();
      document.removeEventListener('click', closeHandler);
    }
  };
  setTimeout(() => document.addEventListener('click', closeHandler), 0);
}

function hideContextMenu() {
  const menu = document.getElementById('context-menu');
  menu.style.display = 'none';
}

// Modal helpers
function showModal(title, content, onConfirm) {
  const overlay = document.getElementById('modal-overlay');
  const modalContent = document.getElementById('modal-content');

  modalContent.innerHTML = `
    <h3 class="modal-title">${title}</h3>
    ${content}
  `;

  overlay.style.display = 'flex';

  // Focus first input
  const firstInput = modalContent.querySelector('input, textarea, select');
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 100);
  }

  // Return close function
  return () => {
    overlay.style.display = 'none';
  };
}

function hideModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.style.display = 'none';
}

// Click outside to close
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('modal-overlay');
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      hideModal();
    }
  });
});
