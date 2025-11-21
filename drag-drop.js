// Drag and Drop Feature
// Handles draggable reordering for tabs, workspaces, and favorites

const AUTO_SCROLL_MARGIN = 48;
const MAX_SCROLL_STEP = 18;
let dragState = {
  draggedElement: null,
  draggedType: null, // 'tab', 'group', 'workspace-item', 'favorite'
  draggedData: null,
  draggedIndex: null,
  dropData: null,
  dropIndicator: null,
  initialY: 0,
  currentY: 0
};
let autoExpandTimeout = null;
let pendingExpandWorkspaceId = null;
let lastDropTarget = null;

/**
 * Initialize drag-and-drop for an element
 * @param {HTMLElement} element - Element to make draggable
 * @param {string} type - Type of draggable ('tab', 'group', 'workspace-item', 'favorite')
 * @param {Object} data - Data associated with this draggable
 * @param {Function} onReorder - Callback when reordering is complete
 */
function makeDraggable(element, type, data, onReorder) {
  element.draggable = true;
  element.classList.add('draggable');

  element.addEventListener('dragstart', (e) => {
    e.stopPropagation();
    handleDragStart(e, element, type, data);
  });

  element.addEventListener('dragend', (e) => {
    e.stopPropagation();
    handleDragEnd(e, onReorder);
  });

  element.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleDragOver(e, element, type);
  });

  element.addEventListener('dragleave', (e) => {
    e.stopPropagation();
    handleDragLeave(e, element);
  });

  element.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[DragDrop] Drop event fired on element');
    handleDrop(e, element, type, data, onReorder);
  });
}

// Also handle drops on the container level
function enableContainerDrop(container, type, onReorder) {
  container.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  container.addEventListener('drop', (e) => {
    e.preventDefault();
    console.log('[DragDrop] Container drop event');
    // Find the closest draggable element
    const target = e.target.closest('.draggable');
    if (target && dragState.draggedElement && target !== dragState.draggedElement) {
      // Use the stored drop indicator position
      if (dragState.dropIndicator) {
        const parent = dragState.dropIndicator.parentElement;
        const siblings = getDraggableSiblings(parent, type);
        const draggedIndex = siblings.indexOf(dragState.draggedElement);

        // Find where the indicator is
        let newIndex = 0;
        for (let i = 0; i < parent.children.length; i++) {
          if (parent.children[i] === dragState.dropIndicator) {
            // Count how many draggable siblings are before this position
            newIndex = siblings.filter((s, idx) =>
              Array.from(parent.children).indexOf(s) < i
            ).length;
            break;
          }
        }

        console.log('[DragDrop] Container drop - from:', draggedIndex, 'to:', newIndex);

        if (draggedIndex !== newIndex && draggedIndex !== -1 && onReorder) {
          onReorder(draggedIndex, newIndex, dragState.draggedData, null);
        }
      }
    }
  });
}

/**
 * Get draggable siblings based on type
 */
function getDraggableSiblings(parent, type) {
  return Array.from(parent.children).filter(el => {
    // Type-specific filtering
    if (type === 'tab') {
      return el.classList.contains('tab-item');
    } else if (type === 'workspace-item') {
      return el.classList.contains('workspace-item');
    } else if (type === 'favorite') {
      // Favorites are buttons with fav-item class, exclude the add button
      return el.classList.contains('fav-item') && !el.classList.contains('fav-add-btn');
    } else if (type === 'group') {
      return el.classList.contains('tab-group');
    }
    return false;
  });
}

/**
 * Handle drag start
 */
function handleDragStart(e, element, type, data) {
  console.log('[DragDrop] Drag start:', type, data);
  dragState.draggedElement = element;
  dragState.draggedType = type;
  dragState.draggedData = data;
  dragState.initialY = e.clientY;

  // Find index within parent
  const parent = element.parentElement;
  const siblings = getDraggableSiblings(parent, type);
  dragState.draggedIndex = siblings.indexOf(element);
  console.log('[DragDrop] Found', siblings.length, 'siblings, dragging index:', dragState.draggedIndex);

  // Add dragging class
  element.classList.add('dragging');

  // Set drag image
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', element.innerHTML);

  // Create visual feedback
  requestAnimationFrame(() => {
    element.style.opacity = '0.5';
    element.style.transform = 'scale(1.02)';
    element.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    element.style.zIndex = '1000';
    element.style.cursor = 'grabbing';
  });
}

function getScrollContainer(element) {
  // Panel content is the main scrollable area; fall back to document
  return document.querySelector('.panel-content') || document.scrollingElement || document.documentElement;
}

function handleAutoScroll(e, element) {
  const container = getScrollContainer(element);
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const distanceToTop = e.clientY - rect.top;
  const distanceToBottom = rect.bottom - e.clientY;
  let delta = 0;

  if (distanceToTop < AUTO_SCROLL_MARGIN) {
    const intensity = 1 - Math.max(distanceToTop, 0) / AUTO_SCROLL_MARGIN;
    delta = -Math.ceil(intensity * MAX_SCROLL_STEP);
  } else if (distanceToBottom < AUTO_SCROLL_MARGIN) {
    const intensity = 1 - Math.max(distanceToBottom, 0) / AUTO_SCROLL_MARGIN;
    delta = Math.ceil(intensity * MAX_SCROLL_STEP);
  }

  if (delta !== 0) {
    container.scrollTop = container.scrollTop + delta;
  }
}

