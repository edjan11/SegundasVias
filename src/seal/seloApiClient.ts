/**
 * Cliente HTTP/XML para comunicação com a API de Selo Digital
 * 
 * Centraliza toda a comunicação HTTP, construção de URLs, headers,
 * parsing de XML e tratamento de erros.
 */

import {
  SeloApiConfig,
  SeloApiError,
  RequestOptions,
} from './types';
import { ENDPOINTS, ApiEnvironment, ERROR_CODES, ERROR_MESSAGES } from './endpoints';

/**
 * Cliente da API de Selo Digital
 */
export class SeloApiClient {
  private config: SeloApiConfig;

  constructor(config: SeloApiConfig) {
    this.config = {
      ...config,
      timeout: config.timeout || 30000,
    };
  }

  /**
   * Monta URL completa com parâmetros
   */
  private buildUrl(endpoint: string, params?: Record<string, string | number>): string {
    const url = new URL(endpoint, this.config.baseUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    return url.toString();
  }

  /**
   * Gera header de autenticação
   * Formato: Base64 de "usuario:senhaMD5"
   */
  private getAuthHeader(): string {
    if (!this.config.usuario || !this.config.senhaMD5) {
      throw new Error('Credenciais de autenticação não configuradas');
    }

    const credentials = `${this.config.usuario}:${this.config.senhaMD5}`;
    const base64Credentials = btoa(credentials);
    return `Basic ${base64Credentials}`;
  }

  /**
   * Monta headers da requisição
   */
  private buildHeaders(options: RequestOptions = {}): HeadersInit {
    const headers: HeadersInit = {
      'Accept': 'application/xml',
      'Content-Type': 'application/xml; charset=UTF-8',
    };

    if (options.requiresAuth) {
      headers['Authorization'] = this.getAuthHeader();
    }

    return headers;
  }

  /**
   * Faz requisição HTTP
   */
  private async fetch<T>(
    url: string,
    method: 'GET' | 'POST' = 'GET',
    body?: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = options.timeout || this.config.timeout!;

    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: this.buildHeaders(options),
        body: body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw this.parseError(errorText, response.status);
      }

      const responseText = await response.text();
      return this.parseXml<T>(responseText);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Timeout na requisição à API de Selo Digital');
        }
        throw error;
      }

      throw new Error('Erro desconhecido ao comunicar com API de Selo Digital');
    }
  }

  /**
   * Parse de XML para objeto
   */
  private parseXml<T>(xml: string): T {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');

    // Verifica se há erro no parsing
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      throw new Error('Erro ao fazer parse do XML de resposta');
    }

    // Converte XML para objeto (implementação simplificada)
    return this.xmlToObject(doc.documentElement) as T;
  }

  /**
   * Converte elemento XML para objeto JavaScript
   */
  private xmlToObject(element: Element): any {
    // Se o elemento tem apenas texto, retorna o texto
    if (element.children.length === 0) {
      return element.textContent?.trim() || '';
    }

    // Se o elemento tem filhos, processa recursivamente
    const obj: any = {};
    const children = Array.from(element.children);

    // Agrupa elementos com mesmo nome em arrays
    const grouped = new Map<string, Element[]>();
    children.forEach(child => {
      const name = child.nodeName;
      if (!grouped.has(name)) {
        grouped.set(name, []);
      }
      grouped.get(name)!.push(child);
    });

    // Converte cada grupo
    grouped.forEach((elements, name) => {
      if (elements.length === 1) {
        obj[name] = this.xmlToObject(elements[0]);
      } else {
        obj[name] = elements.map(el => this.xmlToObject(el));
      }
    });

    return obj;
  }

  /**
   * Parse de erro da API
   */
  private parseError(errorXml: string, statusCode: number): SeloApiError {
    try {
      const parsed = this.parseXml<any>(errorXml);
      
      const codigo = parsed.erro?.codigo || `HTTP_${statusCode}`;
      const mensagem = parsed.erro?.mensagem || ERROR_MESSAGES[codigo] || 'Erro desconhecido';
      const detalhes = parsed.erro?.detalhes;

      return { codigo, mensagem, detalhes };
    } catch {
      return {
        codigo: `HTTP_${statusCode}`,
        mensagem: 'Erro ao processar resposta da API',
        detalhes: errorXml.substring(0, 200),
      };
    }
  }

  /**
   * GET: Listar Taxas
   */
  async listarTaxas(codCartorio?: number) {
    const url = this.buildUrl(ENDPOINTS.LISTAR_TAXAS, {
      codCartorio: codCartorio || this.config.codCartorio,
      chaveApi: this.config.chaveApi,
    });

    return this.fetch<any>(url);
  }

  /**
   * GET: Exibe Modelo
   */
  async exibeModelo(codTaxa: number) {
    const url = this.buildUrl(ENDPOINTS.EXIBE_MODELO, {
      codTaxa,
      chaveApi: this.config.chaveApi,
    });

    return this.fetch<any>(url);
  }

  /**
   * GET: Guia Paga
   */
  async guiaPaga(numGuia: string, codCartorio?: number) {
    const url = this.buildUrl(ENDPOINTS.GUIA_PAGA, {
      numGuia,
      codCartorio: codCartorio || this.config.codCartorio,
    });

    return this.fetch<any>(url, 'GET', undefined, { requiresAuth: true });
  }

  /**
   * GET: Dados Guia
   */
  async dadosGuia(numGuia: string, codCartorio?: number) {
    const url = this.buildUrl(ENDPOINTS.DADOS_GUIA, {
      numGuia,
      codCartorio: codCartorio || this.config.codCartorio,
    });

    return this.fetch<any>(url, 'GET', undefined, { requiresAuth: true });
  }

  /**
   * GET: Selo Digital Aplicado
   */
  async seloDigitalAplicado(nrSelo: string) {
    const url = this.buildUrl(ENDPOINTS.SELO_DIGITAL_APLICADO, {
      nrSelo,
    });

    return this.fetch<any>(url, 'GET', undefined, { requiresAuth: true });
  }

  /**
   * GET: Exibe Imagem
   */
  async exibeImagem(numSelo: string) {
    const url = this.buildUrl(ENDPOINTS.EXIBE_IMAGEM, {
      numSelo,
      chaveApi: this.config.chaveApi,
    });

    return this.fetch<any>(url);
  }

  /**
   * POST: Adiciona Anexo
   */
  async adicionaAnexo(xmlBody: string) {
    const url = this.buildUrl(ENDPOINTS.ADICIONA_ANEXO, {
      chaveApi: this.config.chaveApi,
    });

    return this.fetch<any>(url, 'POST', xmlBody);
  }

  /**
   * POST: Gerar Selo
   */
  async gerarSelo(xmlBody: string) {
    const url = this.buildUrl(ENDPOINTS.GERAR_SELO, {
      chaveApi: this.config.chaveApi,
    });

    return this.fetch<any>(url, 'POST', xmlBody);
  }
}

/**
 * Factory para criar instância do cliente
 */
export function createSeloApiClient(config: SeloApiConfig): SeloApiClient {
  return new SeloApiClient(config);
}
