# Development Tools

This folder contains debugging and testing utilities used during development.

**These files are NOT part of the extension** - they're helper scripts for development and troubleshooting.

## 📁 Files

### Debugging Scripts (paste into DevTools console)

- **debug-bookmarks.js** - Analyzes Chrome bookmark structure, shows folder hierarchy
- **debug-bookmarks-raw.js** - Displays raw bookmark tree data
- **debug-history.js** - Analyzes browsing history patterns
- **debug-onboarding.js** - Tests onboarding flow and workspace creation

### Testing Utilities

- **test-smart-selector.js** - Tests smart URL selection logic with real browsing data
- **smart-url-selector.js** - URL pattern matching prototype (experimental)

## 🔧 Usage

1. Open extension side panel
2. Open DevTools (F12)
3. Copy/paste the content of any debug script
4. Run the exported function (e.g., `analyzeBookmarks()`)

## 📝 Notes

- These are development tools only
- Not loaded by the extension
- Useful for troubleshooting user issues
- Can be safely deleted if not needed
