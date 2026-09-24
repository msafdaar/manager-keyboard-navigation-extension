(() => {
  // Store relative paths instead of hardcoded hostnames and business keys
  const ALIASES = {
    h:  { path: '/summary-view', label: 'Summary' },
    a:  { path: '/bank-and-cash-accounts', label: 'Bank and Cash Accounts' },
    r:  { path: '/receipts', label: 'Receipts' },
    p:  { path: '/payments', label: 'Payments' },
    ia: { path: '/inter-account-transfers', label: 'Inter Account Transfers' },
    c:  { path: '/customers', label: 'Customers' },
    cs: { path: '/customer-statements-transactions-list', label: 'Customer Statements' },
    si: { path: '/sales-invoices', label: 'Sales Invoices' },
    s:  { path: '/suppliers', label: 'Suppliers' },
    ss: { path: '/supplier-statements-transactions-list', label: 'Suppliers Statements' },    
    pi: { path: '/purchase-invoices', label: 'Purchase Invoices' },
    ii: { path: '/inventory-items', label: 'Inventory Items' },
    em: { path: '/employees', label: 'Employees' },
    je: { path: '/journal-entries', label: 'Journal Entries' },
  };

  const TRUNCATE_LIMIT = 40;
  const EMPTY_HINT = 'Type to search · /alias to navigate';
  const PENDING_SEARCH_KEY = 'mgcmd:pendingSearch';

// Extract business query from #tabSummary or any sidebar link
  const getBusinessQuery = () => {
    const summaryTab = document.querySelector('#tabSummary') || document.querySelector('a[href*="/summary-view"]');
    if (summaryTab) {
      const href = summaryTab.getAttribute('href');
      if (href && href.includes('?')) return href.split('?')[1];
    }
    const sidebarLink = document.querySelector('#sidebar a[href*="?"]');
    if (sidebarLink) {
      return sidebarLink.getAttribute('href').split('?')[1];
    }
    return null;
  };


  // Construct absolute dynamic URL for an alias
  const getUrlForAlias = (alias) => {
    const entry = ALIASES[alias];
    if (!entry) return '';
    const bizQuery = getBusinessQuery();
    const queryString = bizQuery ? `?${bizQuery}` : '';
    return `${window.location.origin}${entry.path}${queryString}`;
  };

  const parseNav = (value) => {
    const rest = value.slice(1).trim();
    const spaceIdx = rest.search(/\s/);
    const alias = (spaceIdx === -1 ? rest : rest.slice(0, spaceIdx)).toLowerCase();
    const term = spaceIdx === -1 ? '' : rest.slice(spaceIdx).trim();
    return { alias, term };
  };

  const findSearchInput = () =>
    document.querySelector('input[name="Term"]') ||
    document.querySelector('input[placeholder="Search"]');

  const hasSearchBar = Boolean(findSearchInput());

  const getActiveSearch = () => {
    const input = findSearchInput();
    return input && input.form && input.value.trim() !== '' ? input : null;
  };

  const clearSearch = () => {
    const input = getActiveSearch();
    if (!input) return;
    input.value = '';
    input.form.requestSubmit();
  };

  const truncate = (text) =>
    text.length > TRUNCATE_LIMIT ? text.slice(0, TRUNCATE_LIMIT) + '…' : text;

  const describe = (value) => {
    const trimmed = value.trim();
    if (trimmed === '') {
      const active = getActiveSearch();
      if (active) {
        return { text: `Enter to clear search · currently "${truncate(active.value.trim())}"`, kind: 'clear' };
      }
      return hasSearchBar
        ? { text: EMPTY_HINT, kind: 'hint' }
        : { text: 'No search Bar Detected - /alias to navigate', kind: 'hint' };
    }
    if (trimmed.startsWith('/')) {
      const { alias, term } = parseNav(trimmed);
      if (alias === '') return { text: EMPTY_HINT, kind: 'hint' };
      const entry = ALIASES[alias];
      if (entry) {
        if (term === '') return { text: `Navigate to ${entry.label}`, kind: 'nav' };
        return { text: `Navigate to ${entry.label}, then search "${truncate(term)}"`, kind: 'nav' };
      }
      return { text: `Invalid link: ${alias}`, kind: 'error' };
    }
    if (!hasSearchBar) {
      return { text: 'No search bar detected, nothing will happen', kind: 'error' };
    }
    return { text: `Search for "${truncate(trimmed)}"`, kind: 'search' };
  };

  const execute = (value, newTab = false) => {
    const open = (url) => {
      if (newTab) window.open(url, '_blank');
      else window.location.href = url;
    };

    const trimmed = value.trim();
    if (trimmed === '') {
      if (newTab) return;
      clearSearch();
      return;
    }
    if (trimmed.startsWith('/')) {
      const { alias, term } = parseNav(trimmed);
      if (alias === '') return;
      const entry = ALIASES[alias];
      if (entry) {
        if (term !== '') sessionStorage.setItem(PENDING_SEARCH_KEY, term);
        open(getUrlForAlias(alias));
      }
      return;
    }
    if (!hasSearchBar) return;
    const input = findSearchInput();
    if (!input || !input.form) return;
    if (newTab) {
      const previousValue = input.value;
      input.value = trimmed;
      input.form.target = '_blank';
      input.form.requestSubmit();
      input.value = previousValue;
      input.form.target = '';
      return;
    }
    input.value = trimmed;
    input.form.requestSubmit();
  };

  function closeModal() {
    const overlay = document.querySelector('.mgx-modal-overlay');
    if (overlay) overlay.remove();
  }

  function openModal(titleText, buildContent) {
    closeModal();
    const overlay = document.createElement('div');
    overlay.className = 'mgx-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'mgx-modal';

    const header = document.createElement('div');
    header.className = 'mgx-modal-header';
    const title = document.createElement('span');
    title.textContent = titleText;
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closeModal);
    header.appendChild(title);
    header.appendChild(closeBtn);

    modal.appendChild(header);
    modal.appendChild(buildContent());
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeModal();
    });
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeModal();
    });
    closeBtn.focus();
  }

  const buildAliasTable = () => {
    const table = document.createElement('table');
    table.className = 'mgx-modal-table';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['Alias', 'Label', 'Link'].forEach((label) => {
      const th = document.createElement('th');
      th.textContent = label;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);

    const tbody = document.createElement('tbody');
    Object.entries(ALIASES).forEach(([alias, entry]) => {
      const row = document.createElement('tr');

      const tdAlias = document.createElement('td');
      tdAlias.className = 'mgx-alias-cell';
      tdAlias.textContent = `/${alias}`;

      const tdLabel = document.createElement('td');
      tdLabel.textContent = entry.label;

      const tdLink = document.createElement('td');
      const link = document.createElement('a');
      const targetUrl = getUrlForAlias(alias);
      link.href = targetUrl;
      link.textContent = targetUrl;
      tdLink.appendChild(link);

      row.appendChild(tdAlias);
      row.appendChild(tdLabel);
      row.appendChild(tdLink);
      tbody.appendChild(row);
    });
    table.appendChild(thead);
    table.appendChild(tbody);
    return table;
  };

  // ---- Optional features ----
  const FEATURES_KEY = 'mgx:features';
  const tabActiveFeatures = new Set();
  const activeFeatures = new Set();

  const getFeatureState = (id) => {
    try {
      return Boolean(JSON.parse(localStorage.getItem(FEATURES_KEY) || '{}')[id]);
    } catch {
      return false;
    }
  };

  const setFeatureEnabled = (id, enabled) => {
    try {
      const data = JSON.parse(localStorage.getItem(FEATURES_KEY) || '{}');
      if (enabled) data[id] = true;
      else delete data[id];
      localStorage.setItem(FEATURES_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
    refreshFeature(id);
  };

  const refreshFeature = (id) => {
    const feature = OPTIONAL_FEATURES[id];
    if (!feature) return;
    const on = getFeatureState(id) || tabActiveFeatures.has(id);
    if (on && !activeFeatures.has(id)) {
      feature.enable();
      activeFeatures.add(id);
    } else if (!on && activeFeatures.has(id)) {
      feature.disable();
      activeFeatures.delete(id);
    }
  };

  const activateFeatureOnTab = (id) => {
    const feature = OPTIONAL_FEATURES[id];
    if (!feature) return;
    tabActiveFeatures.add(id);
    refreshFeature(id);
    if (feature.tabOnlyToast) showToast(feature.tabOnlyToast);
  };

  let toastTimer = null;
  const showToast = (message) => {
    let toast = document.getElementById('mgx-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'mgx-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('mgx-toast-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('mgx-toast-show');
    }, 2600);
  };

  let lastMouseDown = null;
  const trackMouseDown = (event) => {
    lastMouseDown = { x: event.clientX, y: event.clientY };
  };

  const rowHighlighterClick = (event) => {
    if (lastMouseDown && (Math.abs(event.clientX - lastMouseDown.x) > 4 || Math.abs(event.clientY - lastMouseDown.y) > 4)) {
      return;
    }
    lastMouseDown = null;
    if (event.target.closest('#mgcmd-bar, .mgx-modal-overlay')) return;
    const row = event.target.closest('tbody tr');
    if (!row) return;
    if (event.target.closest('a, button, input, select, textarea, [role="button"], [contenteditable]')) return;
    if (row.querySelector('th')) return;

    const current = row.dataset.mgxState ? parseInt(row.dataset.mgxState, 10) : 0;
    const next = (current + 1) % 3;
    row.classList.remove('mgx-green', 'mgx-red');
    if (next === 1) row.classList.add('mgx-green');
    else if (next === 2) row.classList.add('mgx-red');
    if (next === 0) delete row.dataset.mgxState;
    else row.dataset.mgxState = String(next);
  };

  const clearRowHighlighterMarks = () => {
    document.querySelectorAll('tbody tr.mgx-green, tbody tr.mgx-red').forEach((row) => {
      row.classList.remove('mgx-green', 'mgx-red');
      delete row.dataset.mgxState;
    });
  };

  const openLinksInNewTabClick = (event) => {
    if (event.defaultPrevented) return;
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (event.target.closest('#mgcmd-bar, .mgx-modal-overlay')) return;
    const link = event.target.closest('a[href]');
    if (!link || link.target === '_blank') return;
    const href = (link.getAttribute('href') || '').trim();
    if (href === '' || href === '#' || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    event.preventDefault();
    window.open(link.href, '_blank');
  };

  const OPTIONAL_FEATURES = {
    rowHighlighter: {
      name: 'Row Highlighter',
      desc: 'Click a table row to cycle its background color: green = matched to the physical book, red = needs fixing, click again to reset.',
      enable() {
        document.addEventListener('mousedown', trackMouseDown);
        document.addEventListener('click', rowHighlighterClick);
      },
      disable() {
        document.removeEventListener('mousedown', trackMouseDown);
        document.removeEventListener('click', rowHighlighterClick);
        clearRowHighlighterMarks();
      },
    },
    openLinksInNewTab: {
      name: 'Open links in new tabs',
      desc: 'All page links open in a new tab, keeping the current page and its marks in place.',
      tabOnlyLabel: 'Activate on current tab only',
      tabOnlyToast: 'All links from current tab will open in a new tab',
      enable() {
        document.addEventListener('click', openLinksInNewTabClick, true);
      },
      disable() {
        document.removeEventListener('click', openLinksInNewTabClick, true);
      },
    },
  };

  const buildFeaturesList = () => {
    const list = document.createElement('div');
    list.className = 'mgx-features-list';

Object.entries(OPTIONAL_FEATURES).forEach(([id, feature]) => {
        const item = document.createElement('label');
        item.className = 'mgx-feature';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = getFeatureState(id);

        const body = document.createElement('span');
        body.className = 'mgx-feature-body';

        const text = document.createElement('span');
        text.className = 'mgx-feature-text';

        const name = document.createElement('span');
        name.className = 'mgx-feature-name';
        name.textContent = feature.name;

        const desc = document.createElement('span');
        desc.className = 'mgx-feature-desc';
        desc.textContent = feature.desc;

        text.appendChild(name);
        text.appendChild(desc);
        body.appendChild(text);

        if (feature.tabOnlyLabel) {
          const tabOnly = document.createElement('button');
          tabOnly.type = 'button';
          tabOnly.className = 'mgx-feature-tabonly';
          tabOnly.textContent = feature.tabOnlyLabel;
          tabOnly.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            activateFeatureOnTab(id);
          });
          body.appendChild(tabOnly);
        }

        checkbox.addEventListener('change', () => setFeatureEnabled(id, checkbox.checked));

        item.appendChild(checkbox);
        item.appendChild(body);
        list.appendChild(item);
      });
    return list;
  };

  const buildSettingsSection = (titleText, content) => {
    const section = document.createElement('div');
    section.className = 'mgx-settings-section';
    const title = document.createElement('div');
    title.className = 'mgx-settings-title';
    title.textContent = titleText;
    section.appendChild(title);
    section.appendChild(content);
    return section;
  };

  function showSettingsModal() {
    openModal('Settings', () => {
      const container = document.createElement('div');
      container.className = 'mgx-settings';
      container.appendChild(buildSettingsSection('Optional features', buildFeaturesList()));
      container.appendChild(buildSettingsSection('Navigation aliases', buildAliasTable()));
      return container;
    });
  }

  const applyFeatures = () => {
    Object.keys(OPTIONAL_FEATURES).forEach(refreshFeature);
  };

  const createBar = () => {
    const bar = document.createElement('div');
    bar.id = 'mgcmd-bar';

    const prompt = document.createElement('span');
    prompt.id = 'mgcmd-prompt';
    prompt.textContent = '>';

    const input = document.createElement('input');
    input.id = 'mgcmd-input';
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('aria-label', 'Command bar');

    const desc = document.createElement('span');
    desc.id = 'mgcmd-desc';
    desc.className = 'mgcmd-hint';

    const settingsToggle = document.createElement('button');
    settingsToggle.id = 'mgcmd-settings-toggle';
    settingsToggle.type = 'button';
    settingsToggle.title = 'Settings';
    settingsToggle.setAttribute('aria-label', 'Settings');
    settingsToggle.innerHTML =
      '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9.4 1.5a1.6 1.6 0 0 0-2.8 0l-.3.52a1.04 1.04 0 0 1-1.46.4l-.54-.31a1.6 1.6 0 0 0-1.99 2.35l.4.47a1.04 1.04 0 0 1-.3 1.5l-.6.32a1.6 1.6 0 0 0 0 2.76l.6.32c.52.28.72.94.3 1.5l-.4.47a1.6 1.6 0 0 0 1.99 2.35l.54-.31c.54-.31 1.2-.12 1.46.4l.3.52a1.6 1.6 0 0 0 2.8 0l.3-.52a1.04 1.04 0 0 1 1.46-.4l.54.31a1.6 1.6 0 0 0 1.99-2.35l-.4-.47a1.04 1.04 0 0 1 .3-1.5l.6-.32a1.6 1.6 0 0 0 0-2.76l-.6-.32a1.04 1.04 0 0 1-.3-1.5l.4-.47a1.6 1.6 0 0 0-1.99-2.35l-.54.31a1.04 1.04 0 0 1-1.46-.4l-.3-.52ZM8 10.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z"/></svg>';
    settingsToggle.addEventListener('click', showSettingsModal);

    bar.appendChild(prompt);
    bar.appendChild(input);
    bar.appendChild(desc);
    bar.appendChild(settingsToggle);

    const render = () => {
      const { text, kind } = describe(input.value);
      desc.textContent = text;
      desc.className = `mgcmd-${kind}`;
    };

    input.addEventListener('input', render);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        execute(input.value, event.shiftKey);
      } else if (event.key === 'Escape') {
        input.blur();
      }
    });

    render();
    return { bar, input, render };
  };

  const runPendingSearch = (input, render) => {
    const term = sessionStorage.getItem(PENDING_SEARCH_KEY);
    if (term === null) return;
    sessionStorage.removeItem(PENDING_SEARCH_KEY);
    const search = findSearchInput();
    if (search && search.form) {
      search.value = term;
      search.form.requestSubmit();
    } else {
      input.value = term;
      render();
    }
  };

  // Strictly verify Manager.io presence using structural IDs
  const isManagerIoPage = () => {
    const hasSidebar = Boolean(document.querySelector('#sidebar'));
    const hasSummaryTab = Boolean(document.querySelector('#tabSummary') || document.querySelector('a[href*="/summary-view"]'));
    return hasSidebar || hasSummaryTab;
  };

  // Wait for dynamic DOM hydration before initializing
  const init = () => {
    if (document.getElementById('mgcmd-bar')) return;

    let attempts = 0;
    const maxAttempts = 20; // Try for up to 2 seconds

    const checkAndRender = () => {
      if (isManagerIoPage()) {
        const { bar, input, render } = createBar();
        document.body.insertBefore(bar, document.body.firstChild);
        input.focus();
        runPendingSearch(input, render);
        applyFeatures();
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(checkAndRender, 100);
      }
    };

    checkAndRender();
  };

  init();

  const refocusHandler = (event) => {
    if (!(event.ctrlKey && event.key === '`')) return;
    if (document.querySelector('.mgx-modal-overlay')) return;
    event.preventDefault();
    const barInput = document.getElementById('mgcmd-input');
    if (!barInput) return;

    const pageSelection = window.getSelection()?.toString() || '';
    if (pageSelection && document.activeElement !== barInput) {
      barInput.value = pageSelection.trim();
      barInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    barInput.focus();
    barInput.select();
  };
  window.addEventListener('keydown', refocusHandler);

})();