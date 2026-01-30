import { applyCertificatePayloadToSecondCopy } from '../payload/apply-payload';
import { importBatchFiles } from '../../shared/import-export/batch';
import { readImportFile } from '../importer';
import { exportLocalDb, clearLocalDb } from '../../shared/import-export/local-json-db';
import {
  createApiSearchStore,
  createLocalSearchStore,
  type SearchPayload,
  type SearchStore,
} from '../../shared/search/search-module';

function byId<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function setStatus(msg: string, isError = false): void {
  const el = byId<HTMLElement>('import-status');
  if (!el) return;
  const existingList = el.querySelector('ul');
  if (existingList) {
    let summary = el.querySelector('.import-summary') as HTMLElement | null;
    if (!summary) {
      summary = document.createElement('div');
      summary.className = 'import-summary';
      el.insertBefore(summary, existingList);
    }
    summary.textContent = msg;
  } else {
    el.textContent = msg;
  }
  el.classList.toggle('error', !!isError);
  el.classList.toggle('visible', !!msg);
}

function renderImportLogs(logs: { status: string; message: string; sourceName: string }[]): void {
  const el = byId<HTMLElement>('import-status');
  if (!el) return;
  el.textContent = '';
  const list = document.createElement('ul');
  list.className = 'import-log';
  logs.forEach((log) => {
    const item = document.createElement('li');
    item.textContent = `[${log.status}] ${log.sourceName} - ${log.message}`;
    list.appendChild(item);
  });
  el.appendChild(list);
  el.classList.add('visible');
}

function readPayload(): SearchPayload {
  return {
    q: (byId<HTMLInputElement>('search-q')?.value || '').trim(),
    nome: (byId<HTMLInputElement>('search-nome')?.value || '').trim(),
    mae: (byId<HTMLInputElement>('search-mae')?.value || '').trim(),
    cpf: (byId<HTMLInputElement>('search-cpf')?.value || '').trim(),
    termo: (byId<HTMLInputElement>('search-termo')?.value || '').trim(),
    kind: (byId<HTMLInputElement>('search-kind')?.value || '').trim(),
    limit: 50,
    offset: 0,
  };
}


