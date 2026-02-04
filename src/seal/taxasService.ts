/**
 * Servico de Taxas
 *
 * Gerencia consulta e cache de taxas disponiveis.
 * Cache tem TTL para evitar dados desatualizados.
 */

import { SeloApiClient } from './seloApiClient';
import { TaxaInfo, CertType } from './types';

interface TaxasCache {
  data: TaxaInfo[];
  timestamp: number;
  codCartorio: number;
}

export class TaxasService {
  private client: SeloApiClient;
  private cache: Map<number, TaxasCache> = new Map();
  private cacheTTL: number = 1000 * 60 * 60; // 1 hour

  constructor(client: SeloApiClient) {
    this.client = client;
  }

  /**
   * Lista taxas com cache inteligente
   */
  async listarTaxas(codCartorio: number): Promise<TaxaInfo[]> {
    const cached = this.cache.get(codCartorio);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.cacheTTL) {
      return cached.data;
    }

    const response = await this.client.listarTaxas(codCartorio);
    const taxas = this.parseListarTaxasResponse(response);

    this.cache.set(codCartorio, {
      data: taxas,
      timestamp: now,
      codCartorio,
    });

    return taxas;
  }

  /**
   * Busca taxa especifica por codigo
   */
  async getTaxa(codCartorio: number, codTaxa: number): Promise<TaxaInfo | null> {
    const taxas = await this.listarTaxas(codCartorio);
    return taxas.find((t) => t.codTaxa === codTaxa) || null;
  }

  /**
   * Busca taxas por tipo de certidao
   */
  async getTaxasByCertType(codCartorio: number, certType: CertType): Promise<TaxaInfo[]> {
    const taxas = await this.listarTaxas(codCartorio);
    const filtered = taxas.filter((t) => t.tipoCertidao === certType);
    if (filtered.length > 0) return filtered;
    // Some TJSE payloads do not identify cert type per tax clearly.
    // Fall back to all taxas so the operator can still proceed.
    return taxas;
  }

  /**
   * Invalida cache (forcar reload)
   */
  invalidateCache(codCartorio?: number): void {
    if (codCartorio) {
      this.cache.delete(codCartorio);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Parse da resposta de listarTaxas
   */
  private parseListarTaxasResponse(response: any): TaxaInfo[] {
    // Depending on XML root parsing, taxa can come as response.taxa or response.taxas.taxa.
    const rootTaxas = response?.taxa ?? response?.taxas?.taxa;
    const taxasArray = Array.isArray(rootTaxas) ? rootTaxas : [rootTaxas].filter(Boolean);

    return taxasArray
      .map((t: any) => {
        const codTaxa = parseInt(String(t?.codTaxa ?? t?.codigoTaxa ?? '').trim(), 10);
        if (!Number.isFinite(codTaxa)) return null;

        const nomeTaxa = String(t?.nomeTaxa ?? t?.descricaoResumida ?? t?.descricao ?? `Taxa ${codTaxa}`).trim();
        const valorRaw = String(t?.valor ?? t?.valorTaxa ?? t?.vlTaxa ?? '0').replace(',', '.');
        const valor = Number.parseFloat(valorRaw);

        const isencoesRoot = t?.isencoes?.isencao ?? t?.isencao;
        const isencoesArray = Array.isArray(isencoesRoot) ? isencoesRoot : [isencoesRoot].filter(Boolean);
        const isencoes = isencoesArray
          .map((i: any) => ({
            codIsencao: parseInt(String(i?.codIsencao ?? i?.codigoIsencao ?? '').trim(), 10),
            dsIsencao: String(i?.dsIsencao ?? i?.descricao ?? '').trim(),
            temAnexo: String(i?.temAnexo ?? 'nao').trim().toLowerCase() === 'sim' ? 'sim' : 'nao',
          }))
          .filter((i: any) => Number.isFinite(i.codIsencao));

        return {
          codTaxa,
          nomeTaxa,
          valor: Number.isFinite(valor) ? valor : 0,
          tipoCertidao: this.parseTipoCertidao(t?.tipoCertidao, nomeTaxa, t?.descricao),
          descricao: String(t?.descricao ?? nomeTaxa).trim(),
          isencoes: isencoes.length ? isencoes : undefined,
        } as TaxaInfo;
      })
      .filter((t: TaxaInfo | null): t is TaxaInfo => !!t);
  }

  /**
   * Converte string da API para CertType
   */
  private parseTipoCertidao(tipo: string, nomeTaxa?: string, descricao?: string): CertType {
    const normalized = `${tipo || ''} ${nomeTaxa || ''} ${descricao || ''}`.toLowerCase();
    if (normalized.includes('nascimento') || normalized.includes('nasc')) return 'nascimento';
    if (normalized.includes('casamento') || normalized.includes('cas')) return 'casamento';
    if (normalized.includes('obito') || normalized.includes('obi')) return 'obito';

    console.warn(`Tipo de certidao nao reconhecido: ${tipo || nomeTaxa || 'N/A'}, usando 'nascimento' como fallback`);
    return 'nascimento';
  }
}

/**
 * Factory singleton
 */
let instance: TaxasService | null = null;

export function createTaxasService(client: SeloApiClient): TaxasService {
  if (!instance) {
    instance = new TaxasService(client);
  }
  return instance;
}

