
import { normalizeText, tokenize, stripCityUfSuffix } from './normalize.js';
import { extractCityUfFromText } from './extractCityUf.js';
function getSafeStorage() {
    try {
        const key = '__certidao_cache_test__';
        window.localStorage.setItem(key, '1');
        window.localStorage.removeItem(key);
        return window.localStorage;
    }
    catch (e) { void e;
        return null;
    }
}
export function createKeyValueStore(opts = {}) {
    const storageKeyPrefix = opts.storageKeyPrefix || '';
    const storage = getSafeStorage();
    const memory = new Map();
    return {
        getItem(key) {
            const fullKey = storageKeyPrefix + key;
            if (storage)
                return storage.getItem(fullKey);
            return memory.has(fullKey) ? memory.get(fullKey) : null;
        },
        setItem(key, value) {
            const fullKey = storageKeyPrefix + key;
            if (storage)
                storage.setItem(fullKey, value);
            else
                memory.set(fullKey, value);
        },
        removeItem(key) {
            const fullKey = storageKeyPrefix + key;
            if (storage)
                storage.removeItem(fullKey);
            else
                memory.delete(fullKey);
        },
    };
}
export class LocalStoragePlaceCacheRepository {
    constructor(opts = {}) {
        this.storageKey = opts.storageKey || 'certidao.placeCache.v2';
        this.store = opts.store || createKeyValueStore();
    }
    read() {
        try {
            const raw = this.store.getItem(this.storageKey);
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
    write(data) {
        try {
            this.store.setItem(this.storageKey, JSON.stringify(data));
        }
        catch (e) { void e; }
    }
}
function jaccard(aTokens, bTokens) {
    const a = new Set(aTokens || []);
    const b = new Set(bTokens || []);
    if (!a.size || !b.size)
        return 0;
    let inter = 0;
    a.forEach((t) => {
        if (b.has(t))
            inter++;
    });
    const union = a.size + b.size - inter;
    return union === 0 ? 0 : inter / union;
}
function makeKey(normalized) {
    let h = 0;
    for (let i = 0; i < normalized.length; i++)
        h = (h * 31 + normalized.charCodeAt(i)) | 0;
    return String(h);
}
export class PlaceAutoFillCache {
    constructor(opts = {}) {
        this.maxEntries = opts.maxEntries || 200;
        this.repo = opts.repo || new LocalStoragePlaceCacheRepository();
        this.memoryData = { schemaVersion: 1, entries: [] };
    }
    normalize(text) {
        return normalizeText(text);
    }
    tokenize(normalizedText) {
        return tokenize(normalizedText);
    }
    stripCityUfSuffix(text) {
        return stripCityUfSuffix(text);
    }
    extractCityUfFromText(text) {
        return extractCityUfFromText(text);
    }
    readData() {
        try {
            const data = this.repo.read();
            if (data && data.schemaVersion === 1) {
                this.memoryData = data;
                return data;
            }
        }
        catch (e) { void e; }
        return this.memoryData;
    }
    writeData(data) {
        this.memoryData = data;
        try {
            this.repo.write(data);
        }
        catch (e) { void e; }
    }
    prune(data) {
        const entries = data.entries || [];
        if (entries.length <= this.maxEntries)
            return data;
        const sorted = entries.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        return { schemaVersion: 1, entries: sorted.slice(0, this.maxEntries) };
    }
    getBestMatch(input, opts = {}) {
        const threshold = opts.threshold || 0.75;
        const ambiguityGap = opts.ambiguityGap || 0.08;
        const keyText = this.normalize(this.stripCityUfSuffix(input || ''));
        if (!keyText)
            return null;
        const tokens = this.tokenize(keyText);
        if (!tokens.length)
            return null;
        const data = this.readData();
        let best = null;
        let second = null;
        for (const entry of data.entries || []) {
            const score = jaccard(tokens, entry.tokens || []);
            if (!best || score > best.score) {
                second = best;
                best = { entry, score };
            }
            else if (!second || score > second.score) {
                second = { entry, score };
            }
        }
        if (!best || best.score < threshold)
            return null;
        if (second && Math.abs(best.score - second.score) < ambiguityGap)
            return null;
        return best.entry;
    }
    recordMapping(args) {
        const placeText = String(args.placeText || '').trim();
        const cityBirth = String(args.cityBirth || '').trim();
        const ufBirth = String(args.ufBirth || '').trim();
        if (!placeText || !cityBirth || !ufBirth)
            return;
        const normalized = this.normalize(this.stripCityUfSuffix(placeText));
        if (!normalized)
            return;
        const data = this.readData();
        const now = Date.now();
        const key = makeKey(normalized);
        const tokens = this.tokenize(normalized);
        const existing = (data.entries || []).find((entry) => {
            const sameKey = entry.key === key;
            const sameCity = (entry.cityBirth || '').toLowerCase() === cityBirth.toLowerCase();
            const sameUf = (entry.ufBirth || '').toLowerCase() === ufBirth.toLowerCase();
            if (sameKey && sameCity && sameUf)
                return true;
            const similarity = jaccard(tokens, entry.tokens || []);
            return similarity >= 0.92 && sameCity && sameUf;
        });
        if (existing) {
            existing.updatedAt = now;
            existing.useCount = (existing.useCount || 0) + 1;
            existing.raw = placeText;
            const pruned = this.prune(data);
            this.writeData(pruned);
            return;
        }
        const nextEntry = {
            id: window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : String(now),
            key,
            raw: placeText,
            normalized,
            tokens,
            cityBirth,
            ufBirth,
            cityNatural: args.cityNatural || '',
            ufNatural: args.ufNatural || '',
            createdAt: now,
            updatedAt: now,
            useCount: 1,
        };
        data.entries = data.entries || [];
        data.entries.push(nextEntry);
        const pruned = this.prune(data);
        this.writeData(pruned);
    }
}
