/**
 * City → UF resolver service (pure functions, API boundary)
 * - Normalizes city names
 * - Builds an index from provided states/cities data
 * - Resolves a city name optionally given currentUf
 *
 * The functions are pure and do NOT access the DOM. The UI layer consumes
 * these functions and decides focus/readonly behaviour.
 */



export type CityMatch = {
  uf: string; // state abbreviation, e.g. 'SP'
  city: string; // original city name
};

export const DEFAULT_STATE_PRIORITY = ['SE', 'BA', 'AL'];
const DEFAULT_FREQUENCY_LIMIT = 30;

export type ResolveResult =
  | { uf: string; status: 'ok'; reason?: string }
  | { uf: string; status: 'inferred'; reason?: string }
  | { uf: null; status: 'ambiguous'; matches: CityMatch[] }
  | { uf: null; status: 'invalid' }
  | { uf: string | null; status: 'divergent'; matches: CityMatch[] };

/**
 * API boundary: fetch public JSON city data and build an index.
 * Intended for browser usage (e.g., UI bootstrap or HTTP API later).
 */
export async function fetchIndexFromPublicData(options: { basePaths?: string[] } = {}) {
  if (typeof fetch !== 'function') return new Map<string, CityMatch[]>();
  const bases =
    options.basePaths && options.basePaths.length
      ? options.basePaths
      : ['/data/jsonCidades', './data/jsonCidades', '../data/jsonCidades', 'data/jsonCidades'];
  const files = ['estados-cidades.json', 'estados-cidades2.json'];

  for (const base of bases) {
    for (const file of files) {
      try {
        const url = `${base}/${file}`;
        const res = await fetch(url);
        if (!res.ok) continue;
        const raw = await res.json();
        const idx = buildIndexFromData(raw);
        if (idx.size > 0) return idx;
      } catch (e) {
        /* ignore and try next */
      }
    }
  }

  return new Map<string, CityMatch[]>();
}

/**
 * Normalize a city name for comparison:
 * - lowercase
 * - remove accents
 * - collapse multiple spaces
 * - remove apostrophes and hyphens
 */
