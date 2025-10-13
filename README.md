# Arc-Style Workspaces for Chrome

A Chrome extension that brings Arc browser's vertical workspace experience to any Chromium-based browser (Chrome, Brave, Edge, Comet).

## Features

### 🌟 Favorites Grid
- **Favicon-only design** with 4 icons per row
- Automatic wrapping for additional favorites
- Quick access to your most-used sites
- Hover tooltips for site names

### 📁 Workspaces
- **Collapsible workspace sections** for organizing tabs by project/context
- Custom **aliases** for links (rename links to anything you want)
- **Drag-to-reorder** items within workspaces
- Move items between workspaces via context menu
- Each workspace shows item count

### 🔍 Quick Open / Search
- **Cmd/Ctrl+K** to focus search
- Search across favorites, workspace items, and open tabs
- Navigate results with arrow keys
- Press Enter to open highlighted result

### ⚙️ Preferences
- **Open behavior**: Same tab | New tab | Workspace window
- **Show/hide open tabs** section
- **Theme density**: Compact | Cozy
- Export/Import your data for backup

### 📋 Open Tabs View (Optional)
- Toggle to view current window's tabs
- Visual indicator for tabs already in workspaces
- Click to focus any tab

## Installation

### From Source (Development)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the `side-panel` folder
6. The extension is now installed!

### From Chrome Web Store (Coming Soon)
*This extension will be published to the Chrome Web Store soon.*

## Usage

### Opening the Side Panel

- **Click the extension icon** in the toolbar
- **Keyboard shortcut**: `Cmd+Shift+V` (Mac) or `Ctrl+Shift+V` (Windows/Linux)

### Adding Favorites

1. Click the **+** button in the Favorites grid
2. Enter the URL and optional title
3. Click **Add**

Your favorites will display as favicon-only icons in a 4-column grid.

### Creating Workspaces

1. Click the **+** button next to "Workspaces"
2. Name your workspace (e.g., "Work", "Personal", "Research")
3. Click **Create**

### Adding Items to Workspaces

1. Expand a workspace by clicking its header
2. Click **+ Add tab**
3. Enter URL and optional alias (custom name)
4. Click **Add**

### Context Menus

**Right-click on favorites:**
- Open in new tab
- Remove from favorites

**Right-click on workspace headers:**
- Rename workspace
- Delete workspace

**Right-click on workspace items:**
- Open / Open in new tab
- Rename alias
- Move to another workspace
- Remove

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+Shift+V` | Toggle side panel |
| `Cmd/Ctrl+K` | Focus search |
| `↑/↓` | Navigate search results |
| `Enter` | Open highlighted result |
| `Esc` | Clear search |

## Architecture

### Files Structure

```
side-panel/
├── manifest.json          # Extension configuration
├── sidepanel.html         # Side panel UI
├── styles.css             # All styles (4-column grid, etc.)
├── sidepanel.js           # Main UI logic
├── components.js          # UI components (FavoritesGrid, WorkspacesList)
├── storage.js             # Chrome storage wrapper
├── background.js          # Service worker (minimal)
└── icons/                 # Extension icons
```

### Key Design Decisions

1. **4-Column Favorites Grid**: Uses CSS Grid with `grid-template-columns: repeat(4, 1fr)` for automatic wrapping
2. **MV3 Service Worker**: Minimal background logic; most state managed in side panel
3. **chrome.storage.sync**: All data persists across devices via Chrome sync
4. **No Framework Dependencies**: Vanilla JavaScript for minimal bundle size
5. **Side Panel API**: Uses Chrome's official Side Panel API (persistent per window)

### Data Model

```javascript
{
  favorites: [
    { id, url, title, icon }
  ],
  workspaces: {
    [id]: {
      id,
      name,
      items: [
        { id, url, alias, icon }
      ],
      collapsed: boolean
    }
  },
  preferences: {
    openBehavior: 'same-tab' | 'new-tab' | 'workspace-window',
    showOpenTabs: boolean,
    themeDensity: 'compact' | 'cozy'
  }
}
```

## Acceptance Criteria (v0.1 MVP)

✅ **Favorites Grid:**
- With 6 favorites → shows 2 rows (4 + 2 icons)
- With 12 favorites → shows 3 rows (4 + 4 + 4 icons)
- Add button flows correctly as next grid cell

✅ **Workspaces:**
- Create, rename, expand/collapse, delete
- Add items with URL + optional alias
- Items open per user preference (same tab/new tab)

✅ **Search:**
- Filters across favorites + workspaces
- Enter opens top result
- Arrow keys navigate

✅ **Persistence:**
- State survives browser restart
- Data syncs via chrome.storage.sync

✅ **Export/Import:**
- Backup data as JSON
- Restore from JSON file

## Edge Cases Handled

- **No favicon available**: Shows domain initial as fallback
- **Duplicate URLs**: Allowed in multiple workspaces; visual badge if already open
- **Large favorite count**: Panel scrolls; header stays sticky
- **Service worker sleep**: UI doesn't depend on long-lived background state
- **Empty states**: Graceful messaging when no items exist

## Browser Compatibility

**Supported:**
- ✅ Chrome (v114+)
- ✅ Brave (v1.50+)
- ✅ Edge (v114+)
- ✅ Comet (assuming Chromium-compatible)

**Not Supported:**
- ❌ Firefox (different extension APIs; port planned for future)

## Limitations (by design)

- Cannot replace or hide the native horizontal tab strip
- Cannot rename OS-level tab titles (aliases only show in side panel)
- Cannot create true "workspace windows" (opens in current/new tab instead)

## Development

### Local Development

1. Make changes to any file
2. Go to `chrome://extensions/`
3. Click the **Reload** button for this extension
4. Refresh the side panel to see changes

### Testing the 4-Column Grid

Add 6 favorites: You should see exactly 2 rows (4 + 2)
Add 12 favorites: You should see exactly 3 rows (4 + 4 + 4)

The grid automatically wraps based on content.

### Debugging

- Open DevTools for the side panel: Right-click in panel → **Inspect**
- Check service worker logs: `chrome://extensions/` → **Service Worker** → **Inspect**
- View storage: DevTools → **Application** → **Storage** → **Extension Storage**

## Roadmap

**v0.2 (Planned):**
- [ ] Drag-and-drop reordering for favorites and workspace items
- [ ] Tab grouping by domain/workspace
- [ ] Theme customization (dark mode, custom colors)
- [ ] Keyboard navigation within workspaces

**v0.3 (Planned):**
- [ ] Cross-browser support (Firefox port)
- [ ] Cloud sync beyond Chrome (optional server backend)
- [ ] Tab session management (save/restore window states)

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly (especially grid layouts!)
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Credits

Inspired by [Arc Browser](https://arc.net) by The Browser Company.

Built with vanilla JavaScript, Chrome Extension APIs, and love for vertical tab management.

---

**Questions or Issues?** Open an issue on GitHub or contact the maintainer.
