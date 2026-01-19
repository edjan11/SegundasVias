import { cpf as cpfValidator } from 'cpf-cnpj-validator';
export function normalizeCpf(raw) {
    return String(raw || '').replace(/\D/g, '');
}
export function formatCpf(digits) {
    const v = normalizeCpf(digits);
    if (v.length !== 11)
        return '';
    return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`;
}
export function isValidCpf(raw) {
    const digits = normalizeCpf(raw);
    return cpfValidator.isValid(digits);
}
