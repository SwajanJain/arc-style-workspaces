# Arc-Style Workspaces: Vertical Tab Management for Any Chromium Browser

> **Bring Arc's best feature to Chrome, Brave, Edge, Comet, and Atlas** - Vertical tabs, workspaces, and smart tab switching. Finally get Arc's organization in the browser of your choice.

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=google-chrome&logoColor=white)](https://github.com/SwajanJain/arc-style-workspaces)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🎯 The Problem

**Horizontal tabs are a productivity killer:**

❌ **Tab overload** - 20+ tabs make it impossible to see what's open
❌ **No organization** - Can't group tabs by project or context
❌ **Wasted space** - Horizontal tabs take precious screen real estate
❌ **Tab duplication** - Clicking Gmail opens *another* Gmail tab instead of focusing the existing one
❌ **Context switching chaos** - Jumping between work, personal, and side projects feels disorganized

**The result?** You waste 5-10 minutes daily hunting for tabs, or worse, you have 50+ tabs open and your browser is a graveyard.

### 💡 Why This Matters NOW

**Arc is great, but focused on design over AI.** Comet and Atlas (OpenAI's browser) are the future - AI + agentic experiences built right in.

**But they have horizontal tabs.** 😢

If you love Arc's vertical tabs but want modern AI features, you're stuck. And if you're on Chrome or Brave, you've never had Arc's amazing tab management.

**This extension solves that.** Install it → Get Arc's tab management in ANY Chromium browser → Use the browser you actually want.

---

## ✨ The Solution

**Arc-Style Workspaces** brings vertical tab management to Chrome/Edge/Brave/Comet with:

### 🎯 Smart Tab Switching (Arc's Killer Feature)
**Problem:** Clicking a link always opens a new tab, even if it's already open.
**Solution:** Our extension **focuses existing tabs** instead of duplicating them.

- Click Gmail favorite → **Focuses your existing Gmail tab** (or creates new if not open)
- Click Slack workspace item → **Goes back to your Slack tab** (even if you navigated elsewhere)
- Navigate from `/directory` to `/admin` in the same tab → **Clicking `/directory` brings you back to that tab** (Arc's tab binding)

**Bonus:** Shift+Click always forces a new tab when you need it.

### 📁 Workspaces: Organize by Context
**Problem:** Your work tabs mix with personal tabs and side projects.
**Solution:** Create workspaces for different contexts.

**Example for a Product Manager:**
- **📊 Office** → Slack, Metabase, Amplitude, Gmail, Calendar
- **🎨 Design Review** → Figma, Notion docs, Linear tickets
- **💼 Client Work** → Client dashboard, reports, emails
- **🏠 Personal** → Twitter, Reddit, banking

Each workspace collapses/expands independently. One click opens your entire workflow.

### ⭐ Favorites: Your Most-Used Tools
**Problem:** You visit the same 10-15 sites every day (Slack, Gmail, Notion, etc.)
**Solution:** Pin them as favicon-only favorites in a clean 4-column grid.

- One-click access to daily tools
- No more bookmark bar clutter
- Visual, fast, and always accessible

### 🔍 Quick Search: Find Anything Instantly
**Problem:** With 50+ tabs, finding the right one is painful.
**Solution:** `Cmd/Ctrl+K` opens a search that filters favorites, workspaces, and open tabs.

Type "slack" → See all Slack-related items → Enter to open. Lightning fast.

---

## 👥 Who This Is For

### ✅ Perfect for:

**Product Managers & Cross-Functional Teams**
- Jump between Slack, dashboards (Metabase, Amplitude), Notion, Linear, Google Suite
- Organize by project or client
- Keep work and personal separate

**Developers & Designers**
- Organize tabs by feature/project
- Quick access to GitHub, docs, staging, prod
- Keep reference docs always accessible

**Knowledge Workers**
- Research projects with many tabs
- Organize by topic or deadline
- Prevent tab chaos

**Arc Lovers Who Want Modern AI Browsers**
- You love Arc's vertical tabs + workspaces
- But new AI browsers (Comet, OpenAI's Atlas) have AI and agentic features Arc doesn't
- Now you can have **both**: Modern AI + Arc's organization

**Chrome/Brave Power Users**
- You're happy with Chrome or Brave but want better tab management
- You've heard about Arc's vertical tabs and want that experience
- Now you can get Arc's features without switching browsers

### ❌ Not for:

- Casual browsers with <5 tabs
- People who prefer horizontal tabs

---

## 🚀 Key Features

### 1. Smart Tab Switching (The Game-Changer)
**How it works:**
- First click → Opens tab and binds it to that workspace item
- Navigate anywhere in that tab (even different sections of the site)
- Click again → **Focuses that bound tab** (Arc's secret sauce!)
- Close tab → Binding clears, next click opens new

**Why it matters:**
No more 5 Gmail tabs, 3 Slack tabs, and duplicate dashboards. Click → go to your existing tab. Period.

**Advanced:**
- Multi-window: Brings window to front if tab is elsewhere
- Cycle mode: Multiple tabs of same site? Rapid-click cycles through them
- Keyboard modifiers: Shift+Click = force new, Cmd+Click = background tab

### 2. Collapsible Workspaces
- Group tabs by project, client, or context
- Each workspace has custom name + icon
- Items inside can have aliases (rename "dashboard-prod-v2" → "Prod Dashboard")
- Move items between workspaces via drag-and-drop or context menu
- Collapse workspaces you're not using

### 3. Favorites Grid
- 4-column layout with favicons only
- Hover for site name
- Add, remove, reorder
- Right-click for context menu (open in new tab, remove)

### 4. Open Tabs View (Optional)
- See all tabs in current window
- Visual indicator for tabs already in workspaces
- Click to focus any tab
- Toggle on/off in preferences

### 5. Preferences & Customization
- **Open behavior:** Smart-switch (default) | New tab | Same tab
- **Theme density:** Compact | Cozy
- **Show/hide** open tabs section
- **Export/Import:** Backup your workspaces as JSON

### 6. Keyboard-First
| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+Shift+V` | Toggle side panel |
| `Cmd/Ctrl+K` | Focus search |
| `↑/↓` | Navigate search results |
| `Enter` | Open highlighted result |
| `Esc` | Clear search |
| `Shift+Click` | Force new tab |

---

## 📦 Installation

### Option 1: From Source (5 minutes)

1. Clone this repository:
   ```bash
   git clone https://github.com/SwajanJain/arc-style-workspaces.git
   cd arc-style-workspaces/side-panel
   ```

2. Open your browser:
   - **Chrome/Brave/Edge:** `chrome://extensions/`
   - **Comet:** `comet://extensions/`

3. Enable **Developer mode** (toggle in top-right)

4. Click **Load unpacked** → Select the `side-panel` folder

5. Done! Click the extension icon or press `Cmd/Ctrl+Shift+V`

### Option 2: Chrome Web Store (Coming Soon)
*Publishing in progress*

---

## 🎬 Quick Start

### 1. Add Your Daily Tools as Favorites
Click the **+** in favorites grid → Add:
- Gmail
- Slack
- Notion
- Calendar
- Whatever you use daily

### 2. Create Your First Workspace
Click **+ New Workspace** → Name it "Office" or "Work"

Add your work tools:
- Slack → Alias: "Team Chat"
- Metabase → Alias: "Analytics"
- Gmail → Alias: "Email"

### 3. Test Smart Switching
1. Click your Gmail favorite → Opens Gmail tab
2. Navigate to Sent folder
3. Switch to another tab
4. **Click Gmail favorite again** → **Jumps back to your Sent folder!** ✨

---

## 🆚 Why Not Just Use Arc?

**Arc is amazing for tab management, but:**

**Arc (Browser Company's focus):**
- ✅ Vertical tabs + workspaces = AMAZING organization
- ✅ Beautiful design and UX
- ❌ Not building AI or agentic features (focused on design)
- ❌ Only available on Arc browser

**Modern AI Browsers (Comet, Atlas):**
- ✅ AI + Agentic features = Cutting edge
- ✅ Built-in AI assistance and automation
- ❌ **Horizontal tabs = Dealbreaker** 😢

**Chrome/Brave Users:**
- ✅ Fast, reliable, extensible
- ✅ Your preferred browser
- ❌ No vertical tabs or workspaces at all

**This Extension = The Bridge**

Works on **any Chromium browser**: Chrome, Brave, Edge, Comet, Atlas, Arc (if you want extra features!).

**Now you can have:**
- ✅ Your browser of choice (AI browsers, Chrome, Brave - whatever!)
- ✅ Arc's vertical tab management
- ✅ Smart tab switching (Arc's secret sauce)
- ✅ Workspaces organized by context
- ✅ No compromises

---

## 🎯 Real-World Example: Product Manager Workflow

**Before (Horizontal Tabs Hell):**
- 47 tabs open across 3 windows
- Can't find the Amplitude dashboard
- Clicking Slack opens a 4th Slack tab
- Mix of work and personal tabs
- Tab bar is 15 pixels wide per tab (unreadable)

**After (Arc-Style Workspaces):**

**Favorites:**
- Gmail, Slack, Linear, Notion, Calendar (one-click access)

**Office Workspace:**
- Feed → `news.almaconnect.com/feed`
- Prospects → `news.almaconnect.com/prospects`
- Directory → `news.almaconnect.com/directory`
- Metabase → Analytics dashboard

**Personal Workspace:**
- Twitter, Reddit, Banking, Shopping

**Result:**
- Click "Office" workspace items → All work tools in their bound tabs
- Click Slack → **Focuses existing Slack** (no more duplicates!)
- Collapse "Personal" when working → Clean workspace
- Navigate `/feed` → `/admin` → Click Feed again → **Returns to same tab!**

**Time saved:** 10+ minutes/day finding and managing tabs.

---

## 🛠️ Architecture & Tech

Built with:
- **Vanilla JavaScript** (no frameworks, minimal bundle)
- **Chrome Extension Manifest V3** (modern, secure)
- **Side Panel API** (persistent, collapsible)
- **chrome.storage.sync** (data syncs across devices)

**Key innovations:**
- **Tab binding cache:** Tracks which tab belongs to which workspace item (Arc's approach)
- **URL canonicalization:** Strips tracking params for better matching
- **Multi-window support:** Brings window to front when tab is elsewhere
- **Service layer:** Clean architecture (tab-matcher, tab-cache, smart-switcher)

---

## 🤝 Contributing

We'd love your help! This extension is **open source** and community-driven.

**Good first issues:**
- Add drag-and-drop reordering
- UI for configuring match modes per favorite
- Toast notifications for tab actions
- Live tab management (show all open tabs in sidebar)

**How to contribute:**
1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📝 License

MIT License - Free to use, modify, and distribute.

---

## 🙏 Credits

Inspired by [Arc Browser](https://arc.net) by The Browser Company.

Built with ❤️ for everyone who loved Arc but needs more flexibility.

---

## 💬 Questions or Issues?

- **GitHub Issues:** [Report bugs or request features](https://github.com/SwajanJain/arc-style-workspaces/issues)
- **Discussions:** Share your workflows and tips

---

**Ready to reclaim your browser?** Install now and experience Arc's best feature in the browser of your choice. 🚀
