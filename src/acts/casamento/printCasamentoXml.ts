type CasamentoJson = {
  certidao?: {
    cartorio_cns?: string;
    plataformaId?: string;
    tipo_registro?: string;
    tipo_certidao?: string;
    transcricao?: boolean;
    selo?: string;
    cod_selo?: string;
    modalidade?: string;
    cota_emolumentos?: string;
    cota_emolumentos_isento?: boolean;
  };
  registro: {
    conjuges?: Array<{
      nome_atual_habilitacao?: string;
      cpf_sem_inscricao?: boolean;
      cpf?: string;
      novo_nome?: string;
      data_nascimento?: string;
      nacionalidade?: string;
      estado_civil?: string;
      municipio_naturalidade?: string;
      uf_naturalidade?: string;
      genitores?: string; // "PAI; MAE"
    }>;
    matricula?: string;
    data_celebracao?: string;
    regime_bens?: string;
    tipo_casamento?: string;
    data_registro?: string;
    averbacao_anotacao?: string;
    anotacoes_cadastro?: {
      primeiro_conjuge?: any[];
      segundo_conjuge?: any[];
    };
  };
};

type BuildResult = { xml: string; warnings: string[] };

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function onlyDigits(v?: string | number | null): string {
  if (v === undefined || v === null) return "";
  return String(v).replace(/\D+/g, "");
}

function normalizeSpaces(v: string): string {
  return v.replace(/\s+/g, " ").trim();
}

function normalizeNameUpper(v?: string): string {
  const s = normalizeSpaces(String(v || ""));
  return s ? s.toUpperCase() : "";
}

function isUF(v?: string): boolean {
  const s = normalizeSpaces(String(v || "")).toUpperCase();
  return /^[A-Z]{2}$/.test(s);
}

function normalizeDateBR(input?: string): string {
  const v = normalizeSpaces(String(input || ""));
  if (!v) return "";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return v;

  const m1 = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m1) return `${m1[3]}/${m1[2]}/${m1[1]}`;

  const m2 = v.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m2) return `${m2[1]}/${m2[2]}/${m2[3]}`;

  // não inventa se não reconhecer
  return "";
}

function stripLeftZeros(v: string): string {
  const s = onlyDigits(v);
  const out = s.replace(/^0+/, "");
  return out === "" ? "0" : out;
}

function inferSexo(nacionalidade?: string): "M" | "F" | "" {
  const v = normalizeSpaces(String(nacionalidade || "")).toUpperCase();
  if (!v) return "";
  // padrão observado: BRASILEIRO -> M, BRASILEIRA -> F
  if (v.endsWith("A")) return "F";
  return "M";
}

function splitGenitores(raw?: string): { pai: string; mae: string } {
  const v = String(raw || "").trim();
  if (!v) return { pai: "", mae: "" };
  const parts = v.split(";").map(s => normalizeSpaces(s)).filter(Boolean);
  return { pai: parts[0] || "", mae: parts[1] || "" };
}

function mapEstadoCivilToCode(estadoCivil?: string): string {
  const v = normalizeSpaces(String(estadoCivil || "")).toLowerCase();
  if (!v) return "";
  if (v.includes("solteir")) return "1";
  if (v.includes("casad")) return "2";
  if (v.includes("divorc")) return "3";
  if (v.includes("viuv") || v.includes("viúv")) return "4";
  if (v.includes("separ")) return "5";
  return "";
}

function normalizeRegimeBens(regime?: string): { descricao: string; codigo: string } {
  const raw = normalizeSpaces(String(regime || ""));
  const v = raw.toLowerCase();
  if (!v) return { descricao: "", codigo: "" };

  if (v.includes("parcial")) return { descricao: "Comunhão parcial de bens", codigo: "P" };
  if (v.includes("universal")) return { descricao: "Comunhão universal de bens", codigo: "U" };
  if (v.includes("separa")) return { descricao: "Separação de bens", codigo: "S" };
  if (v.includes("participa")) return { descricao: "Participação final nos aquestos", codigo: "A" };

  // se não reconhece, só devolve a descrição (sem código) e NÃO sobrescreve pc_321
  return { descricao: raw, codigo: "" };
}

