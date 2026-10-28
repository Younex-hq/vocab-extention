/**
 * background.js - Service Worker for Vocab & Notes Extension
 * Manages context menu registration and actions.
 */

try {
  importScripts('storage.js');
} catch (e) {
  console.error('Failed to import storage.js into service worker:', e);
}

const CONTEXT_MENUS = {
  SAVE_WORD: 'vocab_save_word',
  SAVE_NOTE: 'vocab_save_note'
};

/**
 * Register Context Menus on installation or update
 */
chrome.runtime.onInstalled.addListener(() => {
  // Remove existing to avoid duplicate IDs during reloads
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENUS.SAVE_WORD,
      title: 'Save word "%s"',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: CONTEXT_MENUS.SAVE_NOTE,
      title: 'Save as note "%s"',
      contexts: ['selection']
    });
  });
});

/**
 * Send message to content script with automatic fallback script injection
 */
async function sendToContentScript(tabId, message) {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch (err) {
    // Tab might be an existing page before extension load; dynamically inject
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['storage.js', 'content.js']
      });
      await chrome.scripting.insertCSS({
        target: { tabId },
        files: ['content.css']
      });
      // Retry sending message
      await chrome.tabs.sendMessage(tabId, message);
    } catch (injectErr) {
      console.warn('Could not inject content script into tab:', injectErr);
    }
  }
}

/**
 * Handle Context Menu Clicks
 */
chrome.contextMenus.onClicked.addListener((info, tab) => {
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

/**
 * Listen for runtime messages if needed
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'PING') {
    sendResponse({ status: 'PONG' });
  }
  return true;
});
