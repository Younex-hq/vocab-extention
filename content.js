/**
 * content.js - In-page modal dialog for Vocab & Notes Extension
 * Uses Shadow DOM for complete CSS isolation from host web pages.
 * Supports Colors and Tagging directly from the in-page dialog.
 */

(function () {
  "use strict";

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
      padding: 12px 18px;
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
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 72vh;
      overflow-y: auto;
    }

    .vocab-field {
      display: flex;
      flex-direction: column;
      gap: 5px;
      position: relative;
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
      padding: 7px 11px;
      font-size: 13px;
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
      min-height: 70px;
      resize: vertical;
      line-height: 1.45;
    }

    /* Color Swatches */
    .vocab-color-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 2px 0;
    }

    .vocab-swatch {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      cursor: pointer;
      border: 2px solid transparent;
      padding: 0;
      transition: transform 0.1s, box-shadow 0.1s;
    }

    .vocab-swatch:hover {
      transform: scale(1.15);
    }

    .vocab-swatch.active {
      box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #0f172a;
    }

    .swatch-none { background-color: #94a3b8; }
    .swatch-blue { background-color: #2563eb; }
    .swatch-green { background-color: #16a34a; }
    .swatch-yellow { background-color: #d97706; }
    .swatch-red { background-color: #dc2626; }
    .swatch-purple { background-color: #9333ea; }
    .swatch-orange { background-color: #ea580c; }

    .vocab-meta-info {
      font-size: 11px;
      color: #64748b;
      word-break: break-all;
      background-color: #f8fafc;
      padding: 7px 10px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }

    .vocab-error-banner {
      font-size: 12px;
      color: #b91c1c;
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 4px;
      padding: 7px 10px;
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
      padding: 11px 18px;
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

    /* Inline duplicate warning */
    .vocab-field-warning {
      font-size: 11px;
      font-weight: 600;
      color: #b91c1c;
      margin-top: 2px;
      display: none;
    }

    /* Tag Auto-Suggestions Dropdown */
    .vocab-tag-suggestions {
      position: absolute;
      top: calc(100% + 2px);
      left: 0;
      right: 0;
      z-index: 20;
      background-color: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      box-shadow: 0 6px 14px -4px rgba(0, 0, 0, 0.18);
      max-height: 140px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      padding: 3px;
      gap: 1px;
    }

    .vocab-tag-suggestion-item {
      text-align: left;
      background: transparent;
      border: none;
      border-radius: 4px;
      padding: 6px 9px;
      font-size: 12px;
      font-weight: 500;
      color: #334155;
      cursor: pointer;
    }

    .vocab-tag-suggestion-item:hover,
    .vocab-tag-suggestion-item.active {
      background-color: #eff6ff;
      color: #2563eb;
    }

    /* Dark Mode In-Page Modal Styles */
    .vocab-modal.dark {
      background-color: #0f172a;
      color: #f8fafc;
      border-color: #334155;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
    }

    .vocab-modal.dark .vocab-header {
      background-color: #0f172a;
      border-bottom-color: #334155;
    }

    .vocab-modal.dark .vocab-title {
      color: #f8fafc;
    }

    .vocab-modal.dark .vocab-badge {
      background-color: #1e293b;
      color: #cbd5e1;
      border-color: #334155;
    }

    .vocab-modal.dark .vocab-close-btn {
      color: #94a3b8;
    }

    .vocab-modal.dark .vocab-close-btn:hover {
      background-color: #1e293b;
      color: #f8fafc;
    }

    .vocab-modal.dark .vocab-label {
      color: #cbd5e1;
    }

    .vocab-modal.dark .vocab-input,
    .vocab-modal.dark .vocab-textarea {
      background-color: #1e293b;
      color: #f8fafc;
      border-color: #475569;
    }

    .vocab-modal.dark .vocab-input:focus,
    .vocab-modal.dark .vocab-textarea:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    }

    .vocab-modal.dark .vocab-meta-info {
      background-color: #1e293b;
      border-color: #334155;
      color: #94a3b8;
    }

    .vocab-modal.dark .vocab-footer {
      background-color: #0b1120;
      border-top-color: #334155;
    }

    .vocab-modal.dark .vocab-btn-secondary {
      background-color: #1e293b;
      border-color: #475569;
      color: #e2e8f0;
    }

    .vocab-modal.dark .vocab-btn-secondary:hover {
      background-color: #334155;
    }

    .vocab-modal.dark .vocab-btn-primary {
      background-color: #3b82f6;
    }

    .vocab-modal.dark .vocab-btn-primary:hover {
      background-color: #2563eb;
    }

    .vocab-modal.dark .vocab-swatch.active {
      box-shadow: 0 0 0 2px #0f172a, 0 0 0 4px #f8fafc;
    }

    .vocab-modal.dark .vocab-tag-suggestions {
      background-color: #1e293b;
      border-color: #475569;
      box-shadow: 0 6px 14px -4px rgba(0, 0, 0, 0.5);
    }

    .vocab-modal.dark .vocab-tag-suggestion-item {
      color: #cbd5e1;
    }

    .vocab-modal.dark .vocab-tag-suggestion-item:hover,
    .vocab-modal.dark .vocab-tag-suggestion-item.active {
      background-color: #334155;
      color: #93c5fd;
    }

    .vocab-modal.dark .vocab-field-warning {
      color: #fca5a5;
    }
  `;

  function initShadowRoot() {
    if (!hostElement) {
      hostElement = document.createElement("div");
      hostElement.id = "vocab-extension-root";
      document.documentElement.appendChild(hostElement);
      shadowRoot = hostElement.attachShadow({ mode: "open" });

      const style = document.createElement("style");
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
   * Helper to build Color Swatches HTML and attach events
   */
  function setupColorSwatches(container, initialColor, onColorChange) {
    const colors = [
      "none",
      "blue",
      "green",
      "yellow",
      "red",
      "purple",
      "orange",
    ];
    colors.forEach((c) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `vocab-swatch swatch-${c} ${c === initialColor ? "active" : ""}`;
      btn.title =
        c === "none"
          ? "No color (Default)"
          : c.charAt(0).toUpperCase() + c.slice(1);
      btn.addEventListener("click", () => {
        container
          .querySelectorAll(".vocab-swatch")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        onColorChange(c);
      });
      container.appendChild(btn);
    });
  }

  /**
   * Attaches a suggestion dropdown to a comma-separated tags input inside the
   * Shadow DOM. Offers previously used tags as the user types, matching the
   * behaviour of the popup. Selecting a tag inserts it and keeps the input
   * focused so more tags can be typed.
   */
  function setupTagSuggestions(input, knownTags) {
    if (!input || !Array.isArray(knownTags) || knownTags.length === 0) return;

    let dropdown = null;
    let activeIndex = -1;

    function closeDropdown() {
      if (dropdown) {
        dropdown.remove();
        dropdown = null;
      }
      activeIndex = -1;
    }

    function getMatches() {
      const caret =
        input.selectionStart === null
          ? input.value.length
          : input.selectionStart;
      const ctx = VocabStorage.getTagTokenContext(input.value, caret);
      const q = ctx.token.toLowerCase();
      if (!q) return { ctx, matches: [] };

      const existing = new Set(VocabStorage.parseTags(input.value));
      const matches = knownTags
        .filter((t) => t.startsWith(q) && t !== q && !existing.has(t))
        .slice(0, 8);
      return { ctx, matches };
    }

    function render() {
      const { matches } = getMatches();
      if (matches.length === 0) {
        closeDropdown();
        return;
      }
      if (!dropdown) {
        dropdown = document.createElement("div");
        dropdown.className = "vocab-tag-suggestions";
        input.parentElement.appendChild(dropdown);
      }
      dropdown.innerHTML = "";
      activeIndex = -1;
      matches.forEach((tag) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "vocab-tag-suggestion-item";
        item.textContent = "#" + tag;
        item.addEventListener("mousedown", (e) => {
          e.preventDefault();
          select(tag);
        });
        dropdown.appendChild(item);
      });
    }

    function select(tag) {
      const caret =
        input.selectionStart === null
          ? input.value.length
          : input.selectionStart;
      const ctx = VocabStorage.getTagTokenContext(input.value, caret);
      const applied = VocabStorage.applyTagSelection(
        input.value,
        ctx.start,
        ctx.end,
        tag,
      );
      input.value = applied.value;
      input.setSelectionRange(applied.caret, applied.caret);
      closeDropdown();
      input.focus();
    }

    input.addEventListener("input", render);
    input.addEventListener("focus", render);
    input.addEventListener("click", render);
    input.addEventListener("blur", () => setTimeout(closeDropdown, 120));

    input.addEventListener("keydown", (e) => {
      if (!dropdown) return;
      const items = dropdown.querySelectorAll(".vocab-tag-suggestion-item");
      if (items.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        activeIndex = (activeIndex + 1) % items.length;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        activeIndex = (activeIndex - 1 + items.length) % items.length;
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        e.stopPropagation();
        select(items[activeIndex].textContent.replace(/^#/, ""));
        return;
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeDropdown();
        return;
      } else {
        return;
      }

      items.forEach((it, i) =>
        it.classList.toggle("active", i === activeIndex),
      );
    });
  }

  /**
   * Live duplicate warning for an input. `findFn` resolves to an existing item
   * (or null) and `messageFn` builds the warning text from that item.
   */
  function setupDuplicateCheck(input, warningEl, findFn, messageFn) {
    if (!input || !warningEl) return;

    let timer = null;

    const run = async () => {
      const value = input.value.trim();
      if (!value) {
        warningEl.textContent = "";
        warningEl.style.display = "none";
        return;
      }

      let existing = null;
      try {
        existing = await findFn(value);
      } catch {
        existing = null;
      }

      if (existing) {
        warningEl.textContent = "⚠ " + messageFn(existing);
        warningEl.style.display = "block";
      } else {
        warningEl.textContent = "";
        warningEl.style.display = "none";
      }
    };

    input.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(run, 250);
    });

    run();
  }

  /**
   * Modal: Save Word
   */
  async function openSaveWordModal({ word, pageUrl, pageTitle }) {
    closeModal();
    const shadow = initShadowRoot();

    let selectedColor = "none";
    const theme =
      (await VocabStorage.getTheme().catch(() => "light")) || "light";
    const knownTags = await VocabStorage.getAllTags().catch(() => []);

    const container = document.createElement("div");
    container.className = "vocab-backdrop";
    container.innerHTML = `
      <div class="vocab-modal ${theme === "dark" ? "dark" : ""}" style="position: relative;">
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
            <span class="vocab-field-warning" id="word-dup-warning"></span>
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

          <div class="vocab-field">
            <label class="vocab-label">Color Accent</label>
            <div class="vocab-color-row" id="color-picker-row"></div>
          </div>

          <div class="vocab-field">
            <label class="vocab-label">Tags <span style="font-weight: 400; color: #64748b;">(Comma separated)</span></label>
            <input type="text" class="vocab-input" id="input-tags" placeholder="e.g. adjective, B2, travel" />
          </div>

          ${
            pageUrl
              ? `
            <div class="vocab-meta-info">
              <strong>Source:</strong> ${escapeHtml(pageTitle || pageUrl)}
            </div>
          `
              : ""
          }
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

    const inputWord = shadow.getElementById("input-word");
    const inputTranslation = shadow.getElementById("input-translation");
    const inputDefinition = shadow.getElementById("input-definition");
    const inputTags = shadow.getElementById("input-tags");
    const colorPickerRow = shadow.getElementById("color-picker-row");
    const btnSave = shadow.getElementById("btn-save");
    const btnCancel = shadow.getElementById("btn-cancel");
    const btnClose = shadow.getElementById("btn-close");
    const errorBanner = shadow.getElementById("error-banner");
    const successToast = shadow.getElementById("success-toast");

    setupColorSwatches(
      colorPickerRow,
      selectedColor,
      (c) => (selectedColor = c),
    );

    setupTagSuggestions(inputTags, knownTags);

    setupDuplicateCheck(
      inputWord,
      shadow.getElementById("word-dup-warning"),
      (value) => VocabStorage.findExistingWord(value),
      (item) => `"${item.word}" is already saved.`,
    );

    // Auto focus translation
    setTimeout(() => {
      inputTranslation.focus();
    }, 50);

    const handleSave = async () => {
      const w = inputWord.value.trim();
      const t = inputTranslation.value.trim();
      const d = inputDefinition.value.trim();
      const tags = inputTags.value.trim();

      if (!w) {
        showError("Please enter a word.");
        inputWord.classList.add("error");
        inputWord.focus();
        return;
      }
      if (!t) {
        showError("Please enter a translation.");
        inputTranslation.classList.add("error");
        inputTranslation.focus();
        return;
      }

      const existingWord = await VocabStorage.findExistingWord(w);
      if (existingWord) {
        showError(`"${existingWord.word}" is already saved.`);
        inputWord.classList.add("error");
        inputWord.focus();
        return;
      }

      btnSave.disabled = true;
      btnSave.textContent = "Saving...";

      try {
        await VocabStorage.saveWord({
          word: w,
          translation: t,
          definition: d,
          color: selectedColor,
          tags: tags,
          sourceUrl: pageUrl,
          sourceTitle: pageTitle,
        });

        successToast.style.display = "flex";
        setTimeout(() => {
          closeModal();
        }, 500);
      } catch (err) {
        showError(err.message || "Failed to save word.");
        btnSave.disabled = false;
        btnSave.textContent = "Save Word";
      }
    };

    function showError(msg) {
      errorBanner.textContent = msg;
      errorBanner.style.display = "block";
    }

    function clearErrors() {
      errorBanner.style.display = "none";
      inputWord.classList.remove("error");
      inputTranslation.classList.remove("error");
    }

    inputWord.addEventListener("input", clearErrors);
    inputTranslation.addEventListener("input", clearErrors);

    btnSave.addEventListener("click", handleSave);
    btnCancel.addEventListener("click", closeModal);
    btnClose.addEventListener("click", closeModal);

    container.addEventListener("click", (e) => {
      if (e.target === container) closeModal();
    });

    const keyHandler = (e) => {
      if (e.key === "Escape") {
        closeModal();
      } else if (e.key === "Enter") {
        if (
          e.ctrlKey ||
          e.metaKey ||
          e.target === inputTranslation ||
          e.target === inputWord ||
          e.target === inputTags
        ) {
          e.preventDefault();
          handleSave();
        }
      }
    };

    container.addEventListener("keydown", keyHandler);
  }

  /**
   * Modal: Save Note
   */
  async function openSaveNoteModal({ title, pageUrl, pageTitle }) {
    closeModal();
    const shadow = initShadowRoot();

    let selectedColor = "none";
    const theme =
      (await VocabStorage.getTheme().catch(() => "light")) || "light";
    const knownTags = await VocabStorage.getAllTags().catch(() => []);

    const container = document.createElement("div");
    container.className = "vocab-backdrop";
    container.innerHTML = `
      <div class="vocab-modal ${theme === "dark" ? "dark" : ""}" style="position: relative;">
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
            <span class="vocab-field-warning" id="note-dup-warning"></span>
          </div>

          <div class="vocab-field">
            <label class="vocab-label">Note Body <span class="vocab-required">*</span></label>
            <textarea class="vocab-textarea" id="input-body" style="min-height: 90px;" placeholder="Write your note body here..."></textarea>
            <span class="vocab-hint">Press Ctrl+Enter to save</span>
          </div>

          <div class="vocab-field">
            <label class="vocab-label">Color Accent</label>
            <div class="vocab-color-row" id="color-picker-row"></div>
          </div>

          <div class="vocab-field">
            <label class="vocab-label">Tags <span style="font-weight: 400; color: #64748b;">(Comma separated)</span></label>
            <input type="text" class="vocab-input" id="input-tags" placeholder="e.g. grammar, work, idea" />
          </div>

          ${
            pageUrl
              ? `
            <div class="vocab-meta-info">
              <strong>Source:</strong> ${escapeHtml(pageTitle || pageUrl)}
            </div>
          `
              : ""
          }
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

    const inputTitle = shadow.getElementById("input-title");
    const inputBody = shadow.getElementById("input-body");
    const inputTags = shadow.getElementById("input-tags");
    const colorPickerRow = shadow.getElementById("color-picker-row");
    const btnSave = shadow.getElementById("btn-save");
    const btnCancel = shadow.getElementById("btn-cancel");
    const btnClose = shadow.getElementById("btn-close");
    const errorBanner = shadow.getElementById("error-banner");
    const successToast = shadow.getElementById("success-toast");

    setupColorSwatches(
      colorPickerRow,
      selectedColor,
      (c) => (selectedColor = c),
    );

    setupTagSuggestions(inputTags, knownTags);

    setupDuplicateCheck(
      inputTitle,
      shadow.getElementById("note-dup-warning"),
      (value) => VocabStorage.findExistingNote(value),
      (item) => `A note titled "${item.title}" already exists.`,
    );

    // Auto focus body
    setTimeout(() => {
      inputBody.focus();
    }, 50);

    const handleSave = async () => {
      const t = inputTitle.value.trim();
      const b = inputBody.value.trim();
      const tags = inputTags.value.trim();

      if (!t) {
        showError("Please enter a note title.");
        inputTitle.classList.add("error");
        inputTitle.focus();
        return;
      }
      if (!b) {
        showError("Please enter the note body.");
        inputBody.classList.add("error");
        inputBody.focus();
        return;
      }

      const existingNote = await VocabStorage.findExistingNote(t);
      if (existingNote) {
        showError(`A note titled "${existingNote.title}" already exists.`);
        inputTitle.classList.add("error");
        inputTitle.focus();
        return;
      }

      btnSave.disabled = true;
      btnSave.textContent = "Saving...";

      try {
        await VocabStorage.saveNote({
          title: t,
          body: b,
          color: selectedColor,
          tags: tags,
          sourceUrl: pageUrl,
          sourceTitle: pageTitle,
        });

        successToast.style.display = "flex";
        setTimeout(() => {
          closeModal();
        }, 500);
      } catch (err) {
        showError(err.message || "Failed to save note.");
        btnSave.disabled = false;
        btnSave.textContent = "Save Note";
      }
    };

    function showError(msg) {
      errorBanner.textContent = msg;
      errorBanner.style.display = "block";
    }

    function clearErrors() {
      errorBanner.style.display = "none";
      inputTitle.classList.remove("error");
      inputBody.classList.remove("error");
    }

    inputTitle.addEventListener("input", clearErrors);
    inputBody.addEventListener("input", clearErrors);

    btnSave.addEventListener("click", handleSave);
    btnCancel.addEventListener("click", closeModal);
    btnClose.addEventListener("click", closeModal);

    container.addEventListener("click", (e) => {
      if (e.target === container) closeModal();
    });

    const keyHandler = (e) => {
      if (e.key === "Escape") {
        closeModal();
      } else if (e.key === "Enter") {
        if (
          e.ctrlKey ||
          e.metaKey ||
          (e.target === inputTitle && !e.shiftKey) ||
          e.target === inputTags
        ) {
          e.preventDefault();
          handleSave();
        }
      }
    };

    container.addEventListener("keydown", keyHandler);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Listen for messages from background script (cross-browser)
   */
  const extAPI =
    typeof browser !== "undefined" && browser && browser.runtime
      ? browser
      : chrome;
  if (extAPI && extAPI.runtime && extAPI.runtime.onMessage) {
    extAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "OPEN_SAVE_WORD_MODAL") {
        openSaveWordModal({
          word: request.word,
          pageUrl: request.pageUrl,
          pageTitle: request.pageTitle,
        });
        sendResponse({ status: "OK" });
      } else if (request.action === "OPEN_SAVE_NOTE_MODAL") {
        openSaveNoteModal({
          title: request.title,
          pageUrl: request.pageUrl,
          pageTitle: request.pageTitle,
        });
        sendResponse({ status: "OK" });
      }
      return true;
    });
  }
})();
