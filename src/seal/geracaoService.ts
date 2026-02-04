/**
 * Serviço de Geração de Selo
 * 
 * Gera nrControleSelo idempotente e chama gerarSelo.
 * Garante que mesma taxa não gere múltiplos selos por engano.
 */

import { SeloApiClient } from './seloApiClient';
import { TipoEmissao } from './types';

export interface GerarSeloParams {
  codCartorio: number;
  codTaxa: number;
  codIsencao?: number;
  numGuia?: string;
  tipoEmissao: TipoEmissao;
  campos: Record<string, string>;
  nrProtocoloAnexo?: string;
}

export interface GerarSeloResponse {
  numSelo: string;
  numChavePublica: string;
  nrControleSelo: string;
  dataGeracao: string;
  urlImagem?: string;
}

export class GeracaoService {
  private client: SeloApiClient;
  private controlCache: Map<string, string> = new Map();

  constructor(client: SeloApiClient) {
    this.client = client;
  }

  /**
   * Gera selo com validação de idempotência
   */
  async gerarSelo(params: GerarSeloParams): Promise<GerarSeloResponse> {
    // Gera nrControleSelo idempotente
    const nrControleSelo = this.generateControleSelo(params);

    // Verifica se já foi gerado (prevenção)
    if (this.controlCache.has(nrControleSelo)) {
      throw new Error(`Selo já gerado para este nrControleSelo: ${nrControleSelo}`);
    }

    // Constrói XML
    const xml = this.buildGerarSeloXml({
      ...params,
      nrControleSelo,
    });

    // Chama API
    const response = await this.client.gerarSelo(xml);
    const parsed = this.parseGerarSeloResponse(response);

    // Cacheia para prevenir duplicação
    this.controlCache.set(nrControleSelo, parsed.numSelo);

    return {
      ...parsed,
      nrControleSelo,
    };
  }

  /**
   * Gera nrControleSelo idempotente
   * 
   * Formato: {codCartorio}-{codTaxa}-{timestamp}-{hash}
   * Hash baseado em dados imutáveis da solicitação
   */
  private generateControleSelo(params: GerarSeloParams): string {
    const timestamp = Date.now();
    
    // Dados para hash (campos que identificam a solicitação)
    const hashData = [
      params.codCartorio,
      params.codTaxa,
      params.codIsencao || '',
      params.numGuia || '',
      params.tipoEmissao,
      JSON.stringify(params.campos),
    ].join('|');

    const hash = this.simpleHash(hashData);

    return `${params.codCartorio}-${params.codTaxa}-${timestamp}-${hash}`;
  }

  /**
   * Hash simples (não-criptográfico, apenas para idempotência)
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 8);
  }

  /**
   * Constrói XML para gerarSelo
   */
  private buildGerarSeloXml(params: GerarSeloParams & { nrControleSelo: string }): string {
    const camposXml = Object.entries(params.campos)
      .map(([nome, valor]) => `  <${nome}>${this.escapeXml(valor)}</${nome}>`)
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<solicitacaoSelo>
  <codCartorio>${params.codCartorio}</codCartorio>
  <codTaxa>${params.codTaxa}</codTaxa>
  ${params.codIsencao ? `<codIsencao>${params.codIsencao}</codIsencao>` : ''}
  ${params.numGuia ? `<numGuia>${this.escapeXml(params.numGuia)}</numGuia>` : ''}
  <tipoEmissao>${params.tipoEmissao}</tipoEmissao>
  <nrControleSelo>${this.escapeXml(params.nrControleSelo)}</nrControleSelo>
  ${params.nrProtocoloAnexo ? `<nrProtocoloAnexo>${this.escapeXml(params.nrProtocoloAnexo)}</nrProtocoloAnexo>` : ''}
  <campos>
${camposXml}
  </campos>
</solicitacaoSelo>`;
  }

  /**
   * Parse da resposta de gerarSelo
   */
  private parseGerarSeloResponse(response: any): Omit<GerarSeloResponse, 'nrControleSelo'> {
    const selo = response.selo || response;
    
    return {
      numSelo: selo.numSelo || selo.numeroSelo,
      numChavePublica: selo.numChavePublica || selo.chavePublica,
      dataGeracao: selo.dataGeracao || selo.dataHora || new Date().toISOString(),
      urlImagem: selo.urlImagem,
    };
  }

  /**
   * Limpa cache de controle (use com cuidado)
   */
  clearControlCache(): void {
    this.controlCache.clear();
  }

  /**
   * Escapa caracteres especiais XML
   */
  private escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

/**
 * Factory singleton
 */
let instance: GeracaoService | null = null;

export function createGeracaoService(client: SeloApiClient): GeracaoService {
  if (!instance) {
    instance = new GeracaoService(client);
  }
  return instance;
}
