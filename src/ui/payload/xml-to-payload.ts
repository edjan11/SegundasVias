import { normalizeSpaces, onlyDigits } from './bind';

type CertificatePayload = {
  certidao: Record<string, unknown>;
  registro: Record<string, unknown>;
};

function parseXml(xml: string): Document | null {
  try {
    const parser = new DOMParser();
    return parser.parseFromString(xml, 'text/xml');
  } catch {
    return null;
  }
}

function textOf(root: ParentNode | null, tag: string): string {
  if (!root) return '';
  const el = (root as Document).querySelector?.(tag);
  return normalizeSpaces(el?.textContent || '');
}

function textOfIn(root: ParentNode | null, selector: string): string {
  if (!root) return '';
  const el = (root as Document).querySelector?.(selector);
  return normalizeSpaces(el?.textContent || '');
}

function mapSexoToPayload(value: string): string {
  const v = String(value || '').trim().toUpperCase();
  if (v === 'M' || v === 'MASCULINO') return 'masculino';
  if (v === 'F' || v === 'FEMININO') return 'feminino';
  if (v === 'I' || v === 'IGNORADO') return 'ignorado';
  return 'ignorado';
}

function trimHora(h: string): string {
  const m = String(h || '').match(/(\d{1,2}):(\d{2})/);
  if (!m) return '';
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

export function parseNascimentoXmlToPayload(xml: string): CertificatePayload | null {
  const doc = parseXml(xml);
  if (!doc) return null;
  const pnas = doc.querySelector('PNAS') || doc;
  const registrado = doc.querySelector('PNAS > Registrado') || doc.querySelector('Registrado');

  const nome = textOf(registrado, 'Nome');
  const sexo = mapSexoToPayload(textOf(registrado, 'Sexo'));
  const dataNascimento = textOf(registrado, 'DataNascimento');
  const horaNascimento = trimHora(textOf(registrado, 'HoraNascimento'));
  const cidadeNasc = textOf(registrado, 'CidadeNascimento');
  const ufNasc = textOf(registrado, 'UFNascimento');

  const cpfDoc = doc.querySelector('Registrado Documentos Documento');
  const cpf = normalizeSpaces(cpfDoc?.querySelector?.('Numero')?.textContent || '');

  const dnv = textOf(pnas, 'NumeroDNV_DO');
  const dataRegistro = textOf(pnas, 'DataRegistro');
  const localNascimento =
    textOf(pnas, 'EstabelecimentoDoNascimento') || textOf(pnas, 'DescricaoLocalNascimento');
  const localNascimentoCodigo = textOf(pnas, 'CodigoLocalDoNascimento');

  // Matricula components (livro, folha, termo)
  const nomeLivro = textOf(pnas, 'NomeLivro');
  const numeroLivro = textOf(pnas, 'NumeroLivro');
  const numeroPagina = textOf(pnas, 'NumeroPagina');
  const numeroRegistro = textOf(pnas, 'NumeroRegistro');
  const matriculaLivro = numeroLivro || '';
  const matriculaFolha = numeroPagina || '';
  const matriculaTermo = numeroRegistro || '';
  // Full matricula (best-effort concatenation if present)
  const matriculaFull = (numeroLivro || '') + (numeroPagina || '') + (numeroRegistro || '');

  const participantes = Array.from(doc.querySelectorAll('Participantes > Participante'));
  const filiacao: any[] = [];
  const participantesOut: any[] = [];
  participantes.forEach((p) => {
    const tipo = textOf(p, 'Tipo');
    const pessoa = p.querySelector('Pessoa');
    const nomeP = textOf(pessoa, 'Nome');
    const cidade = textOf(pessoa, 'CidadeNascimento');
    const uf = textOf(pessoa, 'UFNascimento');
    const genitores = Array.from(p.querySelectorAll('Genitores > Genitor'));
    const avos = genitores.map((g) => normalizeSpaces(textOf(g, 'Nome'))).filter(Boolean);
    const avosStr = avos.join('; ');
    const papel = tipo === '0' ? 'MAE' : tipo === '1' ? 'PAI' : '';
    if (nomeP) {
      filiacao.push({
        nome: nomeP,
        municipio_nascimento: cidade,
        uf_nascimento: uf,
        avos: avosStr,
        papel,
      });
    }
    if (nomeP) {
      participantesOut.push({
        nome: nomeP,
        municipio_nascimento: cidade,
        uf_nascimento: uf,
        avos: avosStr,
        papel,
      });
    }
  });

  // Try to extract cartorio CNS from XML tags (CartorioCNS, Cartorio_CNS, cartorio_cns)
  // Also accept CodigoCNJ/CNJ/CodigoMatricula which may already contain the 6-digit code (e.g., 110072)
  const explicitCartorio = textOf(pnas, 'CartorioCNS') || textOf(pnas, 'Cartorio_CNS') || textOf(pnas, 'cartorio_cns') || '';
  const explicitDigits = onlyDigits(explicitCartorio || '');

  // Also recognize CodigoCNJ tags which in some templates carry the CNS code value
  const codigoCnjRaw = textOf(pnas, 'CodigoCNJ') || textOf(pnas, 'CNJ') || textOf(pnas, 'CodigoMatricula') || '';
  const codigoCnjDigits = onlyDigits(codigoCnjRaw || '');

  let matriculaPrefix = '';
  const matriculaDigits = onlyDigits(matriculaFull || '');
  if (matriculaDigits && matriculaDigits.length >= 6) {
    matriculaPrefix = matriculaDigits.slice(0, 6);
  }

  // Priority: explicit CartorioCNS tag, then CodigoCNJ value if present, then matrícula prefix
  const cartorioCnsFinal = explicitDigits || codigoCnjDigits || matriculaPrefix || '';

  return {
    certidao: {
      plataformaId: 'certidao-eletronica',
      tipo_registro: 'nascimento',
      tipo_certidao: 'Breve relato',
      transcricao: false,
      cartorio_cns: cartorioCnsFinal,
      selo: '',
      cod_selo: '',
      modalidade: 'eletronica',
      cota_emolumentos: '',
      cota_emolumentos_isento: false,
    },
    registro: {
      nome_completo: nome,
      cpf_sem_inscricao: !cpf,
      cpf: onlyDigits(cpf),
      data_registro: dataRegistro,
      data_nascimento_ignorada: !dataNascimento,
      data_nascimento: dataNascimento,
      hora_nascimento_ignorada: !horaNascimento,
      hora_nascimento: horaNascimento,
      municipio_naturalidade: cidadeNasc,
      uf_naturalidade: ufNasc,
      local_nascimento: localNascimento,
      municipio_nascimento: cidadeNasc,
      uf_nascimento: ufNasc,
      sexo,
      gemeos: { quantidade: '0', irmao: [] },
      filiacao,
      participantes: participantesOut,
      numero_dnv: dnv,
      averbacao_anotacao: '',
      anotacoes_cadastro: [],
      // Local nascimento code (maps to select ui.local_nascimento_tipo)
      local_nascimento_codigo: localNascimentoCodigo || '',
      // Matricula parts
      matricula_livro: matriculaLivro || '',
      matricula_folha: matriculaFolha || '',
      matricula_termo: matriculaTermo || '',
      // Combined matricula (best-effort)
      matricula: matriculaFull || '',
    },
  };
}

function mapEstadoCivilFromCode(code: string): string {
  const v = String(code || '').trim();
  if (v === '0') return 'SOLTEIRO(A)';
  if (v === '1') return 'CASADO(A)';
  if (v === '2') return 'DIVORCIADO(A)';
  if (v === '3') return 'VIUVO(A)';
  return '';
}

export function parseCasamentoXmlToPayload(xml: string): CertificatePayload | null {
  const doc = parseXml(xml);
  if (!doc) return null;
  const root = doc.querySelector('PCAS') || doc;

  const conjuge1 = {
    nome_atual_habilitacao: textOf(root, 'pc_101'),
    cpf_sem_inscricao: false,
    cpf: onlyDigits(textOfIn(root, 'DocumentosContraente1 Documento Numero')),
    novo_nome: textOf(root, 'pc_101'),
    data_nascimento: textOf(root, 'pc_111'),
    nacionalidade: textOf(root, 'pc_114').toUpperCase(),
    estado_civil: mapEstadoCivilFromCode(textOf(root, 'pc_104')),
    municipio_naturalidade: textOf(root, 'pc_109'),
    uf_naturalidade: textOf(root, 'pc_110'),
    genitores: [textOf(root, 'pc_130'), textOf(root, 'pc_150')].filter(Boolean).join('; '),
  };

  const conjuge2 = {
    nome_atual_habilitacao: textOf(root, 'pc_201'),
    cpf_sem_inscricao: false,
    cpf: onlyDigits(textOfIn(root, 'DocumentosContraente2 Documento Numero')),
    novo_nome: textOf(root, 'pc_310') || textOf(root, 'pc_201'),
    data_nascimento: textOf(root, 'pc_211'),
    nacionalidade: textOf(root, 'pc_214').toUpperCase(),
    estado_civil: mapEstadoCivilFromCode(textOf(root, 'pc_204')),
    municipio_naturalidade: textOf(root, 'pc_209'),
    uf_naturalidade: textOf(root, 'pc_210'),
    genitores: [textOf(root, 'pc_230'), textOf(root, 'pc_250')].filter(Boolean).join('; '),
  };

  const averbacao = textOf(root, 'pc_006') || textOf(root, 'pc_003');
  const livro = textOf(root, 'pc_302');
  const folha = textOf(root, 'pc_303');
  const termo = textOf(root, 'pc_301');
  const pc004 = textOf(root, 'pc_004'); // CNS do cartório no XML de casamento
  let cartorioOficio = textOf(root, 'pc_002') || ''; // Cartório/Ofício

  // Matrícula completa pode vir fora dos campos pc_*** (ex.: linha 4 do XML)
  const matriculaLine4 = onlyDigits((xml.split(/\r?\n/)[3] || ''));
  const matriculaFromXml =
    onlyDigits(
      textOf(root, 'Matricula') ||
      textOf(root, 'matricula') ||
      textOf(root, 'CodigoMatricula') ||
      textOf(root, 'CodigoCNJ') ||
      textOf(root, 'CNJ') ||
      textOf(root, 'NumeroMatricula') ||
      textOf(root, 'MatriculaRegistro') ||
      ''
    ) ||
    (matriculaLine4.length >= 30 ? matriculaLine4 : '');

  // Extrair CNS do cartório - em casamento XML temos campos diferentes
  // Tentar pc_001 primeiro (compatibilidade), depois pc_004 (CNS) e campos de serventia
  let cartorioCnsFinal = onlyDigits(
    textOf(root, 'pc_001') || 
    pc004 ||
    textOf(root, 'CartorioCNS') || 
    textOf(root, 'Cartorio_CNS') || 
    textOf(root, 'cartorio_cns') || 
    ''
  );

  // Se não encontrou CNS explícito, tenta extrair do CartorioRegistro
  // Exemplo: "CartÃ³rio do 9Âº OfÃ­cio" -> extrai "9"
  if (!cartorioCnsFinal && !cartorioOficio) {
    const cartorioRegistro = textOf(root, 'CartorioRegistro') || '';
    // Tenta extrair número do ofício (ex: "9º Ofício" -> "9")
    const oficioMatch = cartorioRegistro.match(/(\d+)\s*[ºo]\s*[Oo]f/i);
    if (oficioMatch) {
      // Se pc_002 estava vazio, usa a extração do CartorioRegistro
      cartorioOficio = oficioMatch[1];
      // Gera CNS mock: "000" + ofício + "001" (exemplo: "0009001" para 9º ofício)
      cartorioCnsFinal = '000' + oficioMatch[1].padStart(2, '0') + '001';
    }
  }

  // Construir matrícula: Se temos cartório + pc_004, concatena
  // Casamento: matrícula é tipicamente: cartório(3) + número(4+)
  let matricula = '';
  // pc_004 é CNS; não usar como matrícula
  if (livro || folha || termo) {
    // Fallback: tenta usar livro/folha/termo
    matricula = [livro, folha, termo].filter(Boolean).join('').padStart(10, '0');
  }

  const matriculaDigits = onlyDigits(matriculaFromXml || matricula || pc004 || '');
  if (!cartorioCnsFinal && matriculaDigits.length >= 6) {
    cartorioCnsFinal = matriculaDigits.slice(0, 6);
  }

  const tipoCasamento = textOf(root, 'pc_499') || textOf(root, 'pc_326');

  return {
    certidao: {
      plataformaId: 'certidao-eletronica',
      tipo_registro: 'casamento',
      tipo_certidao: 'Breve relato',
      transcricao: false,
      cartorio_cns: cartorioCnsFinal,
      selo: '',
      cod_selo: '',
      modalidade: 'eletronica',
      cota_emolumentos: '',
      cota_emolumentos_isento: false,
      'data-imported': 'true', // Flag para evitar override do CNS
    },
    registro: {
      conjuges: [conjuge1, conjuge2],
      matricula: matricula || '',
      matricula_livro: livro || '',
      matricula_folha: folha || '',
      matricula_termo: termo || '',
      tipo_casamento: tipoCasamento,
      data_celebracao: textOf(root, 'pc_305'),
      regime_bens: textOf(root, 'pc_320'),
      data_registro: textOf(root, 'pc_311'),
      averbacao_anotacao: averbacao,
      anotacoes_cadastro: { primeiro_conjuge: [], segundo_conjuge: [] },
    },
  };
}

/**
 * Parse nascimento JSON payload: extract/calculate matrícula and CNS from JSON data.
 * This function is called when importing nascimento JSON files to ensure proper extraction
 * and bidirectional mapping of matricula components and cartorio CNS.
 * 
 * Matrícula structure: CCCCCCLLLLFFFFTTTTT... (32+ digits)
 * - C (6): Cartório CNS (first 6 digits)
 * - L (4): Livro (book)
 * - F (4): Folha (page)
 * - T (6+): Termo (record number, can be 6+ digits)
 */
export function parseNascimentoJsonToPayload(raw: CertificatePayload): CertificatePayload {
  if (!raw?.registro) return raw;
  
  const reg = raw.registro as Record<string, any>;
  const cert = raw.certidao as Record<string, any> || {};
  
  // Get the full matrícula if present
  const matriculaFull = String(reg.matricula || '').trim();
  const matriculaDigits = onlyDigits(matriculaFull);
  
  // Decompose full matrícula into components if available
  let cartorioCns = String(cert.cartorio_cns || '').trim();
  let livro = String(reg.matricula_livro || '').trim();
  let folha = String(reg.matricula_folha || '').trim();
  let termo = String(reg.matricula_termo || '').trim();
  
  // If we have a complete matrícula, extract components from it
  if (matriculaDigits && matriculaDigits.length >= 20) {
    // Extract cartório (first 6 digits)
    cartorioCns = matriculaDigits.slice(0, 6);
    // Extract livro (next 4 digits)
    livro = matriculaDigits.slice(6, 10);
    // Extract folha (next 4 digits)
    folha = matriculaDigits.slice(10, 14);
    // Extract termo (remaining digits, typically 6+)
    termo = matriculaDigits.slice(14);
  } else if (livro || folha || termo) {
    // If we have separate components, build the full matrícula from them
    const cartorioPrefix = String(cert.cartorio_cns || '').trim() || cartorioCns;
    if (livro && folha && termo) {
      const matriculaBuilt = 
        (cartorioPrefix || '') + 
        String(livro || '').padStart(4, '0') +
        String(folha || '').padStart(4, '0') +
        String(termo || '').padStart(6, '0');
      if (onlyDigits(matriculaBuilt).length >= 20) {
        cartorioCns = cartorioPrefix;
      }
    }
  }
  
  // Return updated payload with all calculated values
  return {
    certidao: {
      ...cert,
      cartorio_cns: cartorioCns,
    },
    registro: {
      ...reg,
      matricula: matriculaDigits && matriculaDigits.length >= 20 ? matriculaDigits : matriculaFull,
      matricula_livro: livro,
      matricula_folha: folha,
      matricula_termo: termo,
    },
  };
}
