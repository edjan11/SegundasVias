/**
 * Servico de Recuperacao
 *
 * Endpoints de consulta: guiaPaga, dadosGuia, seloDigitalAplicado.
 * Usado para validacao de guias e consulta de selos existentes.
 */

import { SeloApiClient } from './seloApiClient';
import { StatusGuia } from './types';

export interface GuiaPagaResponse {
  flgPago: StatusGuia;
  numGuia: string;
  dataVencimento?: string;
  dataPagamento?: string;
  valorPago?: number;
}

export interface DadosGuiaResponse {
  numGuia: string;
  codCartorio: number;
  codTaxa: number;
  valor: number;
  dataEmissao: string;
  dataVencimento: string;
  dataPagamento?: string;
  flgPago: StatusGuia;
  taxas?: Array<{
    codigoGuiaTaxa?: string;
    codigoTaxa: number;
    descricaoResumida?: string;
    descricaoDetalhada?: string;
    quantidade?: number;
    quantidadeSelosAplicados?: number;
    selosAplicados?: Array<{
      numSelo: string;
      numChavePublica: string;
      dataHoraEmissao?: string;
      dataHoraAplicacao?: string;
    }>;
  }>;
  selosVinculados?: Array<{
    numSelo: string;
    numChavePublica: string;
    dataGeracao: string;
  }>;
}

export interface SeloAplicadoResponse {
  numSelo: string;
  numChavePublica: string;
  dataGeracao: string;
  codCartorio: number;
  codTaxa: number;
  nomeRegistrado?: string;
  dataAplicacao?: string;
  situacao: 'ATIVO' | 'CANCELADO' | 'UTILIZADO';
}

export class RecuperacaoService {
  private client: SeloApiClient;

  constructor(client: SeloApiClient) {
    this.client = client;
  }

  /**
   * Verifica se guia foi paga
   */
  async verificarGuiaPaga(numGuia: string, codCartorio: number): Promise<GuiaPagaResponse> {
    const response = await this.client.guiaPaga(numGuia, codCartorio);
    return this.parseGuiaPagaResponse(response);
  }

  /**
   * Consulta dados completos da guia
   */
  async consultarDadosGuia(numGuia: string, codCartorio: number): Promise<DadosGuiaResponse> {
    const response = await this.client.dadosGuia(numGuia, codCartorio);
    return this.parseDadosGuiaResponse(response);
  }

  /**
   * Consulta selo ja aplicado
   */
  async consultarSeloAplicado(numSelo: string): Promise<SeloAplicadoResponse> {
    const response = await this.client.seloDigitalAplicado(numSelo);
    return this.parseSeloAplicadoResponse(response);
  }

  /**
   * Valida se guia pode ser usada para gerar selo
   */
  async validarGuiaParaSelo(numGuia: string, codCartorio: number): Promise<{
    valida: boolean;
    motivo?: string;
    dadosGuia?: DadosGuiaResponse;
  }> {
    try {
      const dadosGuia = await this.consultarDadosGuia(numGuia, codCartorio);

      if (dadosGuia.flgPago !== 'paga') {
        return {
          valida: false,
          motivo: dadosGuia.flgPago === 'nao-paga'
            ? 'Guia ainda nao foi paga'
            : 'Status de pagamento da guia eh incerto',
          dadosGuia,
        };
      }

      if (dadosGuia.selosVinculados && dadosGuia.selosVinculados.length > 0) {
        return {
          valida: true,
          motivo: `Guia ja possui ${dadosGuia.selosVinculados.length} selo(s) vinculado(s). Voce pode reutilizar ou gerar novo.`,
          dadosGuia,
        };
      }

      return {
        valida: true,
        dadosGuia,
      };
    } catch (error) {
      return {
        valida: false,
        motivo: error instanceof Error ? error.message : 'Erro ao consultar guia',
      };
    }
  }

  /**
   * Lista selos vinculados a uma guia
   */
  async listarSelosDaGuia(numGuia: string, codCartorio: number): Promise<Array<{
    numSelo: string;
    numChavePublica: string;
    dataGeracao: string;
  }>> {
    const dadosGuia = await this.consultarDadosGuia(numGuia, codCartorio);
    return dadosGuia.selosVinculados || [];
  }

  /**
   * Parse da resposta de guiaPaga
   */
  private parseGuiaPagaResponse(response: any): GuiaPagaResponse {
    const guia = response?.guiaPagaResp || response?.guia || response || {};
    const flg = String(guia?.flgPago || '').trim().toUpperCase();
    const flgPago: StatusGuia = flg === 'S' ? 'paga' : flg === 'N' ? 'nao-paga' : 'desconhecido';

    return {
      flgPago,
      numGuia: String(guia?.numGuia || ''),
      dataVencimento: guia?.dataVencimento,
      dataPagamento: guia?.dataPagamento,
      valorPago: guia?.valorPago ? parseFloat(String(guia.valorPago).replace(',', '.')) : undefined,
    };
  }

