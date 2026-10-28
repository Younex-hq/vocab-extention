/**
 * popup.js - Interactive Controller for Vocab & Notes Extension Popup
 * Supports Color categorization, Tagging, Multi-attribute Filtering, and Sorting.
 */

document.addEventListener('DOMContentLoaded', async () => {
  'use strict';

  // State
  let currentView = 'view-see-saves';
  let currentSubTab = 'words';
  let cachedWords = [];
  let cachedNotes = [];
  let activeTabUrl = '';

  // Filter & Sort State
  let searchQuery = '';
  let sortOrder = 'date-desc';
  let colorFilter = 'all';
  let tagFilter = 'all';
  let websiteFilter = 'all';

  // Form Colors
  let addWordColor = 'none';
  let addNoteColor = 'none';
  let editItemColor = 'none';

  // Modals State
  let itemToEdit = null;
  let itemToDelete = null;

  // DOM Elements - Navigation
  const navBtns = document.querySelectorAll('.nav-btn');
  const viewPanels = document.querySelectorAll('.view-panel');
  const tabWordsBtn = document.getElementById('tab-words');
  const tabNotesBtn = document.getElementById('tab-notes');
  const wordsListEl = document.getElementById('words-list');
  const notesListEl = document.getElementById('notes-list');

  // DOM Elements - Badges & Stats
  const badgeWordsCount = document.getElementById('badge-words-count');
  const badgeNotesCount = document.getElementById('badge-notes-count');
  const statWordsPill = document.getElementById('stat-words-pill');
  const statNotesPill = document.getElementById('stat-notes-pill');

  // DOM Elements - Search & Filters
  const searchInput = document.getElementById('search-input');
  const searchClearBtn = document.getElementById('search-clear-btn');
  const sortSelect = document.getElementById('sort-select');
  const filterColor = document.getElementById('filter-color');
  const filterTag = document.getElementById('filter-tag');
  const filterWebsite = document.getElementById('filter-website');
  const btnResetFilters = document.getElementById('btn-reset-filters');
  const filterStatusBar = document.getElementById('filter-status-bar');
  const filterStatusText = document.getElementById('filter-status-text');

  // DOM Elements - Add Word Form
  const formAddWord = document.getElementById('form-add-word');
  const wordInput = document.getElementById('word-input');
  const translationInput = document.getElementById('translation-input');
  const definitionInput = document.getElementById('definition-input');
  const wordTagsInput = document.getElementById('word-tags-input');
  const wordSourceUrl = document.getElementById('word-source-url');
  const btnCancelAddWord = document.getElementById('btn-cancel-add-word');
  const addWordColorPicker = document.getElementById('add-word-color-picker');

  // DOM Elements - Add Note Form
  const formAddNote = document.getElementById('form-add-note');
  const noteTitleInput = document.getElementById('note-title-input');
  const noteBodyInput = document.getElementById('note-body-input');
  const noteTagsInput = document.getElementById('note-tags-input');
  const noteSourceUrl = document.getElementById('note-source-url');
  const btnCancelAddNote = document.getElementById('btn-cancel-add-note');
  const addNoteColorPicker = document.getElementById('add-note-color-picker');

  // DOM Elements - Export
  const btnExportWordsCsv = document.getElementById('btn-export-words-csv');
  const btnExportWordsJson = document.getElementById('btn-export-words-json');
  const btnExportNotesCsv = document.getElementById('btn-export-notes-csv');
  const btnExportNotesJson = document.getElementById('btn-export-notes-json');
  const btnExportAllJson = document.getElementById('btn-export-all-json');

  // DOM Elements - Edit Modal
  const editModal = document.getElementById('edit-modal');
  const editModalTitle = document.getElementById('edit-modal-title');
  const editModalBody = document.getElementById('edit-modal-body');
  const btnSaveEdit = document.getElementById('btn-save-edit');
  const btnCancelEdit = document.getElementById('btn-cancel-edit');
  const btnCloseEditModal = document.getElementById('btn-close-edit-modal');

  // DOM Elements - Delete Modal
  const deleteModal = document.getElementById('delete-modal');
  const deleteModalPrompt = document.getElementById('delete-modal-prompt');
  const btnConfirmDelete = document.getElementById('btn-confirm-delete');
  const btnCancelDelete = document.getElementById('btn-cancel-delete');
  const btnCloseDeleteModal = document.getElementById('btn-close-delete-modal');

  // Toast
  const toastContainer = document.getElementById('toast-container');

  // -------------------------------------------------------------
  // COLOR PICKER HELPER
  // -------------------------------------------------------------

  function renderColorPicker(container, currentColor, onChange) {
    container.innerHTML = '';
    VocabStorage.VALID_COLORS.forEach((c) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `color-swatch-btn swatch-${c} ${c === currentColor ? 'active' : ''}`;
      btn.title = c === 'none' ? 'No color (Default)' : c.charAt(0).toUpperCase() + c.slice(1);
      btn.addEventListener('click', () => {
        container.querySelectorAll('.color-swatch-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        onChange(c);
      });
      container.appendChild(btn);
    });
  }

  renderColorPicker(addWordColorPicker, addWordColor, (c) => (addWordColor = c));
  renderColorPicker(addNoteColorPicker, addNoteColor, (c) => (addNoteColor = c));

  // -------------------------------------------------------------
  // INITIALIZATION
  // -------------------------------------------------------------

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && !tab.url.startsWith('chrome://')) {
      activeTabUrl = tab.url;
      wordSourceUrl.value = activeTabUrl;
      noteSourceUrl.value = activeTabUrl;
    }
  } catch (e) {
    // Non-fatal
  }

  await loadAllData();

  // -------------------------------------------------------------
  // NAVIGATION & VIEW SWITCHING
  // -------------------------------------------------------------

  function switchView(targetViewId) {
    currentView = targetViewId;
    navBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === targetViewId);
    });
    viewPanels.forEach((panel) => {
      panel.classList.toggle('active', panel.id === targetViewId);
    });

    if (targetViewId === 'view-add-word') {
      setTimeout(() => wordInput.focus(), 50);
    } else if (targetViewId === 'view-add-note') {
      setTimeout(() => noteTitleInput.focus(), 50);
    } else if (targetViewId === 'view-see-saves') {
      renderLists();
    }
  }

  navBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
    });
  });

  btnCancelAddWord.addEventListener('click', () => switchView('view-see-saves'));
  btnCancelAddNote.addEventListener('click', () => switchView('view-see-saves'));

  // -------------------------------------------------------------
  // SUBTABS (WORDS / NOTES)
  // -------------------------------------------------------------

  function switchSubTab(tabName) {
    currentSubTab = tabName;
    tabWordsBtn.classList.toggle('active', tabName === 'words');
    tabNotesBtn.classList.toggle('active', tabName === 'notes');

    if (tabName === 'words') {
      wordsListEl.style.display = 'flex';
      notesListEl.style.display = 'none';
    } else {
      wordsListEl.style.display = 'none';
      notesListEl.style.display = 'flex';
    }

    populateDynamicFilters();
    renderLists();
  }

  tabWordsBtn.addEventListener('click', () => switchSubTab('words'));
  tabNotesBtn.addEventListener('click', () => switchSubTab('notes'));

  // -------------------------------------------------------------
  // DATA LOADING & POPULATION
  // -------------------------------------------------------------

  async function loadAllData() {
    try {
      const { words, notes } = await VocabStorage.getAllData();
      cachedWords = words || [];
      cachedNotes = notes || [];
      updateBadges();
      populateDynamicFilters();
      renderLists();
    } catch (err) {
      console.error('Error loading data:', err);
      showToast('Error loading saves');
    }
  }

  function updateBadges() {
    const wCount = cachedWords.length;
    const nCount = cachedNotes.length;

    badgeWordsCount.textContent = wCount;
    badgeNotesCount.textContent = nCount;
    statWordsPill.textContent = `${wCount} word${wCount === 1 ? '' : 's'}`;
    statNotesPill.textContent = `${nCount} note${nCount === 1 ? '' : 's'}`;
  }

  /**
   * Dynamically populate Tag and Website dropdowns based on the active tab's items
   */
  function populateDynamicFilters() {
    const activeItems = currentSubTab === 'words' ? cachedWords : cachedNotes;

    // Collect Unique Tags
    const tagsSet = new Set();
    activeItems.forEach((item) => {
      (item.tags || []).forEach((t) => tagsSet.add(t));
    });
    const uniqueTags = Array.from(tagsSet).sort();

    // Populate Tag Select
    const prevTag = filterTag.value;
    filterTag.innerHTML = '<option value="all">All Tags</option>';
    uniqueTags.forEach((tag) => {
      const opt = document.createElement('option');
      opt.value = tag;
      opt.textContent = `#${tag}`;
      filterTag.appendChild(opt);
    });
    if (uniqueTags.includes(prevTag)) {
      filterTag.value = prevTag;
      tagFilter = prevTag;
    } else {
      filterTag.value = 'all';
      tagFilter = 'all';
    }

    // Collect Unique Websites / Domains
    const domainsSet = new Set();
    activeItems.forEach((item) => {
      const domain = VocabStorage.extractDomain(item.sourceUrl);
      domainsSet.add(domain);
    });
    const uniqueDomains = Array.from(domainsSet).sort();

    // Populate Website Select
    const prevSite = filterWebsite.value;
    filterWebsite.innerHTML = '<option value="all">All Websites</option>';
    uniqueDomains.forEach((site) => {
      const opt = document.createElement('option');
      opt.value = site;
      opt.textContent = site;
      filterWebsite.appendChild(opt);
    });
    if (uniqueDomains.includes(prevSite)) {
      filterWebsite.value = prevSite;
      websiteFilter = prevSite;
    } else {
      filterWebsite.value = 'all';
      websiteFilter = 'all';
    }
  }

  // -------------------------------------------------------------
  // SORTING & FILTERING LOGIC
  // -------------------------------------------------------------

  function getSortedAndFilteredItems(items, type) {
    const q = searchQuery.toLowerCase().trim();

    // 1. Filter
    let filtered = items.filter((item) => {
      // Search Query
      if (q) {
        const titleMatch = (type === 'word' ? item.word : item.title).toLowerCase().includes(q);
        const bodyMatch = (type === 'word' ? (item.translation + ' ' + (item.definition || '')) : (item.body || '')).toLowerCase().includes(q);
        const tagMatch = (item.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!titleMatch && !bodyMatch && !tagMatch) return false;
      }

      // Color Filter
      if (colorFilter !== 'all') {
        const itemColor = item.color || 'none';
        if (itemColor !== colorFilter) return false;
      }

      // Tag Filter
      if (tagFilter !== 'all') {
        if (!item.tags || !item.tags.includes(tagFilter)) return false;
      }

      // Website Filter
      if (websiteFilter !== 'all') {
        const domain = VocabStorage.extractDomain(item.sourceUrl);
        if (domain !== websiteFilter) return false;
      }

      return true;
    });

    // 2. Sort
    filtered.sort((a, b) => {
      if (sortOrder === 'date-desc') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      if (sortOrder === 'date-asc') {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }
      if (sortOrder === 'alpha-asc') {
        const aVal = (type === 'word' ? a.word : a.title).toLowerCase();
        const bVal = (type === 'word' ? b.word : b.title).toLowerCase();
        return aVal.localeCompare(bVal);
      }
      if (sortOrder === 'alpha-desc') {
        const aVal = (type === 'word' ? a.word : a.title).toLowerCase();
        const bVal = (type === 'word' ? b.word : b.title).toLowerCase();
        return bVal.localeCompare(aVal);
      }
      return 0;
    });

    return filtered;
  }

  function updateFilterStatusBar(totalCount, filteredCount) {
    const isFiltered =
      searchQuery !== '' ||
      colorFilter !== 'all' ||
      tagFilter !== 'all' ||
      websiteFilter !== 'all' ||
      sortOrder !== 'date-desc';

    if (isFiltered) {
      filterStatusBar.style.display = 'flex';
      filterStatusText.textContent = `Showing ${filteredCount} of ${totalCount} items (Filtered)`;
    } else {
      filterStatusBar.style.display = 'none';
    }
  }

  // -------------------------------------------------------------
  // RENDERING LISTS
  // -------------------------------------------------------------

  function formatDate(isoStr) {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return '';
    }
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

  function cleanUrl(url) {
    try {
      const u = new URL(url);
      return u.hostname + (u.pathname.length > 1 ? u.pathname.substring(0, 20) + '...' : '');
    } catch {
      return url.substring(0, 25) + '...';
    }
  }

  function renderLists() {
    const isWordsTab = currentSubTab === 'words';
    const activeItems = isWordsTab ? cachedWords : cachedNotes;
    const filtered = getSortedAndFilteredItems(activeItems, isWordsTab ? 'word' : 'note');

    updateFilterStatusBar(activeItems.length, filtered.length);

    if (isWordsTab) {
      renderWordsList(filtered);
    } else {
      renderNotesList(filtered);
    }

    attachCardEventListeners();
  }

  function renderWordsList(filteredWords) {
    if (filteredWords.length === 0) {
      const isFiltered =
        searchQuery || colorFilter !== 'all' || tagFilter !== 'all' || websiteFilter !== 'all';

      if (isFiltered) {
        wordsListEl.innerHTML = `
          <div class="empty-state">
            <span class="empty-icon">🔍</span>
            <div class="empty-title">No matching words</div>
            <div class="empty-desc">No saved words match your search or filter criteria.</div>
            <button class="btn btn-secondary" id="empty-reset-filters-btn" style="margin-top: 6px;">Reset Filters</button>
          </div>
        `;
        document.getElementById('empty-reset-filters-btn')?.addEventListener('click', resetAllFilters);
      } else {
        wordsListEl.innerHTML = `
          <div class="empty-state">
            <span class="empty-icon">📖</span>
            <div class="empty-title">No saved words yet</div>
            <div class="empty-desc">Select any word on a webpage and right-click to save it, or click Add Word above.</div>
            <button class="btn btn-secondary" id="empty-add-word-btn" style="margin-top: 6px;">+ Add Word</button>
          </div>
        `;
        document.getElementById('empty-add-word-btn')?.addEventListener('click', () => {
          switchView('view-add-word');
        });
      }
      return;
    }

    wordsListEl.innerHTML = filteredWords
      .map((w) => {
        const itemColor = w.color || 'none';
        const colorClass = itemColor !== 'none' ? `card-color-${itemColor}` : '';
        const dotHtml =
          itemColor !== 'none' ? `<span class="card-color-dot dot-${itemColor}"></span>` : '';
        const tagsHtml =
          w.tags && w.tags.length > 0
            ? `<div class="card-tags">${w.tags
                .map((t) => `<span class="card-tag" data-tag="${escapeHtml(t)}">#${escapeHtml(t)}</span>`)
                .join('')}</div>`
            : '';

        return `
          <div class="item-card ${colorClass}" data-id="${w.id}">
            <div class="card-top">
              <div class="card-title-wrap">
                ${dotHtml}
                <span class="card-word">${escapeHtml(w.word)}</span>
                <span class="card-translation">${escapeHtml(w.translation)}</span>
              </div>
              <div class="card-actions">
                <button class="card-action-btn edit-word-btn" data-id="${w.id}" title="Edit word">✏️ Edit</button>
                <button class="card-action-btn delete-btn delete-word-btn" data-id="${w.id}" title="Delete word">🗑️</button>
              </div>
            </div>
            ${w.definition ? `<div class="card-definition">${escapeHtml(w.definition)}</div>` : ''}
            ${tagsHtml}
            <div class="card-footer">
              <span>${formatDate(w.createdAt)}</span>
              ${
                w.sourceUrl
                  ? `<a href="${escapeHtml(w.sourceUrl)}" target="_blank" class="card-source-link" title="${escapeHtml(w.sourceUrl)}">🔗 ${escapeHtml(cleanUrl(w.sourceUrl))}</a>`
                  : ''
              }
            </div>
          </div>
        `;
      })
      .join('');
  }

  function renderNotesList(filteredNotes) {
    if (filteredNotes.length === 0) {
      const isFiltered =
        searchQuery || colorFilter !== 'all' || tagFilter !== 'all' || websiteFilter !== 'all';

      if (isFiltered) {
        notesListEl.innerHTML = `
          <div class="empty-state">
            <span class="empty-icon">🔍</span>
            <div class="empty-title">No matching notes</div>
            <div class="empty-desc">No saved notes match your search or filter criteria.</div>
            <button class="btn btn-secondary" id="empty-reset-filters-btn-notes" style="margin-top: 6px;">Reset Filters</button>
          </div>
        `;
        document.getElementById('empty-reset-filters-btn-notes')?.addEventListener('click', resetAllFilters);
      } else {
        notesListEl.innerHTML = `
          <div class="empty-state">
            <span class="empty-icon">📝</span>
            <div class="empty-title">No saved notes yet</div>
            <div class="empty-desc">Select text on any webpage and right-click "Save as note", or click Add Note above.</div>
            <button class="btn btn-secondary" id="empty-add-note-btn" style="margin-top: 6px;">+ Add Note</button>
          </div>
        `;
        document.getElementById('empty-add-note-btn')?.addEventListener('click', () => {
          switchView('view-add-note');
        });
      }
      return;
    }

    notesListEl.innerHTML = filteredNotes
      .map((n) => {
        const itemColor = n.color || 'none';
        const colorClass = itemColor !== 'none' ? `card-color-${itemColor}` : '';
        const dotHtml =
          itemColor !== 'none' ? `<span class="card-color-dot dot-${itemColor}"></span>` : '';
        const tagsHtml =
          n.tags && n.tags.length > 0
            ? `<div class="card-tags">${n.tags
                .map((t) => `<span class="card-tag" data-tag="${escapeHtml(t)}">#${escapeHtml(t)}</span>`)
                .join('')}</div>`
            : '';

        return `
          <div class="item-card ${colorClass}" data-id="${n.id}">
            <div class="card-top">
              <div class="card-title-wrap">
                ${dotHtml}
                <span class="card-word">${escapeHtml(n.title)}</span>
              </div>
              <div class="card-actions">
                <button class="card-action-btn edit-note-btn" data-id="${n.id}" title="Edit note">✏️ Edit</button>
                <button class="card-action-btn delete-btn delete-note-btn" data-id="${n.id}" title="Delete note">🗑️</button>
              </div>
            </div>
            <div class="card-note-body">${escapeHtml(n.body)}</div>
            ${tagsHtml}
            <div class="card-footer">
              <span>${formatDate(n.createdAt)}</span>
              ${
                n.sourceUrl
                  ? `<a href="${escapeHtml(n.sourceUrl)}" target="_blank" class="card-source-link" title="${escapeHtml(n.sourceUrl)}">🔗 ${escapeHtml(cleanUrl(n.sourceUrl))}</a>`
                  : ''
              }
            </div>
          </div>
        `;
      })
      .join('');
  }

  function attachCardEventListeners() {
    // Word Edit
    document.querySelectorAll('.edit-word-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const item = cachedWords.find((w) => w.id === id);
        if (item) openEditModal('word', item);
      });
    });

    // Word Delete
    document.querySelectorAll('.delete-word-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const item = cachedWords.find((w) => w.id === id);
        if (item) openDeleteModal('word', item);
      });
    });

    // Note Edit
    document.querySelectorAll('.edit-note-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const item = cachedNotes.find((n) => n.id === id);
        if (item) openEditModal('note', item);
      });
    });

    // Note Delete
    document.querySelectorAll('.delete-note-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const item = cachedNotes.find((n) => n.id === id);
        if (item) openDeleteModal('note', item);
      });
    });

    // Clicking a Tag pill filters directly by that tag
    document.querySelectorAll('.card-tag').forEach((pill) => {
      pill.addEventListener('click', () => {
        const t = pill.dataset.tag;
        if (t) {
          filterTag.value = t;
          tagFilter = t;
          renderLists();
        }
      });
    });
  }

  // -------------------------------------------------------------
  // FILTERS & SORT LISTENERS
  // -------------------------------------------------------------

  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value;
    searchClearBtn.style.display = searchQuery ? 'block' : 'none';
    renderLists();
  });

  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    searchClearBtn.style.display = 'none';
    renderLists();
    searchInput.focus();
  });

  sortSelect.addEventListener('change', () => {
    sortOrder = sortSelect.value;
    renderLists();
  });

  filterColor.addEventListener('change', () => {
    colorFilter = filterColor.value;
    renderLists();
  });

  filterTag.addEventListener('change', () => {
    tagFilter = filterTag.value;
    renderLists();
  });

  filterWebsite.addEventListener('change', () => {
    websiteFilter = filterWebsite.value;
    renderLists();
  });

  function resetAllFilters() {
    searchQuery = '';
    searchInput.value = '';
    searchClearBtn.style.display = 'none';

    sortOrder = 'date-desc';
    sortSelect.value = 'date-desc';

    colorFilter = 'all';
    filterColor.value = 'all';

    tagFilter = 'all';
    filterTag.value = 'all';

    websiteFilter = 'all';
    filterWebsite.value = 'all';

    renderLists();
  }

  btnResetFilters.addEventListener('click', resetAllFilters);

  // -------------------------------------------------------------
  // FORM: ADD WORD
  // -------------------------------------------------------------

  formAddWord.addEventListener('submit', async (e) => {
    e.preventDefault();
    const word = wordInput.value.trim();
    const translation = translationInput.value.trim();
    const definition = definitionInput.value.trim();
    const rawTags = wordTagsInput.value.trim();
    const sourceUrl = wordSourceUrl.value.trim();

    if (!word || !translation) {
      showToast('Word and Translation are required');
      return;
    }

    try {
      await VocabStorage.saveWord({
        word,
        translation,
        definition,
        color: addWordColor,
        tags: rawTags,
        sourceUrl
      });

      wordInput.value = '';
      translationInput.value = '';
      definitionInput.value = '';
      wordTagsInput.value = '';
      addWordColor = 'none';
      renderColorPicker(addWordColorPicker, addWordColor, (c) => (addWordColor = c));

      if (!activeTabUrl) wordSourceUrl.value = '';

      await loadAllData();
      showToast('✓ Word saved successfully!');
      switchSubTab('words');
      switchView('view-see-saves');
    } catch (err) {
      console.error(err);
      showToast('Error saving word: ' + err.message);
    }
  });

  // -------------------------------------------------------------
  // FORM: ADD NOTE
  // -------------------------------------------------------------

  formAddNote.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = noteTitleInput.value.trim();
    const body = noteBodyInput.value.trim();
    const rawTags = noteTagsInput.value.trim();
    const sourceUrl = noteSourceUrl.value.trim();

    if (!title || !body) {
      showToast('Title and Body are required');
      return;
    }

    try {
      await VocabStorage.saveNote({
        title,
        body,
        color: addNoteColor,
        tags: rawTags,
        sourceUrl
      });

      noteTitleInput.value = '';
      noteBodyInput.value = '';
      noteTagsInput.value = '';
      addNoteColor = 'none';
      renderColorPicker(addNoteColorPicker, addNoteColor, (c) => (addNoteColor = c));

      if (!activeTabUrl) noteSourceUrl.value = '';

      await loadAllData();
      showToast('✓ Note saved successfully!');
      switchSubTab('notes');
      switchView('view-see-saves');
    } catch (err) {
      console.error(err);
      showToast('Error saving note: ' + err.message);
    }
  });

  // -------------------------------------------------------------
  // EDIT MODAL
  // -------------------------------------------------------------

  function openEditModal(type, item) {
    itemToEdit = { type, item };
    editItemColor = item.color || 'none';
    editModalTitle.textContent = type === 'word' ? 'Edit Word' : 'Edit Note';

    if (type === 'word') {
      editModalBody.innerHTML = `
        <div class="form-group">
          <label class="form-label">Word <span class="req">*</span></label>
          <input type="text" id="edit-word-val" class="form-input" value="${escapeHtml(item.word)}" />
        </div>
        <div class="form-group">
          <label class="form-label">Translation <span class="req">*</span></label>
          <input type="text" id="edit-trans-val" class="form-input" value="${escapeHtml(item.translation)}" />
        </div>
        <div class="form-group">
          <label class="form-label">Definition</label>
          <textarea id="edit-def-val" class="form-textarea" rows="2">${escapeHtml(item.definition || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Color Accent</label>
          <div class="color-picker-row" id="edit-color-picker"></div>
        </div>
        <div class="form-group">
          <label class="form-label">Tags (Comma separated)</label>
          <input type="text" id="edit-tags-val" class="form-input" value="${escapeHtml((item.tags || []).join(', '))}" />
        </div>
      `;
    } else {
      editModalBody.innerHTML = `
        <div class="form-group">
          <label class="form-label">Title <span class="req">*</span></label>
          <input type="text" id="edit-title-val" class="form-input" value="${escapeHtml(item.title)}" />
        </div>
        <div class="form-group">
          <label class="form-label">Body <span class="req">*</span></label>
          <textarea id="edit-body-val" class="form-textarea" rows="4">${escapeHtml(item.body || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Color Accent</label>
          <div class="color-picker-row" id="edit-color-picker"></div>
        </div>
        <div class="form-group">
          <label class="form-label">Tags (Comma separated)</label>
          <input type="text" id="edit-tags-val" class="form-input" value="${escapeHtml((item.tags || []).join(', '))}" />
        </div>
      `;
    }

    const editColorPicker = document.getElementById('edit-color-picker');
    renderColorPicker(editColorPicker, editItemColor, (c) => (editItemColor = c));

    editModal.style.display = 'flex';
  }

  function closeEditModal() {
    editModal.style.display = 'none';
    itemToEdit = null;
  }

  btnCloseEditModal.addEventListener('click', closeEditModal);
  btnCancelEdit.addEventListener('click', closeEditModal);

  btnSaveEdit.addEventListener('click', async () => {
    if (!itemToEdit) return;

    const tagsVal = document.getElementById('edit-tags-val').value.trim();

    if (itemToEdit.type === 'word') {
      const w = document.getElementById('edit-word-val').value.trim();
      const t = document.getElementById('edit-trans-val').value.trim();
      const d = document.getElementById('edit-def-val').value.trim();

      if (!w || !t) {
        showToast('Word and Translation are required');
        return;
      }

      await VocabStorage.updateWord(itemToEdit.item.id, {
        word: w,
        translation: t,
        definition: d,
        color: editItemColor,
        tags: tagsVal
      });
    } else {
      const title = document.getElementById('edit-title-val').value.trim();
      const body = document.getElementById('edit-body-val').value.trim();

      if (!title || !body) {
        showToast('Title and Body are required');
        return;
      }

      await VocabStorage.updateNote(itemToEdit.item.id, {
        title,
        body,
        color: editItemColor,
        tags: tagsVal
      });
    }

    closeEditModal();
    await loadAllData();
    showToast('✓ Updated successfully');
  });

  // -------------------------------------------------------------
  // DELETE MODAL
  // -------------------------------------------------------------

  function openDeleteModal(type, item) {
    itemToDelete = { type, item };
    const label = type === 'word' ? `word "${item.word}"` : `note "${item.title}"`;
    deleteModalPrompt.textContent = `Are you sure you want to delete the ${label}? This cannot be undone.`;
    deleteModal.style.display = 'flex';
  }

  function closeDeleteModal() {
    deleteModal.style.display = 'none';
    itemToDelete = null;
  }

  btnCloseDeleteModal.addEventListener('click', closeDeleteModal);
  btnCancelDelete.addEventListener('click', closeDeleteModal);

  btnConfirmDelete.addEventListener('click', async () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === 'word') {
      await VocabStorage.deleteWord(itemToDelete.item.id);
    } else {
      await VocabStorage.deleteNote(itemToDelete.item.id);
    }

    closeDeleteModal();
    await loadAllData();
    showToast('Item deleted');
  });

  // -------------------------------------------------------------
  // EXPORT ACTIONS
  // -------------------------------------------------------------

  function getDatestamp() {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  btnExportWordsCsv.addEventListener('click', async () => {
    const words = await VocabStorage.getWords();
    if (words.length === 0) {
      showToast('No words to export');
      return;
    }
    const csv = VocabStorage.exportWordsToCsv(words);
    VocabStorage.downloadFile(csv, `vocab_words_anki_${getDatestamp()}.csv`, 'text/csv;charset=utf-8;');
    showToast('✓ Words CSV exported');
  });

  btnExportWordsJson.addEventListener('click', async () => {
    const words = await VocabStorage.getWords();
    if (words.length === 0) {
      showToast('No words to export');
      return;
    }
    const json = VocabStorage.exportWordsToJson(words);
    VocabStorage.downloadFile(json, `vocab_words_${getDatestamp()}.json`, 'application/json;charset=utf-8;');
    showToast('✓ Words JSON exported');
  });

  btnExportNotesCsv.addEventListener('click', async () => {
    const notes = await VocabStorage.getNotes();
    if (notes.length === 0) {
      showToast('No notes to export');
      return;
    }
    const csv = VocabStorage.exportNotesToCsv(notes);
    VocabStorage.downloadFile(csv, `vocab_notes_${getDatestamp()}.csv`, 'text/csv;charset=utf-8;');
    showToast('✓ Notes CSV exported');
  });

  btnExportNotesJson.addEventListener('click', async () => {
    const notes = await VocabStorage.getNotes();
    if (notes.length === 0) {
      showToast('No notes to export');
      return;
    }
    const json = VocabStorage.exportNotesToJson(notes);
    VocabStorage.downloadFile(json, `vocab_notes_${getDatestamp()}.json`, 'application/json;charset=utf-8;');
    showToast('✓ Notes JSON exported');
  });

  btnExportAllJson.addEventListener('click', async () => {
    const all = await VocabStorage.getAllData();
    if (all.words.length === 0 && all.notes.length === 0) {
      showToast('No data to export');
      return;
    }
    const json = VocabStorage.exportAllToJson(all);
    VocabStorage.downloadFile(json, `vocab_vault_backup_${getDatestamp()}.json`, 'application/json;charset=utf-8;');
    showToast('✓ Full backup JSON exported');
  });

  // -------------------------------------------------------------
  // TOAST NOTIFICATIONS
  // -------------------------------------------------------------

  function showToast(msg, duration = 2200) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.2s';
      setTimeout(() => toast.remove(), 200);
    }, duration);
  }
});
