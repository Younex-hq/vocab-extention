/**
 * storage.js - Centralized storage, export, and import helper for Vocab & Notes Extension
 * Compatible with Background Service Worker, Content Scripts, and Popup.
 */

(function (root) {
  "use strict";

  const STORAGE_KEYS = {
    WORDS: "vocab_words",
    NOTES: "vocab_notes",
    THEME: "vocab_theme",
    DEFAULT_VIEW: "vocab_default_view",
  };

  const VALID_COLORS = [
    "none",
    "blue",
    "green",
    "yellow",
    "red",
    "purple",
    "orange",
  ];

  const VALID_VIEWS = ["view-see-saves", "view-add-word", "view-add-note"];

  /**
   * Generates a unique, sortable identifier
   */
  function generateId(prefix = "item") {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
  }

  /**
   * Parse tags from string (comma-separated) or array into clean, lowercase, unique tag array
   */
  function parseTags(input) {
    if (!input) return [];
    if (Array.isArray(input)) {
      return [
        ...new Set(
          input.map((t) => String(t).trim().toLowerCase()).filter(Boolean),
        ),
      ];
    }
    return [
      ...new Set(
        String(input)
          .split(/[,;]/)
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
  }

  /**
   * Describe the tag currently being typed inside a comma-separated tag input.
   * Returns the token under the caret together with the range it occupies.
   */
  function getTagTokenContext(value, caret) {
    const upto = String(value || "").slice(0, caret);
    const lastSeparator = Math.max(
      upto.lastIndexOf(","),
      upto.lastIndexOf(";"),
    );
    const rawStart = lastSeparator + 1;
    const raw = upto.slice(rawStart);
    const leadingSpace = raw.length - raw.trimStart().length;
    return { token: raw.trim(), start: rawStart + leadingSpace, end: caret };
  }

  /**
   * Replace the tag token at [start, end) with `tag`, preserving the rest of the
   * comma-separated value. Returns the new value and the caret position to restore.
   */
  function applyTagSelection(value, start, end, tag) {
    const str = String(value || "");
    const before = str.slice(0, start);
    const after = str
      .slice(end)
      .replace(/^\s*[,;]\s*/, "")
      .trim();
    const inserted = before + tag + ", ";
    return { value: inserted + after, caret: inserted.length };
  }

  /**
   * Validate or default color
   */
  function sanitizeColor(color) {
    if (!color || typeof color !== "string") return "none";
    const c = color.toLowerCase().trim();
    return VALID_COLORS.includes(c) ? c : "none";
  }

  /**
   * Extract clean domain from URL
   */
  function extractDomain(url) {
    if (!url) return "Direct / Manual";
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, "");
    } catch {
      return "Direct / Manual";
    }
  }

  /**
   * Universal WebExtension API Resolver (Firefox 'browser' or Chromium 'chrome')
   */
  function getBrowserAPI() {
    if (typeof browser !== "undefined" && browser && browser.storage)
      return browser;
    if (typeof chrome !== "undefined" && chrome && chrome.storage)
      return chrome;
    if (typeof globalThis !== "undefined") {
      if (globalThis.browser && globalThis.browser.storage)
        return globalThis.browser;
      if (globalThis.chrome && globalThis.chrome.storage)
        return globalThis.chrome;
    }
    return null;
  }

  /**
   * Helper to safely interact with storage across Chrome and Firefox
   */
  async function getFromStorage(key) {
    const api = getBrowserAPI();
    if (!api || !api.storage || !api.storage.local) return undefined;

    // Check for native Promise support (Firefox and modern Chrome)
    try {
      const res = api.storage.local.get([key]);
      if (res && typeof res.then === "function") {
        const data = await res;
        return data ? data[key] : undefined;
      }
    } catch (e) {
      // Fallback to callback if promise fails
    }

    // Callback fallback
    return new Promise((resolve, reject) => {
      api.storage.local.get([key], (result) => {
        if (api.runtime && api.runtime.lastError) {
          return reject(api.runtime.lastError);
        }
        resolve(result ? result[key] : undefined);
      });
    });
  }

  async function setInStorage(key, value) {
    const api = getBrowserAPI();
    if (!api || !api.storage || !api.storage.local) return;

    // Check for native Promise support
    try {
      const res = api.storage.local.set({ [key]: value });
      if (res && typeof res.then === "function") {
        await res;
        return;
      }
    } catch (e) {
      // Fallback to callback
    }

    return new Promise((resolve, reject) => {
      api.storage.local.set({ [key]: value }, () => {
        if (api.runtime && api.runtime.lastError) {
          return reject(api.runtime.lastError);
        }
        resolve();
      });
    });
  }

  /**
   * Robust RFC 4180 CSV Parser
   * Correctly handles quoted fields, escaped quotes (""), and multiline content.
   */
  function parseCsv(csvText) {
    const rows = [];
    let currentRow = [];
    let currentField = "";
    let insideQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentField += '"';
          i++; // skip second quote of pair
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === "," && !insideQuotes) {
        currentRow.push(currentField);
        currentField = "";
      } else if ((char === "\r" || char === "\n") && !insideQuotes) {
        if (char === "\r" && nextChar === "\n") {
          i++;
        }
        currentRow.push(currentField);
        if (currentRow.some((f) => f.trim() !== "")) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }

    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField);
      if (currentRow.some((f) => f.trim() !== "")) {
        rows.push(currentRow);
      }
    }

    return rows;
  }

  const VocabStorage = {
    VALID_COLORS,
    VALID_VIEWS,
    parseTags,
    getTagTokenContext,
    applyTagSelection,
    sanitizeColor,
    extractDomain,
    parseCsv,

    // -------------------------------------------------------------
    // THEME MANAGEMENT (Dark / Light)
    // -------------------------------------------------------------

    async getTheme() {
      const theme = await getFromStorage(STORAGE_KEYS.THEME);
      return theme === "dark" ? "dark" : "light";
    },

    async setTheme(theme) {
      const val = theme === "dark" ? "dark" : "light";
      await setInStorage(STORAGE_KEYS.THEME, val);
      return val;
    },

    // -------------------------------------------------------------
    // WORDS CRUD
    // -------------------------------------------------------------

    async getWords() {
      const words = (await getFromStorage(STORAGE_KEYS.WORDS)) || [];
      return words.map((w) => ({
        ...w,
        color: sanitizeColor(w.color),
        tags: Array.isArray(w.tags) ? w.tags : [],
      }));
    },

    async saveWord({
      word,
      translation,
      definition = "",
      color = "none",
      tags = [],
      sourceUrl = "",
      sourceTitle = "",
      context = "",
    }) {
      if (!word || !word.trim()) {
        throw new Error("Word is required.");
      }
      if (!translation || !translation.trim()) {
        throw new Error("Translation is required.");
      }

      const words = await this.getWords();
      const newWord = {
        id: generateId("word"),
        word: word.trim(),
        translation: translation.trim(),
        definition: (definition || "").trim(),
        color: sanitizeColor(color),
        tags: parseTags(tags),
        sourceUrl: sourceUrl || "",
        sourceTitle: sourceTitle || "",
        context: context || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      words.unshift(newWord);
      await setInStorage(STORAGE_KEYS.WORDS, words);
      return newWord;
    },

    async updateWord(id, updates) {
      const words = await this.getWords();
      const index = words.findIndex((w) => w.id === id);
      if (index === -1) {
        throw new Error(`Word with id ${id} not found.`);
      }

      const cleanUpdates = { ...updates };
      if ("color" in cleanUpdates) {
        cleanUpdates.color = sanitizeColor(cleanUpdates.color);
      }
      if ("tags" in cleanUpdates) {
        cleanUpdates.tags = parseTags(cleanUpdates.tags);
      }

      const updated = {
        ...words[index],
        ...cleanUpdates,
        updatedAt: new Date().toISOString(),
      };

      words[index] = updated;
      await setInStorage(STORAGE_KEYS.WORDS, words);
      return updated;
    },

    async deleteWord(id) {
      const words = await this.getWords();
      const filtered = words.filter((w) => w.id !== id);
      await setInStorage(STORAGE_KEYS.WORDS, filtered);
      return true;
    },

    // -------------------------------------------------------------
    // NOTES CRUD
    // -------------------------------------------------------------

    async getNotes() {
      const notes = (await getFromStorage(STORAGE_KEYS.NOTES)) || [];
      return notes.map((n) => ({
        ...n,
        color: sanitizeColor(n.color),
        tags: Array.isArray(n.tags) ? n.tags : [],
      }));
    },

    async saveNote({
      title,
      body = "",
      color = "none",
      tags = [],
      sourceUrl = "",
      sourceTitle = "",
    }) {
      if (!title || !title.trim()) {
        throw new Error("Note title is required.");
      }

      const notes = await this.getNotes();
      const newNote = {
        id: generateId("note"),
        title: title.trim(),
        body: (body || "").trim(),
        color: sanitizeColor(color),
        tags: parseTags(tags),
        sourceUrl: sourceUrl || "",
        sourceTitle: sourceTitle || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      notes.unshift(newNote);
      await setInStorage(STORAGE_KEYS.NOTES, notes);
      return newNote;
    },

    async updateNote(id, updates) {
      const notes = await this.getNotes();
      const index = notes.findIndex((n) => n.id === id);
      if (index === -1) {
        throw new Error(`Note with id ${id} not found.`);
      }

      const cleanUpdates = { ...updates };
      if ("color" in cleanUpdates) {
        cleanUpdates.color = sanitizeColor(cleanUpdates.color);
      }
      if ("tags" in cleanUpdates) {
        cleanUpdates.tags = parseTags(cleanUpdates.tags);
      }

      const updated = {
        ...notes[index],
        ...cleanUpdates,
        updatedAt: new Date().toISOString(),
      };

      notes[index] = updated;
      await setInStorage(STORAGE_KEYS.NOTES, notes);
      return updated;
    },

    async deleteNote(id) {
      const notes = await this.getNotes();
      const filtered = notes.filter((n) => n.id !== id);
      await setInStorage(STORAGE_KEYS.NOTES, filtered);
      return true;
    },

    // -------------------------------------------------------------
    // COMBINED DATA
    // -------------------------------------------------------------

    async getAllData() {
      const [words, notes] = await Promise.all([
        this.getWords(),
        this.getNotes(),
      ]);
      return { words, notes };
    },

    /**
     * Every tag the user has ever used, de-duplicated and alphabetically sorted.
     * Powers the tag auto-suggestions in the popup and the in-page modal.
     */
    async getAllTags() {
      const { words, notes } = await this.getAllData();
      const set = new Set();
      [...words, ...notes].forEach((item) => {
        (item.tags || []).forEach((tag) => set.add(String(tag).toLowerCase()));
      });
      return Array.from(set).sort();
    },

    // -------------------------------------------------------------
    // PREFERENCES
    // -------------------------------------------------------------

    async getDefaultView() {
      const view = await getFromStorage(STORAGE_KEYS.DEFAULT_VIEW);
      return VALID_VIEWS.includes(view) ? view : "view-see-saves";
    },

    async setDefaultView(view) {
      const val = VALID_VIEWS.includes(view) ? view : "view-see-saves";
      await setInStorage(STORAGE_KEYS.DEFAULT_VIEW, val);
      return val;
    },

    // -------------------------------------------------------------
    // IMPORT FUNCTIONALITY (JSON & CSV)
    // -------------------------------------------------------------

    async importFromJson(jsonString) {
      let data;
      try {
        data = JSON.parse(jsonString);
      } catch (err) {
        throw new Error("Invalid JSON format: " + err.message);
      }

      let wordsToImport = [];
      let notesToImport = [];

      if (Array.isArray(data)) {
        // Determine whether array contains words or notes based on properties
        data.forEach((item) => {
          if (item && item.word && item.translation) {
            wordsToImport.push(item);
          } else if (item && item.title) {
            notesToImport.push(item);
          }
        });
      } else if (typeof data === "object" && data !== null) {
        if (Array.isArray(data.words)) {
          wordsToImport = data.words;
        }
        if (Array.isArray(data.notes)) {
          notesToImport = data.notes;
        }
      }

      if (wordsToImport.length === 0 && notesToImport.length === 0) {
        throw new Error("No valid words or notes found in the imported JSON.");
      }

      const currentWords = await this.getWords();
      const currentNotes = await this.getNotes();

      let addedWordsCount = 0;
      let addedNotesCount = 0;

      // Process words
      wordsToImport.forEach((w) => {
        if (!w || !w.word || !w.translation) return;
        const exists = currentWords.some(
          (cw) =>
            cw.word.toLowerCase() === w.word.trim().toLowerCase() &&
            cw.translation.toLowerCase() === w.translation.trim().toLowerCase(),
        );
        if (!exists) {
          currentWords.unshift({
            id: w.id || generateId("word"),
            word: String(w.word).trim(),
            translation: String(w.translation).trim(),
            definition: String(w.definition || "").trim(),
            color: sanitizeColor(w.color),
            tags: parseTags(w.tags),
            sourceUrl: w.sourceUrl || "",
            sourceTitle: w.sourceTitle || "",
            context: w.context || "",
            createdAt: w.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          addedWordsCount++;
        }
      });

      // Process notes
      notesToImport.forEach((n) => {
        if (!n || !n.title) return;
        const exists = currentNotes.some(
          (cn) =>
            cn.title.toLowerCase() === n.title.trim().toLowerCase() &&
            (cn.body || "").trim() === (n.body || "").trim(),
        );
        if (!exists) {
          currentNotes.unshift({
            id: n.id || generateId("note"),
            title: String(n.title).trim(),
            body: String(n.body || "").trim(),
            color: sanitizeColor(n.color),
            tags: parseTags(n.tags),
            sourceUrl: n.sourceUrl || "",
            sourceTitle: n.sourceTitle || "",
            createdAt: n.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          addedNotesCount++;
        }
      });

      await setInStorage(STORAGE_KEYS.WORDS, currentWords);
      await setInStorage(STORAGE_KEYS.NOTES, currentNotes);

      return {
        wordsImported: addedWordsCount,
        notesImported: addedNotesCount,
      };
    },

    async importFromCsv(csvText) {
      const rows = parseCsv(csvText);
      if (rows.length < 2) {
        throw new Error(
          "CSV file must contain a header row and at least one data row.",
        );
      }

      const headers = rows[0].map((h) => h.trim().toLowerCase());

      // Detect if Words or Notes CSV
      const hasWord = headers.includes("word");
      const hasTitle = headers.includes("title");

      if (!hasWord && !hasTitle) {
        throw new Error(
          'Could not identify CSV format. Expected "Word" or "Title" in headers.',
        );
      }

      const currentWords = await this.getWords();
      const currentNotes = await this.getNotes();

      let addedWordsCount = 0;
      let addedNotesCount = 0;

      if (hasWord) {
        const wordIdx = headers.indexOf("word");
        const transIdx = headers.indexOf("translation");
        const defIdx = headers.indexOf("definition");
        const colorIdx = headers.indexOf("color");
        const tagsIdx = headers.indexOf("tags");
        const urlIdx = headers.indexOf("sourceurl");
        const dateIdx = headers.indexOf("createdat");

        if (transIdx === -1) {
          throw new Error('Words CSV must have a "Translation" column.');
        }

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const w = (row[wordIdx] || "").trim();
          const t = (row[transIdx] || "").trim();
          const d = defIdx !== -1 ? (row[defIdx] || "").trim() : "";
          const c = colorIdx !== -1 ? (row[colorIdx] || "").trim() : "none";
          const tags = tagsIdx !== -1 ? (row[tagsIdx] || "").trim() : "";
          const url = urlIdx !== -1 ? (row[urlIdx] || "").trim() : "";
          const date = dateIdx !== -1 ? (row[dateIdx] || "").trim() : "";

          if (!w || !t) continue;

          const exists = currentWords.some(
            (cw) =>
              cw.word.toLowerCase() === w.toLowerCase() &&
              cw.translation.toLowerCase() === t.toLowerCase(),
          );

          if (!exists) {
            currentWords.unshift({
              id: generateId("word"),
              word: w,
              translation: t,
              definition: d,
              color: sanitizeColor(c),
              tags: parseTags(tags),
              sourceUrl: url,
              sourceTitle: "",
              context: "",
              createdAt: date || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            addedWordsCount++;
          }
        }

        await setInStorage(STORAGE_KEYS.WORDS, currentWords);
      } else if (hasTitle) {
        const titleIdx = headers.indexOf("title");
        const bodyIdx = headers.indexOf("body");
        const colorIdx = headers.indexOf("color");
        const tagsIdx = headers.indexOf("tags");
        const urlIdx = headers.indexOf("sourceurl");
        const dateIdx = headers.indexOf("createdat");

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const title = (row[titleIdx] || "").trim();
          const body = bodyIdx !== -1 ? (row[bodyIdx] || "").trim() : "";
          const c = colorIdx !== -1 ? (row[colorIdx] || "").trim() : "none";
          const tags = tagsIdx !== -1 ? (row[tagsIdx] || "").trim() : "";
          const url = urlIdx !== -1 ? (row[urlIdx] || "").trim() : "";
          const date = dateIdx !== -1 ? (row[dateIdx] || "").trim() : "";

          if (!title) continue;

          const exists = currentNotes.some(
            (cn) =>
              cn.title.toLowerCase() === title.toLowerCase() &&
              cn.body === body,
          );

          if (!exists) {
            currentNotes.unshift({
              id: generateId("note"),
              title: title,
              body: body,
              color: sanitizeColor(c),
              tags: parseTags(tags),
              sourceUrl: url,
              sourceTitle: "",
              createdAt: date || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            addedNotesCount++;
          }
        }

        await setInStorage(STORAGE_KEYS.NOTES, currentNotes);
      }

      return {
        wordsImported: addedWordsCount,
        notesImported: addedNotesCount,
      };
    },

    // -------------------------------------------------------------
    // EXPORT UTILITIES (RFC 4180 CSV & JSON, Anki-friendly)
    // -------------------------------------------------------------

    escapeCsvField(val) {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      return '"' + str.replace(/"/g, '""') + '"';
    },

    exportWordsToCsv(words) {
      const headers = [
        "Word",
        "Translation",
        "Definition",
        "Color",
        "Tags",
        "SourceUrl",
        "CreatedAt",
      ];
      const rows = words.map((w) =>
        [
          this.escapeCsvField(w.word),
          this.escapeCsvField(w.translation),
          this.escapeCsvField(w.definition),
          this.escapeCsvField(w.color || "none"),
          this.escapeCsvField((w.tags || []).join("; ")),
          this.escapeCsvField(w.sourceUrl),
          this.escapeCsvField(w.createdAt),
        ].join(","),
      );

      return [headers.join(","), ...rows].join("\r\n");
    },

    exportWordsToJson(words) {
      return JSON.stringify(words, null, 2);
    },

    exportNotesToCsv(notes) {
      const headers = [
        "Title",
        "Body",
        "Color",
        "Tags",
        "SourceUrl",
        "CreatedAt",
      ];
      const rows = notes.map((n) =>
        [
          this.escapeCsvField(n.title),
          this.escapeCsvField(n.body),
          this.escapeCsvField(n.color || "none"),
          this.escapeCsvField((n.tags || []).join("; ")),
          this.escapeCsvField(n.sourceUrl),
          this.escapeCsvField(n.createdAt),
        ].join(","),
      );

      return [headers.join(","), ...rows].join("\r\n");
    },

    exportNotesToJson(notes) {
      return JSON.stringify(notes, null, 2);
    },

    exportAllToJson(data) {
      return JSON.stringify(data, null, 2);
    },

    /**
     * Downloads string content as a file in the browser context
     */
    downloadFile(content, filename, mimeType = "text/plain;charset=utf-8;") {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    },
  };

  // Export to global scope depending on environment
  if (typeof exports !== "undefined") {
    module.exports = VocabStorage;
  }
  if (typeof self !== "undefined") {
    self.VocabStorage = VocabStorage;
  }
  if (typeof window !== "undefined") {
    window.VocabStorage = VocabStorage;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
