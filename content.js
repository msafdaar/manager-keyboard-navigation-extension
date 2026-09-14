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

  const execute = (value) => {
    const trimmed = value.trim();
    if (trimmed === '') {
      clearSearch();
      return;
    }
    if (trimmed.startsWith('/')) {
      const { alias, term } = parseNav(trimmed);
      if (alias === '') return;
      const entry = ALIASES[alias];
      if (entry) {
        if (term !== '') sessionStorage.setItem(PENDING_SEARCH_KEY, term);
        window.location.href = getUrlForAlias(alias);
      }
      return;
    }
    if (!hasSearchBar) return;
    const input = findSearchInput();
    if (!input || !input.form) return;
    input.value = trimmed;
    input.form.requestSubmit();
  };

  function closeAliasModal() {
    const overlay = document.getElementById('mgcmd-modal-overlay');
    if (overlay) overlay.remove();
  }

  function showAliasModal() {
    closeAliasModal();
    const overlay = document.createElement('div');
    overlay.id = 'mgcmd-modal-overlay';

    const modal = document.createElement('div');
    modal.id = 'mgcmd-modal';

    const header = document.createElement('div');
    header.id = 'mgcmd-modal-header';
    const title = document.createElement('span');
    title.textContent = 'Navigation aliases';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closeAliasModal);
    header.appendChild(title);
    header.appendChild(closeBtn);

    const table = document.createElement('table');
    table.id = 'mgcmd-modal-table';
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
      tdAlias.className = 'mgcmd-alias-cell';
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

    modal.appendChild(header);
    modal.appendChild(table);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeAliasModal();
    });
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeAliasModal();
    });
    closeBtn.focus();
  }

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

    const toggle = document.createElement('button');
    toggle.id = 'mgcmd-alias-toggle';
    toggle.type = 'button';
    toggle.textContent = 'Show all alias';
    toggle.addEventListener('click', showAliasModal);

    bar.appendChild(prompt);
    bar.appendChild(input);
    bar.appendChild(desc);
    bar.appendChild(toggle);

    const render = () => {
      const { text, kind } = describe(input.value);
      desc.textContent = text;
      desc.className = `mgcmd-${kind}`;
    };

    input.addEventListener('input', render);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        execute(input.value);
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
    if (document.getElementById('mgcmd-modal-overlay')) return;
    event.preventDefault();
    const input = document.getElementById('mgcmd-input');
    if (input) {
      input.focus();
      input.select();
    }
  };
  window.addEventListener('keydown', refocusHandler);

})();