// @ts-nocheck
export function setupDrawer(opts = {}) {
  const drawer = document.getElementById('drawer');
  const toggle = document.getElementById('drawer-toggle');
  const close = document.getElementById('drawer-close');
  if (!drawer) return { open: () => {}, close: () => {}, setTab: () => {} };

  const tabs = Array.from(drawer.querySelectorAll('.tab-btn'));
  const panes = Array.from(drawer.querySelectorAll('.tab-pane'));
  let activeTab = opts.defaultTab || (tabs[0] && tabs[0].dataset.tab) || '';

  const setTab = (id) => {
    if (!id) return;
    activeTab = id;
    tabs.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === id));
    panes.forEach((pane) => pane.classList.toggle('active', pane.id === id));
  };

  tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.tab || '';
      setTab(id);
      drawer.classList.add('open');
    });
  });

  const open = (id) => {
    if (id) setTab(id);
    drawer.classList.add('open');
  };
  const hide = () => drawer.classList.remove('open');

  toggle?.addEventListener('click', () => open(activeTab));
  close?.addEventListener('click', hide);

  if (activeTab) setTab(activeTab);

  return { open, close: hide, setTab };
}
