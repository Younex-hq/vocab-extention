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
 * Remove all existing context menus. Resolves once the API has finished,
 * supporting both the Promise (Firefox) and callback (Chrome) styles.
 */
function removeAllContextMenus() {
  if (!contextMenuAPI || !contextMenuAPI.removeAll) return Promise.resolve();

  return new Promise((resolve) => {
    try {
      const ret = contextMenuAPI.removeAll(() => {
        // Consume lastError so it is never reported as "Unchecked".
        void extAPI.runtime.lastError;
        resolve();
      });
      if (ret && typeof ret.then === 'function') {
        ret.then(resolve).catch(() => resolve());
      }
    } catch {
      resolve();
    }
  });
}

/**
 * Create a single context menu, tolerating the "duplicate id" case so the
 * extension never surfaces an unchecked runtime error.
 */
function createContextMenu(props) {
  if (!contextMenuAPI) return Promise.resolve();

  return new Promise((resolve) => {
    try {
      const ret = contextMenuAPI.create(props, () => {
        const err = extAPI.runtime.lastError;
        if (err && !/duplicate/i.test(err.message || '')) {
          console.warn('Context menu create failed:', err.message);
        }
        resolve();
      });
      if (ret && typeof ret.then === 'function') {
        ret.catch(() => {}).then(resolve);
      }
    } catch {
      resolve();
    }
  });
}

// Serializes menu setup so onInstalled and onStartup can never run
// removeAll/create concurrently (which is what produces duplicate ids).
let menusSetupPromise = null;

/**
 * Register Context Menus across Firefox and Chrome
 */
async function setupContextMenus() {
  if (!contextMenuAPI) return;
  if (menusSetupPromise) return menusSetupPromise;

  menusSetupPromise = (async () => {
    try {
      await removeAllContextMenus();

      await createContextMenu({
        id: CONTEXT_MENUS.SAVE_WORD,
        title: 'Save word "%s"',
        contexts: ['selection']
      });

      await createContextMenu({
        id: CONTEXT_MENUS.SAVE_NOTE,
        title: 'Save as note "%s"',
        contexts: ['selection']
      });
    } finally {
      menusSetupPromise = null;
    }
  })();

  return menusSetupPromise;
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
