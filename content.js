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

  /* ============ Custom Date Rows Generator Engine ============ */
  const runCustomDateRowsGenerator = async () => {
    const resolveAccount = () => {
      try {
        if (typeof window.date_heading === "string" && window.date_heading.trim())
          return { value: window.date_heading.trim(), from: "window.date_heading" };
        if (typeof date_heading === "string" && date_heading.trim())
          return { value: date_heading.trim(), from: "date_heading (local)" };
      } catch(_) {}

      const elById = document.getElementById("date_heading")
        || document.querySelector('[name="date_heading"]')
        || document.querySelector('.date_heading, [data-field="date_heading"]');
      if (elById){
        const v = (elById.value || elById.textContent || "").trim();
        if (v) return { value: v, from: "DOM element (id/name/class=date_heading)" };
      }

      const containing = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6,span,div,label,th,td")]
        .find(n => n.children.length === 0 && /date_heading/i.test(n.textContent || ""));
      if (containing) return { value: containing.textContent.trim(), from: "text node containing 'date_heading'" };

      return { value: "", from: "not found" };
    };

    const askDates = (prefill) => new Promise((resolve) => {
      const today = new Date().toISOString().slice(0,10);
      const ov = document.createElement("div");
      ov.className = "mgx-modal-overlay";
      ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;";
      const box = document.createElement("div");
      box.style.cssText = "background:#fff;border-radius:10px;padding:20px 24px;width:360px;box-shadow:0 12px 40px rgba(0,0,0,.3);font-size:14px;color:#222;";
      box.innerHTML = `
        <div style="font-weight:600;font-size:16px;margin-bottom:14px;">Fill table with dates</div>
        <label style="display:block;margin-bottom:10px;">
          <span style="display:block;margin-bottom:4px;font-size:12px;color:#666;">Start date</span>
          <input id="__af_start" type="date" value="${today}"
            style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:14px;box-sizing:border-box;">
        </label>
        <label style="display:block;margin-bottom:10px;">
          <span style="display:block;margin-bottom:4px;font-size:12px;color:#666;">End date <span style="color:#999;">(empty = today)</span></span>
          <input id="__af_end" type="date" value="${today}"
            style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:14px;box-sizing:border-box;">
        </label>
        <label style="display:block;margin-bottom:16px;">
          <span style="display:block;margin-bottom:4px;font-size:12px;color:#666;">
            Account <span style="color:#999;">(resolved: ${prefill.from})</span>
          </span>
          <input id="__af_acct" type="text" value="${prefill.value.replace(/"/g,"&quot;")}"
            placeholder="account name"
            style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:14px;box-sizing:border-box;">
        </label>
        <div id="__af_err" style="color:#c00;font-size:12px;min-height:16px;margin-bottom:8px;"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button id="__af_cancel" type="button" style="padding:8px 14px;border:1px solid #ccc;background:#f5f5f5;border-radius:6px;cursor:pointer;">Cancel</button>
          <button id="__af_ok" type="button" style="padding:8px 14px;border:0;background:#2563eb;color:#fff;border-radius:6px;cursor:pointer;font-weight:600;">Fill</button>
        </div>
      `;
      ov.appendChild(box);
      document.body.appendChild(ov);

      const startEl = box.querySelector("#__af_start");
      const endEl   = box.querySelector("#__af_end");
      const acctEl  = box.querySelector("#__af_acct");
      const errEl   = box.querySelector("#__af_err");

      const close = (val) => { ov.remove(); document.removeEventListener("keydown", onKey); resolve(val); };
      const onKey = (e) => {
        if (e.key === "Escape") close(null);
        if (e.key === "Enter") submit();
      };
      document.addEventListener("keydown", onKey);

      const submit = () => {
        const s = startEl.value;
        const e = endEl.value || today;
        const acct = acctEl.value.trim();
        if (!s){ errEl.textContent = "Start date is required."; return; }
        if (!acct){ errEl.textContent = "Account is required (date_heading not resolved)."; return; }
        const sd = new Date(s + "T00:00:00");
        const ed = new Date(e + "T00:00:00");
        if (isNaN(sd) || isNaN(ed)){ errEl.textContent = "Invalid date."; return; }
        if (sd > ed){ errEl.textContent = "Start must be on or before end."; return; }
        close({ start: s, end: e, account: acct });
      };

      box.querySelector("#__af_ok").onclick = submit;
      box.querySelector("#__af_cancel").onclick = () => close(null);
      startEl.focus();
      startEl.select();
    });

    const URDU = {0:"اتوار",1:"پیر",2:"منگل",3:"بدھ",4:"جمعرات",5:"جمعہ",6:"ہفتہ"};
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const fmt = d => `📆/☀\n\n${String(d.getDate()).padStart(2,"0")} ${d.toLocaleString("en-US",{month:"short"})}, ${URDU[d.getDay()]}`;
    const pd  = s => { const d = new Date(s+"T00:00:00"); if (isNaN(d)) throw new Error("Bad date: "+s); return d; };
    const range = (a,b) => { const s=pd(a), e=b?pd(b):new Date(); e.setHours(0,0,0,0); const o=[]; for(let d=new Date(s);d<=e;d.setDate(d.getDate()+1)) o.push(new Date(d)); return o; };
    const setVal = (el,v) => { const ds=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),"value"); if(ds&&ds.set)ds.set.call(el,v);else el.value=v; el.dispatchEvent(new Event("input",{bubbles:true})); el.dispatchEvent(new Event("change",{bubbles:true})); };
    const fireMouse = (el,type) => el.dispatchEvent(new MouseEvent(type,{bubbles:true,cancelable:true,view:window}));

    try {
      const resolved = resolveAccount();
      const answer = await askDates(resolved);
      if (!answer){ showToast("Autofill cancelled"); return; }

      const ACCOUNT = answer.account;
      const TABLE = [...document.querySelectorAll("table")].find(t =>
        t.querySelector("tbody tr .select2-container") && t.querySelector("tbody tr textarea")
      );
      if (!TABLE) throw new Error("Line-items table not found");
      const TBODY = TABLE.querySelector("tbody");
      const allRows = () => [...TBODY.querySelectorAll("tr")];

      const before = new Set(allRows());
      const findAddBtn = () => {
        const byText = [...document.querySelectorAll("button")].find(b => b.textContent.trim().toLowerCase() === "add line");
        if (byText) return byText;
        const scope = TABLE.closest("form") || TABLE.parentElement;
        return [...scope.querySelectorAll("button")].find(b => /add\s*line/i.test(b.textContent));
      };
      const addBtn = findAddBtn();
      if (!addBtn) throw new Error('No "Add line" button found');

      const dates = range(answer.start, answer.end);
      const rowsNeeded = dates.length * 2;

      for (let i = 0; i < rowsNeeded; i++){
        const countBefore = allRows().length;
        addBtn.click();
        let ok = false;
        for (let t = 0; t < 25; t++){ 
          await wait(20); 
          if (allRows().length > countBefore){ ok = true; break; } 
        }
        if (!ok) throw new Error(`Add-line click #${i+1} did not create a row`);
      }

      const newRows = allRows().filter(r => !before.has(r));
      if (newRows.length < rowsNeeded) throw new Error(`Only ${newRows.length}/${rowsNeeded} new rows`);
      const targets = newRows.slice(-rowsNeeded);

      const closeAllDrops = () => {
        document.querySelectorAll(".select2-drop").forEach(d => {
          d.classList.remove("select2-drop-active");
          d.classList.add("select2-display-none");
          d.style.display = "none";
        });
        document.querySelectorAll(".select2-container-active").forEach(c => c.classList.remove("select2-container-active"));
      };
      const activeDrop = () => document.querySelector(".select2-drop.select2-drop-active");

      const openFor = async (row) => {
        const c = row.querySelector(".select2-container"); if(!c) throw new Error("No select2");
        closeAllDrops(); await wait(15);
        const tryOpen = async (how) => {
          await how();
          for (let i = 0; i < 8; i++){ 
            await wait(25); 
            const d = activeDrop(); 
            if (d) return d; 
          }
          return null;
        };
        const choice = c.querySelector("a.select2-choice");
        const focusser = c.querySelector(".select2-focusser");
        if (choice){
          const d = await tryOpen(() => { fireMouse(choice,"mousedown"); fireMouse(choice,"mouseup"); fireMouse(choice,"click"); });
          if (d) return d;
        }
        if (focusser){
          const d = await tryOpen(() => {
            focusser.focus();
            focusser.dispatchEvent(new KeyboardEvent("keydown",{key:" ",keyCode:32,which:32,bubbles:true}));
            focusser.dispatchEvent(new KeyboardEvent("keyup",  {key:" ",keyCode:32,which:32,bubbles:true}));
          });
          if (d) return d;
        }
        const $ = window.jQuery || window.$;
        if ($ && focusser){
          try {
            const $f = $(focusser);
            if ($f.data("select2")){
              const d = await tryOpen(() => { $f.select2("open"); });
              if (d) return d;
            }
          } catch(_){}
        }
        throw new Error(`Could not open drop (container id=${c.id})`);
      };

      const pick = async (row, q) => {
        const drop = await openFor(row);
        const inp = drop.querySelector(".select2-input"); if(!inp) throw new Error("No search input");
        inp.focus();
        
        setVal(inp, q);
        inp.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "Enter" }));

        let items = [];
        for (let t = 0; t < 30; t++) {
          await wait(50);
          items = [...drop.querySelectorAll("li.select2-result-selectable, li")].filter(l => 
            l.textContent.trim() && 
            !l.classList.contains('select2-no-results') && 
            !l.classList.contains('select2-searching')
          );
          if (items.length > 0) break;
        }

        if (!items.length) throw new Error(`No results for "${q}"`);

        const ql = q.toLowerCase();
        const m = items.find(l => l.textContent.trim().toLowerCase().includes(ql)) || items[0];
        
        fireMouse(m, "mouseover"); 
        fireMouse(m, "mouseup"); 
        m.click();
        await wait(100);
        return m.textContent.trim();
      };

      for (let i = 0; i < dates.length; i++){
        const d = dates[i];
        const dataRow = targets[i * 2];       
        dataRow.scrollIntoView({block:"center"});
        try {
          const chosen = await pick(dataRow, ACCOUNT);
          setVal(dataRow.querySelector("textarea"), fmt(d));
        } catch(e){
          console.error(`[autofill] ✗ date ${i+1} ${d.toDateString()}:`, e.message);
          showToast(`Error: ${e.message}`);
          break;
        }
        await wait(50);
      }
      showToast("Date rows generation completed!");
    } catch(err) {
      console.error("[autofill] FATAL:", err.message);
      showToast(`Autofill error: ${err.message}`);
    }
  };

  /* ============ Autofill Unit Prices Engine ============ */
  const runAutofillUnitPrices = () => {
    const setVal = (el, v) => {
      const ds = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value");
      if (ds && ds.set) ds.set.call(el, v); else el.value = v;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };

    const TABLE = [...document.querySelectorAll("table")].find(t =>
      t.querySelector("tbody tr .select2-container") && t.querySelector("tbody tr textarea")
    );
    if (!TABLE) {
      showToast("Line-items table not found");
      throw new Error("Line-items table not found");
    }
    const TBODY = TABLE.querySelector("tbody");

    const headers = (() => {
      const hr = TABLE.querySelector("thead tr");
      if (!hr) return {};
      const out = {};
      [...hr.children].forEach((th, i) => {
        const t = (th.textContent || "").trim().toLowerCase();
        if (!t) return;
        if (/unit\s*price|rate|price/.test(t) && out.unitPrice == null) out.unitPrice = i;
        if (/amount|total|line\s*total|subtotal/.test(t) && out.amount == null) out.amount = i;
        if (/\bqty\b|quantity|^qty$/i.test(t) && out.qty == null) out.qty = i;
        if (/description|desc|details|narration/.test(t) && out.description == null) out.description = i;
      });
      return out;
    })();

    const descTextarea = row => row.querySelector("textarea");

    const rowInputs = (row) => {
      const out = [];
      [...row.children].forEach((td, i) => {
        for (const inp of td.querySelectorAll('input[type="text"], input:not([type])')){
          if (inp.offsetParent === null) continue;
          if (inp.readOnly || inp.disabled) continue;
          out.push({ input: inp, colIndex: i });
        }
      });
      return out;
    };

    const findAmountInputs = (row) => {
      const inputs = rowInputs(row);
      if (!inputs.length) return { qty: null, unitPrice: null, amount: null };

      if (headers.unitPrice != null){
        const byCol = (col) => inputs.find(x => x.colIndex === col)?.input || null;
        return {
          qty: headers.qty != null ? byCol(headers.qty) : null,
          unitPrice: byCol(headers.unitPrice),
          amount: headers.amount != null ? byCol(headers.amount) : null,
        };
      }

      const last3 = inputs.slice(-3).map(x => x.input);
      return {
        qty: last3.length === 3 ? last3[0] : null,
        unitPrice: last3.length >= 2 ? last3[last3.length - 2] : last3[0] || null,
        amount: last3.length >= 1 ? last3[last3.length - 1] : null,
      };
    };

    const looksLikeDateRow = (row) => {
      const ta = descTextarea(row);
      return !!ta && (ta.value || "").includes("📆/☀");
    };

    const NUMBER_RE = /(?<![\w\u0600-\u06FF])(-?\d{1,3}(?:[,.]\d{3})*(?:[.,]\d+)?|-?\d+(?:[.,]\d+)?)(?![\w\u0600-\u06FF])/g;

    const extractNumbers = (text) => {
      if (!text) return [];
      const out = [];
      let m;
      NUMBER_RE.lastIndex = 0;
      while ((m = NUMBER_RE.exec(text)) !== null){
        let raw = m[1];
        if (raw.includes(",") && raw.includes(".")){
          if (raw.lastIndexOf(",") > raw.lastIndexOf(".")){
            raw = raw.replace(/\./g, "").replace(",", ".");
          } else {
            raw = raw.replace(/,/g, "");
          }
        } else if (raw.includes(",")){
          raw = /^-?\d{1,3}(,\d{3})+$/.test(raw) ? raw.replace(/,/g, "") : raw.replace(",", ".");
        }
        const n = parseFloat(raw);
        if (!isNaN(n)) out.push(n);
      }
      return out;
    };

    const rows = [...TBODY.querySelectorAll("tr")];
    let filled = 0;

    for (const row of rows){
      const ta = descTextarea(row);
      if (!ta) continue;

      if (looksLikeDateRow(row)) continue;

      const { qty, unitPrice, amount } = findAmountInputs(row);
      if (!unitPrice) continue;

      const qtyVal = (qty?.value || "").trim();
      const unitPriceVal = (unitPrice.value || "").trim();
      const amountVal = (amount?.value || "").trim();

      if (qtyVal !== "" || unitPriceVal !== "" || amountVal !== "") continue;

      const nums = extractNumbers(ta.value || "");
      if (!nums.length) continue;

      const text = nums.join("+");
      setVal(unitPrice, text);
      filled++;
    }

    showToast(`Autofilled ${filled} unit price(s) from descriptions.`);
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
    dateRowsGenerator: {
      name: 'Custom Date Rows Generator',
      desc: 'Automatically populates table rows with custom date ranges and account entries for Manager.io accounting tables.',
      actionLabel: 'Generate Date Rows',
      action() {
        runCustomDateRowsGenerator();
      },
      enable() {},
      disable() {},
    },
    autofillUnitPrices: {
      name: 'Autofill Unit Price From Descriptions',
      desc: 'Automatically extracts numerical values from table description text boxes and populates corresponding unit price fields.',
      actionLabel: 'Autofill Prices',
      action() {
        runAutofillUnitPrices();
      },
      enable() {},
      disable() {},
    },
  };

  const buildFeaturesList = () => {
    const list = document.createElement('div');
    list.className = 'mgx-features-list';

    Object.entries(OPTIONAL_FEATURES).forEach(([id, feature]) => {
      const isActionOnly = Boolean(feature.actionLabel && feature.action);

      const item = document.createElement('label');
      item.className = 'mgx-feature';

      let checkbox = null;
      if (!isActionOnly) {
        checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = getFeatureState(id);
        checkbox.addEventListener('change', () => setFeatureEnabled(id, checkbox.checked));
        item.appendChild(checkbox);
      }

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

      if (isActionOnly) {
        const actionBtn = document.createElement('button');
        actionBtn.type = 'button';
        actionBtn.className = 'mgx-feature-tabonly';
        actionBtn.textContent = feature.actionLabel;
        actionBtn.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          closeModal();
          feature.action();
        });
        body.appendChild(actionBtn);
      }

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