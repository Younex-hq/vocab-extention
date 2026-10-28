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
   - **Multi-attribute Sorting:** Newest First, Oldest First, Alphabetical (A → Z), Alphabetical (Z → A).
   - **Multi-attribute Filtering:** Filter by Color, filter by dynamic Tags, filter by origin Website.
   - Color indicator dots and left borders on cards. Clickable tag pills that instantly filter by that tag.
   - Inline edit and delete capabilities for all saved entries.
   - Direct clickable links back to original source web pages.
4. **Export for Study & Anki:**
   - Export Words as **Anki-ready CSV** (`Word,Translation,Definition,Color,Tags,SourceUrl,CreatedAt`) formatted with RFC 4180 escaping.
   - Export Words as structured **JSON**.
   - Export Notes as **CSV** or **JSON**.
   - Export **Full Vault Backup (JSON)** containing all words and notes combined.
   - Built-in Anki import instructions inside the export view.

---

## 2. Design System & Constraints

- **Design Philosophy:** Minimalist modern, prioritizing functionality, speed, and clarity.
- **Rule:** **No gradient colors.** Only solid, curated neutral tones, solid accent swatches, and crisp borders.
- **Color Palette:**
  - Primary Background: `#ffffff`
  - Secondary Background: `#f8fafc`
  - Tertiary / Muted: `#f1f5f9`
  - Text Primary: `#0f172a` (Slate 900)
  - Text Secondary: `#475569` (Slate 600)
  - Text Muted: `#64748b` (Slate 500)
  - Borders: `#e2e8f0` (Base), `#cbd5e1` (Input borders)
  - Accent Solid: `#2563eb` (Blue 600), Hover: `#1d4ed8`
  - Accent Light: `#eff6ff` (Blue 50), Border: `#bfdbfe`
  - Danger Solid: `#dc2626` (Red 600), Hover: `#b91c1c`
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

## 3. Project File Structure

```
vocab-extention/
├── manifest.json        # Chrome Extension Manifest V3 configuration
├── background.js        # Background service worker (Context Menus & tab dispatch)
├── storage.js           # Shared storage layer & RFC 4180 CSV / JSON export engine
├── content.js           # In-page Shadow DOM modal for right-click word/note saving (with colors & tags)
├── content.css          # Fallback / host element style reset
├── popup.html           # Main extension popup HTML structure (filters, sorting, colors, tags)
├── popup.css            # Minimalist modern styling (zero gradients, color swatches, tag pills)
├── popup.js             # Extension popup controller with multi-factor sorting and filtering
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

## 4. Data Models (`storage.js`)

All data is persisted in `chrome.storage.local`.

### Word Item Schema
```typescript
interface WordItem {
  id: string;             // e.g. "word_1730150000000_abc12"
  word: string;           // Selected or manually typed word
  translation: string;    // Target language translation
  definition: string;     // Meaning, context, or example sentence
  color: string;          // 'none' | 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange'
  tags: string[];         // e.g. ["adjective", "b2", "literature"]
  sourceUrl: string;      // URL of the page where captured
  sourceTitle: string;    // Page title where captured
  context: string;        // Optional sentence context
  createdAt: string;      // ISO 8601 timestamp
  updatedAt: string;      // ISO 8601 timestamp
}
```

### Note Item Schema
```typescript
interface NoteItem {
  id: string;             // e.g. "note_1730150000000_xyz34"
  title: string;          // Selected text or manual title
  body: string;           // User written note content
  color: string;          // 'none' | 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange'
  tags: string[];         // e.g. ["grammar", "french", "study"]
  sourceUrl: string;      // URL of the page where captured
  sourceTitle: string;    // Page title
  createdAt: string;      // ISO 8601 timestamp
  updatedAt: string;      // ISO 8601 timestamp
}
```

---

## 5. Implementation Details

### Context Menus & Background Dispatch
- Context menus are created via `chrome.contextMenus.create` on `runtime.onInstalled`.
- Context menu options:
  - `vocab_save_word`: "Save word \"%s\"" (contexts: `['selection']`)
  - `vocab_save_note`: "Save as note \"%s\"" (contexts: `['selection']`)
- When clicked, `background.js` extracts the selection text and sends a message to the active tab's content script.
- Includes a fallback script injector using `chrome.scripting.executeScript` for web pages opened before the extension was loaded or reloaded.

### In-Page Content Script Dialog (`content.js`)
- Injected on web pages using Shadow DOM.
- Supports:
  - Save Word: Word (prefilled), Translation (auto-focused), Definition, Color Swatches, Tags input, Source info, Save, Cancel.
  - Save Note: Title (prefilled), Body (auto-focused), Color Swatches, Tags input, Source info, Save, Cancel.
- Keyboard shortcuts:
  - `Escape` closes modal.
  - `Enter` / `Ctrl+Enter` saves directly to `chrome.storage.local`.

### Popup Interface (`popup.html` & `popup.js`)
- Fixed dimensions: `460px` x `600px`.
- Direct navigation:
  - `[ 📚 See Saves ]`: Subtabs for Words and Notes, real-time search, sorting dropdown, color filter, dynamic tag filter, dynamic website filter, reset button, and item cards with edit/delete.
  - `[ + Add Word ]`: Manual form for word, translation, definition, color swatches, tags, and source URL.
  - `[ + Add Note ]`: Manual form for title, body, color swatches, tags, and source URL.
  - `[ ⤓ Export ]`: Direct download buttons for CSV (Anki compatible) and JSON formats.

### Sorting & Filtering Engine
- **Sorting:**
  - `date-desc`: Newest first
  - `date-asc`: Oldest first
  - `alpha-asc`: Alphabetical A &rarr; Z (by word or title)
  - `alpha-desc`: Alphabetical Z &rarr; A (by word or title)
- **Filtering:**
  - Text search: Matches query across title/word, translation, definition/body, and tags.
  - Color filter: Matches selected solid color or "all".
  - Tag filter: Dynamically populated from all active items. Clicking a `#tag` pill on any card auto-applies this filter.
  - Website filter: Dynamically populated with unique domains extracted from `sourceUrl` using `extractDomain()`.
  - Reset button: Restores all filters to defaults in one click.

