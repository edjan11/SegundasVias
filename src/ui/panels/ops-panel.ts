export function setupOpsPanel(root: Document | HTMLElement = document): void {
  try {
    const rail = (root as Document).querySelector?.('.ops-rail') as HTMLElement | null;
    const pane = (root as Document).querySelector?.('#ops-pane') as HTMLElement | null;
    if (!rail || !pane) return;

    const buttons = Array.from(rail.querySelectorAll<HTMLElement>('.ops-btn'));
    const panels = Array.from(pane.querySelectorAll<HTMLElement>('.ops-panel'));

    // Keep operational controls out of tab order (mouse-only)
    const focusables = pane.querySelectorAll<HTMLElement>('input, select, textarea, button, a');
    focusables.forEach((el) => el.setAttribute('tabindex', '-1'));
    buttons.forEach((b) => b.setAttribute('tabindex', '-1'));

    const activate = (id: string) => {
      if (!id) return;
      buttons.forEach((b) => b.classList.toggle('active', b.dataset?.target === id));
      panels.forEach((p) => p.classList.toggle('active', p.id === id));
      pane.classList.add('open');
    };

    const close = () => {
      buttons.forEach((b) => b.classList.remove('active'));
      panels.forEach((p) => p.classList.remove('active'));
      pane.classList.remove('open');
    };

    buttons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const target = btn.dataset?.target || '';
        if (btn.classList.contains('active')) {
          close();
          return;
        }
        activate(target);
      });
    });

    const closeBtn = pane.querySelector<HTMLElement>('.ops-close');
    closeBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      close();
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (rail.contains(t) || pane.contains(t)) return;
      close();
    });
  } catch (e) {
    /* ignore */
  }
}