function renderResults(items: any[], total: number): void {
  const box = byId<HTMLElement>('search-results');
  if (!box) return;
  box.textContent = '';

  const info = document.createElement('div');
  info.className = 'search-summary';
  info.textContent = `Resultados: ${total}`;
  box.appendChild(info);

  if (!items || items.length === 0) return;

  const table = document.createElement('table');
  table.className = 'search-table';
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Tipo', 'Nome', 'Mae', 'CPF', 'Nascimento', 'Matricula', 'Termo', 'CNS', 'Status', 'Acoes'].forEach((t) => {
    const th = document.createElement('th');
    th.textContent = t;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  items.forEach((r) => {
    const tr = document.createElement('tr');
    const cols = [
      r.kind || '',
      r.nome || '',
      r.mae || '',
      r.cpf || '',
      r.dataNascimento || '',
      r.matricula || '',
      r.termo || '',
      r.cns || '',
      r.status || '',
    ];
    cols.forEach((c) => {
      const td = document.createElement('td');
      td.textContent = String(c || '');
      tr.appendChild(td);
    });
    const tdActions = document.createElement('td');
    tdActions.className = 'search-actions';
    const btnOpen = document.createElement('button');
    btnOpen.className = 'btn tiny';
    btnOpen.textContent = 'Abrir';
    btnOpen.setAttribute('data-action', 'open');
    btnOpen.setAttribute('data-id', String(r.id || ''));
    const btnPrint = document.createElement('button');
    btnPrint.className = 'btn tiny secondary';
    btnPrint.textContent = 'Imprimir';
    btnPrint.setAttribute('data-action', 'print');
    btnPrint.setAttribute('data-id', String(r.id || ''));
    const btnExport = document.createElement('button');
    btnExport.className = 'btn tiny secondary';
    btnExport.textContent = 'Exportar';
    btnExport.setAttribute('data-action', 'export');
    btnExport.setAttribute('data-id', String(r.id || ''));
    tdActions.appendChild(btnOpen);
    tdActions.appendChild(btnPrint);
    tdActions.appendChild(btnExport);
    tr.appendChild(tdActions);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  box.appendChild(table);
}

let searchStore: SearchStore | null = null;

function resolveSearchStore(): SearchStore | null {
  if (searchStore) return searchStore;
  if (window.api && window.api.dbSearch && window.api.dbGet) {
    searchStore = createApiSearchStore({
      dbSearch: async (payload) => window.api.dbSearch(payload),
      dbGet: async (id) => window.api.dbGet(id),
    });
    return searchStore;
  }
  // Fallback para base local (mock de testes)
  searchStore = createLocalSearchStore();
  return searchStore;
}

async function openRecordById(id: string, action: 'open' | 'print' | 'export'): Promise<void> {
  const store = resolveSearchStore();
  if (!store) {
    setStatus('Modulo de busca indisponivel', true);
    return;
  }
  try {
    const record = await store.get(id);
    const payload = record && record.payload ? record.payload : null;
    if (!payload) {
      setStatus('Registro sem payload', true);
      return;
    }
    const result = applyCertificatePayloadToSecondCopy(payload);
    if (!result.ok) {
      setStatus('Falha ao aplicar payload', true);
      return;
    }
    if (result.warnings.length) {
      setStatus(`Aplicado com ${result.warnings.length} aviso(s)`);
    }
    if (result.navigated) return;
    if (action === 'print') {
      await scheduleAction('print');
    } else if (action === 'export') {
      await scheduleAction('export');
    }
    setStatus('');
  } catch {
    setStatus('Falha ao abrir registro', true);
  }
}

async function runSearch(): Promise<void> {
  const payload = readPayload();
  const store = resolveSearchStore();
  if (!store) {
    renderResults([], 0);
    setStatus('Modulo de busca indisponivel', true);
    return;
  }
  try {
    const res = await store.search(payload);
    renderResults(res.items || [], res.total || 0);
    setStatus('');
  } catch (e) {
    renderResults([], 0);
    setStatus('Falha ao buscar', true);
  }
}

async function importFile(): Promise<void> {
  const input = byId<HTMLInputElement>('import-file');
  if (!input || !input.files || input.files.length === 0) {
    setStatus('Selecione um arquivo JSON ou XML', true);
    return;
  }
  try {
    const mode = (localStorage.getItem('import.mode') as 'strict' | 'safe') || 'safe';
    const result = await importBatchFiles(input.files, mode);
    // DEBUG: log import result for troubleshooting of failing apply flows
    try { console.debug('[import] importBatchFiles result:', result); } catch {};
    renderImportLogs(result.logs);
    const summary = `Importados: ${result.imported}/${result.total} | Falhas: ${result.failed} | Duplicados: ${result.skipped} | Modo: ${result.mode}`;
    setStatus(summary, result.failed > 0);
    if (!result.ok && mode === 'strict') return;

    const payloadWrap = result.firstPayload;
    try { console.debug('[import] firstPayloadWrap:', payloadWrap); } catch {};
    if (payloadWrap && payloadWrap.payload) {
      const applied = applyCertificatePayloadToSecondCopy(payloadWrap.payload);
      try { console.debug('[import] applied firstPayload result:', applied); } catch {};
      if (!applied.ok) {
        setStatus('Importado, mas falha ao aplicar na tela', true);
        return;
      }
      if (applied.warnings.length) {
        setStatus(`Aplicado com ${applied.warnings.length} aviso(s)`);
      } else {
        setStatus('Importado e aplicado na tela');
      }
      if (applied.navigated) return;
    } else {
      // Fallback: tenta aplicar diretamente o primeiro arquivo (sem depender do schema)
      const first = input.files[0];
      const fallback = await readImportFile(first);
      try { console.debug('[import] fallback readImportFile result:', fallback); } catch {};
      if (fallback.ok && fallback.payload) {
        const applied = applyCertificatePayloadToSecondCopy(fallback.payload);
        try { console.debug('[import] applied fallback payload result:', applied); } catch {};
        if (!applied.ok) {
          setStatus('Importado, mas falha ao aplicar na tela', true);
          return;
        }
        if (applied.warnings.length) {
          setStatus(`Aplicado com ${applied.warnings.length} aviso(s)`);
        } else {
          setStatus('Importado e aplicado na tela');
        }
        if (applied.navigated) return;
      }
    }
  } catch (e) {
    setStatus('Falha ao importar arquivo', true);
  }
}

function exportLocalDbToJson(): void {
  const content = exportLocalDb();
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'certidoes-importadas.json';
  a.click();
  URL.revokeObjectURL(url);
}

function resetLocalDb(): void {
  if (!confirm('Limpar banco de testes? Esta acao nao pode ser desfeita.')) return;
  clearLocalDb();
  setStatus('Banco de testes limpo');
}

/**
 * Schedule an action that triggers UI buttons in a safe microtask (setTimeout 0).
 * This avoids dispatching events synchronously which can interfere with ongoing DOM updates
 * or navigation that happened as part of payload application.
 */
export function scheduleAction(action: 'print' | 'export'): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const EventCtor = (document && (document.defaultView as any) && (document.defaultView as any).Event) || Event;
      const ev = new EventCtor('click');
      if (action === 'print') {
        document.getElementById('btn-print')?.dispatchEvent(ev as Event);
      } else {
        document.getElementById('btn-xml')?.dispatchEvent(ev as Event);
      }
      resolve();
    }, 0);
  });
}

