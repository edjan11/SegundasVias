type DrawerLoadOptions = {
  root?: Document | HTMLElement;
  url?: string;
};

export async function ensureDrawerLoaded(options: DrawerLoadOptions = {}): Promise<void> {
  const root = options.root || document;
  const existing = (root as Document).getElementById?.('drawer') || root.querySelector?.('#drawer');
  if (existing) {
    const hasContent = (existing as HTMLElement).children.length > 0 || !!(existing as HTMLElement).innerHTML.trim();
    if (hasContent) return;
  }

  const slot =
    (root as Document).getElementById?.('drawer-slot') ||
    root.querySelector?.('#drawer-slot') ||
    existing ||
    null;

  if (!slot) return;

  const candidates = options.url
    ? [options.url]
    : ['./Drawer.html', '/pages/Drawer.html', '/ui/pages/Drawer.html'];

  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const html = await res.text();
      const wrapper = document.createElement('div');
      wrapper.innerHTML = html;
      const drawer = wrapper.querySelector('#drawer');
      if (!drawer) continue;
      if (slot === existing && existing && existing.id === 'drawer') {
        (existing as HTMLElement).innerHTML = drawer.innerHTML;
        return;
      }
      slot.replaceWith(drawer);
      return;
    } catch {
      // try next candidate
    }
  }
}
