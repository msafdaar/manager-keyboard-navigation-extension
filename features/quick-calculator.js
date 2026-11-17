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
    if (!/^-?[\d,]+(?:\.[\d,]+)?$/.test(raw)) return null;

    raw = raw.replace(/,/g, '');
    if (!/^-?\d+(?:\.\d+)?$/.test(raw)) return null;

    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  };

  const tokenizeExpression = (text) => {
    const source = text.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
    const tokens = [];
    let index = 0;

    while (index < source.length) {
      const character = source[index];

      if (/\s/.test(character)) {
        index += 1;
        continue;
      }

      if ('+-*/()'.includes(character)) {
        tokens.push(character);
        index += 1;
        continue;
      }

      if (/[0-9.,]/.test(character)) {
        let end = index + 1;
        while (end < source.length && /[0-9.,]/.test(source[end])) end += 1;

        const value = parseNumber(source.slice(index, end));
        if (value === null) return null;

        tokens.push(value);
        index = end;
        continue;
      }

      return null;
    }

    return tokens;
  };

  const evaluateExpression = (text) => {
    const tokens = tokenizeExpression(text);
    if (!tokens || tokens.length === 0) return null;

    let index = 0;

    const parseExpression = () => {
      let value = parseTerm();
      if (value === null) return null;

      while (tokens[index] === '+' || tokens[index] === '-') {
        const operator = tokens[index];
        index += 1;
        const right = parseTerm();
        if (right === null) return null;
        value = operator === '+' ? value + right : value - right;
      }

      return value;
    };

    const parseTerm = () => {
      let value = parseUnary();
      if (value === null) return null;

      while (tokens[index] === '*' || tokens[index] === '/') {
        const operator = tokens[index];
        index += 1;
        const right = parseUnary();
        if (right === null) return null;
        if (operator === '/' && right === 0) return null;
        value = operator === '*' ? value * right : value / right;
      }

      return value;
    };

    const parseUnary = () => {
      if (tokens[index] === '+') {
        index += 1;
        return parseUnary();
      }
      if (tokens[index] === '-') {
        index += 1;
        const value = parseUnary();
        return value === null ? null : -value;
      }
      return parsePrimary();
    };

    const parsePrimary = () => {
      const token = tokens[index];

      if (typeof token === 'number') {
        index += 1;
        return token;
      }

      if (token !== '(') return null;

      index += 1;
      const value = parseExpression();
      if (value === null || tokens[index] !== ')') return null;
      index += 1;
      return value;
    };

    const value = parseExpression();
    if (value === null || index !== tokens.length || !Number.isFinite(value)) return null;
    return value;
  };

  const parseSelectionValue = (text) => {
    const raw = (text || '').trim();
    if (!raw) return null;

    const directValue = parseNumber(raw);
    if (directValue !== null) {
      return {
        text: raw,
        value: directValue,
        isExpression: false,
        expressionText: '',
      };
    }

    const expressionValue = evaluateExpression(raw);
    if (expressionValue === null) return null;

    return {
      text: raw,
      value: expressionValue,
      isExpression: true,
      expressionText: raw,
    };
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

  const buildCalculationText = (info) => {
    const parts = [
      info.isExpression
        ? `${info.expressionText} = ${formatResult(info.value)}`
        : info.text,
    ];

    getCalculationItems(info.value).forEach(({ kind, label, result, packing }) => {
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

  const renderCalculation = (element, info) => {
    element.replaceChildren();

    const multiplication = document.createElement('div');
    multiplication.className = 'mgx-quickcalc-group mgx-quickcalc-multiplication';

    const division = document.createElement('div');
    division.className = 'mgx-quickcalc-group mgx-quickcalc-division';

    if (info.isExpression) {
      const expression = document.createElement('span');
      expression.className = 'mgx-quickcalc-expression';
      expression.textContent = info.expressionText;

      const equals = document.createElement('span');
      equals.className = 'mgx-quickcalc-equals';
      equals.textContent = '=';

      const result = document.createElement('span');
      result.className = 'mgx-quickcalc-strong';
      result.textContent = formatResult(info.value);

      multiplication.append(expression, equals, result);
    } else {
      const selected = document.createElement('span');
      selected.className = 'mgx-quickcalc-strong';
      selected.textContent = info.text;
      multiplication.appendChild(selected);
    }

    getCalculationItems(info.value).forEach((item) => {
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

    const text = buildCalculationText(info);
    if (calculationVisible && calculationText === text && !element.hidden) return;

    renderCalculation(element, info);
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
    const info = parseSelectionValue(text);
    if (!info) return null;

    const range = selection.getRangeAt(0);
    const ancestor = range.commonAncestorContainer;
    const element = ancestor.nodeType === 1 ? ancestor : ancestor.parentElement;
    if (!element) return null;
    if (element.closest(IGNORED_SELECTOR)) return null;
    if (element.closest(FORM_FIELD_SELECTOR)) return null;

    return info;
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
    return parseSelectionValue(text);
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
    desc: 'Select a number or arithmetic expression on the page or in a same-origin iframe to see its multiplied and divided values in a fixed strip at the bottom of the page.',
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
