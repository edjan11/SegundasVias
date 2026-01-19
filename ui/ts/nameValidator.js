
import Papa from 'papaparse';
import { stripAccents } from './placeAutofill/normalize.js';
const DEFAULT_NAMES = [
    'ana',
    'antonio',
    'beatriz',
    'bruno',
    'carlos',
    'carla',
    'cassio',
    'celia',
    'daniel',
    'elisa',
    'fernanda',
    'gabriel',
    'helena',
    'joao',
    'jose',
    'juliana',
    'larissa',
    'lucas',
    'luiz',
    'maria',
    'marcos',
    'patricia',
    'paulo',
    'rafael',
    'roberto',
    'silvia',
    'thiago',
];
const NAME_PARTICLES = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);
function normalizeName(value) {
    return stripAccents(String(value || ''))
        .toLowerCase()
        .replace(/[^a-z\s]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function tokenizeName(value) {
    return normalizeName(value)
        .split(' ')
        .map((t) => t.trim())
        .filter((t) => t && !NAME_PARTICLES.has(t));
}
function levenshtein(a, b) {
    const alen = a.length;
    const blen = b.length;
    if (alen === 0)
        return blen;
    if (blen === 0)
        return alen;
    const dp = Array.from({ length: alen + 1 }, () => new Array(blen + 1).fill(0));
    for (let i = 0; i <= alen; i++)
        dp[i][0] = i;
    for (let j = 0; j <= blen; j++)
        dp[0][j] = j;
    for (let i = 1; i <= alen; i++) {
        for (let j = 1; j <= blen; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
    }
    return dp[alen][blen];
}
function similarity(a, b) {
    if (!a || !b)
        return 0;
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0)
        return 1;
    const dist = levenshtein(a, b);
    return 1 - dist / maxLen;
}
async function fetchCsvText(path) {
    const res = await fetch(path);
    if (!res.ok)
        throw new Error(`Falha ao baixar: ${path}`);
    if (path.endsWith('.gz')) {
        if (!res.body || typeof DecompressionStream === 'undefined') {
            throw new Error('Descompressao gzip indisponivel');
        }
        const stream = res.body.pipeThrough(new DecompressionStream('gzip'));
        return await new Response(stream).text();
    }
    return await res.text();
}
async function loadCsvData() {
    let nomesText = '';
    let gruposText = '';
    const nomesPaths = [
        '/data/nomes.csv.gz',
        '/public/data/nomes.csv.gz',
        '/data/nomes.csv',
        '/public/data/nomes.csv',
    ];
    const gruposPaths = [
        '/data/grupos.csv.gz',
        '/public/data/grupos.csv.gz',
        '/data/grupos.csv',
        '/public/data/grupos.csv',
    ];
    for (const p of nomesPaths) {
        try {
            nomesText = await fetchCsvText(p);
            break;
        }
        catch (e) { /* ignore */ }
    }
    for (const p of gruposPaths) {
        try {
            gruposText = await fetchCsvText(p);
            break;
        }
        catch (e) { /* ignore */ }
    }
    const nomes = Papa.parse(nomesText, { header: true, skipEmptyLines: true }).data || [];
    const grupos = Papa.parse(gruposText, { header: true, skipEmptyLines: true }).data || [];
    return { nomes, grupos };
}
function splitPipeList(value) {
    return String(value || '')
        .split('|')
        .map((t) => t.trim())
        .filter(Boolean);
}
function buildNameList(data) {
    const set = new Set();
    data.nomes.forEach((row) => {
        if (row.first_name)
            set.add(row.first_name);
        if (row.group_name)
            set.add(row.group_name);
        splitPipeList(row.alternative_names).forEach((n) => set.add(n));
    });
    data.grupos.forEach((row) => {
        if (row.name)
            set.add(row.name);
        splitPipeList(row.names).forEach((n) => set.add(n));
    });
    return Array.from(set)
        .map((n) => normalizeName(n))
        .filter(Boolean);
}
export class NameDictionaryRepository {
    constructor(opts = {}) {
        this.storageKey = opts.storageKey || 'certidao.nameDictionary.v1';
    }
    load() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw)
                return { schemaVersion: 1, entries: [] };
            const parsed = JSON.parse(raw);
            if (!parsed || parsed.schemaVersion !== 1 || !Array.isArray(parsed.entries)) {
                return { schemaVersion: 1, entries: [] };
            }
            return parsed;
        }
        catch (e) { void e;
            return { schemaVersion: 1, entries: [] };
        }
    }
    save(data) {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }
    addException(value) {
        const normalized = normalizeName(value);
        if (!normalized)
            return;
        const data = this.load();
        if (data.entries.find((e) => e.normalized === normalized))
            return;
        data.entries.push({
            value,
            normalized,
            addedAt: new Date().toISOString(),
            source: 'user',
        });
        this.save(data);
    }
    has(value) {
        const normalized = normalizeName(value);
        if (!normalized)
            return false;
        const data = this.load();
        return data.entries.some((e) => e.normalized === normalized);
    }
    list() {
        return this.load().entries || [];
    }
}
export function createNameValidator(opts = {}) {
    const threshold = opts.threshold || 0.82;
    const minLength = opts.minLength || 3;
    const repo = opts.repo || new NameDictionaryRepository();
    let base = (opts.baseNames || DEFAULT_NAMES).map((n) => normalizeName(n)).filter(Boolean);
    let ready = false;
    const readyPromise = loadCsvData()
        .then((data) => {
        base = buildNameList(data);
        ready = true;
    })
        .catch(() => {
        ready = false;
    });
    function isReady() {
        return ready;
    }
    function isKnown(token) {
        if (!token)
            return false;
        if (base.includes(token))
            return true;
        if (repo.has(token))
            return true;
        return false;
    }
    function bestScore(token) {
        let best = 0;
        for (const name of base) {
            const score = similarity(token, name);
            if (score > best)
                best = score;
        }
        return best;
    }
    function check(value) {
        const tokens = tokenizeName(value);
        if (!tokens.length)
            return { suspicious: false, token: '' };
        let unknown = 0;
        let known = 0;
        let firstUnknown = '';
        for (const token of tokens) {
            if (token.length < minLength)
                continue;
            if (isKnown(token)) {
                known += 1;
                continue;
            }
            unknown += 1;
            if (!firstUnknown)
                firstUnknown = token;
        }
        if (unknown === 0)
            return { suspicious: false, token: '' };
        // single-token names: use similarity score to avoid over-eager false positives
        if (tokens.length === 1) {
            const token = firstUnknown || tokens[0];
            const score = bestScore(token);
            // dynamic threshold: be more lenient for short names
            let effectiveThreshold = threshold;
            if (token.length <= 3)
                effectiveThreshold = 0.55;
            else if (token.length <= 5)
                effectiveThreshold = 0.7;
            else if (token.length <= 7)
                effectiveThreshold = 0.78;
            if (score < effectiveThreshold)
                return { suspicious: true, token };
            return { suspicious: false, token: '' };
        }
        if (known === 0)
            return { suspicious: true, token: firstUnknown };
        if (unknown >= 3)
            return { suspicious: true, token: firstUnknown };
        return { suspicious: false, token: '' };
    }
    return { check, repo, normalizeName, ready: readyPromise, isReady };
}
