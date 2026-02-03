import { installAbnt2Guards } from '../shared/ui/abnt2';
import { applyCertificatePayloadToSecondCopy, consumePendingPayload, queuePendingPayload } from './payload/apply-payload';

const ROUTES: Record<string, { id: string; loader: () => Promise<{ mount: (el: HTMLElement) => Promise<void> | void; unmount?: () => void }> }> = {
  nascimento: { id: 'nascimento', loader: () => import('./routes/nascimento') },
  casamento: { id: 'casamento', loader: () => import('./routes/casamento') },
  obito: { id: 'obito', loader: () => import('./routes/obito') },
};

let currentRoute: { id: string; unmount?: () => void } | null = null;
let lastNavigateHref: { href: string; ts: number } | null = null;

type ActSwitchIntent = { act: string; expiresAt: number; source: string } | null;
let actSwitchIntent: ActSwitchIntent = null;

function allowActSwitch(act: string, source: string, ttlMs = 1000): void {
  actSwitchIntent = { act, source, expiresAt: Date.now() + ttlMs };
}

function consumeActSwitchIntent(act: string): boolean {
  if (!actSwitchIntent) return false;
  const valid = actSwitchIntent.act === act && Date.now() <= actSwitchIntent.expiresAt;
  actSwitchIntent = null;
  return valid;
}

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
  const href = window.location.href.toLowerCase();
  
  // Check for /2via/ path format (new routing)
  if (path.includes('/2via/')) {
    const seg = path.split('/2via/')[1] || '';
    return normalizeAct(seg.split('/')[0]);
  }
  
  // Check for ?act= query parameter
  const params = new URLSearchParams(window.location.search);
  const actParam = params.get('act');
  if (actParam) {
    return normalizeAct(actParam);
  }
  
  // FIX: Check for old HTML file format (Nascimento2Via.html, Casamento2Via.html, etc.)
  // This prevents wrong default navigation when loading legacy URLs
  if (href.includes('nascimento2via')) return 'nascimento';
  if (href.includes('casamento2via')) return 'casamento';
  if (href.includes('obito2via')) return 'obito';
  
  // Only return default if we really can't determine the act
  // Log a warning so we can debug if this happens unexpectedly
  console.warn('[layout-router] resolveActFromLocation: Could not determine act from URL, defaulting to nascimento. URL:', window.location.href);
  return 'nascimento';
}

function buildUrlForAct(act: string): string {
  return `/ui/pages/Base2ViaLayout.html?act=${encodeURIComponent(act)}`;
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
  const normalizedAct = normalizeAct(act);

  const currentFromUrl = resolveActFromLocation();
  const hasIntent = consumeActSwitchIntent(normalizedAct);
  if (currentFromUrl && normalizedAct !== currentFromUrl && !hasIntent && opts.push !== false) {
    console.warn('[layout-router] navigate blocked: intent missing for act switch', {
      from: currentFromUrl,
      to: normalizedAct,
    });
    return;
  }

  if (currentRoute?.id === normalizedAct && currentFromUrl === normalizedAct) {
    return;
  }
  
  const route = ROUTES[normalizedAct];
  if (!route) {
    console.warn('[layout-router] No route found for:', normalizedAct);
    return;
  }

  const container = getAppContainer();
  container.classList.add('loading');

  if (currentRoute?.unmount) {
    try { await currentRoute.unmount(); } catch (e) { console.warn('unmount falhou', e); }
  }

  const mod = await route.loader();
  await mod.mount(container);

  if (opts.push !== false) {
    const url = buildUrlForAct(route.id);
    history.pushState({ act: route.id }, '', url);
  }

  const actMod = await importActBundle(route.id);

  // Compose DOM unmount (route.unmount) with act bundle unmount (if provided)
  currentRoute = {
    id: route.id,
    unmount: async () => {
      try { if (mod.unmount) await mod.unmount(); } catch (e) { console.warn('route.unmount falhou', e); }
      try { if (actMod && typeof actMod.unmount === 'function') await actMod.unmount(); } catch (e) { console.warn('act.unmount falhou', e); }
    }
  };

  requestAnimationFrame(() => {
    container.classList.remove('loading');
    container.classList.add('loaded');
     updateAtoButtons(route.id);
    
    // Apply pending payload if any (after route is fully mounted and URL is updated)
    try {
      const pending = consumePendingPayload();
      if (pending) {
        applyCertificatePayloadToSecondCopy(pending);
      }
    } catch (err) {
      console.warn('[layout-router] Error applying pending payload:', err);
    }
    
    // Remover loading da aplicação de certificado após navegação automática
    try {
      const hideLoading = (window as any).hideApplyLoading;
      if (typeof hideLoading === 'function') {
        hideLoading(true);
      }
    } catch (err) {
      // Se hideApplyLoading não estiver disponível, não há problema
      // significa que não há loading de certificado ativo
    }

    // Fallback: se o loading ainda estiver visível, forçar limpeza após curto atraso
    setTimeout(() => {
      try {
        const isVisible = (window as any).isApplyLoadingVisible;
        const forceCleanup = (window as any).forceCleanupApplyLoading;
        if (typeof isVisible === 'function' && isVisible() && typeof forceCleanup === 'function') {
          forceCleanup();
          console.warn('[layout-router] forceCleanupApplyLoading acionado após fallback');
        }
      } catch {
        // ignore
      }
    }, 1500);
  });
}

