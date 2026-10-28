# Vocab & Notes - Chrome Extension Context & Agent Log (`Agents.md`)

This document serves as the persistent memory, architectural blueprint, and context anchor for AI agents and developers working on the **Vocab & Notes** Chrome Browser Extension. Whenever a new session begins or project updates occur, read and update this file.

---

## 1. Project Overview

**Vocab & Notes** is a lightweight, minimalist, high-productivity Chrome extension built with Manifest V3. It enables users to:

1. **Save New Words on the Fly:**
   - Select text on any web page -> right-click -> choose **"Save word"**.
   - An isolated in-page modal dialog appears with the selected word prefilled, allowing immediate entry of a **translation**, optional **definition**, **color accent**, and **tags**.
   - Alternatively, open the extension popup and click the **"Add Word"** button to add words manually with color and tags.
2. **Save Notes:**
   - Select text on any web page -> right-click -> choose **"Save as note"**.
   - An in-page modal appears with the selected text prefilled as the **Title**, allowing entry of the note **Body**, **color accent**, and **tags**.
   - Alternatively, open the extension popup and click the **"Add Note"** button to record notes manually.
3. **Browse & Manage Saves ("See Saves"):**
   - Click the extension icon and navigate to **"See Saves"**.
   - Two distinct tabs: **Words** and **Notes** with dynamic badge counts.
   - Real-time search across words, translations, definitions, titles, body texts, and tags.
   - **Collapsible Filter & Sort Dropdown:** Compact toggle button with active filter counter (`Filter (X) ▾`) that expands into a collapsible menu, taking zero permanent vertical space when closed.
   - **Multi-attribute Sorting:** Newest First, Oldest First, Alphabetical (A → Z), Alphabetical (Z → A).
   - **Multi-attribute Filtering:** Filter by Color, filter by dynamic Tags, filter by origin Website domain.
   - Color indicator dots and left borders on cards. Clickable tag pills that instantly filter by that tag.
   - Inline edit and delete capabilities for all saved entries.
   - Direct clickable links back to original source web pages.
4. **Backup, Restore & Export:**
   - **Import Old Saves:** Import words and notes from previously exported `.json` or `.csv` backup files. Automatically skips duplicates and normalizes tags and colors.
   - **Export for Anki & Backup:**
     - Export Words as **Anki-ready CSV** (`Word,Translation,Definition,Color,Tags,SourceUrl,CreatedAt`) formatted with RFC 4180 escaping.
     - Export Words as structured **JSON**.
     - Export Notes as **CSV** or **JSON**.
     - Export **Full Vault Backup (JSON)** containing all words and notes combined.
     - Built-in Anki import instructions inside the export view.
5. **Dark Mode & Light Mode:**
   - Toggle button in header (`☀️ / 🌙`) with solid slate dark palette. Persisted in `chrome.storage.local`.
   - Also automatically syncs to in-page right-click Shadow DOM modals.

---

## 2. Storage Capacity & Quota Architecture

### Question: How much data (words and notes) can the extension hold?

1. **Standard Chrome Storage Quota:**
   - By default, Chrome's `chrome.storage.local` provides a **10 Megabytes (10,485,760 bytes)** quota.
   - An average word entry (JSON text: word, translation, definition, color, tags, timestamps, source URL) takes ~**250 - 400 bytes**.
   - An average note entry takes ~**300 - 800 bytes**.
   - Even without special permissions, 10 MB comfortably holds between **25,000 to 40,000 words and notes**.

2. **With `"unlimitedStorage"` Permission (Active in `manifest.json`):**
   - We added the `"unlimitedStorage"` permission to `manifest.json`.
   - Google Chrome completely removes the 10 MB quota limit for `chrome.storage.local`.
   - The extension can hold **hundreds of thousands or millions of words and notes**, bounded only by the user's local disk capacity.

---

## 3. Design System & Constraints

