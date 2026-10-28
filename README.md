# Vocab & Notes - Chrome Extension

A minimalist, high-productivity Chrome Extension (Manifest V3) for saving vocabulary with translations and definitions, clipping notes from web pages, color-coding, tagging, and exporting directly to **Anki** or spreadsheets.

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
   - Two sub-tabs: **Words** and **Notes** with count badges.
   - **Sorting:**
     - Time: Newest first (Descending), Oldest first (Ascending).
     - Alphabetical: A &rarr; Z, Z &rarr; A.
   - **Filtering:**
     - Search across titles, words, definitions, translations, and tags.
     - Filter by **Color** (Blue, Green, Yellow, Red, Purple, Orange, No Color).
     - Filter by **Tags** (dynamically populated from your saves).
     - Filter by **Website** (e.g. `wikipedia.org`, `github.com`).
     - One-click **Reset** filters button.
   - In-app **Edit** and **Delete** actions.
   - Interactive `#tag` pills on cards: click any tag to filter by it immediately.

4. **Export for Anki & Backup:**
   - **Words (CSV):** Anki-ready formatted CSV (`Word, Translation, Definition, Color, Tags, SourceUrl, CreatedAt`).
   - **Words (JSON):** Full vocabulary backup.
   - **Notes (CSV):** Formatted spreadsheet table of notes.
   - **Notes (JSON):** Full notes backup.
   - **All Data (JSON):** Combined vault backup.

5. **Minimalist Modern Design:**
   - Pure solid color palette, zero gradients, fast performance, fully isolated via Shadow DOM.

---

## How to Install / Reload in Google Chrome

1. In Google Chrome, go to `chrome://extensions/`.
2. Toggle on **Developer mode** in the upper-right corner.
3. If already loaded, click the **Reload icon** (🔄) on the *Vocab & Notes* card. If not yet loaded, click **Load unpacked** and select this directory (`vocab-extention`).
4. Pin **Vocab & Notes** to your browser toolbar!
