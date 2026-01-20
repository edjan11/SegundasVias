// =========================
// CRC PAYLOAD (NASCIMENTO)
// =========================

// normaliza texto sem destruir acentos
function limpa(v) {
  return String(v == null ? "" : v).replace(/\s+/g, " ").trim();
}

// mantém só números (quando você realmente quiser)
function somenteNumeros(v) {
  return String(v == null ? "" : v).replace(/\D+/g, "");
}

type DocLike = Document | HTMLElement | null;
let CONTEXT_DOC: DocLike = document;
function setContextDoc(d?: DocLike) {
  CONTEXT_DOC = d || document;
}
// tenta achar um texto no DOM por seletor e retorna string limpa
function texto(sel) {
  const el = (CONTEXT_DOC as any).querySelector(sel);
  if (!el) return "";
  // pega value se existir, senão innerText
  return limpa((el as any).value != null ? (el as any).value : (el as any).innerText || '');
}

// data no formato DD/MM/AAAA (não inventa)
function normalizaDataBR(v) {
  const s = limpa(v);
  // já tá ok
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  return s; // se vier diferente, não quebra: devolve como está
}

// hora no formato "HH:MM horas" (igual manual)
function normalizaHoraComHoras(v) {
  const s = limpa(v);
  if (!s) return "";
  const m = s.match(/(\d{1,2})\s*:\s*(\d{2})/);
  if (!m) return "";
  const hh = String(m[1]).padStart(2, "0");
  const mm = String(m[2]);
  return `${hh}:${mm} horas`;
}

// detecta CPF ausente/sem inscrição no texto do TJ
function isCpfAusente(raw) {
  const s = limpa(raw);
  if (!s) return true;
  if (/N[ÃA]O\s*CONSTA/i.test(s)) return true;
  if (/SEM\s*CPF/i.test(s)) return true;
  if (/SEM\s*INSCRI/i.test(s)) return true;
  return false;
}

// se você tiver um ajuste de CNS/matrícula, encaixe aqui (se não tiver, deixa como identity)
function ajustarCNSMatricula(matricula) {
  return limpa(matricula);
}

// =======
// FUNÇÃO PRINCIPAL: monta JSON CRC (normalizado para NascimentoJson)
// =======

const CARTORIO_EMISSOR_CNS = "163659";
const PLATAFORMA_ID = "certidao-eletronica";
const TIPO_CERTIDAO_PADRAO = "Breve relato";

