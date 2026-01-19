import { cpf } from 'cpf-cnpj-validator';

export function normalizeCpf(raw) {
  return String(raw || "").replace(/\D/g, "");
}
export function formatCpf(digits) {
  const v = normalizeCpf(digits);
  if (v.length !== 11) return "";
  return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`;
}
export function isValidCpf(raw) {
  const digits = normalizeCpf(raw);
  return cpf.isValid(digits);
}

export function formatCpfInput(value) {
  const digits = normalizeCpf(value).slice(0, 11);
  if (!digits) return "";
  const p1 = digits.slice(0, 3);
  const p2 = digits.slice(3, 6);
  const p3 = digits.slice(6, 9);
  const p4 = digits.slice(9, 11);
  let out = p1;
  if (p2) out += `.${p2}`;
  if (p3) out += `.${p3}`;
  if (p4) out += `-${p4}`;
  return out;
}