function setDropTarget(element) {
  if (lastDropTarget && lastDropTarget !== element) {
    lastDropTarget.classList.remove('drop-target');
  }
  if (element && !element.classList.contains('drop-target')) {
    element.classList.add('drop-target');
  }
  lastDropTarget = element || null;
}

function scheduleWorkspaceExpand(workspaceEl) {
  if (!workspaceEl || !workspaceEl.classList.contains('collapsed')) return;

  const workspaceId = workspaceEl.dataset.id;
  if (!workspaceId) return;

  // Avoid rescheduling the same workspace repeatedly
  if (pendingExpandWorkspaceId === workspaceId) return;

  clearWorkspaceExpand();
  pendingExpandWorkspaceId = workspaceId;
  autoExpandTimeout = setTimeout(async () => {
    try {
      const currentState = await Storage.getState();
      const workspace = currentState.workspaces[workspaceId];
      if (workspace && workspace.collapsed) {
        await Storage.updateWorkspace(workspaceId, { collapsed: false });
        const state = await Storage.getState();
        window.dispatchEvent(new CustomEvent('storage-updated', { detail: state }));
      }
    } catch (err) {
      console.warn('[DragDrop] Failed to auto-expand workspace', err);
    } finally {
      pendingExpandWorkspaceId = null;
      autoExpandTimeout = null;
    }
  }, 250);
}

function clearWorkspaceExpand() {
  if (autoExpandTimeout) {
    clearTimeout(autoExpandTimeout);
    autoExpandTimeout = null;
  }
  pendingExpandWorkspaceId = null;
}

/**
 * Handle drag over
 */
function handleDragOver(e, element, type) {
  console.log('[DragDrop] DragOver fired on', type, 'element:', element.className);
  handleAutoScroll(e, element);

  if (!dragState.draggedElement || element === dragState.draggedElement) {
    console.log('[DragDrop] DragOver skipped - same element or no dragged element');
    return;
  }

  // Only allow drop if types match (same section)
  if (type !== dragState.draggedType) {
    console.log('[DragDrop] DragOver skipped - type mismatch:', type, 'vs', dragState.draggedType);
    return;
  }

  console.log('[DragDrop] DragOver proceeding - will create indicator');

  const rect = element.getBoundingClientRect();
  const midpoint = rect.top + rect.height / 2;
  const isAfter = e.clientY > midpoint;

  // Remove existing indicator
  if (dragState.dropIndicator) {
    dragState.dropIndicator.remove();
  }

  // Create drop indicator
  const indicator = document.createElement('div');
  indicator.className = 'drop-indicator';
  indicator.style.cssText = `
    height: 2px;
    background: #3B82F6;
    margin: 2px 0;
    border-radius: 1px;
    transition: all 0.2s;
    pointer-events: none;
  `;

  // Insert indicator
  if (isAfter) {
    element.parentElement.insertBefore(indicator, element.nextSibling);
  } else {
    element.parentElement.insertBefore(indicator, element);
  }

  dragState.dropIndicator = indicator;
  if (type === 'workspace-item') {
    const workspaceContainer = element.closest('.workspace-items');
    const workspaceId = workspaceContainer?.dataset.workspaceId ||
      element.closest('.workspace')?.dataset.id;
    const workspaceEl = element.closest('.workspace');

    if (workspaceId) {
      dragState.dropData = { workspaceId };
      indicator.dataset.workspaceId = workspaceId;
    }
    if (workspaceEl) {
      setDropTarget(workspaceEl);
      scheduleWorkspaceExpand(workspaceEl);
    } else {
      setDropTarget(null);
      clearWorkspaceExpand();
    }
  } else {
    dragState.dropData = null;
    clearWorkspaceExpand();
    if (type === 'tab') {
      const tabsContainer = element.closest('#open-tabs-list') || document.getElementById('open-tabs-list');
      setDropTarget(tabsContainer);
    } else {
      setDropTarget(null);
    }
  }
  dragState.currentY = e.clientY;
  console.log('[DragDrop] Indicator created and inserted, isAfter:', isAfter);

  // Add hover effect to other elements
  const parent = element.parentElement;
  const siblings = Array.from(parent.children);
  siblings.forEach(sibling => {
    if (sibling !== dragState.draggedElement && sibling !== indicator) {
      sibling.style.transition = 'transform 0.2s';
    }
  });
}

/**
 * Handle drag leave
 */
function handleDragLeave(e, element) {
  // Only remove indicator if we're truly leaving (not just moving to a child)
  if (!element.contains(e.relatedTarget)) {
    if (dragState.dropIndicator && dragState.dropIndicator.parentElement === element.parentElement) {
      // Don't remove yet - let dragOver handle it
    }
  }
}

