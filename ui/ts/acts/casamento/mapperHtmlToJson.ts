
import { normalizeDate } from '../../shared/validators/date.js';
import { normalizeCpf, formatCpf, isValidCpf } from '../../shared/validators/cpf.js';
import { normalizeText } from '../../shared/formatters/text.js';
import { normalizeUf } from '../../shared/location/uf.js';
import { normalizeMunicipio } from '../../shared/location/municipio.js';

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

function mapRegimeBens(value) {
  const map = {
    L: 'Separacao legal de bens',
    C: 'Separacao convencional de bens',
    B: 'Comunhao de bens',
    P: 'Comunhao parcial de bens',
    U: 'Comunhao universal de bens',
    A: 'Participacao final de bens nos aquestos',
    I: 'Ignorado',
  };
  return map[value] || '';
}

function mapEstadoCivil(value) {
  const map = {
    SJ: 'Separado(a) judicialmente',
    DE: 'Desquitado(a)',
    DI: 'Divorciado(a)',
    SO: 'Solteiro(a)',
    VI: 'Viuvo(a)',
    IG: 'Ignorado',
  };
  return map[value] || '';
}

function buildGenitores(pai, mae) {
  const p = normalizeText(pai);
  const m = normalizeText(mae);
  if (!p && !m) return '';
  return `${p};${m}`;
}

function normalizeCpfFields(raw) {
  const digits = normalizeCpf(raw);
  if (!digits) return { cpf: '', cpf_sem_inscricao: true };
  if (!isValidCpf(digits)) return { cpf: '', cpf_sem_inscricao: true };
  return { cpf: formatCpf(digits), cpf_sem_inscricao: false };
}

function extractSelo(text) {
  const obs = String(text || '');
  const seloMatch = /SELO[^0-9]*([0-9]+)/i.exec(obs);
  const codMatch = /(COD|CODIGO|C[OÓ]DIGO)[^0-9]*([0-9]+)/i.exec(obs);
  return {
    selo: seloMatch ? seloMatch[1] : '',
    cod_selo: codMatch ? codMatch[2] : '',
  };
}

function buildRgItem(numero, data, orgao) {
  const doc = normalizeText(numero);
  if (!doc) return null;
  return {
    tipo: 'RG',
    documento: doc,
    orgao_emissor: normalizeText(orgao),
    uf_emissao: 'IG',
    data_emissao: normalizeDate(data),
  };
}

export function mapperHtmlToJson(root = document) {
  const observacao = getInputValue('observacao', root);
  const seloInfo = extractSelo(observacao);
  const seloInput = normalizeText(getInputValue('certidao.selo', root));
  const codInput = normalizeText(getInputValue('certidao.cod_selo', root));
  const plataformaId = normalizeText(getInputValue('certidao.plataformaId', root));
  const tipoCertidao = normalizeText(getSelectValue('certidao.tipo_certidao', root));
  const modalidade = normalizeText(getSelectValue('certidao.modalidade', root));
  const cartorioCns = normalizeText(getInputValue('certidao.cartorio_cns', root));
  const cotaEmolumentos = normalizeText(getInputValue('certidao.cota_emolumentos', root));
  const transcricao = getCheckboxValue('certidao.transcricao', root);

  const noivoCpf = normalizeCpfFields(getInputValue('CPFNoivo', root));
  const noivaCpf = normalizeCpfFields(getInputValue('CPFNoiva', root));

  const noivoRg = buildRgItem(
    getInputValue('numeroRGNoivo', root),
    getInputValue('dataExpedicaoRGNoivo', root),
    getSelectText('idOrgaoExpedidorRGNoivo', root),
  );
  const noivaRg = buildRgItem(
    getInputValue('numeroRGNoiva', root),
    getInputValue('dataExpedicaoRGNoiva', root),
    getSelectText('idOrgaoExpedidorRGNoiva', root),
  );

  const conjuges = [
    {
      nome_atual_habilitacao: normalizeText(getInputValue('nomeSolteiro', root)),
      cpf_sem_inscricao: noivoCpf.cpf_sem_inscricao,
      cpf: noivoCpf.cpf,
      novo_nome: normalizeText(getInputValue('nomeSolteiro', root)),
      nome_apos_casamento: normalizeText(getInputValue('nomeCasado', root)),
      data_nascimento: normalizeDate(getInputValue('dataNascimentoNoivo', root)),
      nacionalidade: normalizeText(getInputValue('nacionalidadeNoivo', root)),
      estado_civil: mapEstadoCivil(getSelectValue('estadoCivilNoivo', root)),
      municipio_naturalidade: normalizeMunicipio(getInputValue('cidadeNascimentoNoivo', root)),
      uf_naturalidade: normalizeUf(getInputValue('ufNascimentoNoivo', root), { forceIg: true }),
      genitores: buildGenitores(
        getInputValue('nomePaiNoivo', root),
        getInputValue('nomeMaeNoivo', root),
      ),
    },
    {
      nome_atual_habilitacao: normalizeText(getInputValue('nomeSolteira', root)),
      cpf_sem_inscricao: noivaCpf.cpf_sem_inscricao,
      cpf: noivaCpf.cpf,
      novo_nome: normalizeText(getInputValue('nomeSolteira', root)),
      nome_apos_casamento: normalizeText(getInputValue('nomeCasada', root)),
      data_nascimento: normalizeDate(getInputValue('dataNascimentoNoiva', root)),
      nacionalidade: normalizeText(getInputValue('nacionalidadeNoiva', root)),
      estado_civil: mapEstadoCivil(getSelectValue('estadoCivilNoiva', root)),
      municipio_naturalidade: normalizeMunicipio(getInputValue('cidadeNascimentoNoiva', root)),
      uf_naturalidade: normalizeUf(getInputValue('ufNascimentoNoiva', root), { forceIg: true }),
      genitores: buildGenitores(
        getInputValue('nomePaiNoiva', root),
        getInputValue('nomeMaeNoiva', root),
      ),
    },
  ];

  const anotacoes = {
    primeiro_conjuge: [],
    segundo_conjuge: [],
  };
  if (noivoRg) anotacoes.primeiro_conjuge.push(noivoRg);
  if (noivaRg) anotacoes.segundo_conjuge.push(noivaRg);

  return {
    certidao: {
      plataformaId,
      tipo_registro: 'casamento',
      tipo_certidao: tipoCertidao,
      transcricao,
      cartorio_cns: cartorioCns,
      selo: seloInput || seloInfo.selo,
      cod_selo: codInput || seloInfo.cod_selo,
      modalidade,
      cota_emolumentos: cotaEmolumentos,
      cota_emolumentos_isento: false,
    },
    registro: {
      conjuges,
      matricula: '',
      data_celebracao: normalizeDate(getInputValue('dataCasamento', root)),
      regime_bens: mapRegimeBens(getSelectValue('regimeBens', root)),
      data_registro: normalizeDate(getInputValue('dataTermo', root)),
      averbacao_anotacao: normalizeText(observacao),
      anotacoes_cadastro: anotacoes,
    },
  };
}