function onlyDigits(v: any): string {
  return String(v || "").replace(/\D+/g, '');
}
function normUpper(v: any): string {
  return String(v || '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
}
function normHoraHHMM(v: any): string {
  const s = String(v || '').trim();
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (!m) return '';
  const hh = String(m[1]).padStart(2, '0');
  const mm = String(m[2]);
  return `${hh}:${mm}`;
}
function fallbackNaoConsta(v: any): string {
  const t = normUpper(v);
  return t ? t : 'NÃO CONSTA';
}

function montarJson() {
  // Captura bruta
  const nome_raw = texto('input[name="nomeCompleto"]') || texto('[data-bind="registro.nome_completo"]') || texto('#nomeCompleto');
  const data_registro = normalizaDataBR(texto('input[name="dataRegistro"]') || texto('[data-bind="registro.data_registro"]') || texto('#dataRegistro')) || '';

  const data_nascimento = normalizaDataBR(texto('input[name="dataNascimento"]') || texto('[data-bind="registro.data_nascimento"]') || texto('#dataNascimento')) || '';
  const data_nascimento_ignorada = !data_nascimento;

  const hora_raw = texto('input[name="horaNascimento"]') || texto('[data-bind="registro.hora_nascimento"]') || texto('#horaNascimento') || '';
  const hora_nascimento = normHoraHHMM(hora_raw);
  const hora_nascimento_ignorada = !hora_nascimento;

  const municipio_naturalidade_raw = texto('input[name="municipioNaturalidade"]') || texto('input[name="naturalidade"]') || texto('[data-bind="registro.municipio_naturalidade"]') || '';
  const municipio_nascimento_raw = texto('input[name="municipioNascimento"]') || texto('[data-bind="registro.municipio_nascimento"]') || '';

  const uf_naturalidade_raw = texto('select[name="ufNaturalidade"]') || texto('[data-bind="registro.uf_naturalidade"]') || '';
  const uf_nascimento_raw = texto('select[name="ufNascimento"]') || texto('[data-bind="registro.uf_nascimento"]') || '';

  const local_nascimento_raw = texto('input[name="localNascimento"]') || texto('[data-bind="registro.local_nascimento"]') || '';

  // sexo
  const sexo_raw = (((CONTEXT_DOC as any).querySelector('input[name="sexo"]:checked') as HTMLInputElement | null)?.value) || texto('[data-bind="registro.sexo"]') || '';
  const sexo_lower = String(sexo_raw || '').trim().toLowerCase();
  let sexo: string = '';
  if (sexo_lower === 'm' || sexo_lower === 'masculino') sexo = 'masculino';
  else if (sexo_lower === 'f' || sexo_lower === 'feminino') sexo = 'feminino';
  else if (sexo_lower === 'outros' || sexo_lower === 'outro') sexo = 'outros';
  else if (sexo_lower === 'ignorado') sexo = 'ignorado';
  else sexo = sexo_lower ? sexo_lower : '';

  const sexo_outros = sexo === 'outros' ? (texto('input[name="sexoOutros"]') || texto('[data-bind="registro.sexo_outros"]') || '') : '';

  // CPF
  const cpf_raw = texto('input[name="cpf"]') || texto('[data-bind="registro.cpf"]') || texto('#cpf') || '';
  const cpf_sem_inscricao = isCpfAusente(cpf_raw);
  const cpf = cpf_sem_inscricao ? '' : onlyDigits(cpf_raw);

  // matrícula
  const matricula_raw = texto('input[name="matricula"]') || texto('[data-bind="registro.matricula"]') || texto('#matricula') || '';
  const matricula = onlyDigits(ajustarCNSMatricula(matricula_raw));

  // gêmeos
  const gemeos_qtd_raw = texto('input[name="gemeosQuantidade"]') || texto('[data-bind="registro.gemeos.quantidade"]') || '';
  const gemeos_quantidade = limpa(gemeos_qtd_raw) ? String(limpa(gemeos_qtd_raw)) : '0';

  // tenta coletar irmãos se existirem campos repetidos
  let gemeos_irmao: Array<{ nome: string; matricula: string }> = [];
  if (gemeos_quantidade !== '0') {
    const nomes = Array.from((CONTEXT_DOC as Document).querySelectorAll('input[name="gemeoNome"], input[name="gemeosNome[]"], input[name="gemeosNome"]')).map((e: any) => String(e.value || '').trim()).filter(Boolean);
    const mat = Array.from((CONTEXT_DOC as Document).querySelectorAll('input[name="gemeoMatricula"], input[name="gemeosMatricula[]"], input[name="gemeosMatricula"]')).map((e: any) => onlyDigits(e.value || ''));
    gemeos_irmao = nomes.map((n, i) => ({ nome: normUpper(n), matricula: mat[i] || '' })).filter(g => g.nome || g.matricula);
  }

  // filiação
  let filiacao: Array<any> = [];
  const nomesF = Array.from((CONTEXT_DOC as Document).querySelectorAll('input[name="filiacaoNome"], input[name="filiacaoNome[]"], input[name^="filiacao"]')).map((e: any) => String(e.value || '').trim()).filter(Boolean);
  if (nomesF.length) {
    filiacao = nomesF.map((n, i) => ({
      nome: normUpper(n),
      municipio_nascimento: normUpper(((CONTEXT_DOC as Document).querySelectorAll('input[name="filiacaoMunicipio"], input[name^="filiacaoMunicipio"]')[i] as any)?.value || ''),
      uf_nascimento: ((CONTEXT_DOC as Document).querySelectorAll('input[name="filiacaoUf"], select[name^="filiacaoUf"]')[i] as any)?.value || '',
      avos: normUpper(((CONTEXT_DOC as Document).querySelectorAll('input[name="filiacaoAvos"], input[name^="filiacaoAvos"]')[i] as any)?.value || ''),
    })).filter(Boolean);
  }

  const numero_dnv = fallbackNaoConsta(texto('input[name="numeroDNV"]') || texto('[data-bind="registro.numero_dnv"]') || '');
  const averbacao_anotacao = (texto('textarea[name="observacoes"]') || texto('[data-bind="registro.averbacao_anotacao"]') || '');

  // monta final no formato pedido
  return {
    certidao: {
      plataformaId: PLATAFORMA_ID,
      tipo_registro: 'nascimento',
      tipo_certidao: texto('input[name="tipoCertidao"]') || TIPO_CERTIDAO_PADRAO,
      transcricao: true,
      cartorio_cns: CARTORIO_EMISSOR_CNS,
      selo: texto('input[name="certidao.selo"]') || '',
      cod_selo: texto('input[name="certidao.cod_selo"]') || '',
      modalidade: (texto('select[name="certidao.modalidade"]') || 'eletronica') as 'eletronica' | 'fisica',
      cota_emolumentos: texto('input[name="certidao.cota_emolumentos"]') || '',
      cota_emolumentos_isento: !!(CONTEXT_DOC as any).querySelector('input[name="certidao.cota_emolumentos_isento"]')?.checked,
    },
    registro: {
      nome_completo: normUpper(nome_raw),
      cpf_sem_inscricao: !!cpf_sem_inscricao,
      cpf: cpf,
      matricula: matricula,
      data_registro: data_registro,
      data_nascimento_ignorada: !!data_nascimento_ignorada,
      data_nascimento: data_nascimento,
      hora_nascimento_ignorada: !!hora_nascimento_ignorada,
      hora_nascimento: hora_nascimento,
      municipio_naturalidade: normUpper(municipio_naturalidade_raw),
      uf_naturalidade: normUpper(uf_naturalidade_raw),
      local_nascimento: normUpper(local_nascimento_raw),
      municipio_nascimento: normUpper(municipio_nascimento_raw),
      uf_nascimento: normUpper(uf_nascimento_raw),
      sexo: sexo as any,
      gemeos: {
        quantidade: gemeos_quantidade,
        irmao: gemeos_irmao,
      },
      filiacao: filiacao,
      numero_dnv: numero_dnv,
      averbacao_anotacao: averbacao_anotacao,
      anotacoes_cadastro: [],
    },
  };
}

export function mapperHtmlToJsonNascimento(doc?: DocLike) {
  setContextDoc(doc);
  return montarJson();
}
export const mapperHtmlToJson = mapperHtmlToJsonNascimento;
export default mapperHtmlToJsonNascimento;
