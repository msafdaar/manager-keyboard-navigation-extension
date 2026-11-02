(() => {
  const DEFAULT_DATE_FORMAT = 'D-M-YYYY';
  const DATE_FORMAT_KEY = 'mgx:dateInputHelperFormat';
  const TOKEN_PATTERN = /YYYY|YY|MM|M|DD|D/g;

  let DATE_FORMAT = DEFAULT_DATE_FORMAT;

  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const compileFormat = (format) => {
    let pattern = '';
    let lastIndex = 0;
    const tokens = [];
    let match;
    TOKEN_PATTERN.lastIndex = 0;

    while ((match = TOKEN_PATTERN.exec(format)) !== null) {
      const token = match[0];
      pattern += escapeRegExp(format.slice(lastIndex, match.index));

      if (token === 'YYYY') pattern += '(\\d{4})';
      else if (token === 'YY') pattern += '(\\d{2})';
      else if (token === 'DD' || token === 'MM') pattern += '(\\d{2})';
      else pattern += '(\\d{1,2})';

      tokens.push(token);
      lastIndex = match.index + token.length;
    }

    pattern += escapeRegExp(format.slice(lastIndex));
    return { regex: new RegExp(`^${pattern}$`), tokens };
  };

  let FORMAT = compileFormat(DATE_FORMAT);

  const normalizeFormat = (value) => value.trim().toUpperCase();

  const validateFormat = (value) => {
    const format = normalizeFormat(value);
    if (!format) return 'Enter a date format.';

    const tokens = format.match(/YYYY|YY|MM|M|DD|D/g) || [];
    const dayTokens = tokens.filter((token) => token === 'D' || token === 'DD').length;
    const monthTokens = tokens.filter((token) => token === 'M' || token === 'MM').length;
    const yearTokens = tokens.filter((token) => token === 'YY' || token === 'YYYY').length;

    if (dayTokens !== 1) return 'Use exactly one day token: D or DD.';
    if (monthTokens !== 1) return 'Use exactly one month token: M or MM.';
    if (yearTokens !== 1) return 'Use exactly one year token: YY or YYYY.';

    const literal = format.replace(/YYYY|YY|MM|M|DD|D/g, '');
    if (/[0-9]/.test(literal)) return 'Use tokens instead of literal numbers.';
    const unknown = literal.match(/[A-Z]/);
    if (unknown) return `Unknown token "${unknown[0]}".`;

    return '';
  };

  const readSavedFormat = () => {
    try {
      const saved = normalizeFormat(localStorage.getItem(DATE_FORMAT_KEY) || '');
      return saved && !validateFormat(saved) ? saved : DEFAULT_DATE_FORMAT;
    } catch {
      return DEFAULT_DATE_FORMAT;
    }
  };

  const applyFormat = (format) => {
    DATE_FORMAT = normalizeFormat(format);
    FORMAT = compileFormat(DATE_FORMAT);
  };

  const pad2 = (value) => String(value).padStart(2, '0');

  const parseDate = (value) => {
    const match = FORMAT.regex.exec(value.trim());
    if (!match) return null;

    let day = 0;
    let month = 0;
    let year = 0;

    FORMAT.tokens.forEach((token, index) => {
      const number = parseInt(match[index + 1], 10);
      if (token === 'D' || token === 'DD') day = number;
      else if (token === 'M' || token === 'MM') month = number;
      else if (token === 'YY') year = 2000 + number;
      else if (token === 'YYYY') year = number;
    });

    if (!day || !month || !year) return null;

    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    date.setHours(0, 0, 0, 0);
    return date;
  };

  const formatDate = (date, format = DATE_FORMAT) => {
    const values = {
      YYYY: String(date.getFullYear()).padStart(4, '0'),
      YY: pad2(date.getFullYear() % 100),
      MM: pad2(date.getMonth() + 1),
      M: String(date.getMonth() + 1),
      DD: pad2(date.getDate()),
      D: String(date.getDate()),
    };

    return format.replace(TOKEN_PATTERN, (token) => values[token]);
  };

  const today = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  };

  const addDays = (date, days) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

  const setNativeValue = (input, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (setter) setter.call(input, value);
    else input.value = value;
  };

  let suppressFocusTarget = null;

  const handleFocusCapture = (event) => {
    if (event.target !== suppressFocusTarget) return;
    suppressFocusTarget = null;
    event.stopPropagation();
  };

  const isDateInput = (target) => {
    if (!(target instanceof HTMLInputElement)) return false;
    if (!target.matches('input.mx-input')) return false;
    if (!target.closest('.mx-datepicker')) return false;
    return !target.disabled && !target.readOnly;
  };

  const applyDate = (input, date) => {
    const wasOpen = Boolean(document.querySelector('.mx-datepicker-popup'));

    setNativeValue(input, formatDate(date));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));

    if (wasOpen) {
      if (document.activeElement === input) {
        input.dispatchEvent(new FocusEvent('focus'));
      } else {
        input.focus();
      }
    } else if (document.activeElement !== input) {
      suppressFocusTarget = input;
      input.focus();
    }
  };

  const handleKeyDown = (event) => {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    if (!isDateInput(event.target)) return;

    const input = event.target;
    const key = event.key;
    if (key !== 'ArrowDown' && key !== 'ArrowLeft' && key !== 'ArrowRight') return;

    event.preventDefault();

    const base = parseDate(input.value) || today();
    if (key === 'ArrowDown') applyDate(input, today());
    else if (key === 'ArrowLeft') applyDate(input, addDays(base, -1));
    else applyDate(input, addDays(base, 1));
  };

  const showFormatDialog = () =>
    new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'mgx-modal-overlay';

      const modal = document.createElement('div');
      modal.className = 'mgx-modal mgx-date-format-dialog';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'mgx-date-format-title');

      const header = document.createElement('div');
      header.className = 'mgx-modal-header';
      const title = document.createElement('span');
      title.id = 'mgx-date-format-title';
      title.textContent = 'Date input helper';
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.textContent = 'Close';
      header.append(title, closeBtn);

      const body = document.createElement('div');
      body.className = 'mgx-date-format-body';

      const label = document.createElement('label');
      label.className = 'mgx-date-format-field';
      const labelText = document.createElement('span');
      labelText.textContent = 'Date format';
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'mgx-date-format-input';
      input.value = readSavedFormat();
      input.autocomplete = 'off';
      input.spellcheck = false;
      label.append(labelText, input);

      const hint = document.createElement('div');
      hint.className = 'mgx-date-format-hint';
      hint.textContent = 'Use D, DD, M, MM, YY, or YYYY. Example: DD/MM/YYYY';

      const preview = document.createElement('div');
      preview.className = 'mgx-date-format-preview';

      const error = document.createElement('div');
      error.className = 'mgx-date-format-error';

      const actions = document.createElement('div');
      actions.className = 'mgx-date-format-actions';
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.textContent = 'Cancel';
      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'mgx-date-format-save';
      saveBtn.textContent = 'Save';
      actions.append(cancelBtn, saveBtn);

      body.append(label, hint, preview, error, actions);
      modal.append(header, body);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      const close = (ok) => {
        document.removeEventListener('keydown', onKey, true);
        overlay.remove();
        resolve(ok);
      };

      const updatePreview = () => {
        const format = normalizeFormat(input.value);
        const message = validateFormat(format);
        if (message) {
          preview.textContent = '';
          error.textContent = message;
          saveBtn.disabled = true;
          return false;
        }
        preview.textContent = `Preview: ${formatDate(today(), format)}`;
        error.textContent = '';
        saveBtn.disabled = false;
        return true;
      };

      const save = () => {
        const format = normalizeFormat(input.value);
        if (!updatePreview()) {
          input.focus();
          return;
        }
        try {
          localStorage.setItem(DATE_FORMAT_KEY, format);
        } catch {
          error.textContent = 'Could not save the date format.';
          return;
        }
        close(true);
      };

      const onKey = (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          close(false);
        } else if (event.key === 'Enter' && event.target === input) {
          event.preventDefault();
          event.stopPropagation();
          save();
        }
      };

      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) close(false);
      });
      closeBtn.addEventListener('click', () => close(false));
      cancelBtn.addEventListener('click', () => close(false));
      saveBtn.addEventListener('click', save);
      input.addEventListener('input', updatePreview);
      document.addEventListener('keydown', onKey, true);

      updatePreview();
      input.focus();
      input.select();
    });

  (window.MGX_FEATURES = window.MGX_FEATURES || []).push({
    id: 'dateInputHelper',
    name: 'Date input helper',
    desc: 'Asks for your date format when enabled. While a date field is focused: Down sets today, Left sets the previous day, and Right sets the next day.',
    featureScope: 'localStorageCheckbox',
    beforeEnable: showFormatDialog,
    enable() {
      applyFormat(readSavedFormat());
      document.addEventListener('keydown', handleKeyDown, true);
      document.addEventListener('focus', handleFocusCapture, true);
    },
    disable() {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('focus', handleFocusCapture, true);
      suppressFocusTarget = null;
    },
  });
})();
