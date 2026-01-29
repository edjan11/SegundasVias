import { loadActHtml } from '../../shared/ui/act-page';

export async function mount(container: HTMLElement): Promise<void> {
  const payload = await loadActHtml('/ui/pages/Casamento2Via.html');
  container.innerHTML = payload.mainHtml;
  const drawer = document.getElementById('drawer');
  if (drawer && payload.drawerHtml && payload.drawerHtml.trim()) {
    drawer.innerHTML = payload.drawerHtml;
    // notify that drawer content was loaded so dynamic listeners can reattach
    try {
      window.dispatchEvent(new CustomEvent('drawer:loaded'));
    } catch (e) {
      // ignore if event cannot be dispatched
    }
  }
  if (payload.bodyClass) document.body.className = payload.bodyClass;
}

export function unmount(): void {
  // no-op for now
}
