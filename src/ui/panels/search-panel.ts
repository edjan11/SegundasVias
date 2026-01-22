type SearchPayload = {
  q?: string;
  nome?: string;
  mae?: string;
  cpf?: string;
  dataNascimento?: string;
  matricula?: string;
  cns?: string;
  kind?: string;
  limit?: number;
  offset?: number;
};

function stripAccents(value: string): string {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeText(value: string): string {
  return stripAccents(String(value || ''))
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function onlyDigits(value: string): string {
  return String(value || '').replace(/\D+/g, '');
}

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
    dataNascimento: (byId<HTMLInputElement>('search-data')?.value || '').trim(),
    matricula: (byId<HTMLInputElement>('search-matricula')?.value || '').trim(),
    cns: (byId<HTMLInputElement>('search-cns')?.value || '').trim(),
    kind: (byId<HTMLSelectElement>('search-kind')?.value || '').trim(),
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
  ['Tipo', 'Nome', 'Mae', 'CPF', 'Nascimento', 'Matricula', 'CNS', 'Status'].forEach((t) => {
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
      r.cns || '',
      r.status || '',
    ];
    cols.forEach((c) => {
      const td = document.createElement('td');
      td.textContent = String(c || '');
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  box.appendChild(table);
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
    renderResults(res?.items || [], res?.total || 0);
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
  const text = await file.text();
  const trimmed = text.trim();
  const isXml = trimmed.startsWith('<');
  const isJson = !isXml;

  if (!window.api || !window.api.dbIngest) {
    setStatus('API indisponivel para importar', true);
    return;
  }

  try {
    if (isJson) {
      const parsed = JSON.parse(text);
      const kind = String(parsed?.certidao?.tipo_registro || 'nascimento').toLowerCase();
      await window.api.dbIngest({
        kind,
        sourceFormat: 'json',
        sourceRaw: text,
        data: parsed,
        status: 'importado',
      });
      setStatus('JSON importado');
      return;
    }

    let kind = 'nascimento';
    const xmlUpper = normalizeText(trimmed);
    if (xmlUpper.includes('LISTAREGISTROSCASAMENTO')) kind = 'casamento';
    if (xmlUpper.includes('LISTAREGISTROSOBITO')) kind = 'obito';
    await window.api.dbIngest({
      kind,
      sourceFormat: 'xml',
      sourceRaw: text,
      data: {},
      status: 'importado',
    });
    setStatus('XML importado');
  } catch (e) {
    setStatus('Falha ao importar arquivo', true);
  }
}

export function setupSearchPanel(): void {
  const root = byId<HTMLElement>('op-search') || byId<HTMLElement>('tab-search');
  if (!root) return;
  if ((root as any).dataset?.bound === '1') return;
  (root as any).dataset = (root as any).dataset || {};
  (root as any).dataset.bound = '1';

  byId<HTMLElement>('btn-search')?.addEventListener('click', () => void runSearch());
  byId<HTMLElement>('btn-import')?.addEventListener('click', () => void importFile());

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
