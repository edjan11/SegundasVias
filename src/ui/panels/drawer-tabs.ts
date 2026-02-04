export function setupDrawerTabs(root: Document | HTMLElement = document): void {
  try {
    const drawer = (root as Document).querySelector?.('#drawer') as HTMLElement | null;
    if (!drawer) return;
    const tabbar = drawer.querySelector('.tabbar') as HTMLElement | null;
    if (!tabbar) return;

    if (!(window as any)._drawerTabsDelegated) {
      (window as any)._drawerTabsDelegated = true;
      document.addEventListener(
        'click',
        (e) => {
          const target = e.target as HTMLElement | null;
          if (!target) return;
          const btn = target.closest?.('.tab-btn') as HTMLElement | null;
          if (!btn) return;
          const activeDrawer = (btn.closest?.('#drawer') as HTMLElement | null) ||
            (document.querySelector?.('#drawer') as HTMLElement | null);
          if (!activeDrawer) return;
          const activeTabbar = activeDrawer.querySelector('.tabbar') as HTMLElement | null;
          if (!activeTabbar) return;

          e.preventDefault();
          const id = btn.getAttribute('data-tab') || '';
          if (!id) return;

          const buttons = Array.from(activeTabbar.querySelectorAll('.tab-btn')) as HTMLElement[];
          const panes = Array.from(activeDrawer.querySelectorAll('.tab-pane')) as HTMLElement[];
          if (!buttons.length || !panes.length) return;

          buttons.forEach((b) => b.classList.toggle('active', b.getAttribute('data-tab') === id));
          panes.forEach((p) => p.classList.toggle('active', p.id === id));
        },
        true,
      );
    }

    if ((tabbar as any).dataset?.tabsBound === '1') return;
    (tabbar as any).dataset = (tabbar as any).dataset || {};
    (tabbar as any).dataset.tabsBound = '1';

    const buttons = Array.from(tabbar.querySelectorAll('.tab-btn')) as HTMLElement[];
    const panes = Array.from(drawer.querySelectorAll('.tab-pane')) as HTMLElement[];
    if (!buttons.length || !panes.length) return;

    const initial = (tabbar.querySelector('.tab-btn.active') ||
      tabbar.querySelector('.tab-btn')) as HTMLElement | null;
    if (initial) {
      const id = initial.getAttribute('data-tab') || '';
      if (!id) return;
      buttons.forEach((b) => b.classList.toggle('active', b.getAttribute('data-tab') === id));
      panes.forEach((p) => p.classList.toggle('active', p.id === id));
    }
  } catch (e) {
    /* ignore */
  }
}
