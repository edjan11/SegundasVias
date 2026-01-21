type NascimentoJson = {
  certidao?: {
    plataformaId?: string;
    tipo_registro?: string;
    tipo_certidao?: string;
    transcricao?: boolean;
    cartorio_cns?: string;
    selo?: string;
    cod_selo?: string;
    modalidade?: string;
    cota_emolumentos?: string;
    cota_emolumentos_isento?: boolean;
  };
  registro: {
    nome_completo?: string;
    cpf_sem_inscricao?: boolean;
    cpf?: string;
    matricula?: string;
    data_registro?: string;
    data_nascimento_ignorada?: boolean;
    data_nascimento?: string;
    hora_nascimento_ignorada?: boolean;
    hora_nascimento?: string;
    municipio_naturalidade?: string;
    uf_naturalidade?: string;
    local_nascimento?: string;
    local_nascimento_codigo?: string;
    municipio_nascimento?: string;
    uf_nascimento?: string;
    sexo?: string;
    sexo_outros?: string;
    gemeos?: { quantidade?: string | number; irmao?: any[] };
    filiacao?: string[] | string | Array<any>;
    numero_dnv?: string;
    averbacao_anotacao?: string;
    anotacoes_cadastro?: Array<any>;
    livro?: string;
    folha?: string;
    termo?: string;
    id_assinante?: string;
    nome_assinante?: string;
  };
};

type ParentInfo = {
  nome?: string;
  cidade?: string;
  uf?: string;
  avos?: string;
  sexo?: string;
};

function escapeXml(v: string): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function setTag(
  xml: string,
  tag: string,
  value?: string,
  occurrence = 1,
  forceEmpty = false,
): string {
  if (value === undefined || value === null) return xml;
  const safe = escapeXml(String(value));
  if (!safe && !forceEmpty) return xml;
  const re = new RegExp(
    `(<${tag}(?=\\s|/|>)[^>]*>)([\\s\\S]*?)(</${tag}>)|(<${tag}(?=\\s|/|>)[^>]*\\/>)`,
    "g",
  );
  let idx = 0;
  return xml.replace(re, (match, open, _inner, close, selfClosing) => {
    idx += 1;
    if (idx !== occurrence) return match;
    if (selfClosing) {
      const openTag = selfClosing.replace(/\/>?$/, ">");
      return safe ? `${openTag}${safe}</${tag}>` : selfClosing;
    }    // If forceEmpty is requested and the value is empty, prefer to keep self-closing
    if (!safe && forceEmpty) {
      // Quando for forçar vazio, prefira tag explícita vazia para coincidir com o template
      return `${open}</${tag}>`;
    }
    return `${open}${safe}${close}`;
  });
}

function setTagAny(xml: string, tags: string[], value?: string, forceEmpty = false): string {
  for (const t of tags) {
    const before = xml;
    const after = setTag(xml, t, value, 1, forceEmpty);
    if (after !== before) return after; // stop at first successful replacement to preserve template shape
  }
  return xml;
}

function replaceSection(
  xml: string,
  tag: string,
  updater: (inner: string) => string,
  occurrence = 1,
): string {
  const re = new RegExp(`(<${tag}(?=\\s|/|>)[^>]*>)([\\s\\S]*?)(</${tag}>)`, "g");
  let idx = 0;
  return xml.replace(re, (match, open, inner, close) => {
    idx += 1;
    if (idx !== occurrence) return match;
    return `${open}${updater(inner)}${close}`;
  });
}

function setTagInSection(
  xml: string,
  sectionTag: string,
  tag: string,
  value?: string,
  occurrence = 1,
  forceEmpty = false,
): string {
  return replaceSection(xml, sectionTag, (inner) => setTag(inner, tag, value, occurrence, forceEmpty));
}

function onlyDigits(v?: string): string {
  return String(v ?? "").replace(/\D/g, "");
}

function normalizeHoraToXml(v?: string): string {
  const s = String(v ?? "").trim();
  if (!s) return "";
  const m = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return "";
  const hh = String(m[1]).padStart(2, "0");
  const mm = m[2];
  const ss = m[3] ?? "00";
  return `${hh}:${mm}:${ss}`;
}

function mapSexoToXml(v?: string): string {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return "";
  if (s === "masculino" || s === "m") return "M";
  if (s === "feminino" || s === "f") return "F";
  if (s === "ignorado" || s === "i") return "I";
  return "N";
}

function parseAvos(raw?: string): { avo1: string; avo2: string } {
  const parts = String(raw ?? "")
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);
  return { avo1: parts[0] || "", avo2: parts[1] || "" };
}

