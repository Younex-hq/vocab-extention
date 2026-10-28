# Vocab & Notes - Chrome Extension Context & Agent Log (`Agents.md`)

This document serves as the persistent memory, architectural blueprint, and context anchor for AI agents and developers working on the **Vocab & Notes** Chrome Browser Extension. Whenever a new session begins or project updates occur, read and update this file.

---

## 1. Project Overview

**Vocab & Notes** is a lightweight, minimalist, high-productivity Chrome extension built with Manifest V3. It enables users to:
1. **Save New Words on the Fly:**
   - Select text on any web page -> right-click -> choose **"Save word"**.
   - An isolated in-page modal dialog appears with the selected word prefilled, allowing immediate entry of a **translation** and optional **definition**.
   - Alternatively, open the extension popup and click the **"Add Word"** button to add words manually.
2. **Save Notes:**
   - Select text on any web page -> right-click -> choose **"Save as note"**.
   - An in-page modal appears with the selected text prefilled as the **Title**, allowing entry of the note **Body**.
   - Alternatively, open the extension popup and click the **"Add Note"** button to add notes manually.
3. **Browse & Manage Saves ("See Saves"):**
   - Click the extension icon and navigate to **"See Saves"**.
   - Two distinct tabs: **Words** and **Notes** with dynamic badge counts.
   - Real-time search across words, translations, definitions, titles, and body texts.
   - Inline edit and delete capabilities for all saved entries.
   - Direct clickable links back to the original source web pages.
4. **Export for Study & Anki:**
   - Export Words as **Anki-ready CSV** (`Word,Translation,Definition,SourceUrl,CreatedAt`) formatted with RFC 4180 escaping.
   - Export Words as structured **JSON**.
   - Export Notes as **CSV** or **JSON**.
   - Export **Full Vault Backup (JSON)** containing all words and notes combined.
   - Built-in Anki import instructions inside the export view.

---

## 2. Design System & Constraints

- **Design Philosophy:** Minimalist modern, prioritizing functionality, speed, and clarity.
- **Rule:** **No gradient colors.** Only solid, curated neutral tones and crisp borders.
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
- **Typography:** System font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`).
- **Isolation:** Shadow DOM used for all in-page content script modals to prevent any host page CSS from colliding with the extension UI.

---

## 3. Project File Structure

```
vocab-extention/
├── manifest.json        # Chrome Extension Manifest V3 configuration
├── background.js        # Background service worker (Context Menus & tab dispatch)
├── storage.js           # Shared storage layer & RFC 4180 CSV / JSON export engine
├── content.js           # In-page Shadow DOM modal for right-click word/note saving
├── content.css          # Fallback / host element style reset
├── popup.html           # Main extension popup HTML structure
├── popup.css            # Minimalist modern styling (zero gradients)
├── popup.js             # Extension popup UI logic, views, tabs, search, and exports
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
- Injected on web pages.
- Mounts a `#vocab-extension-root` host and attaches an `open` Shadow Root.
- Injects a backdrop modal containing:
  - Save Word: Word (prefilled), Translation (auto-focused), Definition, Source info, Save, Cancel.
  - Save Note: Title (prefilled), Body (auto-focused), Source info, Save, Cancel.
- Keyboard shortcuts:
  - `Escape` closes the modal.
  - `Enter` (or `Ctrl+Enter` / `Cmd+Enter` in textareas) submits and saves directly to storage.
  - Shows an animated checkmark toast upon saving and dismisses automatically.

### Popup Interface (`popup.html` & `popup.js`)
- Fixed dimensions: `440px` x `580px`.
- Direct navigation matching all required buttons:
  - `[ 📚 See Saves ]`: Subtabs for Words (with badge count) and Notes (with badge count), real-time search, cards with edit and delete actions.
  - `[ + Add Word ]`: Quick manual form for word, translation, definition, and source URL.
  - `[ + Add Note ]`: Quick manual form for title, body, and source URL.
  - `[ ⤓ Export ]`: Direct download buttons for CSV (Anki compatible) and JSON formats.

### Anki Compatibility & RFC 4180 CSV Export
- Anki requires clean tabular data. `storage.js` escapes quotes as `""` and wraps fields containing commas, quotes, or newlines in double quotes.
- Words CSV format:
  `Word,Translation,Definition,SourceUrl,CreatedAt`
- Anki Field Mapping:
  - Field 1 = Front
  - Field 2 = Back
  - Field 3 = Notes / Context

---

## 6. How to Load and Test the Extension in Google Chrome

1. Open Google Chrome.
2. Navigate to `chrome://extensions/`.
3. Enable **Developer mode** toggle in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Select the project directory: `c:\Users\Younes-Asus\Desktop\vocab-extention`.
6. Test functionality:
   - Go to any website (e.g. `https://en.wikipedia.org/wiki/Language`).
   - Highlight any word -> right-click -> click **Save word "..."**. Fill in translation and definition -> click **Save**.
   - Highlight a sentence or paragraph -> right-click -> click **Save as note "..."**. Fill in note body -> click **Save**.
   - Click the extension icon in Chrome toolbar -> click **See Saves** -> verify your word in the **Words** tab and note in the **Notes** tab.
   - Test adding a word and note directly through the **Add Word** and **Add Note** buttons in the popup.
   - Go to **Export** tab and download `.csv` and `.json` files to inspect them.

---

## 7. Change Log & Session History

### Session 1 (2026-10-28):
- **Created:**
  - `manifest.json` (Manifest V3, permissions: contextMenus, storage, activeTab, scripting).
  - `storage.js` (Shared storage helper with CRUD for words/notes and RFC 4180 CSV/JSON export).
  - `background.js` (Service worker registering context menus with dynamic fallback injection).
  - `content.js` & `content.css` (Shadow DOM isolated in-page modal dialogs for saving words and notes).
  - `popup.html`, `popup.css`, `popup.js` (Minimalist modern interface with zero gradients, tabs, search, forms, edit/delete modals, and export options).
  - `icons/` (Generated 16x16, 32x32, 48x48, 128x128 PNGs + SVG).
  - `Agents.md` (Comprehensive documentation and persistent memory for agents).
  - Tested JavaScript syntax and data structures.
