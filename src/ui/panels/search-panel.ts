import { applyCertificatePayloadToSecondCopy } from '../payload/apply-payload';
import { readImportFile } from '../importer';

type SearchPayload = {
  q?: string;
  nome?: string;
  mae?: string;
  cpf?: string;
  termo?: string;
  kind?: string;
  limit?: number;
  offset?: number;
};

function byId<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function setStatus(msg: string, isError = false): void {
  const el = byId<HTMLElement>('import-status');
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('error', !!isError);
  el.classList.toggle('visible', !!msg);
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

function isRecordLike(obj: unknown): obj is { data?: any; payload?: any } {
  return !!obj && typeof obj === 'object';
}

async function openRecordById(id: string, action: 'open' | 'print' | 'export'): Promise<void> {
  if (!window.api || !window.api.dbGet) {
    setStatus('API indisponivel para abrir', true);
    return;
  }
  try {
    const record = await window.api.dbGet(id);
    const payload = isRecordLike(record) ? (record.data ?? record.payload ?? null) : null;
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
  if (!window.api || !window.api.dbSearch) {
    renderResults([], 0);
    setStatus('API indisponivel para busca', true);
    return;
  }
  try {
    const res = await window.api.dbSearch(payload);
    const items = (!!res && typeof res === 'object' && 'items' in (res as any)) ? (res as any).items || [] : [];
    const total = (!!res && typeof res === 'object' && 'total' in (res as any)) ? (res as any).total || 0 : 0;
    renderResults(items, total);
    setStatus('');
  } catch (e) {
    renderResults([], 0);
    setStatus('Falha ao buscar', true);
  }
}

async function importFile(): Promise<void> {
  const input = byId<HTMLInputElement>('import-file');
  if (!input || !input.files || !input.files[0]) {
    setStatus('Selecione um arquivo JSON ou XML', true);
    return;
  }
  const file = input.files[0];
  try {
    const result = await readImportFile(file);
    if (!result.ok) {
      const msg = result.errors && result.errors.length ? result.errors.join(', ') : 'Falha ao importar';
      setStatus(msg, true);
      return;
    }

    if (!result.payload) {
      if (window.api && window.api.dbIngest) {
        await window.api.dbIngest({
          kind: result.kind,
          sourceFormat: result.sourceFormat,
          sourceRaw: result.raw,
          data: {},
          status: 'importado',
        });
      }
      setStatus('XML importado (sem mapeamento)');
      return;
    }

    const applyRes = applyCertificatePayloadToSecondCopy(result.payload);
    if (!applyRes.ok) {
      setStatus('Falha ao aplicar arquivo', true);
      return;
    }
    if (applyRes.warnings.length) {
      setStatus(`Arquivo aplicado com ${applyRes.warnings.length} aviso(s)`);
    }

    if (window.api && window.api.dbIngest) {
      const ingestRes = await window.api.dbIngest({
        kind: result.kind,
        sourceFormat: result.sourceFormat,
        sourceRaw: result.raw,
        data: result.payload,
        status: 'importado',
      });
      if (ingestRes && typeof (ingestRes as any).id !== 'undefined') {
        setStatus(`Arquivo importado (id: ${(ingestRes as any).id})`);
      } else {
        setStatus('Arquivo importado');
      }
    } else {
      setStatus('Arquivo importado');
    }
  } catch (e) {
    setStatus('Falha ao importar arquivo', true);
  }
}

export function setupSearchPanel(): void {
  const root = byId<HTMLElement>('op-search') || byId<HTMLElement>('tab-search');
  if (!root) return;
  if (root.getAttribute('data-bound') === '1') return;
  root.setAttribute('data-bound', '1');

  byId<HTMLElement>('btn-search')?.addEventListener('click', () => void runSearch());
  byId<HTMLElement>('btn-import')?.addEventListener('click', () => void importFile());

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
