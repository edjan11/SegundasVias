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

  return {
    certidao: {
      plataformaId: 'certidao-eletronica',
      tipo_registro: 'casamento',
      tipo_certidao: 'Breve relato',
      transcricao: false,
      cartorio_cns: '163659',
      selo: '',
      cod_selo: '',
      modalidade: 'eletronica',
      cota_emolumentos: '',
      cota_emolumentos_isento: false,
    },
    registro: {
      conjuges: [conjuge1, conjuge2],
      matricula: '',
      data_celebracao: textOf(root, 'pc_305'),
      regime_bens: textOf(root, 'pc_320'),
      data_registro: textOf(root, 'pc_311'),
      averbacao_anotacao: averbacao,
      anotacoes_cadastro: { primeiro_conjuge: [], segundo_conjuge: [] },
    },
  };
}
