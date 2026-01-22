import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DB_VERSION = 1;
let dbFile = '';

function nowIso() {
  return new Date().toISOString();
}

function makeId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const rand = Math.random().toString(16).slice(2);
  return `id_${Date.now()}_${rand}`;
}

function initDb(baseDir) {
  if (!baseDir) return;
  dbFile = path.join(baseDir, 'segundas-vias.db.json');
  ensureDb();
}

function ensureDb() {
  if (!dbFile) return;
  if (fs.existsSync(dbFile)) return;
  const seed = {
    version: DB_VERSION,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    certidoes: [],
  };
  fs.writeFileSync(dbFile, JSON.stringify(seed, null, 2), 'utf8');
}

function readDb() {
  ensureDb();
  try {
    const raw = fs.readFileSync(dbFile, 'utf8') || '';
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && parsed.version === DB_VERSION && Array.isArray(parsed.certidoes)) {
      return parsed;
    }
  } catch (e) {
    void e;
  }
  return {
    version: DB_VERSION,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    certidoes: [],
  };
}

function writeDb(db) {
  db.updatedAt = nowIso();
  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), 'utf8');
}

function saveDraft(payload) {
  const db = readDb();
  const now = nowIso();
  const id = payload && payload.id ? String(payload.id) : '';
  let record = id ? db.certidoes.find((r) => r.id === id) : null;
  if (!record) {
    record = {
      id: makeId(),
      kind: (payload && payload.kind) || 'nascimento',
      sourceFormat: (payload && payload.sourceFormat) || 'manual',
      sourceRaw: (payload && payload.sourceRaw) || '',
      data: payload && payload.data ? payload.data : {},
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    db.certidoes.push(record);
  } else {
    record.kind = (payload && payload.kind) || record.kind;
    record.sourceFormat = (payload && payload.sourceFormat) || record.sourceFormat;
    record.sourceRaw = (payload && payload.sourceRaw) || record.sourceRaw;
    record.data = payload && payload.data ? payload.data : record.data;
    record.status = 'draft';
    record.updatedAt = now;
  }
  writeDb(db);
  return { id: record.id, updatedAt: record.updatedAt };
}

function ingest(payload) {
  const db = readDb();
  const now = nowIso();
  const record = {
    id: makeId(),
    kind: (payload && payload.kind) || 'nascimento',
    sourceFormat: (payload && payload.sourceFormat) || 'json',
    sourceRaw: (payload && payload.sourceRaw) || '',
    data: payload && payload.data ? payload.data : {},
    status: (payload && payload.status) || 'new',
    createdAt: now,
    updatedAt: now,
  };
  db.certidoes.push(record);
  writeDb(db);
  return { id: record.id, updatedAt: record.updatedAt };
}

function list(payload) {
  const db = readDb();
  const limit = payload && payload.limit ? Number(payload.limit) : 50;
  const offset = payload && payload.offset ? Number(payload.offset) : 0;
  return db.certidoes.slice(offset, offset + limit).map((r) => ({
    id: r.id,
    kind: r.kind,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

function getById(id) {
  const db = readDb();
  return db.certidoes.find((r) => r.id === id) || null;
}

function updateStatus(payload) {
  const db = readDb();
  const id = payload && payload.id ? String(payload.id) : '';
  const status = payload && payload.status ? String(payload.status) : '';
  if (!id || !status) return null;
  const record = db.certidoes.find((r) => r.id === id);
  if (!record) return null;
  record.status = status;
  record.updatedAt = nowIso();
  writeDb(db);
  return { id: record.id, status: record.status, updatedAt: record.updatedAt };
}

function stripAccents(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeText(value) {
  return stripAccents(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function onlyDigits(value) {
  return String(value || '').replace(/\D+/g, '');
}

function stripXml(raw) {
  return String(raw || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDisplayFields(data) {
  const cert = (data && data.certidao) || {};
  const reg = (data && data.registro) || {};
  let nome = '';
  let mae = '';
  let cpf = '';
  let dataNascimento = '';
  let matricula = reg.matricula || '';
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
    const maeObj = reg.filiacao.find((f) => String(f?.papel || '').toUpperCase() === 'MAE');
    if (maeObj && maeObj.nome) mae = maeObj.nome;
  }
  if (typeof reg.filiacao === 'string') {
    const parts = reg.filiacao.split(';').map((s) => s.trim());
    if (parts[1]) mae = parts[1];
  }

  return { nome, mae, cpf, dataNascimento, matricula, cns };
}

function buildSearchText(record) {
  const parts = [];
  if (record && record.data) {
    const data = record.data;
    const cert = data.certidao || {};
    const reg = data.registro || {};
    parts.push(cert.cartorio_cns, cert.tipo_registro);
    parts.push(reg.nome_completo, reg.cpf, reg.matricula, reg.data_nascimento, reg.data_registro);
    if (Array.isArray(reg.conjuges)) {
      reg.conjuges.forEach((c) => {
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
      reg.filiacao.forEach((f) => {
        parts.push(f?.nome, f?.municipio_nascimento, f?.uf_nascimento, f?.avos);
      });
    }
    if (typeof reg.filiacao === 'string') parts.push(reg.filiacao);
    if (reg.averbacao_anotacao) parts.push(reg.averbacao_anotacao);
  }
  if (record && record.sourceRaw) parts.push(stripXml(record.sourceRaw));
  return normalizeText(parts.filter(Boolean).join(' '));
}

function matchesFilters(record, payload) {
  const text = buildSearchText(record);
  const digits = onlyDigits(record.sourceRaw || '') + onlyDigits(JSON.stringify(record.data || {}));

  const q = normalizeText(payload.q || '');
  if (q && !text.includes(q)) return false;

  const nome = normalizeText(payload.nome || '');
  if (nome && !text.includes(nome)) return false;

  const mae = normalizeText(payload.mae || '');
  if (mae && !text.includes(mae)) return false;

  const cpf = onlyDigits(payload.cpf || '');
  if (cpf && !digits.includes(cpf)) return false;

  const matricula = onlyDigits(payload.matricula || '');
  if (matricula && !digits.includes(matricula)) return false;

  const cns = onlyDigits(payload.cns || '');
  if (cns && !digits.includes(cns)) return false;

  const dataNascimento = normalizeText(payload.dataNascimento || '');
  if (dataNascimento && !text.includes(dataNascimento)) return false;

  const kind = String(payload.kind || '').trim().toLowerCase();
  if (kind && String(record.kind || '').toLowerCase() !== kind) return false;

  return true;
}

function search(payload) {
  const db = readDb();
  const limit = payload && payload.limit ? Number(payload.limit) : 50;
  const offset = payload && payload.offset ? Number(payload.offset) : 0;
  const items = [];
  for (const r of db.certidoes) {
    if (!matchesFilters(r, payload || {})) continue;
    const display = extractDisplayFields(r.data || {});
    items.push({
      id: r.id,
      kind: r.kind,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      sourceFormat: r.sourceFormat,
      nome: display.nome || '',
      mae: display.mae || '',
      cpf: display.cpf || '',
      dataNascimento: display.dataNascimento || '',
      matricula: display.matricula || '',
      cns: display.cns || '',
    });
  }
  return { total: items.length, items: items.slice(offset, offset + limit) };
}

module.exports = {
  initDb,
  saveDraft,
  ingest,
  search,
  list,
  getById,
  updateStatus,
};