function normalizeTipoCasamentoText(raw?: string): string {
  return String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function mapTipoCasamento(raw?: string): string {
  const v = normalizeTipoCasamentoText(raw);
  if (!v) return '';
  if (v === '2' || v === '3') return v;
  if (v === 'B') return '2';
  if (v.startsWith('B') && v.includes('AUX')) return '3';
  if (v.includes('CIVIL')) return '2';
  if (v.includes('RELIGIOS')) return '3';
  return '';
}

function inferTipoCasamentoFromMatricula(matricula?: string): string {
  const digits = onlyDigits(matricula);
  if (digits.length < 15) return '';
  const tipo = digits.charAt(14);
  return tipo === '2' || tipo === '3' ? tipo : '';
}

function extractLivroFolhaTermoFromMatricula(matricula?: string): { livro: string; folha: string; termo: string } {
  const m = onlyDigits(matricula);
  if (m.length < 30) return { livro: "", folha: "", termo: "" };

  // baseado no padrão observado nos seus XMLs antigos (confere com seus arquivos)
  const livro = stripLeftZeros(m.slice(15, 20));
  const folha = stripLeftZeros(m.slice(20, 23));
  const termo = stripLeftZeros(m.slice(23, 30));

  // validações simples de plausibilidade
  if (!/^\d+$/.test(livro) || !/^\d+$/.test(folha) || !/^\d+$/.test(termo)) {
    return { livro: "", folha: "", termo: "" };
  }
  return { livro, folha, termo };
}

function hasTag(xml: string, tag: string): boolean {
  const re = new RegExp(`<${tag}(?=\\s|/|>)`, "g");
  return re.test(xml);
}

function setTag(
  xml: string,
  tag: string,
  value?: string,
  occurrence = 1,
  forceEmpty = false,
  warnings?: string[],
): string {
  if (value === undefined || value === null) return xml;

  const raw = String(value);
  const safe = escapeXml(raw);

  // regra: não sobrescreve com vazio, a não ser que forceEmpty seja true
  if (!safe && !forceEmpty) return xml;

  const re = new RegExp(
    `(<${tag}(?=\\s|/|>)[^>]*>)([\\s\\S]*?)(</${tag}>)|(<${tag}(?=\\s|/|>)[^>]*\\/>)`,
    "g",
  );

  let idx = 0;
  let replaced = false;

  const out = xml.replace(re, (match, open, _inner, close, selfClosing) => {
    idx += 1;
    if (idx !== occurrence) return match;
    replaced = true;

    if (selfClosing) {
      // transforma <tag/> em <tag>value</tag> se tiver value
      if (!safe && !forceEmpty) return match;
      const openTag = selfClosing.replace(/\/>?$/, ">");
      return `${openTag}${safe}</${tag}>`;
    }
    return `${open}${safe}${close}`;
  });

  if (!replaced && warnings) warnings.push(`TAG_NAO_ENCONTRADA: <${tag}> (occ=${occurrence})`);
  return out;
}

function setTagInSection(
  xml: string,
  sectionTag: string,
  tag: string,
  value?: string,
  occurrence = 1,
  forceEmpty = false,
  warnings?: string[],
): string {
  if (value === undefined || value === null) return xml;

  const reSection = new RegExp(`(<${sectionTag}(?=\\s|/|>)[^>]*>)([\\s\\S]*?)(</${sectionTag}>)`, "g");
  let sectionIdx = 0;
  let replaced = false;

  const out = xml.replace(reSection, (sectionMatch, open, inner, close) => {
    sectionIdx += 1;
    if (sectionIdx !== 1) return sectionMatch;

    const before = inner;
    const after = setTag(before, tag, value, occurrence, forceEmpty, warnings);

    if (before !== after) replaced = true;
    return `${open}${after}${close}`;
  });

  if (!replaced && warnings) warnings.push(`SECAO_OU_TAG_NAO_ENCONTRADA: <${sectionTag}>/<${tag}>`);
  return out;
}

function cpfDigitsIfValid(cpf?: string, cpfSemInscricao?: boolean): string {
  if (cpfSemInscricao === true) return "";
  const d = onlyDigits(cpf);
  return d.length === 11 ? d : "";
}

export function buildCasamentoXmlFromJson(templateXml: string, data: CasamentoJson): BuildResult {
  const warnings: string[] = [];
  let xml = templateXml;

  const r = data?.registro ?? ({} as CasamentoJson["registro"]);
  const conj = Array.isArray(r.conjuges) ? r.conjuges : [];
  const c1 = conj[0] || {};
  const c2 = conj[1] || {};

  // pc_004: CNS do acervo no XML do casamento.
  // Regra:
  // 1) usar os 6 primeiros dígitos da matrícula, quando ela estiver válida (>=30 dígitos);
  // 2) fallback para certidao.cartorio_cns (CNS interno/emissor).
  const matriculaDigits = onlyDigits(r.matricula);
  const matricula6 = matriculaDigits.length >= 30 ? matriculaDigits.slice(0, 6) : "";
  const cnsCertidao = onlyDigits(data?.certidao?.cartorio_cns).slice(0, 6);
  const cns = matricula6 || cnsCertidao;

  if (matriculaDigits && matriculaDigits.length < 30) {
    warnings.push(`MATRICULA_INCOMPLETA: ${matriculaDigits} (pc_004 caiu para fallback do certidao.cartorio_cns)`);
  }
  if (matricula6 && cnsCertidao && matricula6 !== cnsCertidao) {
    warnings.push(`CNS_DIVERGENTE: pc_004=${matricula6} (acervo pela matrícula) vs certidao.cartorio_cns=${cnsCertidao}`);
  }

  if (cns) xml = setTag(xml, "pc_004", cns, 1, true, warnings);
  else warnings.push("FALTANTE: não foi possível determinar pc_004 (matrícula e certidao.cartorio_cns ausentes)");

  // pc_006: anotações/averbações (pode ser vazio)
  if (r.averbacao_anotacao !== undefined) {
    xml = setTag(xml, "pc_006", normalizeSpaces(String(r.averbacao_anotacao || "")), 1, true, warnings);
  }

  // ===== Contraente 1 =====
  const nome1 = normalizeNameUpper(c1.nome_atual_habilitacao);
  if (nome1) xml = setTag(xml, "pc_101", nome1, 1, true, warnings);

  const sexo1 = inferSexo(c1.nacionalidade);
  if (sexo1) xml = setTag(xml, "pc_102", sexo1, 1, true, warnings);

  const ec1 = mapEstadoCivilToCode(c1.estado_civil);
  if (ec1) xml = setTag(xml, "pc_104", ec1, 1, true, warnings);

  const mun1 = normalizeSpaces(String(c1.municipio_naturalidade || ""));
  if (mun1) xml = setTag(xml, "pc_109", mun1.toUpperCase(), 1, true, warnings);

  const uf1 = normalizeSpaces(String(c1.uf_naturalidade || "")).toUpperCase();
  if (uf1) {
    if (isUF(uf1)) xml = setTag(xml, "pc_110", uf1, 1, true, warnings);
    else warnings.push(`VALOR_INVALIDO: conjuges[0].uf_naturalidade="${uf1}"`);
  }

  const dn1 = normalizeDateBR(c1.data_nascimento);
  if (dn1) xml = setTag(xml, "pc_111", dn1, 1, true, warnings);

  const nac1 = normalizeSpaces(String(c1.nacionalidade || ""));
  if (nac1) xml = setTag(xml, "pc_114", nac1.toLowerCase(), 1, true, warnings);

  const g1 = splitGenitores(c1.genitores);
  if (g1.pai) xml = setTag(xml, "pc_130", normalizeNameUpper(g1.pai), 1, true, warnings);
  if (g1.mae) xml = setTag(xml, "pc_150", normalizeNameUpper(g1.mae), 1, true, warnings);

  // ===== Contraente 2 =====
  const nome2 = normalizeNameUpper(c2.nome_atual_habilitacao);
  if (nome2) xml = setTag(xml, "pc_201", nome2, 1, true, warnings);

  const sexo2 = inferSexo(c2.nacionalidade);
  if (sexo2) xml = setTag(xml, "pc_202", sexo2, 1, true, warnings);

  const ec2 = mapEstadoCivilToCode(c2.estado_civil);
  if (ec2) xml = setTag(xml, "pc_204", ec2, 1, true, warnings);

  const mun2 = normalizeSpaces(String(c2.municipio_naturalidade || ""));
  if (mun2) xml = setTag(xml, "pc_209", mun2.toUpperCase(), 1, true, warnings);

  const uf2 = normalizeSpaces(String(c2.uf_naturalidade || "")).toUpperCase();
  if (uf2) {
    if (isUF(uf2)) xml = setTag(xml, "pc_210", uf2, 1, true, warnings);
    else warnings.push(`VALOR_INVALIDO: conjuges[1].uf_naturalidade="${uf2}"`);
  }

  const dn2 = normalizeDateBR(c2.data_nascimento);
  if (dn2) xml = setTag(xml, "pc_211", dn2, 1, true, warnings);

  const nac2 = normalizeSpaces(String(c2.nacionalidade || ""));
  if (nac2) xml = setTag(xml, "pc_214", nac2.toLowerCase(), 1, true, warnings);

  const g2 = splitGenitores(c2.genitores);
  if (g2.pai) xml = setTag(xml, "pc_230", normalizeNameUpper(g2.pai), 1, true, warnings);
  if (g2.mae) xml = setTag(xml, "pc_250", normalizeNameUpper(g2.mae), 1, true, warnings);

  // pc_310: novo nome do 2º contraente (opcional no padrão antigo)
  const novo2 = normalizeNameUpper(c2.novo_nome);
  if (novo2) {
    if (hasTag(xml, "pc_310")) xml = setTag(xml, "pc_310", novo2, 1, true, warnings);
    else warnings.push("TAG_NAO_ENCONTRADA: <pc_310> (template não possui?)");
  }

  // ===== Matrícula -> livro/folha/termo =====
  const { livro, folha, termo } = extractLivroFolhaTermoFromMatricula(r.matricula);
  if (termo) xml = setTag(xml, "pc_301", termo, 1, true, warnings);
  if (livro) xml = setTag(xml, "pc_302", livro, 1, true, warnings);
  if (folha) xml = setTag(xml, "pc_303", folha, 1, true, warnings);

  // ===== Tipo de casamento (pc_499 / pc_326) =====
  let tipoCasamento = mapTipoCasamento(r.tipo_casamento);
  if (!tipoCasamento) tipoCasamento = inferTipoCasamentoFromMatricula(r.matricula);
  if (tipoCasamento) {
    xml = setTag(xml, "pc_499", tipoCasamento, 1, true, warnings);
    xml = setTag(xml, "pc_326", tipoCasamento === '3' ? 'B AUX' : 'B', 1, true, warnings);
  }

  // ===== Datas =====
  const dc = normalizeDateBR(r.data_celebracao);
  if (dc) xml = setTag(xml, "pc_305", dc, 1, true, warnings);

  const dr = normalizeDateBR(r.data_registro);
  if (dr) xml = setTag(xml, "pc_311", dr, 1, true, warnings);

  // ===== Regime =====
  const reg = normalizeRegimeBens(r.regime_bens);
  if (reg.descricao) xml = setTag(xml, "pc_320", reg.descricao, 1, true, warnings);
  if (reg.codigo) xml = setTag(xml, "pc_321", reg.codigo, 1, true, warnings);

  // ===== Documentos (CPF) =====
  const cpf1 = cpfDigitsIfValid(c1.cpf, c1.cpf_sem_inscricao);
  if (cpf1) xml = setTagInSection(xml, "DocumentosContraente1", "Numero", cpf1, 1, true, warnings);

  const cpf2 = cpfDigitsIfValid(c2.cpf, c2.cpf_sem_inscricao);
  if (cpf2) xml = setTagInSection(xml, "DocumentosContraente2", "Numero", cpf2, 1, true, warnings);

  // Avisos do que provavelmente precisa virar obrigatório na tela
  if (!isUF(c1.uf_naturalidade)) warnings.push("FALTANTE_NO_JSON: conjuges[0].uf_naturalidade (nos XMLs antigos normalmente é preenchido)");
  if (!isUF(c2.uf_naturalidade)) warnings.push("FALTANTE_NO_JSON: conjuges[1].uf_naturalidade (nos XMLs antigos normalmente é preenchido)");

  return { xml, warnings };
}

export function buildCasamentoXmlString(templateXml: string, data: CasamentoJson): string {
  return buildCasamentoXmlFromJson(templateXml, data).xml;
}

export type { CasamentoJson, BuildResult };
