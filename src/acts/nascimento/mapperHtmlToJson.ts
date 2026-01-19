
import { normalizeDate } from '../../shared/validators/date';
import { normalizeCpf } from '../../shared/validators/cpf';

/**
 * Extrai os dados do formulário de nascimento para um objeto JSON padronizado.
 * @param {Document|HTMLElement} doc
 * @returns {any}
 */
export function mapperHtmlToJson(doc) {
  const get = (sel) => (doc as any).querySelector(sel)?.value || '';
  const getText = (sel) => (doc as any).querySelector(sel)?.textContent || '';
  const getChecked = (sel) => !!(doc as any).querySelector(sel)?.checked;
  const getRadio = (name) => {
    const el = (doc as any).querySelector(`input[name="${name}"]:checked`);
    return el ? (el as any).value : '';
  };
  const getSelect = (sel) => {
    const el = (doc as any).querySelector(sel);
    return el ? (el as any).value : '';
  };
  const getAll = (sel) => Array.from((doc as any).querySelectorAll(sel)).map((el) => (el as any).value || '');

  return {
    registro: {
      nome_completo: get('input[name="nomeCompleto"]'),
      sexo: getRadio('sexo'),
      data_nascimento: normalizeDate(get('input[name="dataNascimento"]')),
      data_registro: normalizeDate(get('input[name="dataRegistro"]')),
      naturalidade: get('input[name="naturalidade"]'),
      nacionalidade: get('input[name="nacionalidade"]'),
      filiacao: get('input[name="filiacao"]'),
      cpf: normalizeCpf(get('input[name="cpf"]')),
      numero_dnv: get('input[name="numeroDNV"]'),
      livro: get('input[name="livro"]'),
      folha: get('input[name="folha"]'),
      termo: get('input[name="termo"]'),
      matricula: get('input[name="matricula"]'),
    },
    certidao: {
      cartorio_cns: get('input[name="certidao.cartorio_cns"]'),
      municipio_cartorio: get('input[name="municipioCartorio"]'),
      uf_cartorio: getSelect('select[name="ufCartorio"]'),
      data_emissao: normalizeDate(get('input[name="dataEmissao"]')),
      via: get('input[name="via"]'),
      solicitante: get('input[name="solicitante"]'),
      cpf_solicitante: normalizeCpf(get('input[name="cpfSolicitante"]')),
      observacoes: get('textarea[name="observacoes"]'),
    },
  };
}
