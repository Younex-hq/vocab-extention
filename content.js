/**
 * content.js - In-page modal dialog for Vocab & Notes Extension
 * Uses Shadow DOM for complete CSS isolation from host web pages.
 */

(function () {
  'use strict';

  // Prevent multiple injections
  if (window.__VOCAB_EXTENSION_CONTENT_INJECTED__) return;
  window.__VOCAB_EXTENSION_CONTENT_INJECTED__ = true;

  let hostElement = null;
  let shadowRoot = null;

  /**
   * Minimalist modern styling (NO gradients, solid colors, clean borders)
   */
  const MODAL_STYLES = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }

    .vocab-backdrop {
      position: fixed;
      inset: 0;
      background-color: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(2px);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: fadeIn 0.15s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .vocab-modal {
      background-color: #ffffff;
      color: #0f172a;
      width: 100%;
      max-width: 460px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: slideUp 0.15s ease-out;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(8px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .vocab-header {
      padding: 14px 18px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background-color: #ffffff;
    }

    .vocab-title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .vocab-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background-color: #f1f5f9;
      color: #334155;
      padding: 2px 7px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }

    .vocab-title {
      font-size: 15px;
      font-weight: 600;
      color: #0f172a;
    }

    .vocab-close-btn {
      background: transparent;
      border: none;
      color: #64748b;
      font-size: 20px;
      line-height: 1;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.12s, color 0.12s;
    }

    .vocab-close-btn:hover {
      background-color: #f1f5f9;
      color: #0f172a;
    }

    .vocab-body {
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      max-height: 70vh;
      overflow-y: auto;
    }

    .vocab-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .vocab-label {
      font-size: 12px;
      font-weight: 600;
      color: #334155;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .vocab-required {
      color: #dc2626;
      font-size: 12px;
      font-weight: 500;
    }

    .vocab-input,
    .vocab-textarea {
      width: 100%;
      padding: 8px 12px;
      font-size: 14px;
      color: #0f172a;
      background-color: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .vocab-input:focus,
    .vocab-textarea:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
    }

    .vocab-input.error,
    .vocab-textarea.error {
      border-color: #dc2626;
    }

    .vocab-textarea {
      min-height: 84px;
      resize: vertical;
      line-height: 1.45;
    }

    .vocab-meta-info {
      font-size: 11px;
      color: #64748b;
      word-break: break-all;
      background-color: #f8fafc;
      padding: 8px 10px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }

    .vocab-error-banner {
      font-size: 12px;
      color: #b91c1c;
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 4px;
      padding: 8px 10px;
      display: none;
    }

    .vocab-success-toast {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: #0f172a;
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
      display: none;
      align-items: center;
      gap: 8px;
      z-index: 10;
    }

    .vocab-footer {
      padding: 12px 18px;
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
    }

    .vocab-btn {
      padding: 7px 14px;
      font-size: 13px;
      font-weight: 500;
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.12s, border-color 0.12s, color 0.12s;
      border: 1px solid transparent;
    }

    .vocab-btn-secondary {
      background-color: #ffffff;
      border-color: #cbd5e1;
      color: #334155;
    }

    .vocab-btn-secondary:hover {
      background-color: #f1f5f9;
      border-color: #94a3b8;
    }

    .vocab-btn-primary {
      background-color: #2563eb;
      color: #ffffff;
      font-weight: 600;
    }

    .vocab-btn-primary:hover {
      background-color: #1d4ed8;
    }

    .vocab-btn-primary:disabled {
      background-color: #94a3b8;
      cursor: not-allowed;
    }

    .vocab-hint {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 2px;
    }
  `;

  function initShadowRoot() {
    if (!hostElement) {
      hostElement = document.createElement('div');
      hostElement.id = 'vocab-extension-root';
      document.documentElement.appendChild(hostElement);
      shadowRoot = hostElement.attachShadow({ mode: 'open' });

      const style = document.createElement('style');
      style.textContent = MODAL_STYLES;
      shadowRoot.appendChild(style);
    }
    return shadowRoot;
  }

  function closeModal() {
    if (hostElement) {
      hostElement.remove();
      hostElement = null;
      shadowRoot = null;
    }
  }

  /**
   * Modal: Save Word
   */
  function openSaveWordModal({ word, pageUrl, pageTitle }) {
    closeModal();
    const shadow = initShadowRoot();

    const container = document.createElement('div');
    container.className = 'vocab-backdrop';
    container.innerHTML = `
      <div class="vocab-modal" style="position: relative;">
        <div class="vocab-header">
          <div class="vocab-title-wrap">
            <span class="vocab-badge">Vocabulary</span>
            <h3 class="vocab-title">Save Word</h3>
          </div>
          <button class="vocab-close-btn" id="btn-close" title="Close (Esc)">×</button>
        </div>

        <div class="vocab-body">
          <div id="error-banner" class="vocab-error-banner"></div>

          <div class="vocab-field">
            <label class="vocab-label">Word / Phrase <span class="vocab-required">*</span></label>
            <input type="text" class="vocab-input" id="input-word" value="${escapeHtml(word)}" />
          </div>

          <div class="vocab-field">
            <label class="vocab-label">Translation <span class="vocab-required">*</span></label>
            <input type="text" class="vocab-input" id="input-translation" placeholder="e.g. Translation to your language" />
          </div>

          <div class="vocab-field">
            <label class="vocab-label">Definition <span style="font-weight: 400; color: #64748b;">(Optional)</span></label>
            <textarea class="vocab-textarea" id="input-definition" placeholder="Meaning, example sentence, or notes..."></textarea>
            <span class="vocab-hint">Press Ctrl+Enter to save</span>
          </div>

          ${pageUrl ? `
            <div class="vocab-meta-info">
              <strong>Source:</strong> ${escapeHtml(pageTitle || pageUrl)}
            </div>
          ` : ''}
        </div>

        <div class="vocab-footer">
          <button class="vocab-btn vocab-btn-secondary" id="btn-cancel">Cancel</button>
          <button class="vocab-btn vocab-btn-primary" id="btn-save">Save Word</button>
        </div>

        <div id="success-toast" class="vocab-success-toast">
          <span>✓</span> Word saved successfully!
        </div>
      </div>
    `;

    shadow.appendChild(container);

    const inputWord = shadow.getElementById('input-word');
    const inputTranslation = shadow.getElementById('input-translation');
    const inputDefinition = shadow.getElementById('input-definition');
    const btnSave = shadow.getElementById('btn-save');
    const btnCancel = shadow.getElementById('btn-cancel');
    const btnClose = shadow.getElementById('btn-close');
    const errorBanner = shadow.getElementById('error-banner');
    const successToast = shadow.getElementById('success-toast');

    // Auto focus translation since word is pre-filled
    setTimeout(() => {
      inputTranslation.focus();
    }, 50);

    const handleSave = async () => {
      const w = inputWord.value.trim();
      const t = inputTranslation.value.trim();
      const d = inputDefinition.value.trim();

      if (!w) {
        showError('Please enter a word.');
        inputWord.classList.add('error');
        inputWord.focus();
        return;
      }
      if (!t) {
        showError('Please enter a translation.');
        inputTranslation.classList.add('error');
        inputTranslation.focus();
        return;
      }

      btnSave.disabled = true;
      btnSave.textContent = 'Saving...';

      try {
        await VocabStorage.saveWord({
          word: w,
          translation: t,
          definition: d,
          sourceUrl: pageUrl,
          sourceTitle: pageTitle
        });

        successToast.style.display = 'flex';
        setTimeout(() => {
          closeModal();
        }, 500);
      } catch (err) {
        showError(err.message || 'Failed to save word.');
        btnSave.disabled = false;
        btnSave.textContent = 'Save Word';
      }
    };

    function showError(msg) {
      errorBanner.textContent = msg;
      errorBanner.style.display = 'block';
    }

    function clearErrors() {
      errorBanner.style.display = 'none';
      inputWord.classList.remove('error');
      inputTranslation.classList.remove('error');
    }

    inputWord.addEventListener('input', clearErrors);
    inputTranslation.addEventListener('input', clearErrors);

    btnSave.addEventListener('click', handleSave);
    btnCancel.addEventListener('click', closeModal);
    btnClose.addEventListener('click', closeModal);

    container.addEventListener('click', (e) => {
      if (e.target === container) closeModal();
    });

    const keyHandler = (e) => {
      if (e.key === 'Escape') {
        closeModal();
      } else if (e.key === 'Enter') {
        if (e.ctrlKey || e.metaKey || e.target === inputTranslation || e.target === inputWord) {
          e.preventDefault();
          handleSave();
        }
      }
    };

    container.addEventListener('keydown', keyHandler);
  }

  /**
   * Modal: Save Note
   */
  function openSaveNoteModal({ title, pageUrl, pageTitle }) {
    closeModal();
    const shadow = initShadowRoot();

    const container = document.createElement('div');
    container.className = 'vocab-backdrop';
    container.innerHTML = `
      <div class="vocab-modal" style="position: relative;">
        <div class="vocab-header">
          <div class="vocab-title-wrap">
            <span class="vocab-badge">Note</span>
            <h3 class="vocab-title">Save as Note</h3>
          </div>
          <button class="vocab-close-btn" id="btn-close" title="Close (Esc)">×</button>
        </div>

        <div class="vocab-body">
          <div id="error-banner" class="vocab-error-banner"></div>

          <div class="vocab-field">
            <label class="vocab-label">Note Title <span class="vocab-required">*</span></label>
            <input type="text" class="vocab-input" id="input-title" value="${escapeHtml(title)}" />
          </div>

          <div class="vocab-field">
            <label class="vocab-label">Note Body <span class="vocab-required">*</span></label>
            <textarea class="vocab-textarea" id="input-body" style="min-height: 110px;" placeholder="Write your note body here..."></textarea>
            <span class="vocab-hint">Press Ctrl+Enter to save</span>
          </div>

          ${pageUrl ? `
            <div class="vocab-meta-info">
              <strong>Source:</strong> ${escapeHtml(pageTitle || pageUrl)}
            </div>
          ` : ''}
        </div>

        <div class="vocab-footer">
          <button class="vocab-btn vocab-btn-secondary" id="btn-cancel">Cancel</button>
          <button class="vocab-btn vocab-btn-primary" id="btn-save">Save Note</button>
        </div>

        <div id="success-toast" class="vocab-success-toast">
          <span>✓</span> Note saved successfully!
        </div>
      </div>
    `;

    shadow.appendChild(container);

    const inputTitle = shadow.getElementById('input-title');
    const inputBody = shadow.getElementById('input-body');
    const btnSave = shadow.getElementById('btn-save');
    const btnCancel = shadow.getElementById('btn-cancel');
    const btnClose = shadow.getElementById('btn-close');
    const errorBanner = shadow.getElementById('error-banner');
    const successToast = shadow.getElementById('success-toast');

    // Auto focus body since title is pre-filled
    setTimeout(() => {
      inputBody.focus();
    }, 50);

    const handleSave = async () => {
      const t = inputTitle.value.trim();
      const b = inputBody.value.trim();

      if (!t) {
        showError('Please enter a note title.');
        inputTitle.classList.add('error');
        inputTitle.focus();
        return;
      }
      if (!b) {
        showError('Please enter the note body.');
        inputBody.classList.add('error');
        inputBody.focus();
        return;
      }

      btnSave.disabled = true;
      btnSave.textContent = 'Saving...';

      try {
        await VocabStorage.saveNote({
          title: t,
          body: b,
          sourceUrl: pageUrl,
          sourceTitle: pageTitle
        });

        successToast.style.display = 'flex';
        setTimeout(() => {
          closeModal();
        }, 500);
      } catch (err) {
        showError(err.message || 'Failed to save note.');
        btnSave.disabled = false;
        btnSave.textContent = 'Save Note';
      }
    };

    function showError(msg) {
      errorBanner.textContent = msg;
      errorBanner.style.display = 'block';
    }

    function clearErrors() {
      errorBanner.style.display = 'none';
      inputTitle.classList.remove('error');
      inputBody.classList.remove('error');
    }

    inputTitle.addEventListener('input', clearErrors);
    inputBody.addEventListener('input', clearErrors);

    btnSave.addEventListener('click', handleSave);
    btnCancel.addEventListener('click', closeModal);
    btnClose.addEventListener('click', closeModal);

    container.addEventListener('click', (e) => {
      if (e.target === container) closeModal();
    });

    const keyHandler = (e) => {
      if (e.key === 'Escape') {
        closeModal();
      } else if (e.key === 'Enter') {
        if (e.ctrlKey || e.metaKey || (e.target === inputTitle && !e.shiftKey)) {
          e.preventDefault();
          handleSave();
        }
      }
    };

    container.addEventListener('keydown', keyHandler);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Listen for messages from background script
   */
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'OPEN_SAVE_WORD_MODAL') {
      openSaveWordModal({
        word: request.word,
        pageUrl: request.pageUrl,
        pageTitle: request.pageTitle
      });
      sendResponse({ status: 'OK' });
    } else if (request.action === 'OPEN_SAVE_NOTE_MODAL') {
      openSaveNoteModal({
        title: request.title,
        pageUrl: request.pageUrl,
        pageTitle: request.pageTitle
      });
      sendResponse({ status: 'OK' });
    }
    return true;
  });
})();