- **Design Philosophy:** Minimalist modern, prioritizing functionality, speed, and clarity.
- **Rule:** **No gradient colors.** Only solid, curated neutral tones, solid accent swatches, and crisp borders.
- **Themes:**
  - **Light Mode:** Backgrounds (`#ffffff`, `#f8fafc`), text (`#0f172a`, `#475569`), borders (`#e2e8f0`).
  - **Dark Mode:** Backgrounds (`#0f172a`, `#020617`, `#1e293b`), text (`#f8fafc`, `#cbd5e1`), borders (`#334155`).
- **Solid Swatches for Categorization:**
  - `none`: `#94a3b8` (Slate / Default)
  - `blue`: `#2563eb` (Solid Blue)
  - `green`: `#16a34a` (Solid Green)
  - `yellow`: `#d97706` (Solid Amber)
  - `red`: `#dc2626` (Solid Red)
  - `purple`: `#9333ea` (Solid Purple)
  - `orange`: `#ea580c` (Solid Orange)
- **Typography:** System font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`).
- **Isolation:** Shadow DOM used for all in-page content script modals to prevent any host page CSS from colliding with the extension UI.

---

## 4. Project File Structure

```
vocab-extension/
├── manifest.json        # Chrome Extension Manifest V3 (with unlimitedStorage)
├── background.js        # Background service worker (Context Menus & tab dispatch)
├── storage.js           # Shared storage layer, RFC 4180 CSV / JSON engine, Importers & Theme
├── content.js           # In-page Shadow DOM modal (colors, tags, dark theme support)
├── content.css          # Fallback / host element style reset
├── popup.html           # Popup HTML (collapsible filter dropdown, dark toggle, import UI)
├── popup.css            # Minimalist styles with complete [data-theme="dark"] rules
├── popup.js             # Controller handling theme, collapsible dropdown, imports, and exports
├── icons/
│   ├── icon16.png       # 16x16 extension icon
│   ├── icon32.png       # 32x32 extension icon
│   ├── icon48.png       # 48x48 extension icon
│   ├── icon128.png      # 128x128 extension icon
│   └── icon.svg         # Scalable vector icon
├── Agents.md            # Agent context, session history, and architectural documentation
└── README.md            # User guide and quick start instructions
```

---

## 5. Data Models (`storage.js`)

All data is persisted in `chrome.storage.local`.

### Word Item Schema

```typescript
interface WordItem {
  id: string; // e.g. "word_1730150000000_abc12"
  word: string; // Selected or manually typed word
  translation: string; // Target language translation
  definition: string; // Meaning, context, or example sentence
  color: string; // 'none' | 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange'
  tags: string[]; // e.g. ["adjective", "b2", "literature"]
  sourceUrl: string; // URL of the page where captured
  sourceTitle: string; // Page title where captured
  context: string; // Optional sentence context
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}
```

### Note Item Schema

```typescript
interface NoteItem {
  id: string; // e.g. "note_1730150000000_xyz34"
  title: string; // Selected text or manual title
  body: string; // User written note content
  color: string; // 'none' | 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange'
  tags: string[]; // e.g. ["grammar", "french", "study"]
  sourceUrl: string; // URL of the page where captured
  sourceTitle: string; // Page title
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}
```

---

## 6. Implementation Details

### Collapsible Filter & Sort Menu

- Embedded next to the search input via `#btn-toggle-filters`.
- Contains a dynamic badge displaying active filters count.
- Expands/collapses the `#filter-dropdown-panel`. When collapsed, it takes 0px vertical height.
- Contains Sort By, Color filter, Tag filter, Website domain filter, and Reset All button.

### Import Functionality (`storage.js`)

- `importFromJson(jsonString)`: Supports full backup `{ words, notes }` or plain arrays. De-duplicates entries by matching word + translation or note title + body.
- `importFromCsv(csvText)`: Uses custom `parseCsv()` compliant with RFC 4180. Detects words vs notes from headers, maps columns, and imports without duplicates.

### Dark Mode Architecture