function mapLocalNascimentoCode(local?: string, tipo?: string): string {
  const rawTipo = String(tipo ?? "").trim().toUpperCase();
  const s = String(local ?? "").trim().toUpperCase();

  const fromTipo = rawTipo || s;
  if (/^\d+$/.test(fromTipo)) return fromTipo;
  if (fromTipo.length === 1) {
    if (fromTipo === "H") return "1";
    if (fromTipo === "S") return "2";
    if (fromTipo === "D") return "3";
    if (fromTipo === "V") return "4";
    if (fromTipo === "O") return "5";
    if (fromTipo === "I") return "9";
  }

  if (/HOSP|CLINIC|MATERN/.test(s)) return "1";
  if (/DOMIC/.test(s)) return "3";
  if (/VIA/.test(s)) return "4";
  if (/IGNOR/.test(s)) return "9";
  return "5";
}

function mapGemeosCode(qtd?: string | number): string {
  const raw = String(qtd ?? "").trim();
  if (!raw) return "";
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return "";
  if (n === 0) return "1";
  if (n === 1) return "2";
  return "3";
}

function normalizeFiliacaoEntries(raw: any): Array<{
  nome?: string;
  municipio_nascimento?: string;
  uf_nascimento?: string;
  avos?: string;
  papel?: string;
  sexo?: string;
}> {
  if (Array.isArray(raw)) {
    return raw
      .map((it) => {
        if (!it) return null;
        if (typeof it === "string") return { nome: String(it).trim() };
        if (typeof it === "object") {
          const nome = String((it as any).nome || (it as any).name || (it as any).nome_completo || "").trim();
          return {
            nome,
            municipio_nascimento: String((it as any).municipio_nascimento || "").trim(),
            uf_nascimento: String((it as any).uf_nascimento || "").trim(),
            avos: String((it as any).avos || "").trim(),
            papel: String((it as any).papel || "").trim(),
            sexo: String((it as any).sexo || "").trim(),
          };
        }
        return null;
      })
      .filter(Boolean) as any[];
  }

  if (typeof raw === "string") {
    const parts = raw
      .split(";")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      return [
        { nome: parts[0], papel: "PAI" },
        { nome: parts[1], papel: "MAE" },
      ];
    }
    if (parts.length === 1) return [{ nome: parts[0] }];
  }

  return [];
}

function pickByRole<T extends { papel?: string }>(items: T[], role: string): T | undefined {
  const r = role.toUpperCase();
  return items.find((it) => String(it.papel || "").toUpperCase() === r);
}

function buildParentInfo(base: any, fallback: any, defaultSexo: string): ParentInfo {
  const nome = String(base?.nome || fallback?.nome || "").trim();
  const cidade = String(base?.municipio_nascimento || fallback?.municipio_nascimento || "").trim();
  const uf = String(base?.uf_nascimento || fallback?.uf_nascimento || "").trim();
  const avos = String(base?.avos || fallback?.avos || "").trim();
  const sexoRaw = base?.sexo || fallback?.sexo;
  const sexo = sexoRaw ? mapSexoToXml(sexoRaw) : defaultSexo;
  const hasAny = !!(nome || cidade || uf || avos);
  return { nome, cidade, uf, avos, sexo: hasAny ? sexo : "" };
}

function updateGenitoresXml(xml: string, avo1?: string, avo2?: string): string {
  let idx = 0;
  const re = new RegExp(`(<Genitor(?=\\s|/|>)[^>]*>)([\\s\\S]*?)(</Genitor>)`, "g");
  return xml.replace(re, (match, open, inner, close) => {
    idx += 1;
    const nome = idx === 1 ? (avo1 ?? "") : idx === 2 ? (avo2 ?? "") : "";
    const sexo = idx === 1 ? "F" : idx === 2 ? "M" : "";
    let updated = setTag(inner, "Nome", nome, 1, true);
    updated = setTag(updated, "Sexo", sexo, 1, true);
    return `${open}${updated}${close}`;
  });
}

function updateParticipantByTipo(xml: string, tipo: string, data: ParentInfo): string {
  const re = new RegExp(
    `(<Participante>\\s*<Tipo>\\s*${tipo}\\s*<\\/Tipo>[\\s\\S]*?<\\/Participante>)`,
    "m",
  );
  if (!re.test(xml)) return xml;
  return xml.replace(re, (block) => {
    let updated = replaceSection(block, "Pessoa", (person) => {
      let out = person;
      out = setTag(out, "Nome", data.nome ?? "", 1, true);
      out = setTag(out, "Sexo", data.sexo ?? "", 1, true);
      out = setTag(out, "CidadeNascimento", data.cidade ?? "", 1, true);
      out = setTag(out, "UFNascimento", data.uf ?? "", 1, true);
      if (data.avos) {
        const { avo1, avo2 } = parseAvos(data.avos);
        out = replaceSection(out, "Genitores", (gen) => updateGenitoresXml(gen, avo1, avo2));
      } else {
        out = replaceSection(out, "Genitores", (gen) => updateGenitoresXml(gen, "", ""));
      }
      return out;
    });
    return updated;
  });
}

