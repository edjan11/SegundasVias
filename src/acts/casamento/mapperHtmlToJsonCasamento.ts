import { normalizeDate } from '../../shared/validators/date';
import { normalizeCpf, isValidCpf, formatCpf } from '../../shared/validators/cpf';

type Root = Document | HTMLElement;

function q(root: Root, sel: string): Element | null {
  return (root as any).querySelector(sel);
}

function val(root: Root, sel: string): string {
  const el = q(root, sel) as any;
  if (!el) return '';
  const v = el.value != null ? el.value : el.textContent;
  return String(v || '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
}

function checked(root: Root, sel: string): boolean {
  const el = q(root, sel) as any;
  return !!el?.checked;
}

function selectedText(root: Root, sel: string): string {
  const el = q(root, sel) as HTMLSelectElement | null;
  const opt = el?.selectedOptions?.[0];
  return (opt?.textContent || '').trim();
}

function buildGenitores(pai: string, mae: string): string {
  const p = pai.trim();
  const m = mae.trim();
  if (!p && !m) return '';
  // Obrigatório um espaço após o ponto-e-vírgula
  return `${p}; ${m}`;
}

/**
 * Regra pedida por você:
 * - se CPF vazio/"NÃO CONSTA"/"SEM CPF"/etc => cpf_sem_inscricao = true e cpf = texto original (ou "")
 * - se CPF inválido => mantém texto original e marca sem inscrição (não perde o que veio)
 * - se CPF válido => formata com máscara
 */
function normalizeCpfFields(raw: string): { cpf: string; cpf_sem_inscricao: boolean } {
  const original = String(raw || '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();

  const missing =
    !original ||
    /N[ÃA]O\s*CONSTA/i.test(original) ||
    /SEM\s*CPF/i.test(original) ||
    /SEM\s*INSCRI/i.test(original);

  // Regra: se ausente -> cpf_sem_inscricao=true e cpf = "" (não manter texto como "NÃO CONSTA")
  if (missing) return { cpf: '', cpf_sem_inscricao: true };

  const digits = normalizeCpf(original);
  // Se não for CPF válido, trata como ausente (não inferir nem manter texto)
  if (!digits || !isValidCpf(digits)) return { cpf: '', cpf_sem_inscricao: true };

  return { cpf: formatCpf(digits), cpf_sem_inscricao: false };
}

function buildDocItemRG(root: Root, prefix: 'Noivo' | 'Noiva') {
  const numero = val(root, `input[name="numeroRG${prefix}"]`);
  if (!numero) return null;

  const orgao = selectedText(root, `select[name="idOrgaoExpedidorRG${prefix}"]`) ||
               val(root, `input[name="orgaoExpedidorRG${prefix}"]`);

  const data = normalizeDate(val(root, `input[name="dataExpedicaoRG${prefix}"]`));

  // UF do emissor: no teu mapper “migração” você estava mandando IG.
  // No CRC, o exemplo usa "SP". Se você tiver um select/campo, preencha aqui.
  const uf = val(root, `select[name="ufEmissaoRG${prefix}"]`) || val(root, `input[name="ufEmissaoRG${prefix}"]`);

  return {
    tipo: 'RG',
    documento: numero.trim(),
    orgao_emissor: orgao.trim(),
    uf_emissao: (uf || 'IG').trim(),
    data_emissao: data,
  };
}

/**
 * Mesma lógica de matrícula que você já tinha no mapper dump:
 * base30 = CNS + 01 + 55 + ano + tipoAto(2/3) + livro(5) + folha(3) + termo(7)
 * dv pelo módulo 11 CNJ
 */
function buildMatriculaCasamento(root: Root): string {
  const existing =
    val(root, 'input[name="matricula"]') ||
    (root as any).querySelector('#matricula')?.value ||
    (root as any).querySelector('input[data-bind="registro.matricula"]')?.value ||
    '';
  if (existing) return String(existing).replace(/\D/g, '');

  try {
    const digitsOnly = (v: any) => String(v || '').replace(/\D/g, '');
    const padLeft = (v: any, s: number) => digitsOnly(v).padStart(s, '0').slice(-s);

    // CNS usado na matrícula pode ser diferente do cartório emissor (acervo), então aqui usamos o input do formulário
    const cns = digitsOnly(
      ((root as any).querySelector('input[name="certidao.cartorio_cns"]') || { value: '' }).value || '110742',
    );

    const dt = ((root as any).querySelector('input[name="dataTermo"]') || { value: '' }).value || '';
    const ano = (String(dt).match(/(\d{4})$/) || [])[1] || '';

    const tipo = ((root as any).querySelector('select[name="tipoCasamento"]') || { value: '' }).value || '';
    const tipoDigit = String(tipo || '').replace(/\D/g, '').slice(0, 1);
    const tipoAto = tipoDigit === '3' ? '3' : '2';

    const livro = padLeft(((root as any).getElementById('matricula-livro') || { value: '' }).value, 5);
    const folha = padLeft(((root as any).getElementById('matricula-folha') || { value: '' }).value, 3);
    const termo = padLeft(((root as any).getElementById('matricula-termo') || { value: '' }).value, 7);

    const base30 = `${cns}01` + `55${ano}${tipoAto}${livro}${folha}${termo}`;
    if (!base30 || base30.length !== 30) return '';

    const calcDv = (base: string) => {
      let s1 = 0;
      for (let i = 0; i < 30; i++) s1 += Number(base[i]) * (31 - i);
      let d1: any = 11 - (s1 % 11);
      d1 = d1 === 11 ? 0 : d1 === 10 ? 1 : d1;

      const seq31 = base + String(d1);
      let s2 = 0;
      for (let i = 0; i < 31; i++) s2 += Number(seq31[i]) * (32 - i);
      let d2: any = 11 - (s2 % 11);
      d2 = d2 === 11 ? 0 : d2 === 10 ? 1 : d2;

      return `${d1}${d2}`;
    };

    const dv = calcDv(base30);
    return dv ? base30 + dv : '';
  } catch {
    return '';
  }
}

export function mapperHtmlToCrcJson(root: Root = document) {
  // defaults CRC
  const plataformaId = val(root, 'input[name="certidao.plataformaId"]') || 'certidao-eletronica';

  // transcrição DEVE ser sempre false (regra CRC)
  const transcricao = false;

  // cartorio_cns: deve ser o CNS do acervo = primeiros 6 dígitos da matrícula quando disponível
  const explicitCartorioCns = String(val(root, 'input[name="certidao.cartorio_cns"]') || '').replace(/\D+/g, '');
  // não usar o CNS da plataforma quando for diferente; preferir extrair da matrícula
  // matricula pode vir já gerada ou será gerada mais abaixo
  // por ora, inicializamos com empty; será substituído depois se possível
  let cartorioCnsEmissor = explicitCartorioCns || '';


  const tipo_certidao = ''; // não inventa
  const modalidade = val(root, 'select[name="certidao.modalidade"]') || 'eletronica';
  const cota_emolumentos = val(root, 'input[name="certidao.cota_emolumentos"]') || 'Cota';

  const averbacao_anotacao =
    val(root, 'textarea[name="observacoes"]') ||
    val(root, 'textarea[name="observacao"]') ||
    '';

  // Conjuge 1 (Noivo)
  const cpf1 = normalizeCpfFields(val(root, 'input[name="CPFNoivo"]') || val(root, 'input[name="cpfNoivo"]'));
  const rg1 = buildDocItemRG(root, 'Noivo');

  const conjuge1 = {
    nome_atual_habilitacao: val(root, 'input[name="nomeSolteiro"]') || '',
    cpf_sem_inscricao: cpf1.cpf_sem_inscricao,
    cpf: cpf1.cpf,
    novo_nome: val(root, 'input[name="nomeSolteiro"]') || '',
    // REMOVIDO: nome_apos_casamento (proibido)
    data_nascimento: normalizeDate(val(root, 'input[name="dataNascimentoNoivo"]')) || '',
    nacionalidade: val(root, 'input[name="nacionalidadeNoivo"]') || '',
    estado_civil: selectedText(root, 'select[name="estadoCivilNoivo"]') || val(root, 'select[name="estadoCivilNoivo"]') || '',
    municipio_naturalidade: val(root, 'input[name="cidadeNascimentoNoivo"]') || '',
    uf_naturalidade: val(root, 'input[name="ufNascimentoNoivo"]') || '',
    genitores: buildGenitores(val(root, 'input[name="nomePaiNoivo"]'), val(root, 'input[name="nomeMaeNoivo"]')),
  };

  // Conjuge 2 (Noiva)
  const cpf2 = normalizeCpfFields(val(root, 'input[name="CPFNoiva"]') || val(root, 'input[name="cpfNoiva"]'));
  const rg2 = buildDocItemRG(root, 'Noiva');

  const conjuge2 = {
    nome_atual_habilitacao: val(root, 'input[name="nomeSolteira"]') || '',
    cpf_sem_inscricao: cpf2.cpf_sem_inscricao,
    cpf: cpf2.cpf,
    novo_nome: val(root, 'input[name="nomeSolteira"]') || '',
    // REMOVIDO: nome_apos_casamento (proibido)
    data_nascimento: normalizeDate(val(root, 'input[name="dataNascimentoNoiva"]')) || '',
    nacionalidade: val(root, 'input[name="nacionalidadeNoiva"]') || '',
    estado_civil: selectedText(root, 'select[name="estadoCivilNoiva"]') || val(root, 'select[name="estadoCivilNoiva"]') || '',
    municipio_naturalidade: val(root, 'input[name="cidadeNascimentoNoiva"]') || '',
    uf_naturalidade: val(root, 'input[name="ufNascimentoNoiva"]') || '',
    genitores: buildGenitores(val(root, 'input[name="nomePaiNoiva"]'), val(root, 'input[name="nomeMaeNoiva"]')),
  };

  // docs adicionais
  const anotacoes_cadastro = {
    primeiro_conjuge: [] as any[],
    segundo_conjuge: [] as any[],
  };
  if (rg1) anotacoes_cadastro.primeiro_conjuge.push(rg1);
  if (rg2) anotacoes_cadastro.segundo_conjuge.push(rg2);

  // matrícula
  const matricula = buildMatriculaCasamento(root);

  // if matricula has first 6 digits, use them as cartorio_cns (CNS do acervo)
  if (matricula && matricula.length >= 6) {
    cartorioCnsEmissor = matricula.slice(0, 6);
  }

  // datas principais
  const data_celebracao = normalizeDate(val(root, 'input[name="dataCasamento"]'));
  const data_registro = normalizeDate(val(root, 'input[name="dataTermo"]') || val(root, 'input[name="dataRegistro"]'));

  // regime
  const regime_bens =
    selectedText(root, 'select[name="regimeBens"]') ||
    val(root, 'select[name="regimeBens"]');

  // selo / cod selo (se você quiser extrair da observação como no outro mapper, me diz o padrão do texto)
  const selo = val(root, 'input[name="certidao.selo"]') || '';
  const cod_selo = val(root, 'input[name="certidao.cod_selo"]') || '';

  return {
    certidao: {
      plataformaId,
      tipo_registro: 'casamento',
      tipo_certidao,
      transcricao,
      // JSON deve manter CNS fixo
      cartorio_cns: '110742',
      selo,
      cod_selo,
      modalidade,
      cota_emolumentos,
      cota_emolumentos_isento: false,
    },
    registro: {
      conjuges: [conjuge1, conjuge2],
      matricula,
      data_celebracao,
      regime_bens,
      data_registro,
      averbacao_anotacao,
      anotacoes_cadastro,
    },
  };
}

// Expose mapper in a safe way (compatible with older code that imports default or uses window.App.mapperHtmlToJson)
try {
  const win = window || globalThis;
  (win as any).App = (win as any).App || {};
  (win as any).App.mapperHtmlToJson = (win as any).App.mapperHtmlToJson || mapperHtmlToCrcJson;
} catch (e) {
  // noop
}

export const mapperHtmlToJson = mapperHtmlToCrcJson;
export default mapperHtmlToCrcJson;
