export type MatriculaParts = {
  livro: string;
  folha: string;
  termo: string;
  cns: string;
};

type BuildMatriculaArgs = {
  cns6: string;
  ano: string;
  tipoAto: string;
  acervo?: string;
  servico?: string;
  livro: string;
  folha: string;
  termo: string;
};

function digitsOnly(value: string): string {
  return String(value || '').replace(/\D+/g, '');
}

function padLeft(value: string, size: number): string {
  return digitsOnly(value).padStart(size, '0').slice(-size);
}

/**
 * API boundary: build the 30-digit matricula base (without DV).
 * Pure logic (safe to expose via backend later).
 */
export function buildMatriculaBase30(args: BuildMatriculaArgs): string {
  const cns6 = padLeft(args.cns6, 6);
  const acervo = padLeft(args.acervo || '01', 2);
  const servico = padLeft(args.servico || '55', 2);
  const ano = padLeft(args.ano, 4);
  const tipoAto = padLeft(args.tipoAto, 1);
  const livro = padLeft(args.livro, 5);
  const folha = padLeft(args.folha, 3);
  const termo = padLeft(args.termo, 7);

  const base = `${cns6}${acervo}${servico}${ano}${tipoAto}${livro}${folha}${termo}`;
  return base.length === 30 ? base : '';
}

/**
 * API boundary: calculate CNJ DV (2 digits) for a 30-digit base.
 */
export function calcDv2Digits(base30: string): string {
  const base = digitsOnly(base30);
  if (base.length !== 30) return '';

  let sum1 = 0;
  for (let i = 0; i < 30; i++) sum1 += Number(base[i]) * (31 - i);
  let d1: number = 11 - (sum1 % 11);
  d1 = d1 === 11 ? 0 : d1 === 10 ? 1 : d1;

  const seq31 = base + String(d1);
  let sum2 = 0;
  for (let i = 0; i < 31; i++) sum2 += Number(seq31[i]) * (32 - i);
  let d2: number = 11 - (sum2 % 11);
  d2 = d2 === 11 ? 0 : d2 === 10 ? 1 : d2;

  return `${d1}${d2}`;
}

/**
 * API boundary: build the final 32-digit matricula (base + DV).
 */
export function buildMatriculaFinal(args: BuildMatriculaArgs): string {
  const base = buildMatriculaBase30(args);
  if (!base) return '';
  const dv = calcDv2Digits(base);
  return dv ? base + dv : '';
}

/**
 * API boundary: adjust matricula using observation text when available.
 * Current safe implementation: normalize digits and return as-is.
 */
export function adjustMatricula(matricula: string, _obs?: string): string {
  const digits = digitsOnly(matricula);
  return digits.length >= 30 ? digits : '';
}

export function extractMatriculaParts(matricula: string): MatriculaParts {
  const digits = String(matricula || '').replace(/\D+/g, '');
  if (digits.length < 30) return { livro: '', folha: '', termo: '', cns: '' };
  const cns = digits.slice(0, 6);
  const livro = digits.slice(15, 20);
  const folha = digits.slice(20, 23);
  const termo = digits.slice(23, 30);
  return { livro, folha, termo, cns };
}
