
export function stripAccents(value) {
    return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
export function normalizeText(value) {
    return stripAccents(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
const STOPWORDS = new Set([
    'hospital',
    'maternidade',
    'clinica',
    'clínica',
    'unidade',
    'posto',
    'upa',
    'ubs',
    'santa',
    'santo',
    'sao',
    'são',
    'san',
    'dr',
    'dra',
]);
export function tokenize(normalizedText) {
    return (normalizedText || '')
        .split(' ')
        .map((t) => t.trim())
        .filter((t) => t && !STOPWORDS.has(t));
}
export function stripCityUfSuffix(value) {
    const raw = (value || '').trim();
    if (!raw)
        return '';
    return raw
        .replace(/\s*[,;]\s*[\p{L}][\p{L}\s.'-]{1,}\s*(?:\/|-|\s)\s*[A-Za-z]{2}\s*$/u, '')
        .trim();
}
