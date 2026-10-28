/**
 * background.js - Cross-Browser Service Worker for Vocab & Notes Extension
 * Compatible with Chromium (Chrome, Edge, Brave) and Gecko (Firefox).
 */

try {
  if (typeof importScripts === 'function') {
    importScripts('storage.js');
  }
} catch (e) {
  // Ignored in non-worker environments (e.g. Firefox background scripts where storage.js is preloaded)
}

// Universal WebExtension API Resolver (Firefox 'browser' or Chromium 'chrome')
const extAPI = (typeof browser !== 'undefined' && browser && browser.runtime) ? browser : chrome;
const contextMenuAPI = extAPI.contextMenus || extAPI.menus;

const CONTEXT_MENUS = {
  SAVE_WORD: 'vocab_save_word',
  SAVE_NOTE: 'vocab_save_note'
};

/**
 * Register Context Menus across Firefox and Chrome
 */
async function setupContextMenus() {
  if (!contextMenuAPI) return;

  try {
    if (contextMenuAPI.removeAll) {
      await new Promise((resolve) => {
        const ret = contextMenuAPI.removeAll(() => resolve());
        if (ret && typeof ret.then === 'function') {
          ret.then(resolve).catch(resolve);
        }
      });
    }
  } catch (err) {
    // Non-fatal if removeAll fails
  }

  contextMenuAPI.create({
    id: CONTEXT_MENUS.SAVE_WORD,
    title: 'Save word "%s"',
    contexts: ['selection']
  });

  contextMenuAPI.create({
    id: CONTEXT_MENUS.SAVE_NOTE,
    title: 'Save as note "%s"',
    contexts: ['selection']
  });
}

extAPI.runtime.onInstalled.addListener(() => {
  setupContextMenus();
});

// Also ensure context menus exist on startup in event pages
if (extAPI.runtime.onStartup) {
  extAPI.runtime.onStartup.addListener(() => {
    setupContextMenus();
  });
}

/**
 * Send message to content script with automatic fallback script injection
 */
async function sendToContentScript(tabId, message) {
  try {
    const res = extAPI.tabs.sendMessage(tabId, message);
    if (res && typeof res.then === 'function') {
      await res;
    }
  } catch (err) {
    // Tab might be an existing page before extension load; dynamically inject
    try {
      if (extAPI.scripting) {
        await extAPI.scripting.executeScript({
          target: { tabId },
          files: ['storage.js', 'content.js']
        });
        await extAPI.scripting.insertCSS({
          target: { tabId },
          files: ['content.css']
        });
        await extAPI.tabs.sendMessage(tabId, message);
      }
    } catch (injectErr) {
      console.warn('Could not inject content script into tab:', injectErr);
    }
  }
}

/**
 * Handle Context Menu Clicks
 */
if (contextMenuAPI && contextMenuAPI.onClicked) {
  contextMenuAPI.onClicked.addListener((info, tab) => {
    if (!tab || !tab.id) return;

    const selectedText = (info.selectionText || '').trim();
    if (!selectedText) return;

    if (info.menuItemId === CONTEXT_MENUS.SAVE_WORD) {
      sendToContentScript(tab.id, {
        action: 'OPEN_SAVE_WORD_MODAL',
        word: selectedText,
        pageUrl: tab.url || '',
        pageTitle: tab.title || ''
      });
    } else if (info.menuItemId === CONTEXT_MENUS.SAVE_NOTE) {
      sendToContentScript(tab.id, {
        action: 'OPEN_SAVE_NOTE_MODAL',
        title: selectedText,
        pageUrl: tab.url || '',
        pageTitle: tab.title || ''
      });
    }
  });
}

/**
 * Listen for runtime messages if needed
 */
if (extAPI.runtime && extAPI.runtime.onMessage) {
  extAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'PING') {
      sendResponse({ status: 'PONG' });
    }
    return true;
  });
}