export function normalizeCityName(input: string | null | undefined): string {
  if (!input) return '';
  let s = String(input).normalize('NFKD');

  // remove diacritics
  s = s.replace(/\p{Diacritic}/gu, '');
  // convert to lowercase
  s = s.toLowerCase();
  // remove apostrophes and hyphens
  s = s.replace(/[’'\-]/g, ' ');
  // collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

export function getStatePriorityIndex(uf: string, priority?: string[]) {
  const list = priority && priority.length ? priority : DEFAULT_STATE_PRIORITY;
  const idx = list.indexOf(String(uf || '').toUpperCase().trim());
  return idx === -1 ? list.length + 1 : idx;
}

export function scoreTextSimilarity(queryNorm: string, candidateNorm: string) {
  if (!queryNorm || !candidateNorm) return 0;
  if (candidateNorm === queryNorm) return 1.2;
  if (candidateNorm.startsWith(queryNorm)) return 1.0;
  if (candidateNorm.includes(queryNorm)) return 0.8;

  // Subsequence match ratio (very light fuzzy)
  let qi = 0;
  for (let i = 0; i < candidateNorm.length && qi < queryNorm.length; i++) {
    if (candidateNorm[i] === queryNorm[qi]) qi++;
  }
  const ratio = qi / Math.max(1, queryNorm.length);
  return ratio * 0.7;
}

/**
 * Build an index map: normalizedCity -> array of { uf, city }
 * Supports two input shapes:
 * - estados-cidades.json: { estados: [ { sigla: 'SP', nome: 'São Paulo', cidades: ['São Paulo', ...] } ] }
 * - estados-cidades2.json: { states: [ { id: 1, uf: 'SP' } ], cities: [ { name: 'São Paulo', state_id: 1 } ] }
 */
export function buildIndexFromData(raw: any): Map<string, CityMatch[]> {
  const idx = new Map<string, CityMatch[]>();

  if (!raw) return idx;

  if (Array.isArray(raw.estados)) {
    for (const estado of raw.estados) {
      const uf = (estado.sigla || estado.uf || '').toUpperCase().trim();
      if (!uf) continue;
      const cidades = estado.cidades || estado.cities || [];
      for (const c of cidades) {
        const city = typeof c === 'string' ? c : c.nome || c.name;
        if (!city) continue;
        const norm = normalizeCityName(city);
        const arr = idx.get(norm) || [];
        arr.push({ uf, city });
        idx.set(norm, arr);
      }
    }
    return idx;
  }

  // second format
  if (Array.isArray(raw.states) && Array.isArray(raw.cities)) {
    const stateById = new Map<number, string>();
    for (const st of raw.states) {
      const id = Number(st.id);
      const uf = (st.uf || st.sigla || '').toUpperCase().trim();
      if (id && uf) stateById.set(id, uf);
    }
    for (const c of raw.cities) {
      const name = c.name || c.city || c.nome;
      const id = Number(c.state_id || c.stateId || c.state);
      const uf = stateById.get(id);
      if (!name || !uf) continue;
      const norm = normalizeCityName(name);
      const arr = idx.get(norm) || [];
      arr.push({ uf, city: name });
      idx.set(norm, arr);
    }
    return idx;
  }

  // Fallback: try to detect any {uf:..., city:...} arrays
  return idx;
}

/**
 * Primary API boundary: pure function that resolves city → UF
 * @param city - input city name
 * @param currentUf - optional currently selected UF (e.g. from user)
 * @param index - the prebuilt index map (normalized city -> array of matches)
 * @returns ResolveResult
 */
export function resolveCityToUf(
  city: string | null | undefined,
  currentUf: string | null | undefined,
  index: Map<string, CityMatch[]>
): ResolveResult {
  const norm = normalizeCityName(city);
  if (!norm) return { uf: null, status: 'invalid' };

  const matches = index.get(norm) || [];
  if (matches.length === 0) return { uf: null, status: 'invalid' };

  // If currentUf provided, verify
  if (currentUf) {
    const cu = String(currentUf).toUpperCase().trim();
    const anyMatchInCurrent = matches.find((m) => m.uf === cu);
    if (anyMatchInCurrent) {
      return { uf: cu, status: 'ok' };
    }
    // currentUf provided but not matching
    return { uf: cu, status: 'divergent', matches };
  }

  // No currentUf: if unique match, infer
  const uniqueUfs = Array.from(new Set(matches.map((m) => m.uf)));
  if (uniqueUfs.length === 1) {
    return { uf: uniqueUfs[0], status: 'inferred' };
  }

  // Ambiguous
  return { uf: null, status: 'ambiguous', matches };
}

/**
 * Convenience loader which reads the project's public JSON files and builds an index.
 * Not used by the pure functions — provided as a tiny helper for the UI or CLI.
 */
export function loadIndexFromProjectData(rootDir = process.cwd()): Map<string, CityMatch[]> {
  // This helper is Node-only. In browser bundles we use fetch + buildIndexFromData instead.
  if (typeof window !== 'undefined') return new Map();

  try {
    // require here so bundlers for browser don't attempt to resolve 'fs'/'path' at build time
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');

    const candidates = [
      path.join(rootDir, 'public', 'data', 'jsonCidades', 'estados-cidades.json'),
      path.join(rootDir, 'public', 'data', 'jsonCidades', 'estados-cidades2.json'),
    ];

    for (const p of candidates) {
      try {
        if (fs.existsSync(p)) {
          const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
          const idx = buildIndexFromData(raw);
          if (idx.size > 0) return idx;
        }
      } catch (err) {
        // ignore and try next
      }
    }
  } catch (e) {
    // if require fails, return empty map
  }

  // No data found
  return new Map();
}

/**
 * Load frequency map from localStorage (browser only)
 */
export function loadFrequencyMapFromLocalStorage(key = 'citySuggestionFreq'): Map<string, number> {
  if (typeof window === 'undefined') return new Map();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Map();
    const obj = JSON.parse(raw);
    return new Map(Object.entries(obj));
  } catch (e) {
    return new Map();
  }
}

export function saveFrequencyMapToLocalStorage(
  map: Map<string, number>,
  key = 'citySuggestionFreq',
  maxEntries = DEFAULT_FREQUENCY_LIMIT,
) {
  if (typeof window === 'undefined') return;
  const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  const trimmed = sorted.slice(0, Math.max(1, maxEntries));
  const obj = Object.fromEntries(trimmed);
  localStorage.setItem(key, JSON.stringify(obj));
}

export function incrementFrequency(
  city: string,
  uf: string,
  key = 'citySuggestionFreq',
  maxEntries = DEFAULT_FREQUENCY_LIMIT,
) {
  if (typeof window === 'undefined') return;
  const map = loadFrequencyMapFromLocalStorage(key);
  const mapKey = `${city}|${uf}`;
  const prev = Number(map.get(mapKey) || 0);
  map.set(mapKey, prev + 1);
  saveFrequencyMapToLocalStorage(map, key, maxEntries);
}

/**
 * Find suggestions for a query string with options.
 * Options:
 * - statePriority: array of UF codes in order to prefer (e.g. ['SE','AL','BA'])
 * - frequencyMap: Map<string,number> with keys 'City|UF' to weight results by selection frequency
 */
export function findCitySuggestions(
  index: Map<string, CityMatch[]>,
  query: string,
  limit = 5,
  options?: { statePriority?: string[]; frequencyMap?: Map<string, number> }
) {
  const q = normalizeCityName(query);
  if (!q) return [];

  const combined: Array<{ m: CityMatch; similarity: number }> = [];
  for (const [norm, matches] of index) {
    const similarity = scoreTextSimilarity(q, norm);
    if (similarity < 0.35) continue;
    for (const m of matches) combined.push({ m, similarity });
  }

  // Build frequency map (options override localStorage)
  let freqMap: Map<string, number> | undefined = options?.frequencyMap;
  if (!freqMap && typeof window !== 'undefined') {
    freqMap = loadFrequencyMapFromLocalStorage();
  }

  // State priority ranking
  const priority = (options && options.statePriority) || DEFAULT_STATE_PRIORITY;

  // Sort by: state priority (lower better), frequency desc, similarity desc, city name
  combined.sort((a, b) => {
    const pa = getStatePriorityIndex(a.m.uf, priority);
    const pb = getStatePriorityIndex(b.m.uf, priority);
    if (pa !== pb) return pa - pb;

    const ka = `${a.m.city}|${a.m.uf}`;
    const kb = `${b.m.city}|${b.m.uf}`;
    const fa = Number(freqMap?.get(ka) || 0);
    const fb = Number(freqMap?.get(kb) || 0);
    if (fa !== fb) return fb - fa;

    if (a.similarity !== b.similarity) return b.similarity - a.similarity;

    return a.m.city.localeCompare(b.m.city, 'pt', { sensitivity: 'base' });
  });

  // Deduplicate and cut to limit
  const seen = new Set();
  const out: CityMatch[] = [];
  for (const it of combined) {
    const m = it.m;
    const key = `${m.city}|${m.uf}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(m);
    }
    if (out.length >= limit) break;
  }

  return out;
}

// Export default convenience object
export default {
  normalizeCityName,
  buildIndexFromData,
  resolveCityToUf,
  loadIndexFromProjectData,
  findCitySuggestions,
  loadFrequencyMapFromLocalStorage,
  saveFrequencyMapToLocalStorage,
  incrementFrequency,
};
