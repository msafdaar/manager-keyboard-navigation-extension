(() => {
  // ---- Configuration ----
  // Change these values to customize the calculations.
  const MODE = 'both'; // 'multiply' | 'divide' | 'both'
  const MODIFIERS = [
    { size: 25, name: '' },
    { size: 40, name: 'Mand' },
    { size: 50, name: 'Bag' },
  ];
  const MAX_DECIMALS = 2;
  // -----------------------

  const STRIP_ID = 'mgx-quickcalc-strip';
  const IGNORED_SELECTOR = '#mgcmd-bar, .mgx-modal-overlay';
  const FORM_FIELD_SELECTOR = 'input, textarea, select';

  const showMultiply = MODE === 'multiply' || MODE === 'both';
  const showDivide = MODE === 'divide' || MODE === 'both';

  const modifiers = MODIFIERS.map((modifier) => {
    if (typeof modifier === 'number') {
      return { size: modifier, name: '' };
    }
    return {
      size: Number(modifier?.size),
      name: typeof modifier?.name === 'string' ? modifier.name.trim() : '',
    };
  });

  const bindings = new Map();
  const watchedFrames = new Set();

  let enabled = false;
  let pendingUpdate = null;
  let pendingSync = null;
  let calculationVisible = false;
  let calculationText = '';
  let strip = null;

  const parseNumber = (text) => {
    let raw = (text || '').trim();
    if (!raw) return null;
    if (!/^-?(?:\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?|\d+(?:[.,]\d+)?)$/.test(raw)) {
      return null;
    }

    if (raw.includes(',') && raw.includes('.')) {
      if (raw.lastIndexOf(',') > raw.lastIndexOf('.')) {
        raw = raw.replace(/\./g, '').replace(',', '.');
      } else {
        raw = raw.replace(/,/g, '');
      }
    } else if (raw.includes(',')) {
      raw = /^-?\d{1,3}(,\d{3})+$/.test(raw)
        ? raw.replace(/,/g, '')
        : raw.replace(',', '.');
    }

    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  };

  const formatResult = (value) => {
    if (!Number.isFinite(value)) return '—';
    const factor = 10 ** Math.max(0, Math.floor(MAX_DECIMALS));
    const rounded = Math.round((value + Number.EPSILON) * factor) / factor;
    return String(Object.is(rounded, -0) ? 0 : rounded);
  };

  const getPackingParts = (value, divisor) => {
    if (!Number.isFinite(divisor) || divisor <= 0) return null;

    const factor = 10 ** Math.max(0, Math.floor(MAX_DECIMALS));
    let packs = Math.floor(value / divisor + 1e-9);
    let remainder = Math.round((value - packs * divisor + Number.EPSILON) * factor) / factor;

    if (remainder >= divisor) {
      packs += 1;
      remainder = 0;
    }

    return {
      packs: formatResult(packs),
      divisor: formatResult(divisor),
      remainder: formatResult(remainder),
    };
  };

  const getCalculationItems = (value) => {
    const items = [];

    modifiers.forEach(({ size, name }) => {
      if (!Number.isFinite(size)) return;
      if (showMultiply) {
        items.push({
          kind: 'multiply',
          label: `x${size}`,
          result: formatResult(value * size),
        });
      }
      if (showDivide) {
        const packing = getPackingParts(value, size);
        const nameSuffix = name ? ` ${name}` : '';
        items.push({
          kind: 'divide',
          label: `/${size}`,
          name,
          result: packing
            ? `/${packing.divisor}: ${packing.packs}${nameSuffix} + ${packing.remainder}`
            : formatResult(value / size),
          packing,
        });
      }
    });

    return items;
  };

  const buildCalculationText = (selectedText, value) => {
    const parts = [selectedText];
    getCalculationItems(value).forEach(({ kind, label, result, packing }) => {
      parts.push(kind === 'divide' && packing ? result : `${label}: ${result}`);
    });
    return parts.join(' · ');
  };

  const appendCalculationItem = (container, item, withSeparator) => {
    if (withSeparator) {
      const separator = document.createElement('span');
      separator.className = 'mgx-quickcalc-sep';
      separator.textContent = '·';
      container.appendChild(separator);
    }

    if (item.kind === 'divide' && item.packing) {
      const packSizeElement = document.createElement('span');
      packSizeElement.className = 'mgx-quickcalc-pack-size';
      packSizeElement.textContent = `/${item.packing.divisor}:`;

      const packsElement = document.createElement('span');
      packsElement.className = 'mgx-quickcalc-strong';
      packsElement.textContent = item.packing.packs;

      const operatorElement = document.createElement('span');
      operatorElement.className = 'mgx-quickcalc-operator';
      operatorElement.textContent = '+';

      const remainderElement = document.createElement('span');
      remainderElement.className = 'mgx-quickcalc-strong';
      remainderElement.textContent = item.packing.remainder;

      container.append(packSizeElement, packsElement);

      if (item.name) {
        const nameElement = document.createElement('span');
        nameElement.className = 'mgx-quickcalc-pack-name';
        nameElement.textContent = item.name;
        container.appendChild(nameElement);
      }

      container.append(operatorElement, remainderElement);
      return;
    }

    const labelElement = document.createElement('span');
    labelElement.className = 'mgx-quickcalc-strong';
    labelElement.textContent = `${item.label}:`;

    const valueElement = document.createElement('span');
    valueElement.className = 'mgx-quickcalc-value';
    valueElement.textContent = item.result;

    container.append(labelElement, valueElement);
  };

  const renderCalculation = (element, selectedText, value) => {
    element.replaceChildren();

    const multiplication = document.createElement('div');
    multiplication.className = 'mgx-quickcalc-group mgx-quickcalc-multiplication';

    const division = document.createElement('div');
    division.className = 'mgx-quickcalc-group mgx-quickcalc-division';

    const selected = document.createElement('span');
    selected.className = 'mgx-quickcalc-strong';
    selected.textContent = selectedText;
    multiplication.appendChild(selected);

    getCalculationItems(value).forEach((item) => {
      const target = item.kind === 'divide' ? division : multiplication;
      appendCalculationItem(target, item, target === multiplication || target.childElementCount > 0);
    });

    element.append(multiplication, division);
  };

  const ensureStrip = () => {
    if (strip && strip.isConnected) return strip;

    strip = document.createElement('div');
    strip.id = STRIP_ID;
    strip.className = 'mgx-quickcalc-strip';
    strip.hidden = true;
    document.body.appendChild(strip);
    return strip;
  };

  const hideCalculation = () => {
    if (!calculationVisible) return;
    calculationVisible = false;
    calculationText = '';
    if (strip) strip.hidden = true;
  };

  const showCalculation = (info) => {
    const element = ensureStrip();
    if (!element) return;

    const text = buildCalculationText(info.text, info.value);
    if (calculationVisible && calculationText === text && !element.hidden) return;

    renderCalculation(element, info.text, info.value);
    element.title = text;
    element.hidden = false;
    calculationVisible = true;
    calculationText = text;
  };

  const getPageSelectionInfo = (doc) => {
    let selection;
    try {
      selection = doc.defaultView.getSelection();
    } catch {
      return null;
    }
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;

    const text = selection.toString().trim();
    const value = parseNumber(text);
    if (value === null) return null;

    const range = selection.getRangeAt(0);
    const ancestor = range.commonAncestorContainer;
    const element = ancestor.nodeType === 1 ? ancestor : ancestor.parentElement;
    if (!element) return null;
    if (element.closest(IGNORED_SELECTOR)) return null;
    if (element.closest(FORM_FIELD_SELECTOR)) return null;

    return { text, value };
  };

  const getFormFieldSelectionInfo = (doc) => {
    const field = doc.activeElement;
    if (!field || (field.tagName !== 'INPUT' && field.tagName !== 'TEXTAREA')) {
      return null;
    }
    if (field.closest(IGNORED_SELECTOR)) return null;

    let start;
    let end;
    try {
      start = field.selectionStart;
      end = field.selectionEnd;
    } catch {
      return null;
    }
    if (typeof start !== 'number' || typeof end !== 'number' || start === end) {
      return null;
    }

    const text = field.value.slice(start, end).trim();
    const value = parseNumber(text);
    return value === null ? null : { text, value };
  };

  const getSelectionInfo = () => {
    if (isOwnUiFocused()) return null;

    const doc = getActiveDocument();
    return getPageSelectionInfo(doc) || getFormFieldSelectionInfo(doc);
  };

  const isOwnUiFocused = () => {
    const active = document.activeElement;
    return Boolean(active && active.closest && active.closest(IGNORED_SELECTOR));
  };

  const getActiveDocument = () => {
    let doc = document;
    const seen = new Set();

    while (doc && !seen.has(doc)) {
      seen.add(doc);
      const active = doc.activeElement;
      if (!active || active.tagName !== 'IFRAME') break;

      let childDoc = null;
      try {
        childDoc = active.contentDocument;
      } catch {
        childDoc = null;
      }
      if (!childDoc) break;
      doc = childDoc;
    }

    return doc;
  };

  const updateCalculation = () => {
    pendingUpdate = null;
    if (!enabled) return;

    const info = getSelectionInfo();
    if (!info) {
      hideCalculation();
      return;
    }
    showCalculation(info);
  };

  const scheduleUpdate = (delay = 0) => {
    if (pendingUpdate !== null) clearTimeout(pendingUpdate);
    pendingUpdate = window.setTimeout(updateCalculation, delay);
  };

  const handleSelectionChange = () => scheduleUpdate(120);
  const handleMouseUp = () => scheduleUpdate(0);
  const handleKeyUp = (event) => {
    if (event.key === 'Escape') {
      hideCalculation();
      return;
    }
    scheduleUpdate(0);
  };
  const handleMouseDown = () => hideCalculation();
  const handleKeyDown = (event) => {
    if (event.key === 'Escape') hideCalculation();
  };
  const handleResize = () => hideCalculation();

  const bindDocument = (doc) => {
    if (!doc || bindings.has(doc)) return;

    const win = doc.defaultView;
    if (!win) return;

    const cleanups = [];
    const add = (target, type, handler, options) => {
      target.addEventListener(type, handler, options);
      cleanups.push(() => target.removeEventListener(type, handler, options));
    };

    add(doc, 'selectionchange', handleSelectionChange);
    add(doc, 'mouseup', handleMouseUp, true);
    add(doc, 'keyup', handleKeyUp, true);
    add(doc, 'mousedown', handleMouseDown, true);
    add(doc, 'keydown', handleKeyDown, true);

    let observer = null;
    try {
      const Observer = win.MutationObserver || window.MutationObserver;
      observer = new Observer(() => scheduleSync(80));
      observer.observe(doc.documentElement || doc, { childList: true, subtree: true });
    } catch {
      observer = null;
    }

    bindings.set(doc, () => {
      cleanups.forEach((cleanup) => cleanup());
      if (observer) observer.disconnect();
    });
  };

  const watchFrame = (frame) => {
    if (watchedFrames.has(frame)) return;
    watchedFrames.add(frame);
    frame.addEventListener('load', handleFrameLoad);
  };

  const syncDocuments = () => {
    pendingSync = null;
    if (!enabled) return;

    const seen = new Set();

    const visit = (doc) => {
      if (!doc || seen.has(doc)) return;
      seen.add(doc);
      bindDocument(doc);

      let frames;
      try {
        frames = doc.querySelectorAll('iframe');
      } catch {
        return;
      }

      frames.forEach((frame) => {
        watchFrame(frame);

        let childDoc = null;
        try {
          childDoc = frame.contentDocument;
        } catch {
          childDoc = null;
        }
        if (childDoc) visit(childDoc);
      });
    };

    visit(document);

    bindings.forEach((cleanup, doc) => {
      if (seen.has(doc)) return;
      cleanup();
      bindings.delete(doc);
    });

    watchedFrames.forEach((frame) => {
      if (frame.isConnected) return;
      frame.removeEventListener('load', handleFrameLoad);
      watchedFrames.delete(frame);
    });
  };

  const scheduleSync = (delay = 0) => {
    if (!enabled) return;
    if (pendingSync !== null) clearTimeout(pendingSync);
    pendingSync = window.setTimeout(syncDocuments, delay);
  };

  const handleFrameLoad = () => scheduleSync(50);

  (window.MGX_FEATURES = window.MGX_FEATURES || []).push({
    id: 'quickCalculator',
    name: 'Quick Calculator',
    desc: 'Select a number on the page or in a same-origin iframe to see its multiplied and divided values in a fixed strip at the bottom of the page.',
    featureScope: 'localStorageCheckbox',

    enable() {
      if (enabled) return;
      enabled = true;

      bindDocument(document);
      window.addEventListener('resize', handleResize);
      syncDocuments();
      scheduleUpdate(0);
    },

    disable() {
      if (!enabled) return;
      enabled = false;

      if (pendingUpdate !== null) clearTimeout(pendingUpdate);
      if (pendingSync !== null) clearTimeout(pendingSync);
      pendingUpdate = null;
      pendingSync = null;

      hideCalculation();
      if (strip) {
        strip.remove();
        strip = null;
      }

      bindings.forEach((cleanup) => cleanup());
      bindings.clear();

      watchedFrames.forEach((frame) => {
        frame.removeEventListener('load', handleFrameLoad);
      });
      watchedFrames.clear();

      window.removeEventListener('resize', handleResize);
    },
  });
})();