### Anki Compatibility & RFC 4180 CSV Export
- Words CSV format: `Word,Translation,Definition,Color,Tags,SourceUrl,CreatedAt`
- Notes CSV format: `Title,Body,Color,Tags,SourceUrl,CreatedAt`
- Fields containing commas, newlines, or quotes are properly escaped with double quotes.

---

## 6. How to Load and Test the Extension in Google Chrome

1. Open Google Chrome.
2. Navigate to `chrome://extensions/`.
3. Enable **Developer mode** toggle in the top-right corner.
4. Click **Load unpacked** (or click the reload icon on the "Vocab & Notes" card).
5. Select the project directory: `c:\Users\Younes-Asus\Desktop\vocab-extention`.
6. Test functionality:
   - Highlight text on any page -> right-click -> **Save word** or **Save as note**. Choose a color swatch and add tags -> save.
   - Open popup -> click **See Saves** -> test sorting by time and alphabetical order.
   - Test filtering by color, selecting a tag, and filtering by website.
   - Click a tag pill on any card to test instant tag filtering.
   - Test adding with colors and tags from popup, and editing an existing item.
   - Go to **Export** and download updated CSVs and JSONs.

---

## 7. Change Log & Session History

### Session 1 (2026-10-28):
- Created base Manifest V3 extension structure:
  - Context menu word and note saving via Shadow DOM in-page modals.
  - Extension popup with See Saves (Words/Notes tabs), Add Word, Add Note, and Export views.
  - RFC 4180 CSV and JSON exporters with Anki guide.
  - Created initial `Agents.md` context file.

### Session 2 (2026-10-28):
- Added **Color categorization**:
  - 7 solid, minimalist swatches (`none`, `blue`, `green`, `yellow`, `red`, `purple`, `orange`).
  - Swatch pickers in in-page modal (`content.js`), popup add forms (`popup.html`/`popup.js`), and edit modals.
  - Visual color indicators: Left border stripe and colored dot on word & note cards.
- Added **Tagging support**:
  - Tags input in in-page dialog, popup forms, and edit modal.
  - Normalized lowercase, trimmed, deduplicated tags.
  - Clickable `#tag` pills on cards that immediately filter the list.
- Added **Sorting engine**:
  - Newest First, Oldest First, Alphabetical A &rarr; Z, Alphabetical Z &rarr; A.
- Added **Multi-attribute Filtering**:
  - Filter by color dropdown.
  - Filter by dynamically aggregated tags dropdown.
  - Filter by dynamically aggregated website domains (`extractDomain()`) dropdown.
  - Real-time combined filtering with search query and one-click Reset button.
- Updated CSV and JSON export formats to include `Color` and `Tags`.
- Updated `Agents.md` documentation.
