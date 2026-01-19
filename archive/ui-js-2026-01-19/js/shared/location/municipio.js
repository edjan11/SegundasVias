export function normalizeMunicipio(raw) {
    return String(raw || '')
        .replace(/\u00A0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
