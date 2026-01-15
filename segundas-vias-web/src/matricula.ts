import type { AppState } from "./types";
const DEFAULT_CNS = "163659";

const digitsOnly = (v: string) => (v || "").replace(/\D/g, "");
const padDigits = (v: string, size: number) => {
  const d = digitsOnly(v);
  return d ? d.padStart(size, "0").slice(-size) : "";
};
const yearFromDate = (v: string) => {
  const m = (v || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? m[3] : "";
};

function dvMatricula(base30: string) {
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

function tipoDigit(tipoRegistro: string, casamentoTipo: string) {
  if (tipoRegistro === "nascimento") return "1";
  if (tipoRegistro === "casamento") return digitsOnly(casamentoTipo || "").slice(0, 1) || "";
  return "";
}

export function buildMatricula(state: AppState) {
  const cns = digitsOnly(state.certidao.cartorio_cns || DEFAULT_CNS);
  const ano = yearFromDate(state.registro.data_registro || "");
  const tipo = tipoDigit(state.certidao.tipo_registro, state.ui.casamento_tipo);
  const livro = padDigits(state.ui.matricula_livro, 5);
  const folha = padDigits(state.ui.matricula_folha, 3);
  const termo = padDigits(state.ui.matricula_termo, 7);
  if (cns.length !== 6 || !ano || !tipo || !livro || !folha || !termo) return "";
  const base30 = `${cns}01` + `55${ano}${tipo}${livro}${folha}${termo}`;
  if (base30.length !== 30) return "";
  const dv = dvMatricula(base30);
  return base30 + dv;
}

export function applyCartorioCns(state: AppState) {
  // Sempre fixo no CNS do cartório (9º Ofício = 163659)
  state.certidao.cartorio_cns = DEFAULT_CNS;
  return DEFAULT_CNS;
}
