// @ts-nocheck
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const DB_VERSION = 1;
let dbFile = '';
function nowIso() {
    return new Date().toISOString();
}
function makeId() {
    if (crypto.randomUUID)
        return crypto.randomUUID();
    const rand = Math.random().toString(16).slice(2);
    return `id_${Date.now()}_${rand}`;
}
function initDb(baseDir) {
    if (!baseDir)
        return;
    dbFile = path.join(baseDir, 'segundas-vias.db.json');
    ensureDb();
}
function ensureDb() {
    if (!dbFile)
        return;
    if (fs.existsSync(dbFile))
        return;
    const seed = {
        version: DB_VERSION,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        certidoes: []
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
    }
    catch { }
    return {
        version: DB_VERSION,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        certidoes: []
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
    let record = id ? db.certidoes.find(r => r.id === id) : null;
    if (!record) {
        record = {
            id: makeId(),
            kind: (payload && payload.kind) || 'nascimento',
            sourceFormat: (payload && payload.sourceFormat) || 'manual',
            sourceRaw: (payload && payload.sourceRaw) || '',
            data: payload && payload.data ? payload.data : {},
            status: 'draft',
            createdAt: now,
            updatedAt: now
        };
        db.certidoes.push(record);
    }
    else {
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
        updatedAt: now
    };
    db.certidoes.push(record);
    writeDb(db);
    return { id: record.id, updatedAt: record.updatedAt };
}
function list(payload) {
    const db = readDb();
    const limit = payload && payload.limit ? Number(payload.limit) : 50;
    const offset = payload && payload.offset ? Number(payload.offset) : 0;
    return db.certidoes.slice(offset, offset + limit).map(r => ({
        id: r.id,
        kind: r.kind,
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
    }));
}
function getById(id) {
    const db = readDb();
    return db.certidoes.find(r => r.id === id) || null;
}
function updateStatus(payload) {
    const db = readDb();
    const id = payload && payload.id ? String(payload.id) : '';
    const status = payload && payload.status ? String(payload.status) : '';
    if (!id || !status)
        return null;
    const record = db.certidoes.find(r => r.id === id);
    if (!record)
        return null;
    record.status = status;
    record.updatedAt = nowIso();
    writeDb(db);
    return { id: record.id, status: record.status, updatedAt: record.updatedAt };
}
module.exports = {
    initDb,
    saveDraft,
    ingest,
    list,
    getById,
    updateStatus
};
