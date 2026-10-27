(() => {
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

  const keepThisPageConfirm = (event) => {
    event.preventDefault();
    event.returnValue = '';
  };

  (window.MGX_FEATURES = window.MGX_FEATURES || []).push({
    id: 'keepThisPage',
    name: 'Keep This Page',
    desc: 'All links open in new tabs and leaving or refreshing the page asks for confirmation, so nothing on this page — highlighted rows, form entries, notes — is lost to an accidental click or refresh. Active for the current tab only.',
    featureScope: 'tabOnlyCheckbox',
    enable() {
      document.addEventListener('click', openLinksInNewTabClick, true);
      window.addEventListener('beforeunload', keepThisPageConfirm);
    },
    disable() {
      document.removeEventListener('click', openLinksInNewTabClick, true);
      window.removeEventListener('beforeunload', keepThisPageConfirm);
    },
  });
})();