/**
 * Handle drop
 * Note: We don't trigger reorder here - it's handled in dragend based on indicator position
 */
function handleDrop(e, element, type, data, onReorder) {
  // Drop event is handled, but actual reorder happens in dragend
  // This prevents double-firing of reorder callbacks
}

/**
 * Handle drag end
 */
function handleDragEnd(e, onReorder) {
  if (!dragState.draggedElement) return;

  console.log('[DragDrop] Drag end');
  console.log('[DragDrop] Has dropIndicator:', !!dragState.dropIndicator);
  console.log('[DragDrop] Indicator has parent:', dragState.dropIndicator?.parentElement ? 'yes' : 'no');
  clearWorkspaceExpand();

  // Calculate new position based on drop indicator
  if (dragState.dropIndicator && dragState.dropIndicator.parentElement) {
    const parent = dragState.dropIndicator.parentElement;
    const siblings = getDraggableSiblings(parent, dragState.draggedType);
    const draggedIndex = dragState.draggedIndex;

    // Find where the indicator is positioned
    let newIndex = 0;
    const allChildren = Array.from(parent.children);
    const indicatorPosition = allChildren.indexOf(dragState.dropIndicator);

    // Count draggable elements before the indicator
    for (let i = 0; i < indicatorPosition; i++) {
      const child = allChildren[i];
      if (child !== dragState.draggedElement && siblings.includes(child)) {
        newIndex++;
      }
    }

    console.log('[DragDrop] DragEnd - from:', draggedIndex, 'to:', newIndex);

    // Trigger reorder if position changed
    if (draggedIndex !== -1 && newIndex !== draggedIndex && onReorder) {
      onReorder(draggedIndex, newIndex, dragState.draggedData, dragState.dropData || null);
    }
  }

  // Remove dragging class
  dragState.draggedElement.classList.remove('dragging');

  // Reset styles
  dragState.draggedElement.style.opacity = '';
  dragState.draggedElement.style.transform = '';
  dragState.draggedElement.style.boxShadow = '';
  dragState.draggedElement.style.zIndex = '';
  dragState.draggedElement.style.cursor = '';

  // Remove drop indicator
  if (dragState.dropIndicator) {
    dragState.dropIndicator.remove();
  }
  setDropTarget(null);

  // Reset transitions
  const parent = dragState.draggedElement.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children);
    siblings.forEach(sibling => {
      sibling.style.transition = '';
    });
  }

  // Reset drag state
  dragState = {
    draggedElement: null,
    draggedType: null,
    draggedData: null,
    draggedIndex: null,
    dropData: null,
    dropIndicator: null,
    initialY: 0,
    currentY: 0
  };
}

/**
 * Enable drag-and-drop for open tabs
 * @param {HTMLElement} container - Container with tab elements
 * @param {Function} onReorder - Callback when tabs are reordered
 */
function enableTabDragDrop(container, onReorder) {
  const tabs = container.querySelectorAll('.tab-item');
  console.log('[DragDrop] Enabling drag for', tabs.length, 'tabs');
  tabs.forEach((tab, index) => {
    const tabId = parseInt(tab.dataset.tabId);
    makeDraggable(tab, 'tab', { tabId, index }, onReorder);
  });
}

/**
 * Enable drag-and-drop for favorites grid
 * @param {HTMLElement} container - Favorites grid container
 * @param {Function} onReorder - Callback when favorites are reordered
 */
function enableFavoriteDragDrop(container, onReorder) {
  const favItems = container.querySelectorAll('.fav-item');
  favItems.forEach((item, index) => {
    const favId = item.dataset.id;
    makeDraggable(item, 'favorite', { favId, index }, onReorder);
  });
}

/**
 * Enable drag-and-drop for workspace items
 * @param {HTMLElement} container - Workspace items container
 * @param {string} workspaceId - ID of the workspace
 * @param {Function} onReorder - Callback when items are reordered
 */
function enableWorkspaceItemDragDrop(container, workspaceId, onReorder) {
  container.dataset.workspaceId = workspaceId;
  const items = container.querySelectorAll('.workspace-item');
  console.log('[DragDrop] Enabling drag for', items.length, 'workspace items in', workspaceId);
  items.forEach((item, index) => {
    const itemId = item.dataset.id;
    makeDraggable(item, 'workspace-item', { workspaceId, itemId, index }, onReorder);
  });
}

/**
 * Enable drag-and-drop for tab groups
 * @param {HTMLElement} container - Container with group elements
 * @param {Function} onReorder - Callback when groups are reordered
 */
function enableGroupDragDrop(container, onReorder) {
  const groups = container.querySelectorAll('.tab-group');
  groups.forEach((group, index) => {
    const domain = group.dataset.domain;
    makeDraggable(group, 'group', { domain, index }, onReorder);
  });
}

/**
 * Reorder array items
 * @param {Array} array - Array to reorder
 * @param {number} fromIndex - Index to move from
 * @param {number} toIndex - Index to move to
 * @returns {Array} - Reordered array
 */
function reorderArray(array, fromIndex, toIndex) {
  const result = Array.from(array);
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
}
