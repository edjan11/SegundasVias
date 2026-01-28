import { loadActHtml } from '../../shared/ui/act-page';

export async function mount(container: HTMLElement): Promise<void> {
  const payload = await loadActHtml('/ui/pages/Casamento2Via.html');
  container.innerHTML = payload.mainHtml;
  const drawer = document.getElementById('drawer');
  if (drawer) drawer.innerHTML = payload.drawerHtml;
  if (payload.bodyClass) document.body.className = payload.bodyClass;
}

export function unmount(): void {
  // no-op for now
}
