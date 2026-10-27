(() => {
  const findMainActionButton = () => {
    const buttons = Array.from(document.querySelectorAll('button'));
    if (buttons.length === 0) return null;

    // Look for buttons with Update or Create text
    for (const btn of buttons) {
      const text = btn.textContent.trim();
      if (text === 'Update' || text === 'Create') {
        return btn;
      }
    }

    // Look for buttons with ajaxPost calls
    for (const btn of buttons) {
      const onclick = btn.getAttribute('onclick') || '';
      if (onclick.includes('ajaxPost')) {
        return btn;
      }
    }

    // Look for primary/success styled buttons
    for (const btn of buttons) {
      if (btn.classList.contains('btn-success') || btn.classList.contains('btn-primary')) {
        return btn;
      }
    }

    return null;
  };

  const handleKeyDown = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      console.log('ctrl+enter / cmd+enter');
      const btn = findMainActionButton();
      if (btn) {
        btn.focus();
        console.log('Focused:', btn.textContent.trim());
      }
    }
  };

  (window.MGX_FEATURES = window.MGX_FEATURES || []).push({
    id: 'focusOnActionButton',
    name: 'Focus on Action Button',
    desc: 'When you press Ctrl+Enter (or Cmd+Enter), the main action button on the page should get focus.',
    featureScope: 'localStorageCheckbox',
    enable() {
      document.addEventListener('keydown', handleKeyDown);
    },
    disable() {
      document.removeEventListener('keydown', handleKeyDown);
    },
  });
})();
