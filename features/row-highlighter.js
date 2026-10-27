(() => {
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

  (window.MGX_FEATURES = window.MGX_FEATURES || []).push({
    id: 'rowHighlighter',
    name: 'Row Highlighter',
    desc: 'Click a table row to cycle its background color: green = matched to the physical book, red = needs fixing, click again to reset.',
    featureScope: 'localStorageCheckbox',
    enable() {
      document.addEventListener('mousedown', trackMouseDown);
      document.addEventListener('click', rowHighlighterClick);
    },
    disable() {
      document.removeEventListener('mousedown', trackMouseDown);
      document.removeEventListener('click', rowHighlighterClick);
      clearRowHighlighterMarks();
    },
  });
})();
