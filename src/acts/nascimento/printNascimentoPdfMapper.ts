type DocLike = Document | HTMLElement | null;

function q<T extends Element = Element>(doc: DocLike, sel: string): T | null {
  return (doc as any)?.querySelector?.(sel) ?? null;
}

function valueOf(doc: DocLike, sel: string): string {
  const el: any = q(doc, sel);
  if (!el) return '';
  if (el.value != null) return String(el.value ?? '').trim();
  return String(el.textContent ?? '').trim();
}

function isChecked(doc: DocLike, sel: string): boolean {
  const el: any = q(doc, sel);
  return !!el?.checked;
}

function normalizeSpace(value: string): string {
  return String(value || '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function upper(value: string): string {
  return normalizeSpace(value).toUpperCase();
}

function parseDateParts(value: string): { dd: string; mm: string; yyyy: string } | null {
  const raw = normalizeSpace(value);
  if (!raw) return null;
  const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return { dd: m[1], mm: m[2], yyyy: m[3] };
}

function buildDateExtenso(value: string): string {
  const parts = parseDateParts(value);
  if (!parts) return '';
  const meses = [
    'JANEIRO',
    'FEVEREIRO',
    'MARCO',
    'ABRIL',
    'MAIO',
    'JUNHO',
    'JULHO',
    'AGOSTO',
    'SETEMBRO',
    'OUTUBRO',
    'NOVEMBRO',
    'DEZEMBRO',
  ];
  const idx = Number(parts.mm) - 1;
  const mes = meses[idx] || '';
  if (!mes) return '';
  return `${parts.dd} DE ${mes} DE ${parts.yyyy}`;
}

function formatHoraForPdf(value: string): string {
  const raw = normalizeSpace(value);
  if (!raw) return '';
  const m = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return upper(raw);
  const hh = String(m[1]).padStart(2, '0');
  const mm = String(m[2]);
  return `${hh}:${mm} HORAS`;
}

function joinCityUf(city: string, uf: string): string {
  const c = upper(city);
  const u = upper(uf);
  if (!c && !u) return '';
  if (c && u) return `${c}/${u}`;
  return c || u;
}

export function buildNascimentoPdfDataFromForm(doc?: DocLike) {
  const d: DocLike = doc || document;

  const dataRegistro = valueOf(d, 'input[data-bind="registro.data_registro"]');
  const dataNasc = valueOf(d, 'input[data-bind="registro.data_nascimento"]');
  const dataNascIgn = isChecked(d, 'input[data-bind="registro.data_nascimento_ignorada"]');
  const horaNasc = valueOf(d, 'input[data-bind="registro.hora_nascimento"]');
  const horaNascIgn = isChecked(d, 'input[data-bind="registro.hora_nascimento_ignorada"]');

  const nome = upper(valueOf(d, 'input[data-bind="registro.nome_completo"]'));
  const cpf = normalizeSpace(valueOf(d, 'input[data-bind="registro.cpf"]'));
  const matricula = normalizeSpace(valueOf(d, 'input[data-bind="registro.matricula"]'));
  const livro = normalizeSpace(valueOf(d, 'input[data-bind="ui.matricula_livro"]'));
  const folha = normalizeSpace(valueOf(d, 'input[data-bind="ui.matricula_folha"]'));
  const termo = normalizeSpace(valueOf(d, 'input[data-bind="ui.matricula_termo"]'));
  const dnv = normalizeSpace(valueOf(d, 'input[data-bind="registro.numero_dnv"]'));

  const sexo = upper(valueOf(d, 'select[data-bind="registro.sexo"]'));

  const localNasc = upper(valueOf(d, 'input[data-bind="registro.local_nascimento"]'));
  const municipioNasc = upper(valueOf(d, 'input[data-bind="registro.municipio_nascimento"]'));
  const ufNasc = upper(valueOf(d, 'select[data-bind="registro.uf_nascimento"]'));

  const municipioNat = upper(valueOf(d, 'input[data-bind="registro.municipio_naturalidade"]')) || municipioNasc;
  const ufNat = upper(valueOf(d, 'select[data-bind="registro.uf_naturalidade"]')) || ufNasc;

  const maeNome = upper(valueOf(d, 'input[data-bind="ui.mae_nome"]'));
  const maeCidade = upper(valueOf(d, 'input[data-bind="ui.mae_cidade"]'));
  const maeUf = upper(valueOf(d, 'select[data-bind="ui.mae_uf"]'));
  const maeAvoMaterna = upper(valueOf(d, 'input[data-bind="ui.mae_avo_materna"]'));
  const maeAvoMaterno = upper(valueOf(d, 'input[data-bind="ui.mae_avo_materno"]'));
  const maeAvos = [maeAvoMaterna, maeAvoMaterno].filter(Boolean).join('; ');

  const paiNome = upper(valueOf(d, 'input[data-bind="ui.pai_nome"]'));
  const paiCidade = upper(valueOf(d, 'input[data-bind="ui.pai_cidade"]'));
  const paiUf = upper(valueOf(d, 'select[data-bind="ui.pai_uf"]'));
  const paiAvoPaterna = upper(valueOf(d, 'input[data-bind="ui.pai_avo_paterna"]'));
  const paiAvoPaterno = upper(valueOf(d, 'input[data-bind="ui.pai_avo_paterno"]'));
  const paiAvos = [paiAvoPaterna, paiAvoPaterno].filter(Boolean).join('; ');

  const genitor3Nome = upper(valueOf(d, 'input[data-bind="ui.genitor3_nome"]'));
  const genitor3Cidade = upper(valueOf(d, 'input[data-bind="ui.genitor3_cidade"]'));
  const genitor3Uf = upper(valueOf(d, 'select[data-bind="ui.genitor3_uf"]'));
  const genitor3Avo1 = upper(valueOf(d, 'input[data-bind="ui.genitor3_avo1"]'));
  const genitor3Avo2 = upper(valueOf(d, 'input[data-bind="ui.genitor3_avo2"]'));
  const genitor3Avos = [genitor3Avo1, genitor3Avo2].filter(Boolean).join('; ');

  const genitor4Nome = upper(valueOf(d, 'input[data-bind="ui.genitor4_nome"]'));
  const genitor4Cidade = upper(valueOf(d, 'input[data-bind="ui.genitor4_cidade"]'));
  const genitor4Uf = upper(valueOf(d, 'select[data-bind="ui.genitor4_uf"]'));
  const genitor4Avo1 = upper(valueOf(d, 'input[data-bind="ui.genitor4_avo1"]'));
  const genitor4Avo2 = upper(valueOf(d, 'input[data-bind="ui.genitor4_avo2"]'));
  const genitor4Avos = [genitor4Avo1, genitor4Avo2].filter(Boolean).join('; ');

  const gemeosQtd = normalizeSpace(valueOf(d, 'input[data-bind="registro.gemeos.quantidade"]'));
  const gemeo = Number(gemeosQtd || 0) > 0 ? 'SIM' : 'NAO';

  const cartorioCns = normalizeSpace(valueOf(d, 'input[data-bind="certidao.cartorio_cns"]'));
  const averbacao = upper(valueOf(d, 'textarea[data-bind="registro.averbacao_anotacao"]'));
  const anotacoes = upper(valueOf(d, 'textarea[data-bind="ui.anotacoes_raw"]'));

  const dataRegExtenso = buildDateExtenso(dataRegistro);
  const dataNascExtenso = dataNascIgn ? '' : buildDateExtenso(dataNasc);
  const dataNascParts = dataNascIgn ? null : parseDateParts(dataNasc);

  return {
    certidao: {
      cartorio_cns: cartorioCns,
    },
    registro: {
      nome_completo: nome,
      cpf,
      matricula,
      livro,
      folha,
      termo,
      numero_dnv: dnv,
      data_registro_extenso: dataRegExtenso,
      data_nascimento_extenso: dataNascExtenso,
      dia_nascimento: dataNascParts?.dd || '',
      mes_nascimento: dataNascParts?.mm || '',
      ano_nascimento: dataNascParts?.yyyy || '',
      hora_nascimento: horaNascIgn ? '' : formatHoraForPdf(horaNasc),
      sexo,
      naturalidade_municipio_uf: joinCityUf(municipioNat, ufNat),
      naturalidade_uf: ufNat,
      local_nascimento: localNasc,
      municipio_nascimento: municipioNasc,
      uf_nascimento: ufNasc,
      mae_nome: maeNome,
      mae_municipio: maeCidade,
      mae_uf: maeUf,
      mae_avos: maeAvos,
      pai_nome: paiNome,
      pai_municipio: paiCidade,
      pai_uf: paiUf,
      pai_avos: paiAvos,
      genitor3_nome: genitor3Nome,
      genitor3_municipio: genitor3Cidade,
      genitor3_uf: genitor3Uf,
      genitor3_avos: genitor3Avos,
      genitor4_nome: genitor4Nome,
      genitor4_municipio: genitor4Cidade,
      genitor4_uf: genitor4Uf,
      genitor4_avos: genitor4Avos,
      data_registro: dataRegistro,
      gemeo,
      averbacao_anotacao: averbacao,
      anotacoes_voluntarias: anotacoes,
    },
  };
}