export function setupSearchPanel(): void {
  // Import controls live in the drawer (tab-config). Bind them even if search panel isn't present.
  const importInput = byId<HTMLInputElement>('import-file');
  if (importInput && importInput.getAttribute('data-bound') !== '1') {
    importInput.setAttribute('data-bound', '1');
    byId<HTMLElement>('btn-import')?.addEventListener('click', () => void importFile());
    byId<HTMLElement>('btn-export-local')?.addEventListener('click', () => exportLocalDbToJson());
    byId<HTMLElement>('btn-reset-local')?.addEventListener('click', () => resetLocalDb());
  }

  const root = byId<HTMLElement>('op-search') || byId<HTMLElement>('tab-search');
  if (!root) return;
  if (root.getAttribute('data-bound') === '1') return;
  root.setAttribute('data-bound', '1');

  byId<HTMLElement>('btn-search')?.addEventListener('click', () => void runSearch());

  root.querySelectorAll<HTMLElement>('[data-kind-toggle]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const kind = btn.getAttribute('data-kind') || '';
      root.querySelectorAll<HTMLElement>('[data-kind-toggle]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const hidden = byId<HTMLInputElement>('search-kind');
      if (hidden) hidden.value = kind;
    });
  });

  // Hook clicks on result actions (open/print/export)
  const results = byId<HTMLElement>('search-results');
  results?.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement | null;
    if (!target) return;
    const action = target.getAttribute('data-action') as 'open' | 'print' | 'export' | null;
    const id = target.getAttribute('data-id') || '';
    if (!action || !id) return;
    ev.preventDefault();
    void openRecordById(id, action);
  });

  // Enter key on inputs triggers search
  const inputs = root.querySelectorAll('input, select');
  inputs.forEach((el) => {
    el.addEventListener('keydown', (ev: Event) => {
      const e = ev as KeyboardEvent;
      if (e.key === 'Enter') {
        e.preventDefault();
        void runSearch();
      }
    });
  });

  // Ensure a pending payload listener is bound at module load time so pages without the search root still handle the event
}

