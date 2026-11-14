(() => {
  const CONTAINER_SELECTOR = '#nonBatchView';
  const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button',
    'input',
    'select',
    'textarea',
    '[tabindex]',
    '[contenteditable="true"]',
  ].join(',');

  const isVisible = (element) => {
    if (element.matches(':disabled')) return false;
    if (element.closest('[hidden], [aria-hidden="true"]')) return false;
    if (element.getAttribute('type') === 'hidden') return false;
    if (element.tabIndex < 0) return false;
    return element.getClientRects().length > 0;
  };

  const getFocusableElements = (container) =>
    Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(isVisible);

  const handleKeyDown = (event) => {
    if (event.key !== 'Tab') return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.defaultPrevented) return;

    const container = document.querySelector(CONTAINER_SELECTOR);
    if (!container) return;

    const active = document.activeElement;
    if (!active || active === container || !container.contains(active)) return;

    const elements = getFocusableElements(container);
    if (elements.length === 0) return;

    const index = elements.indexOf(active);
    if (index === -1) return;

    const nextIndex = event.shiftKey
      ? (index - 1 + elements.length) % elements.length
      : (index + 1) % elements.length;

    event.preventDefault();
    elements[nextIndex].focus();
  };

  (window.MGX_FEATURES = window.MGX_FEATURES || []).push({
    id: 'trapTabNavigation',
    name: 'Trap Tab Navigation',
    desc: 'Keeps Tab and Shift+Tab cycling through the elements inside the form area (#nonBatchView) instead of leaving the form.',
    featureScope: 'localStorageCheckbox',
    enable() {
      document.addEventListener('keydown', handleKeyDown, true);
    },
    disable() {
      document.removeEventListener('keydown', handleKeyDown, true);
    },
  });
})();
