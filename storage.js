/**
 * storage.js - Centralized storage and export helper for Vocab & Notes Extension
 * Compatible with Background Service Worker, Content Scripts, and Popup.
 */

(function (root) {
  'use strict';

  const STORAGE_KEYS = {
    WORDS: 'vocab_words',
    NOTES: 'vocab_notes'
  };

  const VALID_COLORS = ['none', 'blue', 'green', 'yellow', 'red', 'purple', 'orange'];

  /**
   * Generates a unique, sortable identifier
   */
  function generateId(prefix = 'item') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
  }

  /**
   * Parse tags from string (comma-separated) or array into clean, lowercase, unique tag array
   */
  function parseTags(input) {
    if (!input) return [];
    if (Array.isArray(input)) {
      return [...new Set(input.map((t) => String(t).trim().toLowerCase()).filter(Boolean))];
    }
    return [...new Set(String(input).split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))];
  }

  /**
   * Validate or default color
   */
  function sanitizeColor(color) {
    if (!color || typeof color !== 'string') return 'none';
    const c = color.toLowerCase().trim();
    return VALID_COLORS.includes(c) ? c : 'none';
  }

  /**
   * Extract clean domain from URL
   */
  function extractDomain(url) {
    if (!url) return 'Direct / Manual';
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, '');
    } catch {
      return 'Direct / Manual';
    }
  }

  /**
   * Helper to safely interact with chrome.storage.local using Promises
   */
  async function getFromStorage(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        resolve(result[key] || []);
      });
    });
  }

  async function setInStorage(key, value) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        resolve();
      });
    });
  }

  const VocabStorage = {
    VALID_COLORS,
    parseTags,
    sanitizeColor,
    extractDomain,

    // -------------------------------------------------------------
    // WORDS CRUD
    // -------------------------------------------------------------

    async getWords() {
      const words = await getFromStorage(STORAGE_KEYS.WORDS);
      // Normalize legacy entries without color or tags
      return words.map((w) => ({
        ...w,
        color: sanitizeColor(w.color),
        tags: Array.isArray(w.tags) ? w.tags : []
      }));
    },

    async saveWord({
      word,
      translation,
      definition = '',
      color = 'none',
      tags = [],
      sourceUrl = '',
      sourceTitle = '',
      context = ''
    }) {
      if (!word || !word.trim()) {
        throw new Error('Word is required.');
      }
      if (!translation || !translation.trim()) {
        throw new Error('Translation is required.');
      }

      const words = await this.getWords();
      const newWord = {
        id: generateId('word'),
        word: word.trim(),
        translation: translation.trim(),
        definition: (definition || '').trim(),
        color: sanitizeColor(color),
        tags: parseTags(tags),
        sourceUrl: sourceUrl || '',
        sourceTitle: sourceTitle || '',
        context: context || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
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
      if ('color' in cleanUpdates) {
        cleanUpdates.color = sanitizeColor(cleanUpdates.color);
      }
      if ('tags' in cleanUpdates) {
        cleanUpdates.tags = parseTags(cleanUpdates.tags);
      }

      const updated = {
        ...words[index],
        ...cleanUpdates,
        updatedAt: new Date().toISOString()
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
      const notes = await getFromStorage(STORAGE_KEYS.NOTES);
      return notes.map((n) => ({
        ...n,
        color: sanitizeColor(n.color),
        tags: Array.isArray(n.tags) ? n.tags : []
      }));
    },

    async saveNote({
      title,
      body = '',
      color = 'none',
      tags = [],
      sourceUrl = '',
      sourceTitle = ''
    }) {
      if (!title || !title.trim()) {
        throw new Error('Note title is required.');
      }

      const notes = await this.getNotes();
      const newNote = {
        id: generateId('note'),
        title: title.trim(),
        body: (body || '').trim(),
        color: sanitizeColor(color),
        tags: parseTags(tags),
        sourceUrl: sourceUrl || '',
        sourceTitle: sourceTitle || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
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
      if ('color' in cleanUpdates) {
        cleanUpdates.color = sanitizeColor(cleanUpdates.color);
      }
      if ('tags' in cleanUpdates) {
        cleanUpdates.tags = parseTags(cleanUpdates.tags);
      }

      const updated = {
        ...notes[index],
        ...cleanUpdates,
        updatedAt: new Date().toISOString()
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
      const [words, notes] = await Promise.all([this.getWords(), this.getNotes()]);
      return { words, notes };
    },

    // -------------------------------------------------------------
    // EXPORT UTILITIES (RFC 4180 CSV & JSON, Anki-friendly)
    // -------------------------------------------------------------

    escapeCsvField(val) {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      return '"' + str.replace(/"/g, '""') + '"';
    },

    exportWordsToCsv(words) {
      const headers = ['Word', 'Translation', 'Definition', 'Color', 'Tags', 'SourceUrl', 'CreatedAt'];
      const rows = words.map((w) => [
        this.escapeCsvField(w.word),
        this.escapeCsvField(w.translation),
        this.escapeCsvField(w.definition),
        this.escapeCsvField(w.color || 'none'),
        this.escapeCsvField((w.tags || []).join('; ')),
        this.escapeCsvField(w.sourceUrl),
        this.escapeCsvField(w.createdAt)
      ].join(','));

      return [headers.join(','), ...rows].join('\r\n');
    },

    exportWordsToJson(words) {
      return JSON.stringify(words, null, 2);
    },

    exportNotesToCsv(notes) {
      const headers = ['Title', 'Body', 'Color', 'Tags', 'SourceUrl', 'CreatedAt'];
      const rows = notes.map((n) => [
        this.escapeCsvField(n.title),
        this.escapeCsvField(n.body),
        this.escapeCsvField(n.color || 'none'),
        this.escapeCsvField((n.tags || []).join('; ')),
        this.escapeCsvField(n.sourceUrl),
        this.escapeCsvField(n.createdAt)
      ].join(','));

      return [headers.join(','), ...rows].join('\r\n');
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
    downloadFile(content, filename, mimeType = 'text/plain;charset=utf-8;') {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    }
  };

  // Export to global scope depending on environment
  if (typeof exports !== 'undefined') {
    module.exports = VocabStorage;
  }
  if (typeof self !== 'undefined') {
    self.VocabStorage = VocabStorage;
  }
  if (typeof window !== 'undefined') {
    window.VocabStorage = VocabStorage;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
