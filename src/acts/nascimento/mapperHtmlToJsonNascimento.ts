// mapperHtmlToJsonNascimento.ts
// Gera o payload CRC no padrão FINAL (certidao + registro) igual aos exemplos "corretos".

type DocLike = Document | HTMLElement | null;

function q<T extends Element = Element>(doc: DocLike, sel: string): T | null {
  return (doc as any)?.querySelector?.(sel) ?? null;
}
function v(doc: DocLike, sel: string): string {
  const el: any = q(doc, sel);
  if (!el) return '';
  const raw = el.value != null ? el.value : el.innerText;
  return String(raw ?? '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
}
function checked(doc: DocLike, sel: string): boolean {
  const el: any = q(doc, sel);
  return !!el?.checked;
}
function onlyDigits(x: any): string {
  return String(x ?? '').replace(/\D+/g, '');
}
function upper(x: any): string {
  return String(x ?? '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}
function normDateBR(x: any): string {
  const s = String(x ?? '').trim();
  if (!s) return '';
  // mantém se já estiver DD/MM/AAAA
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  // não inventa formato: devolve limpo
  return s;
}
function normHoraHHMM(x: any): string {
  const s = String(x ?? '').trim();
  if (!s) return '';
  const m = s.match(/(\d{1,2})\s*:\s*(\d{2})/);
  if (!m) return '';
  const hh = String(m[1]).padStart(2, '0');
  const mm = String(m[2]);
  return `${hh}:${mm}`;
}
function naoConstaIfEmpty(x: any): string {
  const s = upper(x);
  return s ? s : 'NÃO CONSTA';
}
function ufOrNC(x: any): string {
  const s = upper(x);
  return s ? s : 'N/C';
}

const CARTORIO_EMISSOR_CNS_DEFAULT = '163659';
const PLATAFORMA_ID = 'certidao-eletronica';
const TIPO_CERTIDAO_PADRAO = 'Breve relato';

function parseGemeos(raw: string): Array<{ nome: string; matricula: string }> {
  // textarea ui.gemeos_irmao_raw: aceita "nome|matricula" ou "nome - matricula" por linha
  const lines = String(raw ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  return lines
    .map((line) => {
      let nomeRaw = '';
      let matRaw = '';

      if (line.includes('|')) {
        [nomeRaw, matRaw] = line.split('|').map((s) => s.trim());
      } else {
        // tenta usar o ÚLTIMO traço/emdash como separador (preserva nomes com hífen)
        const dashPos = Math.max(line.lastIndexOf('-'), line.lastIndexOf('—'));
        if (dashPos > 0) {
          const right = line.slice(dashPos + 1).trim();
          if (/\d/.test(right)) {
            nomeRaw = line.slice(0, dashPos).trim();
            matRaw = right;
          } else {
            // se depois do traço não há dígitos, trata tudo como nome
            nomeRaw = line;
          }
        } else {
          // sem separador: se for quase só dígitos => matrícula, senão => nome
          const digitsOnly = onlyDigits(line);
          if (digitsOnly && digitsOnly.length >= 3 && digitsOnly.length <= 20 && digitsOnly.length >= Math.max(3, Math.floor(line.length / 2))) {
            matRaw = line;
          } else {
            nomeRaw = line;
          }
        }
      }

      return {
        nome: upper(nomeRaw ?? ''),
        matricula: onlyDigits(matRaw ?? ''),
      };
    })
    .filter((x) => x.nome || x.matricula);
}

function parseAnotacoesCadastro(raw: string): any[] {
  // textarea ui.anotacoes_raw: "tipo|documento|orgao_emissor|uf_emissao|data_emissao" por linha
  const lines = String(raw ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  return lines
    .map((line) => {
      const parts = line.split('|').map((p) => p.trim());
      const [tipo, documento, orgao_emissor, uf_emissao, data_emissao] = parts;
      if (!tipo && !documento && !orgao_emissor && !uf_emissao && !data_emissao) return null;

      return {
        tipo: upper(tipo ?? ''),
        documento: String(documento ?? '').trim(),
        orgao_emissor: upper(orgao_emissor ?? ''),
        uf_emissao: upper(uf_emissao ?? ''),
        data_emissao: normDateBR(data_emissao ?? ''),
      };
    })
    .filter(Boolean) as any[];
}

export function mapperHtmlToJsonNascimento(doc?: DocLike) {
  const d: DocLike = doc || document;

  // ===== certidao =====
  const cartorioCnsFromBind =
    v(d, 'input[data-bind="certidao.cartorio_cns"]') ||
    v(d, '[data-bind="certidao.cartorio_cns"]');

  const cartorio_cns = onlyDigits(cartorioCnsFromBind) || CARTORIO_EMISSOR_CNS_DEFAULT;

  // ===== registro (campos principais) =====
  const nome_completo = upper(
    v(d, '[data-bind="registro.nome_completo"]') ||
      v(d, 'input[name="nomeCompleto"]') ||
      v(d, '#nomeCompleto'),
  );

  const data_registro = normDateBR(
    v(d, '[data-bind="registro.data_registro"]') || v(d, 'input[name="dataRegistro"]') || v(d, '#dataRegistro'),
  );

  // data nascimento + ignorar
  const dnIgn = checked(d, '#dn-ign') || checked(d, '[data-bind="registro.data_nascimento_ignorada"]');
  const dnVal = normDateBR(v(d, '[data-bind="registro.data_nascimento"]') || v(d, '#dn') || v(d, 'input[name="dataNascimento"]'));
  const data_nascimento_ignorada = dnIgn || !dnVal;
  const data_nascimento = data_nascimento_ignorada ? '' : dnVal;

  // hora nascimento + ignorar
  const hnIgn = checked(d, '#hn-ign') || checked(d, '[data-bind="registro.hora_nascimento_ignorada"]');
  const hnVal = normHoraHHMM(v(d, '[data-bind="registro.hora_nascimento"]') || v(d, '#hn') || v(d, 'input[name="horaNascimento"]'));
  const hora_nascimento_ignorada = hnIgn || !hnVal;
  const hora_nascimento = hora_nascimento_ignorada ? '' : hnVal;

  // sexo + sexo_outros
  const sexoRaw = (v(d, 'select[data-bind="registro.sexo"]') || v(d, '#sexo') || '').toLowerCase();
  let sexo: 'masculino' | 'feminino' | 'ignorado' | 'outros' = 'ignorado';
  if (sexoRaw === 'masculino' || sexoRaw === 'm') sexo = 'masculino';
  else if (sexoRaw === 'feminino' || sexoRaw === 'f') sexo = 'feminino';
  else if (sexoRaw === 'outros' || sexoRaw === 'outro') sexo = 'outros';
  else sexo = 'ignorado';

  const sexo_outros_raw = v(d, '#sexo-outros') || v(d, '[data-bind="registro.sexo_outros"]');
  const sexo_outros = sexo === 'outros' ? String(sexo_outros_raw || '').trim() : '';

  // local nascimento
  const local_nascimento = upper(v(d, '#local-nascimento') || v(d, '[data-bind="registro.local_nascimento"]'));

  // município/uf nascimento (principal)
  const municipio_nascimento = upper(v(d, '[data-bind="registro.municipio_nascimento"]'));
  const uf_nascimento = upper(v(d, 'select[data-bind="registro.uf_nascimento"]'));

  // naturalidade: se toggle NÃO marcado, replica do nascimento
  const natDiff = checked(d, '#naturalidade-diferente') || checked(d, '[data-bind="ui.naturalidade_diferente"]');
  const municipio_naturalidade = natDiff
    ? upper(v(d, '[data-bind="registro.municipio_naturalidade"]'))
    : municipio_nascimento;

  const uf_naturalidade = natDiff
    ? upper(v(d, 'select[data-bind="registro.uf_naturalidade"]'))
    : uf_nascimento;

  // CPF: origem é o checkbox "Não inscrito". Se marcado => cpf="" e cpf_sem_inscricao=true
  const cpfSem = checked(d, '#cpf-sem') || checked(d, '[data-bind="registro.cpf_sem_inscricao"]');
  const cpfDigits = onlyDigits(v(d, '#cpf') || v(d, '[data-bind="registro.cpf"]'));
  const cpf_sem_inscricao = !!cpfSem;
  const cpf = cpf_sem_inscricao ? '' : cpfDigits;

  // matrícula: já vem gerada no input readonly
  const matricula = onlyDigits(v(d, '#matricula') || v(d, '[data-bind="registro.matricula"]'));

  // gemeos
  const gemeosQtdRaw = v(d, '[data-bind="registro.gemeos.quantidade"]') || '0';
  const gemeosQtd = onlyDigits(gemeosQtdRaw) || '0';
  const gemeosIrmaoRaw = v(d, '[data-bind="ui.gemeos_irmao_raw"]');
  const gemeosIrmao = gemeosQtd === '0' ? [] : parseGemeos(gemeosIrmaoRaw);

  // filiação: vem do seu HTML (ui.mae_*, ui.pai_*)
  const mae_nome = upper(v(d, 'input[data-bind="ui.mae_nome"]'));
  const mae_cidade = upper(v(d, 'input[data-bind="ui.mae_cidade"]'));
  const mae_uf = upper(v(d, 'select[data-bind="ui.mae_uf"]'));
  const mae_avo_materna = upper(v(d, 'input[data-bind="ui.mae_avo_materna"]'));
  const mae_avo_materno = upper(v(d, 'input[data-bind="ui.mae_avo_materno"]'));

  const pai_nome = upper(v(d, 'input[data-bind="ui.pai_nome"]'));
  const pai_cidade = upper(v(d, 'input[data-bind="ui.pai_cidade"]'));
  const pai_uf = upper(v(d, 'select[data-bind="ui.pai_uf"]'));
  const pai_avo_paterna = upper(v(d, 'input[data-bind="ui.pai_avo_paterna"]'));
  const pai_avo_paterno = upper(v(d, 'input[data-bind="ui.pai_avo_paterno"]'));

  const filiacao: Array<{
    nome: string;
    municipio_nascimento: string;
    uf_nascimento: string;
    avos: string;
  }> = [];

  if (mae_nome) {
    const avos = [mae_avo_materna, mae_avo_materno].filter(Boolean).join('; ');
    filiacao.push({
      nome: mae_nome,
      municipio_nascimento: naoConstaIfEmpty(mae_cidade),
      uf_nascimento: ufOrNC(mae_uf),
      avos: avos,
    });
  }

  if (pai_nome) {
    const avos = [pai_avo_paterna, pai_avo_paterno].filter(Boolean).join('; ');
    filiacao.push({
      nome: pai_nome,
      municipio_nascimento: naoConstaIfEmpty(pai_cidade),
      uf_nascimento: ufOrNC(pai_uf),
      avos: avos,
    });
  }

  // DNV / averbação / anotacoes cadastro
  const numero_dnv = naoConstaIfEmpty(v(d, '[data-bind="registro.numero_dnv"]'));
  const averbacao_anotacao = String(v(d, '[data-bind="registro.averbacao_anotacao"]') || '').trim();
  const anotacoes_cadastro = parseAnotacoesCadastro(v(d, '[data-bind="ui.anotacoes_raw"]'));

  // ===== payload final (igual exemplos) =====
  const payload: any = {
    certidao: {
      plataformaId: PLATAFORMA_ID,
      tipo_registro: 'nascimento',
      tipo_certidao: TIPO_CERTIDAO_PADRAO,
      transcricao: false,
      cartorio_cns: CARTORIO_EMISSOR_CNS_DEFAULT, // sempre o CNS do cartório emissor (163659)
      selo: '',
      cod_selo: '',
      modalidade: 'eletronica',
      cota_emolumentos: '',
      cota_emolumentos_isento: false,
    },
    registro: {
      nome_completo,
      cpf_sem_inscricao,
      cpf,
      matricula,
      data_registro,
      data_nascimento_ignorada,
      data_nascimento,
      hora_nascimento_ignorada,
      hora_nascimento,
      municipio_naturalidade,
      uf_naturalidade,
      local_nascimento,
      municipio_nascimento,
      uf_nascimento,
      sexo,
      gemeos: {
        quantidade: String(gemeosQtd),
        irmao: gemeosIrmao,
      },
      filiacao,
      numero_dnv,
      averbacao_anotacao,
      anotacoes_cadastro,
    },
  };

  // sexo_outros só existe quando sexo="outros"
  if (sexo === 'outros') {
    payload.registro.sexo_outros = String(sexo_outros || '').trim();
  }

  return payload;
}

export const mapperHtmlToJson = mapperHtmlToJsonNascimento;
export default mapperHtmlToJsonNascimento;