function updateCpfDocumento(xml: string, cpfDigits: string): string {
  return replaceSection(xml, "Registrado", (inner) => {
    return replaceSection(inner, "Documentos", (docs) => {
      const docRe =
        /(<Documento>[\s\S]*?<Titulo>\s*CPF\s*<\/Titulo>[\s\S]*?<Numero>)([\s\S]*?)(<\/Numero>)/m;
      if (!docRe.test(docs)) return docs;
      return docs.replace(docRe, `$1${escapeXml(cpfDigits || "")}$3`);
    });
  });
}

export function buildNascimentoXmlFromJson(templateXml: string, data: NascimentoJson): string {
  let xml = templateXml;
  const r = data?.registro ?? {};
  const hasRegistrado = /<Registrado(?=\s|\/|>)/.test(templateXml);

  const matriculaDigits = onlyDigits(r.matricula);
  const codigoCnj = matriculaDigits.slice(0, 6) || onlyDigits(data?.certidao?.cartorio_cns) || '163659';

  xml = setTagAny(xml, ["CodigoCNJ", "MatriculaCNJ", "CNJ", "CodigoMatricula"], codigoCnj || "", true);

  if ((r as any).titulo_livro) {
    xml = setTagAny(xml, ["NomeLivro"], String((r as any).titulo_livro));
  }

  xml = setTagAny(xml, ["NumeroLivro", "Livro", "LivroRegistro"], onlyDigits(r.livro) || "", true);
  xml = setTagAny(xml, ["NumeroPagina", "NumeroFolha", "Folha"], onlyDigits(r.folha) || "", true);
  xml = setTagAny(xml, ["NumeroRegistro", "NumeroTermo", "Termo"], onlyDigits(r.termo) || "", true);

  xml = setTagAny(xml, ["DataRegistro", "DataLavratura", "DataAto"], r.data_registro || "", true);

  const cartorio = onlyDigits(data?.certidao?.cartorio_cns || "") || codigoCnj;
  if (cartorio) xml = setTagAny(xml, ["CartorioCNS", "Cartorio_CNS", "cartorio_cns"], cartorio, true);
  const transcricao = data?.certidao?.transcricao === true ? "true" : "false";
  xml = setTagAny(xml, ["Transcricao", "transcricao"], transcricao, true);

  const localNascimento = String(r.local_nascimento ?? "").trim();
  xml = setTagAny(
    xml,
    [
      "EstabelecimentoDoNascimento",
      "EstabelecimentoNascimento",
      "EnderecoLocalDoNascimento",
      "EnderecoNascimento",
      "DescricaoLocalNascimento",
      "LocalNascimentoDescricao",
      "DescricaoLocal",
    ],
    localNascimento,
    true,
  );
  xml = setTagAny(
    xml,
    ["CodigoLocalDoNascimento", "CodLocalNascimento"],
    mapLocalNascimentoCode(localNascimento, (r as any).local_nascimento_codigo),
    true,
  );

  const dataNasc = r.data_nascimento_ignorada ? "" : (r.data_nascimento ?? "");
  const horaNasc = r.hora_nascimento_ignorada ? "" : normalizeHoraToXml(r.hora_nascimento);

  if (hasRegistrado) {
    xml = setTagInSection(xml, "Registrado", "Nome", r.nome_completo || "", 1, true);
    xml = setTagInSection(xml, "Registrado", "Sexo", mapSexoToXml(r.sexo) || "", 1, true);
    xml = setTagInSection(xml, "Registrado", "DataNascimento", dataNasc || "", 1, true);
    xml = setTagInSection(xml, "Registrado", "HoraNascimento", horaNasc || "", 1, true);
    xml = setTagInSection(xml, "Registrado", "CidadeNascimento", r.municipio_nascimento || "", 1, true);
    xml = setTagInSection(xml, "Registrado", "UFNascimento", r.uf_nascimento || "", 1, true);
  } else {
    xml = setTagAny(xml, ["Nome", "NomePessoa", "NomeRegistrando"], r.nome_completo || "", true);
    xml = setTagAny(xml, ["Sexo", "SexoPessoa"], mapSexoToXml(r.sexo) || "", true);
    xml = setTagAny(xml, ["DataNascimento", "DtNascimento"], dataNasc || "", true);
    xml = setTagAny(xml, ["HoraNascimento", "HrNascimento"], horaNasc || "", true);
    xml = setTagAny(
      xml,
      ["CidadeNascimento", "MunicipioNascimento", "CidadeDoNascimento"],
      r.municipio_nascimento || "",
      true,
    );
    xml = setTagAny(xml, ["UFNascimento", "UfNascimento"], r.uf_nascimento || "", true);
  }

  const munNat = String(r.municipio_naturalidade ?? "").trim();
  const ufNat = String(r.uf_naturalidade ?? "").trim();
  if (munNat || ufNat) {
    const nat = [munNat, ufNat].filter(Boolean).join("/");
    xml = setTagAny(xml, ["Naturalidade", "MunicipioNaturalidade", "CidadeNaturalidade"], nat || "", true);
    xml = setTagAny(xml, ["UFNaturalidade", "UfNaturalidade"], ufNat || "", true);
  }

  xml = setTagAny(xml, ["NumeroDNV_DO", "NumeroDNV", "DNV", "NumeroDeclaracaoVivo"], r.numero_dnv || "", true);

  const codigoGemeo = mapGemeosCode(r.gemeos?.quantidade);
  if (codigoGemeo) xml = setTagAny(xml, ["CodigoGemelaridade"], codigoGemeo, true);
  const gemeosNomes = Array.isArray(r.gemeos?.irmao)
    ? r.gemeos?.irmao
        .map((g: any) => String(g?.nome || g?.nome_completo || "").trim())
        .filter(Boolean)
        .join("; ")
    : "";
  if (gemeosNomes) xml = setTagAny(xml, ["NomeIrmaosGemeos"], gemeosNomes, true);

  const cpfDigits = r.cpf_sem_inscricao ? "" : onlyDigits(r.cpf);
  xml = setTagAny(xml, ["CPF", "NumeroCPF", "CPFPessoa", "CpfRegistrando"], cpfDigits || "", true);
  xml = updateCpfDocumento(xml, cpfDigits || "");

  xml = setTagAny(
    xml,
    ["DataNascimentoIgnorada", "FlagDtNasc", "IgnorarDataNascimento"],
    r.data_nascimento_ignorada ? "true" : "false",
    true,
  );
  xml = setTagAny(
    xml,
    ["HoraNascimentoIgnorada", "FlagHrNasc", "IgnorarHoraNascimento"],
    r.hora_nascimento_ignorada ? "true" : "false",
    true,
  );

  const participants = Array.isArray((r as any).participantes) ? (r as any).participantes : [];
  const filiacaoEntries = normalizeFiliacaoEntries(r.filiacao);
  const maeBase = pickByRole(participants, "MAE") || participants[0];
  const paiBase = pickByRole(participants, "PAI") || participants[1];
  const maeFallback = pickByRole(filiacaoEntries, "MAE") || filiacaoEntries[0];
  const paiFallback = pickByRole(filiacaoEntries, "PAI") || filiacaoEntries[1];

  const maeInfo = buildParentInfo(maeBase, maeFallback, "F");
  const paiInfo = buildParentInfo(paiBase, paiFallback, "M");

  xml = replaceSection(xml, "Participantes", (inner) => {
    let out = inner;
    out = updateParticipantByTipo(out, "1", paiInfo);
    out = updateParticipantByTipo(out, "0", maeInfo);
    return out;
  });

  const filiacaoRaw = [paiInfo.nome, maeInfo.nome].filter(Boolean).join("; ");
  xml = setTagAny(xml, ["NomePai", "Pai", "NomeGenitor1"], paiInfo.nome || "", true);
  xml = setTagAny(xml, ["NomeMae", "Mae", "NomeGenitor2"], maeInfo.nome || "", true);

  // Atualiza o campo de filiação apenas dentro do bloco <Registrado> quando o template tiver esse bloco.
  if (hasRegistrado) {
    xml = setTagInSection(xml, "Registrado", "Genitores", filiacaoRaw || "", 1, true);
  } else {
    xml = setTagAny(xml, ["Filiacao", "Genitores"], filiacaoRaw || "", true);
  }

  if (typeof r.averbacao_anotacao === "string") {
    xml = setTagAny(xml, ["ObservacaoCertidao", "Observacao", "AverbacaoAnotacao"], r.averbacao_anotacao, true);
  }

  const assinanteId = String(r.id_assinante || "").trim();
  if (/^\d+$/.test(assinanteId)) {
    xml = setTagAny(xml, ["IdAssinante", "CodigoAssinante", "CodigoDeclarante"], assinanteId, true);
  }
  if (r.nome_assinante) {
    xml = setTagAny(xml, ["Assinante", "NomeAssinante"], r.nome_assinante, true);
  }

  return xml;
}

export type { NascimentoJson };
