(() => {
  const DELETE_MARK_PATTERN = /^[×x✕✖]$/i;
  const CLONE_CLASS = 'mgx-rowaction-clone';
  const DELETE_CLASS = 'mgx-rowaction-delete';
  const DELETE_DELAY = 150;
  const CLONE_DETECT_ATTEMPTS = 40;
  const CLONE_DETECT_INTERVAL = 25;
  const CLONE_CLEANUP_DELAY = 900;
  const DELETE_CLEANUP_DELAY = 400;
  const flashStates = new WeakMap();
  const pendingDeletes = new WeakSet();

  const isVisibleControl = (button) => {
    if (!button || button.disabled) return false;
    if (button.closest('[hidden], [aria-hidden="true"]')) return false;
    return button.getClientRects().length > 0;
  };

  const findCloneButton = (row) => {
    const icon = row.querySelector('.fa-table-rows');
    if (icon) {
      const button = icon.closest('button');
      if (isVisibleControl(button)) return button;
    }

    const buttons = Array.from(row.querySelectorAll('button'));
    return buttons.find((button) => {
      if (!isVisibleControl(button)) return false;
      const title = (button.getAttribute('title') || '').trim().toLowerCase();
      return title === 'copy' || title === 'clone' || title === 'duplicate';
    }) || null;
  };

  const findDeleteButton = (row, cloneButton) => {
    const buttons = Array.from(row.querySelectorAll('button.btn'));
    const marked = buttons.find((button) => {
      if (!isVisibleControl(button) || button === cloneButton) return false;
      return DELETE_MARK_PATTERN.test((button.textContent || '').trim());
    });
    if (marked) return marked;

    const cells = row.querySelectorAll('td');
    const lastCell = cells[cells.length - 1];
    const fallback = lastCell && lastCell.querySelector('button');
    if (!isVisibleControl(fallback) || fallback === cloneButton) return null;
    return fallback;
  };

  const getSupportedRow = () => {
    if (document.querySelector('.mgx-modal-overlay')) return null;
    if (document.querySelector('.select2-drop.select2-drop-active, .mx-datepicker-popup')) return null;

    const active = document.activeElement;
    if (!active || active === document.body) return null;
    if (active.closest('#mgcmd-bar, .mgx-modal-overlay')) return null;

    const row = active.closest('tbody tr');
    if (!row || row.querySelector('th')) return null;

    const cloneButton = findCloneButton(row);
    if (!cloneButton) return null;

    const deleteButton = findDeleteButton(row, cloneButton);
    if (!deleteButton) return null;

    return { row, cloneButton, deleteButton };
  };

  const flashRow = (row, className, cleanupDelay) => {
    if (!row || !row.isConnected) return;

    let states = flashStates.get(row);
    if (!states) {
      states = new Map();
      flashStates.set(row, states);
    }

    const previous = states.get(className);
    if (previous) {
      clearTimeout(previous.timer);
      row.removeEventListener('animationend', previous.handler);
    }

    row.classList.remove(className);
    void row.offsetWidth;
    row.classList.add(className);

    const state = { timer: null, handler: null };
    const cleanup = () => {
      clearTimeout(state.timer);
      row.classList.remove(className);
      row.removeEventListener('animationend', state.handler);
      states.delete(className);
    };

    state.handler = (event) => {
      if (event.animationName && !event.animationName.startsWith('mgx-rowaction-')) return;
      cleanup();
    };
    state.timer = setTimeout(cleanup, cleanupDelay);
    states.set(className, state);
    row.addEventListener('animationend', state.handler);
  };

  const clickControl = (button, action) => {
    try {
      button.click();
      return true;
    } catch (error) {
      console.error(`[mgcmd] Feature "rowCloneDelete" ${action} failed.`, error);
      return false;
    }
  };

  const getRowNumber = (row) => {
    const cells = row.querySelectorAll('td');
    return cells.length > 1 ? (cells[1].textContent || '').trim() : '';
  };

  const getRowFingerprint = (row) => {
    const hidden = Array.from(row.querySelectorAll('input[type="hidden"]'))
      .map((input) => (input.value || '').trim())
      .filter(Boolean);
    if (hidden.length) return hidden.join('|');

    const values = Array.from(row.querySelectorAll('.select2-chosen, textarea, input[type="text"]'))
      .map((control) => ((control.textContent || '') + (control.value || '')).trim())
      .filter(Boolean);
    return values.join('|');
  };

  const cloneRow = (target) => {
    const table = target.row.closest('table');
    const scope = table || target.row.closest('#nonBatchView') || document;
    const fallbackScope = table ? table.parentElement : null;
    const beforeRows = Array.from(scope.querySelectorAll('tbody tr'));
    const beforeRowSet = new Set(beforeRows);
    const beforeFingerprints = beforeRows.map(getRowFingerprint);
    const sourceIndex = beforeRows.indexOf(target.row);
    const sourceNumber = getRowNumber(target.row);
    const sourceFingerprint = beforeFingerprints[sourceIndex] || getRowFingerprint(target.row);
    const beforeSourceMatches = sourceFingerprint
      ? beforeFingerprints.filter((fingerprint) => fingerprint === sourceFingerprint).length
      : 0;
    if (!clickControl(target.cloneButton, 'clone')) return;

    let attempts = 0;
    const findNewRow = () => {
      const currentScope = scope.isConnected
        ? scope
        : fallbackScope && fallbackScope.isConnected
          ? fallbackScope
          : document;
      const rows = Array.from(currentScope.querySelectorAll('tbody tr'));
      if (rows.length <= beforeRows.length && attempts < CLONE_DETECT_ATTEMPTS) {
        attempts += 1;
        setTimeout(findNewRow, CLONE_DETECT_INTERVAL);
        return;
      }

      const newRows = rows.filter((row) => !beforeRowSet.has(row));
      const adjacent = sourceIndex >= 0 ? rows[sourceIndex + 1] : null;
      let clonedRow = null;
      if (sourceFingerprint && adjacent && getRowFingerprint(adjacent) === sourceFingerprint
        && (!sourceNumber || getRowNumber(adjacent) !== sourceNumber)) {
        clonedRow = adjacent;
      } else if (sourceFingerprint) {
        const matchingRows = rows.filter((row) => getRowFingerprint(row) === sourceFingerprint);
        if (matchingRows.length > beforeSourceMatches) {
          clonedRow = (sourceNumber && matchingRows.find((row) => getRowNumber(row) !== sourceNumber))
            || matchingRows.find((row) => !beforeRowSet.has(row))
            || matchingRows[matchingRows.length - 1];
        }
      }

      if (!clonedRow) {
        const allRowsReplaced = newRows.length === rows.length;
        const adjacentIsNew = adjacent && (!sourceNumber || getRowNumber(adjacent) !== sourceNumber)
          && (allRowsReplaced || !beforeRowSet.has(adjacent));
        clonedRow = adjacentIsNew ? adjacent : newRows[0];
      }

      if (clonedRow) flashRow(clonedRow, CLONE_CLASS, CLONE_CLEANUP_DELAY);
    };
    findNewRow();
  };

  const deleteRow = (target) => {
    const row = target.row;
    if (pendingDeletes.has(row)) return;
    pendingDeletes.add(row);
    flashRow(row, DELETE_CLASS, DELETE_CLEANUP_DELAY);

    setTimeout(() => {
      pendingDeletes.delete(row);
      if (!row.isConnected || !target.deleteButton.isConnected) return;
      clickControl(target.deleteButton, 'delete');
    }, DELETE_DELAY);
  };

  const handleKeyDown = (event) => {
    if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.repeat || event.isComposing) return;

    const key = (event.key || '').toLowerCase();
    const isClone = event.code === 'KeyC' || key === 'c';
    const isDelete = event.code === 'KeyX' || key === 'x';
    if (!isClone && !isDelete) return;

    const target = getSupportedRow();
    if (!target) return;

    event.preventDefault();
    event.stopPropagation();

    if (isClone) cloneRow(target);
    else deleteRow(target);
  };

  (window.MGX_FEATURES = window.MGX_FEATURES || []).push({
    id: 'rowCloneDelete',
    name: 'Clone / Delete Row',
    desc: 'While focus is inside a supported form row: Alt+C clones the row, Alt+X removes it. Unsupported rows are ignored.',
    featureScope: 'localStorageCheckbox',
    enable() {
      document.addEventListener('keydown', handleKeyDown, true);
    },
    disable() {
      document.removeEventListener('keydown', handleKeyDown, true);
    },
  });
})();
