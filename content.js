(() => {
  const ALIASES = {
    h: { url: '127.0.0.1:55667/summary-view?ogYTRmF6YWwgRmVlZHMgTWl4aW5nIA', label: 'Summary' },
    a: { url: '127.0.0.1:55667/bank-and-cash-accounts?ogYTRmF6YWwgRmVlZHMgTWl4aW5nILgMAMAMALgNAMANAOgNANAPAKgQALgQAMgQAPAQAMARAMgRAJASAPD7AQA', label: 'Bank and Cash Accounts' },
    r: { url: '127.0.0.1:55667/receipts?ogYTRmF6YWwgRmVlZHMgTWl4aW5nILgMAMAMALgNAMANAOgNANAPAKgQALgQAMgQAPAQAMARAMgRAJASAPD7AQA', label: 'Receipts' },
    p: { url: '127.0.0.1:55667/payments?ogYTRmF6YWwgRmVlZHMgTWl4aW5nILgMAMAMALgNAMANAOgNANAPAKgQALgQAMgQAPAQAMARAMgRAJASAPD7AQA', label: 'Payments' },
    ia: { url: '127.0.0.1:55667/inter-account-transfers?ogYTRmF6YWwgRmVlZHMgTWl4aW5nILgMAMAMALgNAMANAOgNANAPAKgQALgQAMgQAPAQAMARAMgRAJASAPD7AQA', label: 'Inter Account Transfers' },
    c: { url: '127.0.0.1:55667/customers?ogYTRmF6YWwgRmVlZHMgTWl4aW5nILgMAMAMALgNAMANAOgNANAPAKgQALgQAMgQAPAQAMARAMgRAJASAPD7AQA', label: 'Customers' },
    cs: { url: '127.0.0.1:55667/customer-statements-transactions-list?ogYTRmF6YWwgRmVlZHMgTWl4aW5nIKoGJy9yZXBvcnRzP29nWVRSbUY2WVd3Z1JtVmxaSE1nVFdsNGFXNW5JQQ', label: 'Customer Statements' },
    si: { url: '127.0.0.1:55667/sales-invoices?ogYTRmF6YWwgRmVlZHMgTWl4aW5nILgMAMAMALgNAMANAOgNANAPAKgQALgQAMgQAPAQAMARAMgRAJASAPD7AQA', label: 'Sales Invoices' },
    s: { url: '127.0.0.1:55667/suppliers?ogYTRmF6YWwgRmVlZHMgTWl4aW5nILgMAMAMALgNAMANAOgNANAPAKgQALgQAMgQAPAQAMARAMgRAJASAPD7AQA', label: 'Suppliers' },
    ss: { url: '127.0.0.1:55667/suppliers?ogYTRmF6YWwgRmVlZHMgTWl4aW5nILgMAMAMALgNAMANAOgNANAPAKgQALgQAMgQAPAQAMARAMgRAJASAPD7AQA', label: 'Suppliers Statements' },    
    pi: { url: '127.0.0.1:55667/purchase-invoices?ogYTRmF6YWwgRmVlZHMgTWl4aW5nILgMAMAMALgNAMANAOgNANAPAKgQALgQAMgQAPAQAMARAMgRAJASAPD7AQA', label: 'Purchase Invoices' },
    ii: { url: '127.0.0.1:55667/inventory-items?ogYTRmF6YWwgRmVlZHMgTWl4aW5nILgMAMAMALgNAMANAOgNANAPAKgQALgQAMgQAPAQAMARAMgRAJASAPD7AQA', label: 'Inventory Items' },
    em: { url: '127.0.0.1:55667/employees?ogYTRmF6YWwgRmVlZHMgTWl4aW5nILgMAMAMALgNAMANAOgNANAPAKgQALgQAMgQAPAQAMARAMgRAJASAPD7AQA', label: 'Employees' },
    je: { url: '127.0.0.1:55667/journal-entries?ogYTRmF6YWwgRmVlZHMgTWl4aW5nILgMAMAMALgNAMANAOgNANAPAKgQALgQAMgQAPAQAMARAMgRAJASAPD7AQA', label: 'Journal Enteries' },
  };

  const TRUNCATE_LIMIT = 40;
  const EMPTY_HINT = 'Type to search · /alias to navigate';
  const PENDING_SEARCH_KEY = 'mgcmd:pendingSearch';

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

  const toAbsoluteUrl = (url) => {
    if (/^[a-z][a-z0-9+\-.]*:\/\//i.test(url)) return url;
    if (/^[a-z0-9.-]+(?::\d+)?\//i.test(url)) {
      return `${window.location.protocol}//${url}`;
    }
    return window.location.origin + url;
  };

  const truncate = (text) =>
    text.length > TRUNCATE_LIMIT ? text.slice(0, TRUNCATE_LIMIT) + '…' : text;

  const describe = (value) => {
    const trimmed = value.trim();
    if (trimmed === '') {
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
    if (trimmed === '') return;
    if (trimmed.startsWith('/')) {
      const { alias, term } = parseNav(trimmed);
      if (alias === '') return;
      const entry = ALIASES[alias];
      if (entry) {
        if (term !== '') sessionStorage.setItem(PENDING_SEARCH_KEY, term);
        window.location.href = toAbsoluteUrl(entry.url);
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
      link.href = toAbsoluteUrl(entry.url);
      link.textContent = entry.url;
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

  const init = () => {
    if (document.getElementById('mgcmd-bar')) return;
    const { bar, input, render } = createBar();
    document.body.insertBefore(bar, document.body.firstChild);
    input.focus();
    runPendingSearch(input, render);
  };

  init();
})();