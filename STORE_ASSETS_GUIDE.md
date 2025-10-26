# Chrome Web Store Assets Guide

This guide explains what assets you need to create for the Chrome Web Store listing.

## Required Assets

### 1. Screenshots (REQUIRED - At least 1, up to 5)

**Dimensions:** 1280x800 or 640x400 pixels
**Format:** PNG or JPEG
**Max file size:** 2MB each

#### What to Capture:

**Screenshot 1: Overview with Favorites** (Most Important)
- Show the side panel open with favorites grid at top
- Have 8-12 favorites visible with recognizable icons (Gmail, Slack, GitHub, etc.)
- Show 1-2 expanded workspaces below
- Make sure the panel looks clean and organized

**Screenshot 2: Smart Tab Switching Demo**
- Show before/after of clicking a favorite
- Could use a simple annotation showing "Click → Focuses existing tab"
- Highlight the tab binding feature

**Screenshot 3: Workspaces Organized**
- Show multiple workspaces (Office, Personal, etc.)
- One expanded, others collapsed
- Shows the organizational power

**Screenshot 4: Search Feature**
- Show the search bar active (Cmd+K)
- Search results filtered
- Demonstrates quick access

**Screenshot 5: Preferences (Optional)**
- Show the preferences panel
- Highlights customization options

#### How to Take Screenshots:

1. **Set up a clean demo:**
   ```bash
   # Open these sites in tabs:
   - gmail.com
   - slack.com
   - github.com
   - notion.so
   - figma.com
   - linear.app
   ```

2. **Add them to favorites and workspaces**

3. **Take screenshots:**
   - Mac: `Cmd+Shift+4` then select the browser window
   - Windows: `Win+Shift+S` then select area
   - Or use browser dev tools: `Cmd+Shift+P` → "Capture screenshot"

4. **Resize to 1280x800:**
   - Use Preview (Mac) or Paint (Windows)
   - Or online tools like iloveimg.com/resize-image

### 2. Promotional Tile (OPTIONAL but Recommended)

**Small Tile:** 440x280 pixels
**Format:** PNG or JPEG

**Design tips:**
- Use the extension icon
- Add tagline: "Arc's Vertical Tabs for Any Browser"
- Keep it simple and professional
- Use brand colors

Tools to create:
- Canva (free templates)
- Figma
- Photoshop/GIMP

### 3. Store Listing Text (REQUIRED)

Already have this in README, but optimize for Chrome Web Store:

**Short Description (132 characters max):**
```
Arc-style vertical tabs & workspaces for Chrome. Smart tab switching, organized contexts, zero tab duplication.
```

**Detailed Description (no limit):**
Copy the key sections from README.md:
- Problem statement
- Key features (smart switching, workspaces, favorites)
- Who it's for
- Installation/usage

### 4. Category Selection

Choose: **Productivity**

### 5. Language

Primary: **English**

---

## Chrome Web Store Submission Checklist

Before submitting, verify:

- [ ] At least 1 screenshot (1280x800 or 640x400)
- [ ] Icons present (16px, 48px, 128px) ✅
- [ ] Privacy policy created and accessible ✅
- [ ] Manifest version is 1.0.0 ✅
- [ ] No `<all_urls>` permission ✅
- [ ] Description is clear and accurate
- [ ] All permissions are justified in description
- [ ] No trademark violations in name/description
- [ ] Tested extension works in latest Chrome

---

## Store Listing Description Template

Use this template for the Chrome Web Store description:

```markdown
Bring Arc Browser's best feature to any Chromium browser — vertical tabs, workspaces, and smart tab switching.

🎯 THE PROBLEM
Horizontal tabs are outdated for serious work:
• 20+ tabs make it impossible to see what's open
• Can't organize tabs by project or context
• Clicking Gmail opens another tab instead of focusing existing one
• Wasted time hunting for tabs

✨ THE SOLUTION
Arc-Inspired Workspaces gives you:

SMART TAB SWITCHING (Arc's Killer Feature)
• Click favorites → focuses existing tab or creates new
• Navigate anywhere → clicking again returns to same tab
• No more duplicate tabs cluttering your browser
• Keyboard shortcuts: Shift+Click (new tab), Cmd+Click (background)

WORKSPACES BY CONTEXT
• Organize tabs into Work, Personal, Client projects
• Collapse/expand for focus
• Add aliases to rename tabs

FAVORITES GRID
• Pin daily tools (Gmail, Slack, GitHub, etc.)
• Clean 4-column favicon grid
• One-click access

QUICK SEARCH
• Cmd/Ctrl+K to search across everything
• Instant tab switching

👥 WHO IT'S FOR
• Arc fans wanting AI browsers (Comet, Atlas, Dia)
• Product managers & knowledge workers
• Developers & designers
• Chrome/Brave users wanting better tab management

🔒 PRIVACY
• All data stored locally (no servers, no tracking)
• Open source: github.com/SwajanJain/arc-style-workspaces
• Full privacy policy available

⌨️ KEYBOARD SHORTCUTS
• Cmd/Ctrl+Shift+V: Toggle panel
• Cmd/Ctrl+K: Quick search
• Shift+Click: Force new tab
• Alt+Click: Cycle through matches

🚀 GET STARTED
1. Install extension
2. Click icon or press Cmd+Shift+V
3. Add your daily sites to favorites
4. Create workspaces for different contexts
5. Enjoy Arc-style tab management!

Questions? Issues? Visit our GitHub repo for support.
```

---

## Tips for Getting Approved Quickly

1. **Be transparent about permissions:**
   - Explain why you need each permission in the description
   - We only use: sidePanel, storage, tabs, favicon

2. **Privacy policy must be accessible:**
   - Link to PRIVACY.md in your GitHub repo
   - Make sure it's viewable without login

3. **Avoid trademark issues:**
   - We use "Arc-Inspired" (shows it's a tribute, not official)
   - Don't claim affiliation with The Browser Company
   - Credit Arc Browser in description

4. **Respond quickly to review feedback:**
   - Chrome reviewers may ask questions
   - Respond within 48 hours for faster approval

5. **Test thoroughly before submission:**
   - Works in latest Chrome version
   - No console errors
   - All features functional

---

## After Approval

1. Add Chrome Web Store badge to README
2. Update README with store link
3. Share on Product Hunt, HackerNews, Reddit
4. Tweet about launch

Good luck! 🚀
