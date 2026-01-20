import { normalizeDate } from '../../shared/validators/date';
import { normalizeTime } from '../../shared/validators/time';
import { normalizeCpf } from '../../shared/validators/cpf';
import { adjustMatricula } from '../../shared/matricula/cnj';

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
      nome_completo: get('input[name="nomeFalecido"]'),
      sexo: getRadio('sexoFalecido'),
      data_nascimento: normalizeDate(get('input[name="dataNascimentoFalecido"]')),
      data_obito: normalizeDate(get('input[name="dataObito"]')),
      hora_obito: normalizeTime(get('input[name="horaObito"]')),
      local_obito: get('input[name="localObito"]'),
      municipio_obito: get('input[name="municipioObito"]'),
      uf_municipio_obito: getSelect('select[name="ufMunicipioObito"]'),
      estado_civil: getRadio('estadoCivilFalecido'),
      profissao: get('input[name="profissaoFalecido"]'),
      naturalidade: get('input[name="naturalidadeFalecido"]'),
      nacionalidade: get('input[name="nacionalidadeFalecido"]'),
      nome_pai: get('input[name="nomePaiFalecido"]'),
      nome_mae: get('input[name="nomeMaeFalecido"]'),
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
        return sem ? '' : normalizeCpf(get('input[name="cpfFalecido"]'));
      })(),
      rg: get('input[name="rgFalecido"]'),
      orgao_expedidor_rg: get('input[name="orgaoExpedidorRG"]'),
      titulo_eleitor: get('input[name="tituloEleitorFalecido"]'),
      zona_eleitoral: get('input[name="zonaEleitoralFalecido"]'),
      secao_eleitoral: get('input[name="secaoEleitoralFalecido"]'),
      passaporte: get('input[name="passaporteFalecido"]'),
      orgao_expedidor_passaporte: get('input[name="orgaoExpedidorPassaporte"]'),
      pis: get('input[name="pisFalecido"]'),
      orgao_expedidor_pis: get('input[name="orgaoExpedidorPIS"]'),
      cns: get('input[name="cnsFalecido"]'),
      orgao_expedidor_cns: get('input[name="orgaoExpedidorCNS"]'),
      certidao: get('input[name="certidaoFalecido"]'),
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
          const livro = padLeft((doc.getElementById('matricula-livro') || { value: '' }).value, 5);
          const folha = padLeft((doc.getElementById('matricula-folha') || { value: '' }).value, 3);
          const termo = padLeft((doc.getElementById('matricula-termo') || { value: '' }).value, 7);
          const base30 = `${cns}01` + `55${ano}4${livro}${folha}${termo}`;
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
          return candidate
            ? adjustMatricula
              ? adjustMatricula(
                  candidate,
                  (doc.querySelector('textarea[name="observacoesFalecido"]') || { value: '' })
                    .value,
                ) || candidate
              : candidate
            : '';
        } catch (e) {
          return '';
        }
      })(),
      observacoes: get('textarea[name="observacoesFalecido"]'),
      declaracao_obito: get('input[name="declaracaoObito"]'),
      data_declaracao_obito: normalizeDate(get('input[name="dataDeclaracaoObito"]')),
      causa_mortis: get('input[name="causaMortis"]'),
      medico: get('input[name="medico"]'),
      crm_medico: get('input[name="crmMedico"]'),
      uf_crm_medico: get('input[name="ufCrmMedico"]'),
      local_sepultamento: get('input[name="localSepultamento"]'),
      municipio_sepultamento: get('input[name="municipioSepultamento"]'),
      uf_municipio_sepultamento: getSelect('select[name="ufMunicipioSepultamento"]'),
      data_sepultamento: normalizeDate(get('input[name="dataSepultamento"]')),
      hora_sepultamento: normalizeTime(get('input[name="horaSepultamento"]')),
      informante: get('input[name="informante"]'),
      parentesco_informante: get('input[name="parentescoInformante"]'),
      cpf_informante: normalizeCpf(get('input[name="cpfInformante"]')),
      rg_informante: get('input[name="rgInformante"]'),
      orgao_expedidor_rg_informante: get('input[name="orgaoExpedidorRGInformante"]'),
      endereco_informante: get('input[name="enderecoInformante"]'),
      telefone_informante: get('input[name="telefoneInformante"]'),
      email_informante: get('input[name="emailInformante"]'),
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
      data_retorno_cartorio: normalizeDate(get('input[name="dataRetornoCartorio"]')),
      motivo_retorno_cartorio: get('input[name="motivoRetornoCartorio"]'),
      observacoes_retorno_cartorio: get('textarea[name="observacoesRetornoCartorio"]'),
      data_exclusao_cartorio: normalizeDate(get('input[name="dataExclusaoCartorio"]')),
      motivo_exclusao_cartorio: get('input[name="motivoExclusaoCartorio"]'),
      observacoes_exclusao_cartorio: get('textarea[name="observacoesExclusaoCartorio"]'),
      data_arquivamento_cartorio: normalizeDate(get('input[name="dataArquivamentoCartorio"]')),
      motivo_arquivamento_cartorio: get('input[name="motivoArquivamentoCartorio"]'),
      observacoes_arquivamento_cartorio: get('textarea[name="observacoesArquivamentoCartorio"]'),
      data_reabertura_cartorio: normalizeDate(get('input[name="dataReaberturaCartorio"]')),
      motivo_reabertura_cartorio: get('input[name="motivoReaberturaCartorio"]'),
      observacoes_reabertura_cartorio: get('textarea[name="observacoesReaberturaCartorio"]'),
      data_transferencia_cartorio: normalizeDate(get('input[name="dataTransferenciaCartorio"]')),
      motivo_transferencia_cartorio: get('input[name="motivoTransferenciaCartorio"]'),
      observacoes_transferencia_cartorio: get('textarea[name="observacoesTransferenciaCartorio"]'),
      data_averbacao_cartorio: normalizeDate(get('input[name="dataAverbacaoCartorio"]')),
      motivo_averbacao_cartorio: get('input[name="motivoAverbacaoCartorio"]'),
      observacoes_averbacao_cartorio: get('textarea[name="observacoesAverbacaoCartorio"]'),
      data_anotacao_cartorio: normalizeDate(get('input[name="dataAnotacaoCartorio"]')),
      motivo_anotacao_cartorio: get('input[name="motivoAnotacaoCartorio"]'),
      observacoes_anotacao_cartorio: get('textarea[name="observacoesAnotacaoCartorio"]'),
    },
  };
}
