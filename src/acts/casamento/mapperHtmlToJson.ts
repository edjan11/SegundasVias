import { normalizeDate } from '../../shared/validators/date';
import { normalizeTime } from '../../shared/validators/time';
import { normalizeCpf } from '../../shared/validators/cpf';

export function mapperHtmlToJson(doc) {
  const get = (sel) => (doc as any).querySelector(sel)?.value || '';
  const getText = (sel) => (doc as any).querySelector(sel)?.textContent || '';
  const getChecked = (sel) => !!(doc as any).querySelector(sel)?.checked;
  const getRadio = (name) => {
    const el = (doc as any).querySelector(`input[name="${name}"]:checked`);
    return el ? (el as any).value : '';
  };
  const getSelect = (sel) => {
    const el = (doc as any).querySelector(sel);
    return el ? (el as any).value : '';
  };
  const getAll = (sel) =>
    Array.from((doc as any).querySelectorAll(sel)).map((el) => (el as any).value || '');

  return {
    registro: {
      nome_completo: get('input[name="nomeCompleto"]'),
      sexo: getRadio('sexo'),
      data_nascimento: normalizeDate(get('input[name="dataNascimento"]')),
      data_casamento: normalizeDate(get('input[name="dataCasamento"]')),
      hora_casamento: normalizeTime(get('input[name="horaCasamento"]')),
      local_casamento: get('input[name="localCasamento"]'),
      municipio_casamento: get('input[name="municipioCasamento"]'),
      uf_municipio_casamento: getSelect('select[name="ufMunicipioCasamento"]'),
      estado_civil: getRadio('estadoCivil'),
      profissao: get('input[name="profissao"]'),
      naturalidade: get('input[name="naturalidade"]'),
      nacionalidade: get('input[name="nacionalidade"]'),
      nome_pai: get('input[name="nomePai"]'),
      nome_mae: get('input[name="nomeMae"]'),
      cpf_sem_inscricao: (function () {
        return (
          !!doc.querySelector('input[data-bind="registro.cpf_sem_inscricao"]')?.checked ||
          !!(doc.querySelector('#cpf-sem') as any)?.checked ||
          false
        );
      })(),
      cpf: (function () {
        const sem =
          !!doc.querySelector('input[data-bind="registro.cpf_sem_inscricao"]')?.checked ||
          !!(doc.querySelector('#cpf-sem') as any)?.checked ||
          false;
        return sem ? '' : normalizeCpf(get('input[name="cpf"]'));
      })(),
      rg: get('input[name="rg"]'),
      orgao_expedidor_rg: get('input[name="orgaoExpedidorRG"]'),
      titulo_eleitor: get('input[name="tituloEleitor"]'),
      zona_eleitoral: get('input[name="zonaEleitoral"]'),
      secao_eleitoral: get('input[name="secaoEleitoral"]'),
      passaporte: get('input[name="passaporte"]'),
      orgao_expedidor_passaporte: get('input[name="orgaoExpedidorPassaporte"]'),
      pis: get('input[name="pis"]'),
      orgao_expedidor_pis: get('input[name="orgaoExpedidorPIS"]'),
      cns: get('input[name="cns"]'),
      orgao_expedidor_cns: get('input[name="orgaoExpedidorCNS"]'),
      certidao: get('input[name="certidao"]'),
      livro: get('input[name="livro"]'),
      folha: get('input[name="folha"]'),
      termo: get('input[name="termo"]'),
      data_termo: normalizeDate(get('input[name="dataTermo"]')),
      cartorio_cns:
        get('input[name="certidao.cartorio_cns"]') ||
        doc.querySelector('input[data-bind="certidao.cartorio_cns"]')?.value ||
        '163659',
      matricula: (function () {
        const m =
          get('input[name="matricula"]') ||
          doc.querySelector('#matricula')?.value ||
          doc.querySelector('input[data-bind="registro.matricula"]')?.value ||
          '';
        if (m) return m;
        try {
          const digitsOnly = (v) => String(v || '').replace(/\D/g, '');
          const padLeft = (v, s) => digitsOnly(v).padStart(s, '0').slice(-s);
          const cns = digitsOnly(
            (doc.querySelector('input[name="certidao.cartorio_cns"]') || { value: '' }).value ||
              '163659',
          );
          const dt = (doc.querySelector('input[name="dataTermo"]') || { value: '' }).value || '';
          const ano = (dt.match(/(\d{4})$/) || [])[1] || '';
          const tipo =
            (doc.querySelector('select[name="tipoCasamento"]') || { value: '' }).value || '';
          const tipoAto = tipo === 'R' ? '3' : tipo === 'C' ? '2' : '';
          const livro = padLeft((doc.getElementById('matricula-livro') || { value: '' }).value, 5);
          const folha = padLeft((doc.getElementById('matricula-folha') || { value: '' }).value, 3);
          const termo = padLeft((doc.getElementById('matricula-termo') || { value: '' }).value, 7);
          const base30 = `${cns}01` + `55${ano}${tipoAto}${livro}${folha}${termo}`;
          if (!base30 || base30.length !== 30) return '';
          const calcDv = (base) => {
            let s1 = 0;
            for (let i = 0; i < 30; i++) s1 += Number(base[i]) * (31 - i);
            let d1 = 11 - (s1 % 11);
            d1 = d1 === 11 ? 0 : d1 === 10 ? 1 : d1;
            const seq31 = base + String(d1);
            let s2 = 0;
            for (let i = 0; i < 31; i++) s2 += Number(seq31[i]) * (32 - i);
            let d2 = 11 - (s2 % 11);
            d2 = d2 === 11 ? 0 : d2 === 10 ? 1 : d2;
            return `${d1}${d2}`;
          };
          const dv = calcDv(base30);
          const candidate = dv ? base30 + dv : '';
          // For casamento: return computed candidate directly (no oficio/observacoes prompts)
          return candidate || '';
        } catch (e) {
          return '';
        }
      })(),
      observacoes: get('textarea[name="observacoes"]'),
      data_registro: normalizeDate(get('input[name="dataRegistro"]')),
      oficial: get('input[name="oficial"]'),
      id_assinante: getSelect('select[name="idAssinante"]'),
      nome_assinante: getText('select[name="idAssinante"] option:checked'),
      titulo_livro: get('input[name="tituloLivro"]'),
      municipio_cartorio: get('input[name="municipioCartorio"]'),
      uf_cartorio: getSelect('select[name="ufCartorio"]'),
      data_emissao: normalizeDate(get('input[name="dataEmissao"]')),
      via: get('input[name="via"]'),
      motivo: get('input[name="motivo"]'),
      solicitante: get('input[name="solicitante"]'),
      cpf_solicitante: normalizeCpf(get('input[name="cpfSolicitante"]')),
      rg_solicitante: get('input[name="rgSolicitante"]'),
      orgao_expedidor_rg_solicitante: get('input[name="orgaoExpedidorRGSolicitante"]'),
      endereco_solicitante: get('input[name="enderecoSolicitante"]'),
      telefone_solicitante: get('input[name="telefoneSolicitante"]'),
      email_solicitante: get('input[name="emailSolicitante"]'),
      observacoes_solicitante: get('textarea[name="observacoesSolicitante"]'),
      data_solicitacao: normalizeDate(get('input[name="dataSolicitacao"]')),
      protocolo: get('input[name="protocolo"]'),
      status: get('input[name="status"]'),
      data_status: normalizeDate(get('input[name="dataStatus"]')),
      observacoes_status: get('textarea[name="observacoesStatus"]'),
      data_entrega: normalizeDate(get('input[name="dataEntrega"]')),
      responsavel_entrega: get('input[name="responsavelEntrega"]'),
      observacoes_entrega: get('textarea[name="observacoesEntrega"]'),
      data_cancelamento: normalizeDate(get('input[name="dataCancelamento"]')),
      motivo_cancelamento: get('input[name="motivoCancelamento"]'),
      observacoes_cancelamento: get('textarea[name="observacoesCancelamento"]'),
      data_retorno: normalizeDate(get('input[name="dataRetorno"]')),
      motivo_retorno: get('input[name="motivoRetorno"]'),
      observacoes_retorno: get('textarea[name="observacoesRetorno"]'),
      data_arquivamento: normalizeDate(get('input[name="dataArquivamento"]')),
      motivo_arquivamento: get('input[name="motivoArquivamento"]'),
      observacoes_arquivamento: get('textarea[name="observacoesArquivamento"]'),
      data_exclusao: normalizeDate(get('input[name="dataExclusao"]')),
      motivo_exclusao: get('input[name="motivoExclusao"]'),
      observacoes_exclusao: get('textarea[name="observacoesExclusao"]'),
      data_reabertura: normalizeDate(get('input[name="dataReabertura"]')),
      motivo_reabertura: get('input[name="motivoReabertura"]'),
      observacoes_reabertura: get('textarea[name="observacoesReabertura"]'),
      data_transferencia: normalizeDate(get('input[name="dataTransferencia"]')),
      motivo_transferencia: get('input[name="motivoTransferencia"]'),
      observacoes_transferencia: get('textarea[name="observacoesTransferencia"]'),
      data_averbacao: normalizeDate(get('input[name="dataAverbacao"]')),
      motivo_averbacao: get('input[name="motivoAverbacao"]'),
      observacoes_averbacao: get('textarea[name="observacoesAverbacao"]'),
      data_anotacao: normalizeDate(get('input[name="dataAnotacao"]')),
      motivo_anotacao: get('input[name="motivoAnotacao"]'),
      observacoes_anotacao: get('textarea[name="observacoesAnotacao"]'),
    },
  };
}
