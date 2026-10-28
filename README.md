# Vocab & Notes - Chrome Extension

A minimalist, high-productivity Chrome Extension (Manifest V3) for saving vocabulary with translations and definitions, clipping notes from web pages, and exporting directly to **Anki** or spreadsheets.

---

## Features

1. **Right-Click to Save Words:**
   - Select any word on a webpage, right-click, and choose **Save word "..."**.
   - An in-page modal opens with the selected word prefilled.
   - Enter the translation and optional definition.
   - Or click **Add Word** in the extension popup to add words manually.

2. **Right-Click to Save Notes:**
   - Select any text on a webpage, right-click, and choose **Save as note "..."**.
   - An in-page modal opens with the selected text as the note's Title.
   - Enter your note body.
   - Or click **Add Note** in the extension popup to record notes manually.

3. **See Saves:**
   - Click the extension icon and select **See Saves**.
   - Two sub-tabs: **Words** and **Notes** with count badges.
   - Instant search filter across all fields.
   - In-app **Edit** and **Delete** actions.
   - Direct link to original source web pages.

4. **Export for Anki & Backup:**
   - **Words (CSV):** Anki-ready formatted CSV (`Word, Translation, Definition, SourceUrl, CreatedAt`).
   - **Words (JSON):** Full vocabulary backup.
   - **Notes (CSV):** Formatted spreadsheet table of notes.
   - **Notes (JSON):** Full notes backup.
   - **All Data (JSON):** Combined vault backup.

5. **Minimalist Modern Design:**
   - Pure solid neutral palette, zero gradients, fast performance, fully isolated via Shadow DOM.

---

## How to Install in Google Chrome

1. Clone or download this repository.
2. In Google Chrome, go to `chrome://extensions/`.
3. Toggle on **Developer mode** in the upper-right corner.
4. Click **Load unpacked** in the upper-left corner.
5. Select this folder (`vocab-extention`).
6. Pin **Vocab & Notes** to your browser toolbar!

---

## How to Import Words into Anki

1. In the extension popup, go to **Export** and click **Download .CSV** under *Saved Words*.
2. Open Anki on your computer.
3. Click **File > Import...** and select the downloaded CSV file.
4. Set the **Field Separator** to **Comma**.
5. Map:
   - Field 1 &rarr; Front (Word)
   - Field 2 &rarr; Back (Translation)
   - Field 3 &rarr; Definition / Extra Notes
6. Click **Import**!
