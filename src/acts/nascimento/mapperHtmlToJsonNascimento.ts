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
// FUNÇÃO PRINCIPAL: monta JSON CRC
// =======
function montarJson() {
  // ---- CAPTURA (ajuste os seletores conforme seu DOM real) ----
  // Esses seletores são “plugáveis”: se no teu script você já tem funções que capturam,
  // pode substituir só as linhas abaixo por suas variáveis atuais.

  const nome_completo = texto('input[name="nomeCompleto"]') || texto('[data-bind="registro.nome_completo"]') || texto('#nomeCompleto');

  const data_registro = normalizaDataBR(
    texto('input[name="dataRegistro"]') || texto('[data-bind="registro.data_registro"]') || texto('#dataRegistro')
  );

  const data_nascimento_raw = normalizaDataBR(
    texto('input[name="dataNascimento"]') || texto('[data-bind="registro.data_nascimento"]') || texto('#dataNascimento')
  );

  const hora_nascimento_raw = normalizaHoraComHoras(
    texto('input[name="horaNascimento"]') || texto('[data-bind="registro.hora_nascimento"]') || texto('#horaNascimento')
  );

  const municipio_naturalidade =
    texto('input[name="municipioNaturalidade"]') ||
    texto('input[name="naturalidade"]') ||
    texto('[data-bind="registro.municipio_naturalidade"]') ||
    "";

  const uf_naturalidade =
    texto('select[name="ufNaturalidade"]') ||
    texto('[data-bind="registro.uf_naturalidade"]') ||
    "";

  const local_nascimento =
    texto('input[name="localNascimento"]') ||
    texto('[data-bind="registro.local_nascimento"]') ||
    "";

  const municipio_nascimento =
    texto('input[name="municipioNascimento"]') ||
    texto('[data-bind="registro.municipio_nascimento"]') ||
    "";

  const uf_nascimento =
    texto('select[name="ufNascimento"]') ||
    texto('[data-bind="registro.uf_nascimento"]') ||
    "";

  // sexo: se teu DOM dá "M/F", converte pra CRC; se já der "masculino/feminino", mantém
 const sexo_raw =
  (
    (((CONTEXT_DOC as any).querySelector('input[name="sexo"]:checked') as HTMLInputElement | null)?.value) ||
    texto('[data-bind="registro.sexo"]') ||
    ''
  ).toLowerCase();

  let sexo = "ignorado";
  if (sexo_raw === "m" || sexo_raw === "masculino") sexo = "masculino";
  else if (sexo_raw === "f" || sexo_raw === "feminino") sexo = "feminino";
  else if (sexo_raw === "outros") sexo = "outros";
  else if (sexo_raw === "ignorado") sexo = "ignorado";

  const sexo_outros = sexo === "outros"
    ? (texto('input[name="sexoOutros"]') || texto('[data-bind="registro.sexo_outros"]') || "")
    : "";

  // ===== CPF (aqui é a correção que você pediu) =====
  // “quando o cpf for null tu bota oq ele mandar”:
  // - se existir CPF no texto, manda como veio (com máscara)
  // - se não existir, manda exatamente o que vier (geralmente "" ou "NÃO CONSTA")
  // - e corrige cpf_sem_inscricao pra não ficar incoerente
  const cpf_raw =
    texto('input[name="cpf"]') ||
    texto('[data-bind="registro.cpf"]') ||
    texto('#cpf') ||
    ""; // se teu script pega do TJ direto, coloque aqui esse valor

  const cpf_sem_inscricao = isCpfAusente(cpf_raw);
  const cpf = cpf_sem_inscricao ? (cpf_raw || "") : cpf_raw; // mantém máscara quando existir

  // matrícula (usa o que existir; se teu script calcula, substitui aqui pelo teu cálculo)
  const matricula_raw =
    texto('input[name="matricula"]') ||
    texto('[data-bind="registro.matricula"]') ||
    texto('#matricula') ||
    "";

  const matricula = ajustarCNSMatricula(matricula_raw);

  // gemeos (garante contrato: quantidade string e nunca vazia)
  const gemeos_qtd_raw =
    texto('input[name="gemeosQuantidade"]') ||
    texto('[data-bind="registro.gemeos.quantidade"]') ||
    "";

  const gemeos_quantidade = limpa(gemeos_qtd_raw) ? String(limpa(gemeos_qtd_raw)) : "0";

  // se teu script preenche irmãos, substitui aqui; senão, fica coerente com quantidade
  const gemeos_irmao = (gemeos_quantidade === "0")
    ? []
    : []; // você pode montar [{nome, matricula}] se tiver os campos

  // filiacao (se teu script monta, substitui; senão, [] padrão CRC)
  const filiacao = []; // ex.: [{nome, municipio_nascimento, uf_nascimento, avos}]

  // número DNV e averbação/anotação
  const numero_dnv =
    texto('input[name="numeroDNV"]') ||
    texto('[data-bind="registro.numero_dnv"]') ||
    "";

  const averbacao_anotacao =
    texto('textarea[name="observacoes"]') ||
    texto('[data-bind="registro.averbacao_anotacao"]') ||
    "";

  // documentos adicionais
  const anotacoes_cadastro = []; // ex.: [{tipo, documento, orgao_emissor, uf_emissao, data_emissao}]

  // flags de ignorado (se não tiver data/hora)
  const data_nascimento_ignorada = !data_nascimento_raw;
  const data_nascimento = data_nascimento_raw || "";
  const hora_nascimento = hora_nascimento_raw || "";

  // ---- MONTA PAYLOAD CRC EXATO (SOMENTE certidao + registro) ----
  return {
    certidao: {
      plataformaId: "certidao-eletronicA",
      tipo_registro: "nascimento",
      tipo_certidao: "",
      transcricao: true,
      cartorio_cns: "163659",
      selo: "",
      cod_selo: "",
      modalidade: "eletronica",
      cota_emolumentos: "Cota",
      cota_emolumentos_isento: false
    },
    registro: {
      nome_completo: nome_completo,
      cpf_sem_inscricao: cpf_sem_inscricao,
      cpf: cpf,
      matricula: matricula,
      data_registro: data_registro,
      data_nascimento_ignorada: data_nascimento_ignorada,
      data_nascimento: data_nascimento,
      hora_nascimento: hora_nascimento,
      municipio_naturalidade: municipio_naturalidade,
      uf_naturalidade: uf_naturalidade,
      local_nascimento: local_nascimento,
      municipio_nascimento: municipio_nascimento,
      uf_nascimento: uf_nascimento,
      sexo: sexo,
      sexo_outros: sexo_outros,
      gemeos: {
        quantidade: gemeos_quantidade,
        irmao: gemeos_irmao
      },
      filiacao: filiacao,
      numero_dnv: numero_dnv,
      averbacao_anotacao: averbacao_anotacao,
      anotacoes_cadastro: anotacoes_cadastro
    }
  };
}

export function mapperHtmlToJsonNascimento(doc?: DocLike) {
  setContextDoc(doc);
  return montarJson();
}
export const mapperHtmlToJson = mapperHtmlToJsonNascimento;
export default mapperHtmlToJsonNascimento;
