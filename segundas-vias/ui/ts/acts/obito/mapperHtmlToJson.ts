// @ts-nocheck
import { normalizeDate } from '../../shared/validators/date.js';
import { normalizeTime } from '../../shared/validators/time.js';
import { normalizeCpf, formatCpf, isValidCpf } from '../../shared/validators/cpf.js';
import { normalizeText } from '../../shared/formatters/text.js';
import { normalizeUf } from '../../shared/location/uf.js';
import { normalizeMunicipio } from '../../shared/location/municipio.js';
import { buildMatriculaFinal } from '../../shared/matricula/cnj.js';

function getInputValue(name, root = document) {
  const el = root.querySelector(`[name="${name}"]`);
  if (!el) return '';
  if (el.tagName === 'TEXTAREA') return el.value || '';
  return el.value || '';
}

function getSelectValue(name, root = document) {
  const el = root.querySelector(`select[name="${name}"]`);
  if (!el) return '';
  return el.value || '';
}

function getSelectText(name, root = document) {
  const el = root.querySelector(`select[name="${name}"]`);
  if (!el) return '';
  const opt = el.selectedOptions && el.selectedOptions[0];
  return opt ? opt.textContent.trim() : '';
}

function getCheckboxValue(name, root = document) {
  const el = root.querySelector(`[name="${name}"]`);
  if (!el) return false;
  return !!el.checked;
}

function mapSexo(value, label) {
  const map = { M: 'masculino', F: 'feminino', I: 'ignorado', N: 'outros' };
  const sexo = map[value] || '';
  const sexoOutros = sexo === 'outros' ? normalizeText(label || '') : '';
  return { sexo, sexo_outros: sexoOutros };
}

function mapEstadoCivil(value) {
  const map = {
    SJ: 'separado',
    CA: 'casado',
    DE: 'desquitado',
    DI: 'divorciado',
    SO: 'solteiro',
    VI: 'viuvo',
    IG: 'ignorado'
  };
  return map[value] || '';
}

function mapBens(value) {
  if (value === 'S') return 'sim';
  if (value === 'N') return 'nao';
  return 'ignorada';
}

function normalizeCpfFields(raw) {
  const digits = normalizeCpf(raw);
  if (!digits) return { cpf: '', cpf_sem_inscricao: true };
  if (!isValidCpf(digits)) return { cpf: '', cpf_sem_inscricao: true };
  return { cpf: formatCpf(digits), cpf_sem_inscricao: false };
}

function buildGenitores(pai, mae) {
  const p = normalizeText(pai);
  const m = normalizeText(mae);
  if (!p && !m) return '';
  return `${p};${m}`;
}

function extractSelo(text) {
  const obs = String(text || '');
  const seloMatch = /SELO[^0-9]*([0-9]+)/i.exec(obs);
  const codMatch = /(COD|CODIGO|CÓDIGO)[^0-9]*([0-9]+)/i.exec(obs);
  return {
    selo: seloMatch ? seloMatch[1] : '',
    cod_selo: codMatch ? codMatch[2] : ''
  };
}

