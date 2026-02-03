import { loadActHtml } from '../../shared/ui/act-page';

export async function mount(container: HTMLElement): Promise<void> {
  console.log('[route/casamento] mount() called');
  const payload = await loadActHtml('/ui/pages/Casamento2Via.html');
  console.log('[route/casamento] loadActHtml returned bodyClass:', payload.bodyClass);
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
  if (payload.bodyClass) {
    console.log('[route/casamento] Setting body.className to:', payload.bodyClass);
    document.body.className = payload.bodyClass;
  }
  console.log('[route/casamento] mount() complete, body.className is now:', document.body.className);
}

export function unmount(): void {
  // no-op for now
}
