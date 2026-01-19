import { formatCpf, normalizeCpf } from '../validators/cpf.js';
export function formatCpfValue(raw) {
    const digits = normalizeCpf(raw);
    return formatCpf(digits);
}
