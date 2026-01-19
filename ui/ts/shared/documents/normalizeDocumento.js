
export function normalizeDocumento(tipo, raw) {
    const value = String(raw || '').trim();
    if (!value)
        return '';
    if (String(tipo || '').toUpperCase() === 'CPF') {
        return value.replace(/\D/g, '');
    }
    return value;
}