// Bind listener at module scope
let _pendingPayloadListenerBound = false;
function bindPendingPayloadListener() {
  if (_pendingPayloadListenerBound) return;
  _pendingPayloadListenerBound = true;

  window.addEventListener('app:pending-payload', (ev: Event) => {
    try {
      try { console.debug('[search-panel] pending-payload event received', (ev as CustomEvent).detail); } catch {}
      const d = (ev as CustomEvent).detail || {};
      const kind = String(d.kind || '').toLowerCase();
      // Clean previous action if present
      const statusEl = byId<HTMLElement>('import-status');
      if (statusEl) {
        // remove previous action area if any
        const prev = statusEl.querySelector('#pending-payload-action');
        if (prev) prev.remove();
      }

      const readable = (kind === 'nascimento' || kind === 'casamento' || kind === 'obito') ? kind : 'registro';
      setStatus(`Registro enfileirado para: ${readable}. Clique para ir e aplicar.`, true);

      // Create action button next to status to let user navigate explicitly
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = `Ir para ${readable}`;
      const closeBtn = document.createElement('button');
      closeBtn.className = 'btn btn-close';
      closeBtn.textContent = '✕';
      closeBtn.title = 'Fechar';

      const container = byId<HTMLElement>('import-status');
      if (container) {
        const action = document.createElement('div');
        action.id = 'pending-payload-action';
        action.style.marginTop = '8px';
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          // Map kind to href same as navigateToAct
          const map: Record<string, string> = {
            nascimento: './Nascimento2Via.html',
            casamento: './Casamento2Via.html',
            obito: './Obito2Via.html',
          };
          const href = map[kind] || '';
          if (href) {
            try {
              // Prefer SPA navigation when available to avoid full page reloads and routing conflicts
              try {
                // dynamic import of router to avoid circular imports at module load time
                const router = require('../layout-router');
                if (router && typeof router.navigate === 'function') {
                  // use SPA router
                  router.navigate(kind).catch((err: any) => {
                    console.warn('[search-panel] router.navigate failed, falling back to app:navigate', err);
                    window.dispatchEvent(new CustomEvent('app:navigate', { detail: { href } }));
                  });
                } else {
                  window.dispatchEvent(new CustomEvent('app:navigate', { detail: { href } }));
                }
              } catch (err) {
                // fallback to app:navigate or direct location change
                try { window.dispatchEvent(new CustomEvent('app:navigate', { detail: { href } })); } catch { window.location.href = href; }
              }
            } catch (e) {
              try { window.location.href = href; } catch {}
            }
            // update status to reflect action
            setStatus('Navegando para aplicar o registro...');
          }
        });
        action.appendChild(btn);
        container.appendChild(action);
      } else {
        // Fallback: if import-status is not available on this page, show a small floating action
        const prev = document.getElementById('pending-payload-action');
        if (prev) prev.remove();

        const floatWrap = document.createElement('div');
        floatWrap.id = 'pending-payload-action';
        floatWrap.style.position = 'fixed';
        floatWrap.style.right = '12px';
        floatWrap.style.bottom = '12px';
        floatWrap.style.zIndex = '9999';
        floatWrap.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        floatWrap.style.background = '#fff';
        floatWrap.style.padding = '8px';
        floatWrap.style.borderRadius = '6px';
        closeBtn.style.marginLeft = '8px';
        closeBtn.addEventListener('click', (e) => { e.preventDefault(); floatWrap.remove(); });

        floatWrap.appendChild(btn);
        floatWrap.appendChild(closeBtn);
        document.body.appendChild(floatWrap);
      }
    } catch (e) {
      setStatus('Registro enfileirado. Clique no painel para navegar e aplicar.');
    }
  });
}

// Ensure the listener is bound at module load so pages without search roots still react
try { bindPendingPayloadListener(); } catch (err) { /* ignore if already bound or not available */ }