function yearFromDate(value) {
  const normalized = normalizeDate(value);
  const match = (normalized || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? match[3] : '';
}

function buildMatricula(root) {
  const cns = getInputValue('certidao.cartorio_cns', root);
  const ano = yearFromDate(getInputValue('dataTermo', root));
  const livro = getInputValue('livro', root);
  const folha = getInputValue('folha', root);
  const termo = getInputValue('termo', root);
  return buildMatriculaFinal({
    cns6: cns,
    ano,
    tipoAto: '4',
    acervo: '01',
    servico: '55',
    livro,
    folha,
    termo
  });
}

function parseFilhos(raw) {
  const lines = String(raw || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.map((line) => ({ texto: line }));
}

function parseFilhosEstruturado(raw) {
  const lines = String(raw || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const filhos = lines.map((line) => {
    const parts = line.split('|').map((p) => p.trim());
    return {
      nome: normalizeText(parts[0] || ''),
      idade: normalizeText(parts[1] || ''),
      falecido: /^sim|true|1$/i.test(parts[2] || '')
    };
  });
  return {
    quantidade: filhos.length ? String(filhos.length) : '',
    filhos
  };
}

function buildDoc(tipo, numero, data, orgao, uf) {
  const doc = normalizeText(numero);
  if (!doc) return null;
  return {
    tipo,
    documento: doc,
    orgao_emissor: normalizeText(orgao),
    uf_emissao: normalizeUf(uf, { forceIg: true }),
    data_emissao: normalizeDate(data)
  };
}

export function mapperHtmlToJson(root = document) {
  const observacao = getInputValue('observacaoCertidao', root);
  const seloInfo = extractSelo(observacao);
  const seloInput = normalizeText(getInputValue('certidao.selo', root));
  const codInput = normalizeText(getInputValue('certidao.cod_selo', root));
  const plataformaId = normalizeText(getInputValue('certidao.plataformaId', root));
  const tipoCertidao = normalizeText(getSelectValue('certidao.tipo_certidao', root));
  const modalidade = normalizeText(getSelectValue('certidao.modalidade', root));
  const cartorioCns = normalizeText(getInputValue('certidao.cartorio_cns', root));
  const cotaEmolumentos = normalizeText(getInputValue('certidao.cota_emolumentos', root));
  const transcricao = getCheckboxValue('certidao.transcricao', root);

  const cpfInfo = normalizeCpfFields(getInputValue('CPFPessoa', root));
  const sexoRaw = getSelectValue('sexo', root);
  const sexoLabel = getSelectText('sexo', root);
  const sexoInfo = mapSexo(sexoRaw, sexoLabel);

  const localTipo = normalizeText(getSelectText('localObito', root));
  const localDesc = normalizeText(getInputValue('descricaoLocalObito', root));
  const localFalecimento = localDesc || localTipo;

  const filhosTexto = getInputValue('descricaoFilhos', root);
  let filhosOpcao = normalizeText(getSelectValue('existenciaFilhosOpcao', root)).toLowerCase();
  if (!filhosOpcao) filhosOpcao = filhosTexto ? 'texto' : '';

  let filhosPayload = { filhos: [] };
  if (filhosOpcao === 'sim') {
    filhosPayload = parseFilhosEstruturado(filhosTexto);
  } else if (filhosTexto) {
    filhosPayload = { filhos: parseFilhos(filhosTexto) };
  }

  const anotacoes = [];
  const docPrincipal = buildDoc('Outros', getInputValue('documento', root), '', '', '');
  if (docPrincipal) anotacoes.push(docPrincipal);

  const rg = buildDoc('RG', getInputValue('numeroRG', root), getInputValue('dataExpedicaoRG', root), getSelectText('idOrgaoExpedidorRG', root), 'IG');
  if (rg) anotacoes.push(rg);
  const pis = buildDoc('PIS', getInputValue('numeroPIS', root), getInputValue('dataExpedicaoPIS', root), getSelectText('idOrgaoExpedidorPIS', root), 'IG');
  if (pis) anotacoes.push(pis);
  const passaporte = buildDoc('Passaporte', getInputValue('numeroPassaporte', root), getInputValue('dataExpedicaoPassaporte', root), getSelectText('idOrgaoExpedidorPassaporte', root), 'IG');
  if (passaporte) anotacoes.push(passaporte);
  const cns = buildDoc('CNS', getInputValue('numeroCNS', root), getInputValue('dataExpedicaoCNS', root), getSelectText('idOrgaoExpedidorCNS', root), 'IG');
  if (cns) anotacoes.push(cns);
  const titulo = buildDoc('TituloEleitor', getInputValue('numeroTitulo', root), '', '', getSelectValue('ufTitulo', root));
  if (titulo) anotacoes.push(titulo);

  const matricula = buildMatricula(root);

  return {
    certidao: {
      plataformaId,
      tipo_registro: 'obito',
      tipo_certidao: tipoCertidao,
      transcricao,
      cartorio_cns: cartorioCns,
      selo: seloInput || seloInfo.selo,
      cod_selo: codInput || seloInfo.cod_selo,
      modalidade,
      cota_emolumentos: cotaEmolumentos,
      cota_emolumentos_isento: false
    },
    registro: {
      nome_completo: normalizeText(getInputValue('nomePessoa', root)),
      cpf_sem_inscricao: cpfInfo.cpf_sem_inscricao,
      cpf: cpfInfo.cpf,
      matricula,
      data_falecimento_ignorada: false,
      data_falecimento: normalizeDate(getInputValue('dataObito', root)),
      hora_falecimento: normalizeTime(getInputValue('horaObito', root)),
      local_falecimento: localFalecimento,
      municipio_falecimento: normalizeMunicipio(getInputValue('municipioObito', root)),
      uf_falecimento: normalizeUf(getSelectValue('ufMunicipioObito', root), { forceIg: true }),
      sexo: sexoInfo.sexo,
      sexo_outros: sexoInfo.sexo_outros || '',
      estado_civil: mapEstadoCivil(getSelectValue('estadoCivil', root)),
      nome_ultimo_conjuge_convivente: normalizeText(getInputValue('conjuge', root)),
      idade: normalizeText(getInputValue('idade', root)),
      data_nascimento: normalizeDate(getInputValue('dataNascimento', root)),
      municipio_naturalidade: normalizeMunicipio(getInputValue('cidadeNascimento', root)),
      uf_naturalidade: normalizeUf(getSelectValue('ufNascimento', root), { forceIg: true }),
      filiacao: buildGenitores(getInputValue('nomePai', root), getInputValue('nomeMae', root)),
      causa_morte: normalizeText(getInputValue('causaObito', root)),
      nome_medico: normalizeText(getInputValue('nomeMedico', root)),
      crm_medico: normalizeText(getInputValue('crm', root)),
      local_sepultamento_cremacao: normalizeText(getInputValue('sepultamento', root)),
      municipio_sepultamento_cremacao: normalizeMunicipio(getInputValue('municipioSepultamento', root)),
      uf_sepultamento_cremacao: normalizeUf(getSelectValue('ufMunicipioSepultamento', root), { forceIg: true }),
      data_registro: normalizeDate(getInputValue('dataTermo', root)),
      nome_declarante: normalizeText(getInputValue('declarante', root)),
      existencia_bens: mapBens(getSelectValue('flagBens', root)),
      existencia_filhos_opcao: filhosOpcao,
      existencia_filhos: filhosPayload,
      averbacao_anotacao: normalizeText(observacao),
      anotacoes_cadastro: anotacoes
    }
  };
}
