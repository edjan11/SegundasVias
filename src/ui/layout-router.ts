import { installAbnt2Guards } from '../shared/ui/abnt2';

const ROUTES: Record<string, { id: string; loader: () => Promise<{ mount: (el: HTMLElement) => Promise<void> | void; unmount?: () => void }> }> = {
  nascimento: { id: 'nascimento', loader: () => import('./routes/nascimento') },
  casamento: { id: 'casamento', loader: () => import('./routes/casamento') },
  obito: { id: 'obito', loader: () => import('./routes/obito') },
};

let currentRoute: { id: string; unmount?: () => void } | null = null;

function getAppContainer(): HTMLElement {
  const el = document.getElementById('app');
  if (!el) throw new Error('Shell sem #app');
  return el;
}

function normalizeAct(act: string | null): string {
  const val = String(act || '').toLowerCase();
  if (val.startsWith('nasc')) return 'nascimento';
  if (val.startsWith('cas')) return 'casamento';
  if (val.startsWith('ob')) return 'obito';
  return 'nascimento';
}

function resolveActFromLocation(): string {
  const path = window.location.pathname.toLowerCase();
  if (path.includes('/2via/')) {
    const seg = path.split('/2via/')[1] || '';
    return normalizeAct(seg.split('/')[0]);
  }
  const params = new URLSearchParams(window.location.search);
  return normalizeAct(params.get('act'));
}

function buildUrlForAct(act: string): string {
  return `/2via/${act}`;
}

async function importActBundle(act: string): Promise<any> {
  const path = `/ui/js/${act}.bundle.js`;
  try {
    return await import(path);
  } catch (err) {
    console.warn(`Falha ao importar bundle ${path}`, err);
    return null;
  }
}

async function navigate(act: string, opts: { push?: boolean } = {}): Promise<void> {
  const route = ROUTES[normalizeAct(act)];
  if (!route) return;

  const container = getAppContainer();
  container.classList.add('loading');

  if (currentRoute?.unmount) {
    try { await currentRoute.unmount(); } catch (e) { console.warn('unmount falhou', e); }
  }

  const mod = await route.loader();
  await mod.mount(container);

  const actMod = await importActBundle(route.id);

  // Compose DOM unmount (route.unmount) with act bundle unmount (if provided)
  currentRoute = {
    id: route.id,
    unmount: async () => {
      try { if (mod.unmount) await mod.unmount(); } catch (e) { console.warn('route.unmount falhou', e); }
      try { if (actMod && typeof actMod.unmount === 'function') await actMod.unmount(); } catch (e) { console.warn('act.unmount falhou', e); }
    }
  };

  if (opts.push !== false) {
    const url = buildUrlForAct(route.id);
    history.pushState({ act: route.id }, '', url);
  }

  requestAnimationFrame(() => {
    container.classList.remove('loading');
    container.classList.add('loaded');
  });
}

function wireGlobalHandlers(): void {
  document.addEventListener('change', (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (target.id !== 'ato-select') return;
    const val = (target as HTMLSelectElement).value;
    if (val) navigate(val).catch((err) => console.error('Erro ao trocar ato', err));
  });

  document.body.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement | null;
    if (!target) return;
    const link = target.closest('[data-route]') as HTMLElement | null;
    if (!link) return;
    const act = link.getAttribute('data-route');
    if (!act) return;
    ev.preventDefault();
    navigate(act).catch((err) => console.error('Erro ao navegar', err));
  });
}

window.addEventListener('popstate', (event) => {
  const act = event.state?.act || resolveActFromLocation();
  navigate(act, { push: false }).catch((err) => console.error('popstate', err));
});

document.addEventListener('DOMContentLoaded', () => {
  installAbnt2Guards(document);
  wireGlobalHandlers();
  const act = resolveActFromLocation();
  navigate(act, { push: false }).catch((err) => console.error('init', err));
});

export { navigate };