  /**
   * Parse da resposta de dadosGuia
   */
  private parseDadosGuiaResponse(response: any): DadosGuiaResponse {
    const guia = response?.dadosGuia || response?.guia || response || {};

    const taxasRoot = guia?.taxas?.taxa || guia?.taxa;
    const taxasArray = Array.isArray(taxasRoot) ? taxasRoot : [taxasRoot].filter(Boolean);

    const taxas = taxasArray
      .map((t: any) => {
        const codigoTaxa = parseInt(String(t?.codigoTaxa ?? t?.codTaxa ?? '').trim(), 10);
        if (!Number.isFinite(codigoTaxa)) return null;

        const selosRoot = t?.selosAplicados?.selo || t?.selos?.selo;
        const selosArray = Array.isArray(selosRoot) ? selosRoot : [selosRoot].filter(Boolean);
        const selosAplicados = selosArray
          .map((s: any) => ({
            numSelo: String(s?.nrSelo ?? s?.numSelo ?? '').trim(),
            numChavePublica: String(s?.numeroChavePublica ?? s?.numChavePublica ?? '').trim(),
            dataHoraEmissao: String(s?.dataHoraEmissao ?? '').trim() || undefined,
            dataHoraAplicacao: String(s?.dataHoraAplicacao ?? '').trim() || undefined,
          }))
          .filter((s: any) => !!s.numSelo);

        return {
          codigoGuiaTaxa: String(t?.codigoGuiaTaxa ?? '').trim() || undefined,
          codigoTaxa,
          descricaoResumida: String(t?.descricaoResumida ?? '').trim() || undefined,
          descricaoDetalhada: String(t?.descricaoDetalhada ?? '').trim() || undefined,
          quantidade: t?.quantidade ? parseInt(String(t.quantidade), 10) : undefined,
          quantidadeSelosAplicados: t?.quantidadeSelosAplicados ? parseInt(String(t.quantidadeSelosAplicados), 10) : undefined,
          selosAplicados: selosAplicados.length ? selosAplicados : undefined,
        };
      })
      .filter((t: any) => !!t);

    const flatSelos = taxas.flatMap((t: any) => t.selosAplicados || []);

    const flgRaw = String(guia?.flgPago || '').trim().toUpperCase();
    const hasPaymentDate = !!String(guia?.dataPagamento || '').trim();
    const flgPago: StatusGuia = flgRaw === 'S' || hasPaymentDate
      ? 'paga'
      : flgRaw === 'N'
        ? 'nao-paga'
        : 'desconhecido';

    const codTaxaFromList = taxas[0]?.codigoTaxa;
    const codTaxaFallback = parseInt(String(guia?.codTaxa ?? guia?.codigoTaxa ?? '').trim(), 10);
    const codTaxa = Number.isFinite(codTaxaFromList) ? codTaxaFromList : (Number.isFinite(codTaxaFallback) ? codTaxaFallback : 0);

    const codCartorioRaw = parseInt(String(guia?.codCartorio ?? guia?.codigoCartorio ?? '').trim(), 10);
    const codCartorio = Number.isFinite(codCartorioRaw) ? codCartorioRaw : 0;

    const valorRaw = String(guia?.valorGuia ?? guia?.valor ?? '0').replace(',', '.');
    const valor = Number.parseFloat(valorRaw);

    return {
      numGuia: String(guia?.numGuia || ''),
      codCartorio,
      codTaxa,
      valor: Number.isFinite(valor) ? valor : 0,
      dataEmissao: String(guia?.dataEmissao || ''),
      dataVencimento: String(guia?.dataVencimento || ''),
      dataPagamento: String(guia?.dataPagamento || '').trim() || undefined,
      flgPago,
      taxas,
      selosVinculados: flatSelos.map((s: any) => ({
        numSelo: s.numSelo,
        numChavePublica: s.numChavePublica,
        dataGeracao: s.dataHoraAplicacao || s.dataHoraEmissao || '',
      })),
    };
  }

  /**
   * Parse da resposta de seloDigitalAplicado
   */
  private parseSeloAplicadoResponse(response: any): SeloAplicadoResponse {
    const selo = response?.dadosModeloSelo || response?.selo || response || {};

    return {
      numSelo: String(selo?.numSelo || ''),
      numChavePublica: String(selo?.numChavePublica || selo?.numeroChavePublica || ''),
      dataGeracao: String(selo?.dataGeracao || ''),
      codCartorio: parseInt(String(selo?.codCartorio || '0'), 10),
      codTaxa: parseInt(String(selo?.codTaxa || '0'), 10),
      nomeRegistrado: selo?.nomeRegistrado,
      dataAplicacao: selo?.dataAplicacao,
      situacao: selo?.situacao || 'ATIVO',
    };
  }
}

/**
 * Factory singleton
 */
let instance: RecuperacaoService | null = null;

export function createRecuperacaoService(client: SeloApiClient): RecuperacaoService {
  if (!instance) {
    instance = new RecuperacaoService(client);
  }
  return instance;
}

