import { loadLocalDb, LocalDbRecord, LOCAL_DB_STORAGE_KEY } from '../import-export/local-json-db';
import { resolveOficioFromCns } from '../cartorio-mapping';
import { extractMatriculaParts } from '../matricula';

export type SearchPayload = {
  q?: string;
  nome?: string;
  mae?: string;
  pai?: string;
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
  pai?: string;
  pais?: string;
  tipoCasamento?: string;
  cpf?: string;
  dataNascimento?: string;
  dataRegistro?: string;
  dataEvento?: string;
  matricula?: string;
  livro?: string;
  folha?: string;
  termo?: string;
  cartorio?: string;
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

type CompiledSearch = {
  q: string;
  nome: string;
  mae: string;
  pai: string;
  cpf: string;
  matricula: string;
  termo: string;
  cns: string;
  dataNascimento: string;
  kind: string;
};

type IndexedRecord = {
  id: string;
  kind?: string;
  payload?: any;
  status?: string;
  sourceFormat?: string;
  createdAt?: string;
  updatedAt?: string;
  searchText: string;
  digits: string;
  display: ReturnType<typeof extractDisplayFields>;
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
  pai: string;
  pais: string;
  tipoCasamento: string;
  cpf: string;
  dataNascimento: string;
  dataRegistro: string;
  dataEvento: string;
  matricula: string;
  livro: string;
  folha: string;
  termo: string;
  cartorio: string;
  cns: string;
} {
  const cert = (payload && payload.certidao) || {};
  const reg = (payload && payload.registro) || {};
  let nome = '';
  let mae = '';
  let pai = '';
  let pais = '';
  let tipoCasamento = '';
  let cpf = '';
  let dataNascimento = '';
  let dataRegistro = '';
  let dataEvento = '';
  let matricula = reg.matricula || '';
  let livro = reg.matricula_livro || '';
  let folha = reg.matricula_folha || '';
  let termo = reg.matricula_termo || reg.termo || '';
  let cartorio = reg.cartorio_oficio || reg.cartorio || '';
  let cns = cert.cartorio_cns || '';

  if (reg.nome_completo) nome = reg.nome_completo;
  if (reg.cpf) cpf = reg.cpf;
  if (reg.data_nascimento) dataNascimento = reg.data_nascimento;
  if (reg.data_registro) dataRegistro = reg.data_registro;
  if (reg.casamento_tipo) tipoCasamento = reg.casamento_tipo;
  if (!tipoCasamento && reg.tipo_casamento) tipoCasamento = reg.tipo_casamento;
  if (!tipoCasamento && reg.tipoCasamento) tipoCasamento = reg.tipoCasamento;

  if (Array.isArray(reg.conjuges) && reg.conjuges.length) {
    const c1 = reg.conjuges[0] || {};
    const c2 = reg.conjuges[1] || {};
    nome = [c1.nome_atual_habilitacao, c2.nome_atual_habilitacao].filter(Boolean).join(' / ') || nome;
    cpf = c1.cpf || c2.cpf || cpf;
    dataEvento = reg.data_celebracao || '';
    dataNascimento = c1.data_nascimento || c2.data_nascimento || dataNascimento;
    if (c1.genitores) {
      const parts = String(c1.genitores).split(';').map((p: string) => p.trim());
      pai = parts[0] || pai;
      mae = parts[1] || mae;
    }
    if (!tipoCasamento && reg.casamento_tipo) tipoCasamento = reg.casamento_tipo;
    if (!tipoCasamento && reg.tipo_casamento) tipoCasamento = reg.tipo_casamento;
  }

  if (Array.isArray(reg.filiacao)) {
    const maeObj = reg.filiacao.find((f: any) => String(f?.papel || '').toUpperCase() === 'MAE');
    const paiObj = reg.filiacao.find((f: any) => String(f?.papel || '').toUpperCase() === 'PAI');
    if (maeObj && maeObj.nome) mae = maeObj.nome;
    if (paiObj && paiObj.nome) pai = paiObj.nome;
    const nomes = reg.filiacao.map((f: any) => f?.nome).filter(Boolean);
    if (nomes.length) pais = nomes.join(' / ');
  }
  if (typeof reg.filiacao === 'string') {
    const parts = reg.filiacao.split(';').map((s: string) => s.trim());
    if (parts[0]) pai = parts[0];
    if (parts[1]) mae = parts[1];
  }

  if (!pais && (pai || mae)) {
    pais = [pai, mae].filter(Boolean).join(' / ');
  }

  if (reg.data_falecimento) dataEvento = reg.data_falecimento;
  if (reg.data_obito) dataEvento = reg.data_obito;
  if (!dataEvento && reg.data_nascimento) dataEvento = reg.data_nascimento;
  if (!dataEvento && reg.data_celebracao) dataEvento = reg.data_celebracao;

  if (!livro || !folha || !termo) {
    const parsed = extractMatriculaParts(matricula);
    if (!livro) livro = parsed.livro;
    if (!folha) folha = parsed.folha;
    if (!termo) termo = parsed.termo;
    if (!cns && parsed.cns) cns = parsed.cns;
  }

  if (!cns && /^\d{6}$/.test(String(cartorio || ''))) cns = String(cartorio || '');
  const oficio = resolveOficioFromCns(cns || cartorio || '');
  if (oficio) {
    cartorio = oficio;
  } else if (/^\d{6}$/.test(String(cartorio || ''))) {
    cartorio = '';
  }

  return { nome, mae, pai, pais, tipoCasamento, cpf, dataNascimento, dataRegistro, dataEvento, matricula, livro, folha, termo, cartorio, cns };
}

function buildSearchText(payload: any, sourceRaw?: string): string {
  const parts: string[] = [];
  if (payload) {
    const cert = payload.certidao || {};
    const reg = payload.registro || {};
    parts.push(cert.cartorio_cns, cert.tipo_registro);
    parts.push(reg.cartorio_oficio, reg.cartorio);
    const oficio = resolveOficioFromCns(cert.cartorio_cns || reg.cartorio || '');
    if (oficio) parts.push(oficio);
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

  const pai = normalizeText(search.pai || '');
  if (pai && !text.includes(pai)) return false;

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

function compileSearch(payload: SearchPayload): CompiledSearch {
  return {
    q: normalizeText(payload.q || ''),
    nome: normalizeText(payload.nome || ''),
    mae: normalizeText(payload.mae || ''),
    pai: normalizeText(payload.pai || ''),
    cpf: onlyDigits(payload.cpf || ''),
    matricula: onlyDigits(payload.matricula || ''),
    termo: onlyDigits(payload.termo || ''),
    cns: onlyDigits(payload.cns || ''),
    dataNascimento: normalizeText(payload.dataNascimento || ''),
    kind: String(payload.kind || '').trim().toLowerCase(),
  };
}

function matchesIndexed(rec: IndexedRecord, search: CompiledSearch): boolean {
  if (search.kind && String(rec.kind || '').toLowerCase() !== search.kind) return false;
  if (search.q && !rec.searchText.includes(search.q)) return false;
  if (search.nome && !rec.searchText.includes(search.nome)) return false;
  if (search.mae && !rec.searchText.includes(search.mae)) return false;
  if (search.pai && !rec.searchText.includes(search.pai)) return false;
  if (search.cpf && !rec.digits.includes(search.cpf)) return false;
  if (search.matricula && !rec.digits.includes(search.matricula)) return false;
  if (search.termo && !rec.digits.includes(search.termo)) return false;
  if (search.cns && !rec.digits.includes(search.cns)) return false;
  if (search.dataNascimento && !rec.searchText.includes(search.dataNascimento)) return false;
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
  let cachedRaw = '';
  let cachedIndex: IndexedRecord[] = [];

  const loadIndex = (): IndexedRecord[] => {
    let raw = '';
    try {
      raw = localStorage.getItem(LOCAL_DB_STORAGE_KEY) || '';
    } catch {
      raw = '';
    }
    if (raw && raw === cachedRaw && cachedIndex.length) return cachedIndex;

    let records: LocalDbRecord[] = [];
    try {
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.records)) records = parsed.records;
      } else {
        records = loadLocalDb().records;
      }
    } catch {
      records = loadLocalDb().records;
    }

    cachedRaw = raw;
    cachedIndex = records.map((r) => {
      const payload = r.payload || {};
      const searchText = buildSearchText(payload);
      const digits = onlyDigits(JSON.stringify(payload || {}));
      const display = extractDisplayFields(payload || {});
      return {
        id: r.id,
        kind: r.kind,
        status: 'importado',
        sourceFormat: r.sourceFormat,
        createdAt: r.importedAt,
        updatedAt: r.importedAt,
        payload,
        searchText,
        digits,
        display,
      };
    });
    return cachedIndex;
  };

  return {
    async search(payload: SearchPayload): Promise<SearchResponse> {
      const limit = payload && payload.limit ? Number(payload.limit) : 50;
      const offset = payload && payload.offset ? Number(payload.offset) : 0;
      const index = loadIndex();
      const compiled = compileSearch(payload || {});
      const items: SearchResultItem[] = [];
      index.forEach((r) => {
        if (!matchesIndexed(r, compiled)) return;
        const display = r.display;
        items.push({
          id: r.id,
          kind: r.kind,
          status: 'importado',
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          sourceFormat: r.sourceFormat,
          nome: display.nome || '',
          mae: display.mae || '',
          pai: display.pai || '',
          pais: display.pais || '',
          tipoCasamento: display.tipoCasamento || '',
          cpf: display.cpf || '',
          dataNascimento: display.dataNascimento || '',
          dataRegistro: display.dataRegistro || '',
          dataEvento: display.dataEvento || '',
          matricula: display.matricula || '',
          livro: display.livro || '',
          folha: display.folha || '',
          termo: display.termo || '',
          cartorio: display.cartorio || '',
          cns: display.cns || '',
        });
      });
      return { total: items.length, items: items.slice(offset, offset + limit) };
    },
    async get(id: string): Promise<SearchRecord | null> {
      const index = loadIndex();
      const record = index.find((r) => r.id === id);
      if (!record) return null;
      return {
        id: record.id,
        kind: record.kind,
        sourceFormat: record.sourceFormat,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        payload: record.payload,
      };
    },
  };
}