- `VocabStorage.getTheme()` / `VocabStorage.setTheme()` reads/writes `'vocab_theme'`.
- Toggle button in header switches `data-theme="dark"` attribute on `document.documentElement`.
- In-page Shadow DOM modal checks theme before rendering and applies `.dark` styles.

### Cross-Browser Architecture (Chrome & Firefox)

- **Universal WebExtension Resolver:** Dynamically resolves `browser` (native Gecko API) or `chrome` (Chromium API) across background, content, popup, and storage scripts.
- **Gecko ID:** Added `browser_specific_settings.gecko.id: "vocab-notes@study-vault.extension"` to `manifest.json`.
- **Context Menus & Scripting:** Seamlessly accesses `browser.contextMenus || browser.menus` and `browser.scripting` across both engines.
- **Dual Async Storage:** Checks for native Promise support on `storage.local` with automatic callback fallback.
- **Popup Sizing:** Added explicit `html, body` min/max dimension constraints for Firefox extension popup sizing.

---

## 7. Change Log & Session History

### Session 1 (2026-10-28):

- Created base Manifest V3 extension structure (Context menus, in-page modals, popup with tabs, CSV/JSON export, Agents.md).

### Session 2 (2026-10-28):

- Added Color categorization (7 solid swatches, card left borders, color dots).
- Added Tagging support (clean parsing, card tag pills, click-to-filter).
- Added Sorting engine (Time & Alphabetical, Ascending & Descending).
- Added Multi-attribute Filtering (Color, Tags, Website domain).

### Session 3 (2026-10-28):

- **Collapsible Filter & Sort Menu:** Converted filter toolbar into a collapsible dropdown menu triggered by a toggle button with an active filter counter badge.
- **Import Engine:** Added `importFromJson()` and `importFromCsv()` to restore backups with duplicate prevention.
- **Dark Mode System:** Added solid dark mode theme (`[data-theme="dark"]`), header toggle button, and dark styling support for in-page Shadow DOM modals.
- **Unlimited Storage:** Added `"unlimitedStorage"` to `manifest.json`, removing the default 10MB quota and allowing virtually unlimited storage for notes and words.
- Documented storage capacity and updated `Agents.md`.

### Session 4 (2026-10-28):

- **Firefox & Chrome Divergence Resolution:**
  - Resolved the Manifest V3 background discrepancy: Chrome strictly forbids `background.scripts` (showing a yellow warning), while Firefox strictly requires `background.scripts` (throwing a fatal error if only `service_worker` is provided).
  - Created standalone manifests:
    - [`manifest.chrome.json`](file:///c:/Users/Younes-Asus/Desktop/vocab-extension/manifest.chrome.json): Dedicated to Chromium (service_worker only, 0 warnings).
    - [`manifest.firefox.json`](file:///c:/Users/Younes-Asus/Desktop/vocab-extension/manifest.firefox.json): Dedicated to Gecko (background.scripts and gecko ID, 0 errors).
  - Created zero-dependency [`build.js`](file:///c:/Users/Younes-Asus/Desktop/vocab-extension/build.js) and [`package.json`](file:///c:/Users/Younes-Asus/Desktop/vocab-extension/package.json):
    - `npm run build`: Generates standalone `dist/chrome/` and `dist/firefox/` simultaneously.
    - `npm run for:chrome`: Swaps root `manifest.json` to Chrome target.
    - `npm run for:firefox`: Swaps root `manifest.json` to Firefox target.
  - Implemented universal API resolver across `storage.js`, `background.js`, `content.js`, and `popup.js` supporting both `browser.*` and `chrome.*` namespaces.
  - Implemented dual Promise and callback fallbacks for `storage.local.get` / `set` and `contextMenus.removeAll`.
  - Added Firefox internal page URL handling (`about:`) alongside `chrome://` in tab query routines.
  - Updated `popup.css` with explicit `html, body` min/max constraints to prevent popup resizing quirks in Firefox.
  - Updated `README.md` with instructions for both browsers.
