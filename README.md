# Vocab & Notes - Cross-Browser Extension (Chrome & Firefox)

A minimalist, high-productivity browser extension (Manifest V3) for saving vocabulary with translations and definitions, clipping notes from web pages, color-coding, tagging, and exporting directly to **Anki** or spreadsheets.

**Works seamlessly in:**

- Google Chrome, and other Chromium browsers (Brave, MS Edge, Opera ...)
- Mozilla Firefox, and other Firefox browsers (Zen, Tor Browser, Waterfox ...)

---

## Features

1. **Right-Click to Save Words:**
   - Select any word on a webpage, right-click, and choose **Save word "..."**.
   - An in-page modal opens with the selected word prefilled.
   - Enter translation, definition, pick a **color accent**, and add **tags**.
   - Or click **Add Word** in the extension popup to add words manually.

2. **Right-Click to Save Notes:**
   - Select any text on a webpage, right-click, and choose **Save as note "..."**.
   - An in-page modal opens with the selected text as the note's Title.
   - Enter your note body, pick a **color accent**, and add **tags**.
   - Or click **Add Note** in the extension popup to record notes manually.

3. **See Saves:**
   - Click the extension icon and select **See Saves**.
   - Two sub-tabs: **Words** and **Notes** with live count badges.
   - **Collapsible Sort & Filter Dropdown:** Keeps the interface clean and spacious without taking permanent vertical space.
   - **Sorting:** Newest First, Oldest First, Alphabetical A &rarr; Z, Alphabetical Z &rarr; A.
   - **Filtering:** Search bar + filters by Color, Tags, and origin Website domain.
   - In-app **Edit** and **Delete** actions.
   - Interactive `#tag` pills on cards: click any tag to filter by it immediately.

4. **Dark & Light Mode:**
   - Header toggle button (`🌙 / ☀️`) with solid slate dark theme.
   - Automatically synchronizes with in-page right-click dialogs.

5. **Backup, Restore & Export:**
   - **Import Old Saves:** Restore from `.json` or `.csv` files with automatic duplicate skipping.
   - **Words (CSV):** Anki-ready formatted CSV (`Word, Translation, Definition, Color, Tags, SourceUrl, CreatedAt`).
   - **Words (JSON):** Full vocabulary backup.
   - **Notes (CSV):** Formatted spreadsheet table of notes.
   - **Notes (JSON):** Full notes backup.
   - **All Data (JSON):** Combined vault backup.

6. **Minimalist Modern Design:**
   - Pure solid color palette, zero gradients, fast performance, fully isolated via Shadow DOM.

---

## Browser Setup & Installation

Because Chrome and Firefox have differing Manifest V3 requirements for background workers (`service_worker` in Chrome vs `background.scripts` in Firefox), the project ships **two dedicated, pre-built folders** in `dist/`, so both browsers run with **zero warnings and zero errors**.

### Option A: Using the `dist` distributions (Simultaneous, 0 warnings in both)

The `dist/` folder is **committed to this repository**, so both browser builds are already present and can be loaded immediately — **no build step required**.

You only need to regenerate them after editing a source file at the project root (`background.js`, `storage.js`, `content.js`, `content.css`, `popup.html`, `popup.css`, `popup.js`, `build.js`, or any icon). Skipping this step means `dist/` keeps serving the older copies:

```bash
npm run build
```

This refreshes both dedicated folders in `dist/`:

- **For Google Chrome / Edge / Brave:**
  1. Open `chrome://extensions/` and enable **Developer mode**.
  2. Click **Load unpacked** and select the folder:
     `vocab-extention/dist/chrome`
  3. Result: **0 errors, 0 warnings!**

- **For Mozilla Firefox:**
  1. Open `about:debugging#/runtime/this-firefox`.
  2. Click **Load Temporary Add-on...** and select:
     `vocab-extention/dist/firefox/manifest.json`
  3. Result: **0 errors, 0 warnings!**

---

### Option B: Developing directly from the root folder

If you prefer loading directly from the project root directory, you can switch the root `manifest.json` on demand. Beware that the committed root `manifest.json` is the **Chrome** variant, so loading the project root in Firefox without running the command below fails with `background.service_worker is currently disabled. Add background.scripts.`

- **For Chrome (Default):**

  ```bash
  npm run for:chrome
  ```

  _(Configures `manifest.json` with `service_worker`, removing the `background.scripts` warning)_

- **For Firefox:**
  ```bash
  npm run for:firefox
  ```
  _(Configures `manifest.json` with `background.scripts` and gecko ID for Firefox)_
