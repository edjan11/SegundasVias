import { normalizeDate } from '../../shared/validators/date';
import { normalizeTime } from '../../shared/validators/time';
import { normalizeCpf, isValidCpf, formatCpf } from '../../shared/validators/cpf';
import { adjustMatricula } from '../../shared/matricula/cnj';

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

function selectedText(root: Root, sel: string): string {
  const el = q(root, sel) as HTMLSelectElement | null;
  const opt = el?.selectedOptions?.[0];
  return (opt?.textContent || '').trim();
}

function checked(root: Root, sel: string): boolean {
  const el = q(root, sel) as any;
  return !!el?.checked;
}

function radio(root: Root, name: string): string {
  const el = (root as any).querySelector(`input[name="${name}"]:checked`) as any;
  return el?.value != null ? String(el.value) : '';
}

/**
 * Regra pedida:
 * - vazio / "NÃO CONSTA" / "SEM CPF" => cpf_sem_inscricao=true e cpf = texto original (ou "")
 * - inválido => mantém o texto original e marca sem inscrição
 * - válido => máscara
 */
function normalizeCpfFields(raw: string): { cpf: string; cpf_sem_inscricao: boolean } {
  const original = String(raw || '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();

  const missing =
    !original ||
    /N[ÃA]O\s*CONSTA/i.test(original) ||
    /SEM\s*CPF/i.test(original) ||
    /SEM\s*INSCRI/i.test(original);

  if (missing) return { cpf: original || '', cpf_sem_inscricao: true };

  const digits = normalizeCpf(original);
  if (!digits || !isValidCpf(digits)) return { cpf: original, cpf_sem_inscricao: true };

  return { cpf: formatCpf(digits), cpf_sem_inscricao: false };
}

function normalizeSexo(raw: string): { sexo: string; sexo_outros?: string } {
  const v = String(raw || '').trim().toLowerCase();

  if (!v) return { sexo: 'ignorado' };
  if (v === 'm' || v === 'masculino') return { sexo: 'masculino' };
  if (v === 'f' || v === 'feminino') return { sexo: 'feminino' };
  if (v === 'ignorado') return { sexo: 'ignorado' };
  if (v === 'outros' || v === 'outro') return { sexo: 'outros' };

  // Se vier “não binário” direto, assume outros e guarda texto
  return { sexo: 'outros', sexo_outros: raw };
}

function normalizeYesNoIgnored(raw: string): 'sim' | 'nao' | 'ignorada' {
  const v = String(raw || '').trim().toLowerCase();
  if (!v) return 'ignorada';
  if (v === 'sim' || v === 's') return 'sim';
  if (v === 'nao' || v === 'não' || v === 'n') return 'nao';
  if (v.includes('ignor')) return 'ignorada';
  return 'ignorada';
}

function buildGenitores(pai: string, mae: string): string {
  const p = pai.trim();
  const m = mae.trim();
  if (!p && !m) return '';
  return `${p};${m}`;
}

function buildAnotacaoRG(root: Root): any | null {
  const documento = val(root, 'input[name="rgFalecido"]');
  if (!documento) return null;

  const orgao = val(root, 'input[name="orgaoExpedidorRG"]') || 'SSP - Secretaria de Segurança Pública';
  const uf = val(root, 'input[name="ufEmissaoRG"]') || val(root, 'select[name="ufEmissaoRG"]') || 'IG';
  const data = normalizeDate(val(root, 'input[name="dataEmissaoRG"]'));

  return {
    tipo: 'RG',
    documento: documento.trim(),
    orgao_emissor: orgao.trim(),
    uf_emissao: uf.trim(),
    data_emissao: data,
  };
}

function buildMatriculaObito(root: Root): string {
  const existing =
    val(root, 'input[name="matricula"]') ||
    (root as any).querySelector('#matricula')?.value ||
    (root as any).querySelector('input[data-bind="registro.matricula"]')?.value ||
    '';
  if (existing) return String(existing).replace(/\D/g, '');

  try {
    const digitsOnly = (v: any) => String(v || '').replace(/\D/g, '');
    const padLeft = (v: any, s: number) => digitsOnly(v).padStart(s, '0').slice(-s);

    // CNS do acervo (matrícula) vem do formulário — pode ser diferente do emissor
    const cns = digitsOnly(
      ((root as any).querySelector('input[name="certidao.cartorio_cns"]') || { value: '' }).value || '163659',
    );

    const dt = ((root as any).querySelector('input[name="dataTermo"]') || { value: '' }).value || '';
    const ano = (String(dt).match(/(\d{4})$/) || [])[1] || '';

    const livro = padLeft(((root as any).getElementById('matricula-livro') || { value: '' }).value, 5);
    const folha = padLeft(((root as any).getElementById('matricula-folha') || { value: '' }).value, 3);
    const termo = padLeft(((root as any).getElementById('matricula-termo') || { value: '' }).value, 7);

    // ÓBITO = tipo 4
    const base30 = `${cns}01` + `55${ano}4${livro}${folha}${termo}`;
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
    const candidate = dv ? base30 + dv : '';

    if (!candidate) return '';

    // Ajuste CNS/ofício pelo texto das observações (acervo)
    const obs = val(root, 'textarea[name="observacoesFalecido"]');
    try {
      return adjustMatricula ? adjustMatricula(candidate, obs) || candidate : candidate;
    } catch {
      return candidate;
    }
  } catch {
    return '';
  }
}

/**
 * Filhos (3 schemas):
 * - NOVO: existencia_filhos_opcao = 'sim' | 'nao' | 'texto' | 'ignorada'
 * - ANTIGO (vai morrer): existencia_filhos_ignorada boolean
 * Aqui sempre saímos no NOVO.
 */
function buildExistenciaFilhos(root: Root): {
  existencia_filhos_opcao?: 'sim' | 'nao' | 'texto' | 'ignorada';
  existencia_filhos?: any;
} {
  // 1) tenta pegar opção nova (se existir)
  const opcRaw =
    val(root, 'select[name="existenciaFilhosOpcao"]') ||
    val(root, 'input[name="existenciaFilhosOpcao"]') ||
    val(root, 'input[name="existencia_filhos_opcao"]');

  const opcNorm = (String(opcRaw || '').trim().toLowerCase() as any) || '';

  // 2) fallback: modelo antigo "existencia_filhos_ignorada" (checkbox)
  const antigaIgnorada =
    (q(root, 'input[name="existencia_filhos_ignorada"]') as any)?.checked ??
    (q(root, 'input[data-bind="registro.existencia_filhos_ignorada"]') as any)?.checked ??
    null;

  let opc: 'sim' | 'nao' | 'texto' | 'ignorada' | '' = '';
  if (opcNorm === 'sim' || opcNorm === 'nao' || opcNorm === 'texto' || opcNorm === 'ignorada') opc = opcNorm;
  else if (antigaIgnorada === true) opc = 'ignorada';

  // 3) se nada definido, tenta inferir: se tem texto/campos de filhos preenchidos → sim ou texto
  const textoFilhos = val(root, 'textarea[name="textoFilhos"]') || val(root, 'input[name="textoFilhos"]');
  if (!opc) {
    if (textoFilhos) opc = 'texto';
    else opc = 'ignorada';
  }

  if (opc === 'texto') {
    return {
      existencia_filhos_opcao: 'texto',
      existencia_filhos: {
        filhos: [{ texto: textoFilhos || '' }],
      },
    };
  }

  if (opc === 'nao') {
    return {
      existencia_filhos_opcao: 'nao',
      existencia_filhos: { quantidade: 0, filhos: [] },
    };
  }

  if (opc === 'sim') {
    // tenta pegar quantidade e uma lista (se o teu formulário tiver campos repetidos)
    const qtdRaw = val(root, 'input[name="quantidadeFilhos"]') || val(root, 'input[name="existenciaFilhosQuantidade"]');
    const quantidade = Number(String(qtdRaw || '').replace(/\D/g, '') || '0');

    // filhos em repetição (ajuste seletores conforme teu HTML real)
    const nomes = Array.from((root as any).querySelectorAll('input[name="filhoNome"]')).map((e: any) => String(e.value || '').trim());
    const idades = Array.from((root as any).querySelectorAll('input[name="filhoIdade"]')).map((e: any) => String(e.value || '').trim());
    const falecidos = Array.from((root as any).querySelectorAll('input[name="filhoFalecido"]')).map((e: any) => !!e.checked);

    const filhos = nomes.map((nome, i) => ({
      nome,
      idade: idades[i] || '',
      falecido: falecidos[i] ?? false,
    })).filter((f) => f.nome || f.idade);

    return {
      existencia_filhos_opcao: 'sim',
      existencia_filhos: {
        quantidade: quantidade || filhos.length || 0,
        filhos,
      },
    };
  }

  // ignorada
  return { existencia_filhos_opcao: 'ignorada', existencia_filhos: { filhos: [] } };
}

export function mapperHtmlToCrcJsonObito(root: Root = document) {
  const plataformaId = val(root, 'input[name="certidao.plataformaId"]') || 'certidao-eletronica';

  // cartório emissor SEMPRE 163659 (padrão CRC teu)
  const cartorioCnsEmissor = '163659';

  const tipo_certidao = ''; // não inventa
  const transcricao = true;
  const modalidade = val(root, 'select[name="certidao.modalidade"]') || 'eletronica';
  const cota_emolumentos = val(root, 'input[name="certidao.cota_emolumentos"]') || 'Cota';
  const cota_emolumentos_isento = false;

  const nome = val(root, 'input[name="nomeFalecido"]');

  const cpfIgn = checked(root, '#cpf-falecido-ign');
  const cpfField = cpfIgn
    ? { cpf: '', cpf_sem_inscricao: true }
    : normalizeCpfFields(val(root, 'input[name="cpfFalecido"]') || val(root, 'input[name="CPFPessoa"]'));

  const matricula = buildMatriculaObito(root);

  const data_falecimento = normalizeDate(val(root, 'input[name="dataObito"]'));
  const data_falecimento_ignorada = !data_falecimento;

  const hora_falecimento_raw = val(root, 'input[name="horaObito"]');
  const hora_falecimento = hora_falecimento_raw ? `${normalizeTime(hora_falecimento_raw)} horas` : '';

  const local_falecimento = val(root, 'input[name="localObito"]');
  const municipio_falecimento = val(root, 'input[name="municipioObito"]');
  const uf_falecimento = val(root, 'select[name="ufMunicipioObito"]') || val(root, 'input[name="ufMunicipioObito"]');

  const sexoRaw = radio(root, 'sexoFalecido');
  const sexoOutrosText = val(root, 'input[name="sexoOutrosFalecido"]');
  const sexoNorm = normalizeSexo(sexoRaw);
  const sexo =
    sexoNorm.sexo === 'outros' && sexoOutrosText
      ? { sexo: 'outros', sexo_outros: sexoOutrosText }
      : sexoNorm;

  const estado_civil = radio(root, 'estadoCivilFalecido') || val(root, 'input[name="estadoCivilFalecido"]');

  const nome_ultimo_conjuge_convivente =
    val(root, 'input[name="nomeUltimoConjuge"]') ||
    val(root, 'input[name="nomeUltimoConjugeConvivente"]');

  const idade = val(root, 'input[name="idadeFalecido"]'); // se teu form tiver
  const data_nascimento = normalizeDate(val(root, 'input[name="dataNascimentoFalecido"]'));
  const municipio_naturalidade = val(root, 'input[name="naturalidadeFalecido"]');
  const uf_naturalidade = val(root, 'input[name="ufNaturalidadeFalecido"]') || val(root, 'select[name="ufNaturalidadeFalecido"]');

  const filiacao = buildGenitores(
    val(root, 'input[name="nomePaiFalecido"]'),
    val(root, 'input[name="nomeMaeFalecido"]'),
  );

  const causa_morte =
    val(root, 'input[name="causaMortis"]') ||
    val(root, 'textarea[name="causaMortis"]');

  const nome_medico = val(root, 'input[name="medico"]');
  const crm_medico = val(root, 'input[name="crmMedico"]');

  const local_sepultamento_cremacao = val(root, 'input[name="localSepultamento"]');
  const municipio_sepultamento_cremacao = val(root, 'input[name="municipioSepultamento"]');
  const uf_sepultamento_cremacao =
    val(root, 'select[name="ufMunicipioSepultamento"]') ||
    val(root, 'input[name="ufMunicipioSepultamento"]');

  const data_registro = normalizeDate(val(root, 'input[name="dataRegistro"]') || val(root, 'input[name="dataTermo"]'));
  const nome_declarante = val(root, 'input[name="informante"]');

  const existencia_bens = normalizeYesNoIgnored(
    val(root, 'select[name="existenciaBens"]') || val(root, 'input[name="existenciaBens"]'),
  );

  const filhosBlock = buildExistenciaFilhos(root);

  const averbacao_anotacao = val(root, 'textarea[name="observacoesFalecido"]');

  const anotacoes_cadastro: any[] = [];
  const rg = buildAnotacaoRG(root);
  if (rg) anotacoes_cadastro.push(rg);

  return {
    certidao: {
      plataformaId,
      tipo_registro: 'obito',
      tipo_certidao,
      transcricao,
      cartorio_cns: cartorioCnsEmissor,
      selo: val(root, 'input[name="certidao.selo"]') || '',
      cod_selo: val(root, 'input[name="certidao.cod_selo"]') || '',
      modalidade,
      cota_emolumentos,
      cota_emolumentos_isento,
    },
    registro: {
      nome_completo: nome,
      cpf_sem_inscricao: cpfField.cpf_sem_inscricao,
      cpf: cpfField.cpf,

      matricula,

      data_falecimento_ignorada,
      data_falecimento,
      hora_falecimento,

      local_falecimento,
      municipio_falecimento,
      uf_falecimento,

      ...sexo,

      estado_civil,
      nome_ultimo_conjuge_convivente,

      idade,
      data_nascimento,
      municipio_naturalidade,
      uf_naturalidade,

      filiacao,

      causa_morte,
      nome_medico,
      crm_medico,

      local_sepultamento_cremacao,
      municipio_sepultamento_cremacao,
      uf_sepultamento_cremacao,

      data_registro,
      nome_declarante,

      existencia_bens,

      ...filhosBlock,

      averbacao_anotacao,
      anotacoes_cadastro,
    },
  };
}

// Expose mapper (drop-in)
try {
  const win = window || globalThis;
  (win as any).App = (win as any).App || {};
  (win as any).App.mapperHtmlToJson = (win as any).App.mapperHtmlToJson || mapperHtmlToCrcJsonObito;
} catch {
  // noop
}

export const mapperHtmlToJson = mapperHtmlToCrcJsonObito;
export default mapperHtmlToCrcJsonObito;
