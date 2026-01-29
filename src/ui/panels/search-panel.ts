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
      dbSearch: (payload) => window.api.dbSearch(payload),
      dbGet: (id) => window.api.dbGet(id),
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
      document.getElementById('btn-print')?.dispatchEvent(new Event('click'));
    } else if (action === 'export') {
      document.getElementById('btn-xml')?.dispatchEvent(new Event('click'));
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
    renderImportLogs(result.logs);
    const summary = `Importados: ${result.imported}/${result.total} | Falhas: ${result.failed} | Duplicados: ${result.skipped} | Modo: ${result.mode}`;
    setStatus(summary, result.failed > 0);
    if (!result.ok && mode === 'strict') return;

    const payloadWrap = result.firstPayload;
    if (payloadWrap && payloadWrap.payload) {
      const applied = applyCertificatePayloadToSecondCopy(payloadWrap.payload);
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
      if (fallback.ok && fallback.payload) {
        const applied = applyCertificatePayloadToSecondCopy(fallback.payload);
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
}
