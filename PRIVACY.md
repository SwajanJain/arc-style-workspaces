# Privacy Policy for Arc-Inspired Workspaces

**Last Updated:** October 26, 2024

## Overview

Arc-Inspired Workspaces ("the Extension") is committed to protecting your privacy. This privacy policy explains how the Extension handles your data.

## Data Collection

### What Data We Collect

The Extension stores the following data **locally on your device only**:

- **Favorites:** URLs, titles, and icons of websites you add to your favorites
- **Workspaces:** Names, organization, and items within your workspaces
- **Tab bindings:** Temporary associations between workspace items and open tabs
- **Preferences:** Your settings (theme, behavior options, etc.)

### What Data We Do NOT Collect

- We do **NOT** collect any personal information
- We do **NOT** track your browsing history
- We do **NOT** collect data about which websites you visit
- We do **NOT** transmit any data to external servers
- We do **NOT** use analytics or tracking services
- We do **NOT** sell or share any data with third parties

## How Data is Stored

### Local Storage Only

All data is stored **locally on your device** using Chrome's `chrome.storage.sync` API. This means:

- Data stays on your devices
- Data syncs across your Chrome browsers if you're signed in to Chrome sync
- Google handles the syncing (we don't run any servers)
- You can clear all data anytime by removing the extension

### No External Servers

The Extension does **not** communicate with any external servers. All functionality runs entirely within your browser.

## Permissions Explained

The Extension requests the following permissions:

| Permission | Why We Need It |
|------------|----------------|
| `sidePanel` | To display the vertical sidebar interface |
| `storage` | To save your favorites, workspaces, and preferences locally |
| `tabs` | To focus, create, and manage tabs when you click favorites/workspace items |
| `favicon` | To display website icons for your favorites and workspace items |

**Note:** We do NOT request `<all_urls>` or broad host permissions. We only access tab information, not page content.

## Your Rights

You have full control over your data:

- **View your data:** All data is stored in standard Chrome storage (viewable via developer tools)
- **Export your data:** Use the "Export" feature in preferences to download your data as JSON
- **Delete your data:** Remove the extension to delete all stored data, or use the "Clear All" option in preferences
- **Opt-out of sync:** Disable Chrome sync in your browser settings to keep data local to one device

## Data Security

- All data is stored using Chrome's secure storage APIs
- No data is transmitted over the internet (except Chrome sync, which is encrypted by Google)
- We do not implement any tracking, analytics, or telemetry

## Changes to This Policy

We may update this privacy policy from time to time. Changes will be posted in this document with an updated "Last Updated" date.

## Open Source

Arc-Inspired Workspaces is **open source**. You can review the code at:
https://github.com/SwajanJain/arc-style-workspaces

You can verify that we do not collect or transmit data by inspecting the source code.

## Contact

If you have questions about this privacy policy:

- Open an issue on GitHub: https://github.com/SwajanJain/arc-style-workspaces/issues
- Email: [Your contact email - optional]

## Consent

By installing and using Arc-Inspired Workspaces, you agree to this privacy policy.
