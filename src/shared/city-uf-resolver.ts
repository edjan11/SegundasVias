/**
 * City → UF resolver service (pure functions, API boundary)
 * - Normalizes city names
 * - Builds an index from provided states/cities data
 * - Resolves a city name optionally given currentUf
 *
 * The functions are pure and do NOT access the DOM. The UI layer consumes
 * these functions and decides focus/readonly behaviour.
 */

import fs from 'fs';
import path from 'path';

export type CityMatch = {
  uf: string; // state abbreviation, e.g. 'SP'
  city: string; // original city name
};

export type ResolveResult =
  | { uf: string; status: 'ok'; reason?: string }
  | { uf: string; status: 'inferred'; reason?: string }
  | { uf: null; status: 'ambiguous'; matches: CityMatch[] }
  | { uf: null; status: 'invalid' }
  | { uf: string | null; status: 'divergent'; matches: CityMatch[] };

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
  const candidates = [
    path.join(rootDir, 'public', 'data', 'jsonCidades', 'estados-cidades.json'),
    path.join(rootDir, 'public', 'data', 'jsonCidades', 'estados-cidades2.json')
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

  // No data found
  return new Map();
}

// Export default convenience object
export default {
  normalizeCityName,
  buildIndexFromData,
  resolveCityToUf,
  loadIndexFromProjectData
};
