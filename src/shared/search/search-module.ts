import { loadLocalDb, LocalDbRecord } from '../import-export/local-json-db';

export type SearchPayload = {
  q?: string;
  nome?: string;
  mae?: string;
  cpf?: string;
  matricula?: string;
  termo?: string;
  cns?: string;
  dataNascimento?: string;
  kind?: string;
  limit?: number;
  offset?: number;
};

export type SearchResultItem = {
  id: string;
  kind?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  sourceFormat?: string;
  nome?: string;
  mae?: string;
  cpf?: string;
  dataNascimento?: string;
  matricula?: string;
  termo?: string;
  cns?: string;
};

export type SearchResponse = {
  total: number;
  items: SearchResultItem[];
};

export type SearchRecord = {
  id: string;
  kind?: string;
  payload?: any;
  status?: string;
  sourceFormat?: string;
  createdAt?: string;
  updatedAt?: string;
  sourceRaw?: string;
};

export type SearchStore = {
  search: (payload: SearchPayload) => Promise<SearchResponse>;
  get: (id: string) => Promise<SearchRecord | null>;
};

function stripAccents(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeText(value: string): string {
  return stripAccents(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function onlyDigits(value: string): string {
  return String(value || '').replace(/\D+/g, '');
}

function stripXml(raw: string): string {
  return String(raw || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDisplayFields(payload: any): {
  nome: string;
  mae: string;
  cpf: string;
  dataNascimento: string;
  matricula: string;
  termo: string;
  cns: string;
} {
  const cert = (payload && payload.certidao) || {};
  const reg = (payload && payload.registro) || {};
  let nome = '';
  let mae = '';
  let cpf = '';
  let dataNascimento = '';
  let matricula = reg.matricula || '';
  let termo = reg.termo || '';
  let cns = cert.cartorio_cns || '';

  if (reg.nome_completo) nome = reg.nome_completo;
  if (reg.cpf) cpf = reg.cpf;
  if (reg.data_nascimento) dataNascimento = reg.data_nascimento;

  if (Array.isArray(reg.conjuges) && reg.conjuges.length) {
    const c1 = reg.conjuges[0] || {};
    const c2 = reg.conjuges[1] || {};
    nome = [c1.nome_atual_habilitacao, c2.nome_atual_habilitacao].filter(Boolean).join(' / ') || nome;
    cpf = c1.cpf || c2.cpf || cpf;
    dataNascimento = c1.data_nascimento || c2.data_nascimento || dataNascimento;
    if (c1.genitores) mae = String(c1.genitores).split(';')[1]?.trim() || mae;
  }

  if (Array.isArray(reg.filiacao)) {
    const maeObj = reg.filiacao.find((f: any) => String(f?.papel || '').toUpperCase() === 'MAE');
    if (maeObj && maeObj.nome) mae = maeObj.nome;
  }
  if (typeof reg.filiacao === 'string') {
    const parts = reg.filiacao.split(';').map((s: string) => s.trim());
    if (parts[1]) mae = parts[1];
  }

  return { nome, mae, cpf, dataNascimento, matricula, termo, cns };
}

function buildSearchText(payload: any, sourceRaw?: string): string {
  const parts: string[] = [];
  if (payload) {
    const cert = payload.certidao || {};
    const reg = payload.registro || {};
    parts.push(cert.cartorio_cns, cert.tipo_registro);
    parts.push(reg.nome_completo, reg.cpf, reg.matricula, reg.data_nascimento, reg.data_registro);
    if (Array.isArray(reg.conjuges)) {
      reg.conjuges.forEach((c: any) => {
        parts.push(
          c?.nome_atual_habilitacao,
          c?.novo_nome,
          c?.cpf,
          c?.data_nascimento,
          c?.genitores,
          c?.municipio_naturalidade,
          c?.uf_naturalidade,
        );
      });
    }
    if (Array.isArray(reg.filiacao)) {
      reg.filiacao.forEach((f: any) => {
        parts.push(f?.nome, f?.municipio_nascimento, f?.uf_nascimento, f?.avos);
      });
    }
    if (typeof reg.filiacao === 'string') parts.push(reg.filiacao);
    if (reg.averbacao_anotacao) parts.push(reg.averbacao_anotacao);
  }
  if (sourceRaw) parts.push(stripXml(sourceRaw));
  return normalizeText(parts.filter(Boolean).join(' '));
}

function matchesFilters(payload: any, sourceRaw: string | undefined, search: SearchPayload): boolean {
  const text = buildSearchText(payload, sourceRaw);
  const digits = onlyDigits(sourceRaw || '') + onlyDigits(JSON.stringify(payload || {}));

  const q = normalizeText(search.q || '');
  if (q && !text.includes(q)) return false;

  const nome = normalizeText(search.nome || '');
  if (nome && !text.includes(nome)) return false;

  const mae = normalizeText(search.mae || '');
  if (mae && !text.includes(mae)) return false;

  const cpf = onlyDigits(search.cpf || '');
  if (cpf && !digits.includes(cpf)) return false;

  const matricula = onlyDigits(search.matricula || '');
  if (matricula && !digits.includes(matricula)) return false;

  const termo = onlyDigits(search.termo || '');
  if (termo && !digits.includes(termo)) return false;

  const cns = onlyDigits(search.cns || '');
  if (cns && !digits.includes(cns)) return false;

  const dataNascimento = normalizeText(search.dataNascimento || '');
  if (dataNascimento && !text.includes(dataNascimento)) return false;

  const kind = String(search.kind || '').trim().toLowerCase();
  if (kind && String(payload?.certidao?.tipo_registro || payload?.kind || '').toLowerCase() !== kind) {
    return false;
  }

  return true;
}

function normalizeApiSearchResponse(res: any): SearchResponse {
  const items = !!res && typeof res === 'object' && 'items' in res ? res.items || [] : [];
  const total = !!res && typeof res === 'object' && 'total' in res ? res.total || 0 : 0;
  return { total, items };
}

export function createApiSearchStore(api: {
  dbSearch: (payload: SearchPayload) => Promise<any>;
  dbGet: (id: string) => Promise<any>;
}): SearchStore {
  return {
    async search(payload: SearchPayload): Promise<SearchResponse> {
      const res = await api.dbSearch(payload);
      return normalizeApiSearchResponse(res);
    },
    async get(id: string): Promise<SearchRecord | null> {
      const record = await api.dbGet(id);
      if (!record || typeof record !== 'object') return null;
      const payload = (record as any).data ?? (record as any).payload ?? null;
      return {
        id: String((record as any).id || id),
        kind: (record as any).kind,
        status: (record as any).status,
        sourceFormat: (record as any).sourceFormat,
        createdAt: (record as any).createdAt,
        updatedAt: (record as any).updatedAt,
        sourceRaw: (record as any).sourceRaw,
        payload,
      };
    },
  };
}

export function createLocalSearchStore(): SearchStore {
  return {
    async search(payload: SearchPayload): Promise<SearchResponse> {
      const db = loadLocalDb();
      const limit = payload && payload.limit ? Number(payload.limit) : 50;
      const offset = payload && payload.offset ? Number(payload.offset) : 0;
      const items: SearchResultItem[] = [];
      db.records.forEach((r: LocalDbRecord) => {
        if (!matchesFilters(r.payload, undefined, payload || {})) return;
        const display = extractDisplayFields(r.payload || {});
        items.push({
          id: r.id,
          kind: r.kind,
          status: 'importado',
          createdAt: r.importedAt,
          updatedAt: r.importedAt,
          sourceFormat: r.sourceFormat,
          nome: display.nome || '',
          mae: display.mae || '',
          cpf: display.cpf || '',
          dataNascimento: display.dataNascimento || '',
          matricula: display.matricula || '',
          termo: display.termo || '',
          cns: display.cns || '',
        });
      });
      return { total: items.length, items: items.slice(offset, offset + limit) };
    },
    async get(id: string): Promise<SearchRecord | null> {
      const db = loadLocalDb();
      const record = db.records.find((r) => r.id === id);
      if (!record) return null;
      return {
        id: record.id,
        kind: record.kind,
        sourceFormat: record.sourceFormat,
        createdAt: record.importedAt,
        updatedAt: record.importedAt,
        payload: record.payload,
      };
    },
  };
}