function wireGlobalHandlers(): void {
  document.addEventListener('click', (event) => {
    if (!(event as Event).isTrusted) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (!target.classList.contains('ato-btn')) return;
    const atoValue = target.getAttribute('data-ato');
    if (!atoValue) return;
    if ((window as any).__applyInProgress) {
      return;
    }
    allowActSwitch(atoValue, 'ato-btn');
    navigate(atoValue).catch((err) => console.error('Erro ao trocar ato', err));
  });

  document.body.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement | null;
    if (!target) return;
    const link = target.closest('[data-route]') as HTMLElement | null;
    if (!link) return;
    const act = link.getAttribute('data-route');
    if (!act) return;
    ev.preventDefault();
    allowActSwitch(act, 'data-route');
    navigate(act).catch((err) => console.error('Erro ao navegar', err));
  });
}

function updateAtoButtons(currentAct: string): void {
  document.querySelectorAll('.ato-btn').forEach((btn) => {
    const btnAto = btn.getAttribute('data-ato');
    if (btnAto === currentAct) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Reset button visibility when switching atos - reset to 'include' mode (new record)
  const updateButtonsVisibility = (window as any).__updateButtonsVisibility;
  if (typeof updateButtonsVisibility === 'function') {
    updateButtonsVisibility();
  }
}

window.addEventListener('popstate', (event) => {
  const act = event.state?.act || resolveActFromLocation();
  navigate(act, { push: false }).catch((err) => console.error('popstate', err));
});

// Listener para navegação interna sem reload (disparado por apply-payload)
window.addEventListener('app:navigate', (event: Event) => {
  const customEvent = event as CustomEvent<{ href: string }>;
  const href = customEvent.detail?.href;
  if (!href) return;
  if ((window as any).__applyInProgress) {
    console.warn('[layout-router] app:navigate ignorado durante apply', { href });
    return;
  }
  if (lastNavigateHref && lastNavigateHref.href === href && Date.now() - lastNavigateHref.ts < 800) {
    return;
  }
  lastNavigateHref = { href, ts: Date.now() };
  // Extrair ato do href
  const matchLegacy = href.match(/\.?\/(\w+)2Via\.html/);
  const matchSpa = href.match(/\/2via\/(nascimento|casamento|obito)/i);
  let actRaw = '';
  try {
    const url = new URL(href, window.location.origin);
    const actParam = url.searchParams.get('act');
    if (actParam) actRaw = actParam.toLowerCase();
  } catch {
    // ignore
  }
  if (!actRaw && matchSpa) actRaw = matchSpa[1].toLowerCase();
  if (!actRaw && matchLegacy) actRaw = matchLegacy[1].toLowerCase();
  if (!actRaw) {
    console.warn('[layout-router] app:navigate - Could not extract act from href:', href);
    return;
  }
  const act = normalizeAct(actRaw);
  if (currentRoute?.id === act && resolveActFromLocation() === act) {
    return;
  }
  allowActSwitch(act, 'app:navigate');
  navigate(act).catch((err) => console.error('app:navigate', err));
});

// Quando um payload pendente é enfileirado e já estamos na rota correta,
// aplicar sem navegar novamente.
window.addEventListener('app:pending-payload', () => {
  try {
    if ((window as any).__applyInProgress) return;
    const current = resolveActFromLocation();
    const pending = consumePendingPayload();
    if (!pending) return;
    const kind = String((pending as any)?.certidao?.tipo_registro || '').toLowerCase();
    if (kind && normalizeAct(kind) === current) {
      applyCertificatePayloadToSecondCopy(pending);
      return;
    }
    // Se o payload não é da rota atual, re-enfileira e navega para o ato correto
    try { queuePendingPayload(pending); } catch {}
    if (kind) {
      const act = normalizeAct(kind);
      if (act && act !== current) {
        allowActSwitch(act, 'pending-payload');
        navigate(act).catch((err) => console.error('pending-payload navigate', err));
      }
    }
  } catch (err) {
    console.warn('[layout-router] app:pending-payload error', err);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  installAbnt2Guards(document);
  wireGlobalHandlers();
  const act = resolveActFromLocation();
  allowActSwitch(act, 'init');
  navigate(act, { push: false }).catch((err) => console.error('init', err));
});

export { navigate };
