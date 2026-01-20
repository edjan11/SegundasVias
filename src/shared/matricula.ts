export function digitsOnly(value: string | number): string {
  return String(value || '').replace(/\D/g, '');
}

export function padLeft(value: string | number, size: number): string {
  const digits = digitsOnly(value);
  if (!digits) return '';
  return digits.padStart(size, '0').slice(-size);
}

export interface MatriculaArgs {
  cns6?: string;
  ano?: string;
  tipoAto?: string;
  acervo?: string;
  servico?: string;
  livro?: string;
  folha?: string;
  termo?: string;
}

export function buildMatriculaBase30(args: MatriculaArgs): string {
  const cns = digitsOnly(args.cns6 || '');
  const ano = digitsOnly(args.ano || '');
  const tipoAto = digitsOnly(args.tipoAto || '');
  const acervo = digitsOnly(args.acervo || '01').padStart(2, '0');
  const servico = digitsOnly(args.servico || '55').padStart(2, '0');
  const livro = padLeft(args.livro || '', 5);
  const folha = padLeft(args.folha || '', 3);
  const termo = padLeft(args.termo || '', 7);
  if (cns.length !== 6 || ano.length !== 4 || !tipoAto || !livro || !folha || !termo) return '';
  const base = `${cns}${acervo}${servico}${ano}${tipoAto}${livro}${folha}${termo}`;
  return base.length === 30 ? base : '';
}

export function calcDv2Digits(base30: string): string {
  if (!base30 || base30.length !== 30) return '';
  let s1 = 0;
  for (let i = 0; i < 30; i++) s1 += Number(base30[i]) * (31 - i);
  let d1 = 11 - (s1 % 11);
  d1 = d1 === 11 ? 0 : d1 === 10 ? 1 : d1;
  const seq31 = base30 + String(d1);
  let s2 = 0;
  for (let i = 0; i < 31; i++) s2 += Number(seq31[i]) * (32 - i);
  let d2 = 11 - (s2 % 11);
  d2 = d2 === 11 ? 0 : d2 === 10 ? 1 : d2;
  return `${d1}${d2}`;
}

export function buildMatriculaFinal(args: MatriculaArgs): string {
  const base30 = buildMatriculaBase30(args);
  if (!base30) return '';
  const dv = calcDv2Digits(base30);
  return dv ? base30 + dv : '';
}

export function dvMatricula(base30: string): string {
  return calcDv2Digits(base30);
}

/**
 * Adjust a raw matrícula (digits-only, 30 or 32) according to business rules.
 * - normalize digits
 * - if oficio found in averbacaoText, replace CNS
 * - if CNS is suspicious (163659 and ano<2024) prompt for oficio
 * - if CNS unknown prompt for oficio
 * - always recalc DV from base30 and return 32-digit matricula or '' if aborted
 */
export function adjustMatricula(rawInput: string, averbacaoText?: string): string {
  const digitsOnly = (v: string) => String(v || '').replace(/\D/g, '');
  const raw = digitsOnly(rawInput || '');
  if (!(raw.length === 30 || raw.length === 32)) return '';
  let base30 = raw.slice(0, 30);

  const oficioMap: Record<string, string> = {
    '6': '110742',
    '9': '163659',
    '12': '110064',
    '13': '109736',
    '14': '110635',
    '15': '110072',
  };

  const findOficioInText = (text?: string): string | null => {
    if (!text) return null;
    const m = /of[ií]cio(?:\s+(?:n[uú]mero)?)?\s*(\d{1,2})[ºo]?/i.exec(text);
    return m ? m[1] : null;
  };

  // Apply oficio found in averbacao (priority)
  const found = findOficioInText(averbacaoText || '');
  if (found && oficioMap[found]) {
    base30 = oficioMap[found] + base30.slice(6);
  }

  const cnsAtual = base30.slice(0, 6);
  const ano = parseInt(base30.slice(10, 14), 10);

  // Special rule previously prompted for oficio. Now: prefer oficio found in averbacaoText; otherwise
  // proceed with candidate (no interactive prompt). Log warnings when CNS is suspicious or unknown.
  if (cnsAtual === '163659' && ano && ano < 2024) {
    console.warn('Matrícula suspeita (CNS 163659 com ano < 2024). Proceeding with candidate without prompting.');
  }

  // Fallback: if CNS not recognized, log and proceed
  if (!Object.values(oficioMap).includes(base30.slice(0, 6))) {
    console.warn(`CNS não reconhecido (${base30.slice(0,6)}). Proceeding with candidate without prompting.`);
  }

  // Recalculate DV and return final
  const dv = calcDv2Digits(base30);
  return dv ? base30 + dv : '';
}
