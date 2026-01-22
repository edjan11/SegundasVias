export function setupDrawerTabs(root: Document | HTMLElement = document): void {
  try {
    const drawer = (root as Document).querySelector?.('#drawer') as HTMLElement | null;
    if (!drawer) return;
    const tabbar = drawer.querySelector('.tabbar') as HTMLElement | null;
    if (!tabbar) return;
    if ((tabbar as any).dataset?.tabsBound === '1') return;
    (tabbar as any).dataset = (tabbar as any).dataset || {};
    (tabbar as any).dataset.tabsBound = '1';

    const buttons = Array.from(tabbar.querySelectorAll('.tab-btn')) as HTMLElement[];
    const panes = Array.from(drawer.querySelectorAll('.tab-pane')) as HTMLElement[];
    if (!buttons.length || !panes.length) return;

    const activate = (id: string) => {
      buttons.forEach((b) => b.classList.toggle('active', b.getAttribute('data-tab') === id));
      panes.forEach((p) => p.classList.toggle('active', p.id === id));
    };

    tabbar.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement | null)?.closest?.('.tab-btn') as HTMLElement | null;
      if (!btn) return;
      e.preventDefault();
      const id = btn.getAttribute('data-tab') || '';
      if (id) activate(id);
    });

    const initial = (tabbar.querySelector('.tab-btn.active') ||
      tabbar.querySelector('.tab-btn')) as HTMLElement | null;
    if (initial) {
      const id = initial.getAttribute('data-tab') || '';
      if (id) activate(id);
    }
  } catch (e) {
    /* ignore */
  }
}
