/**
 * Serviço de Anexos
 * 
 * Gerencia conversão e envio de anexos (PDFs) para isenções.
 * Validação: 2MB max, PDF apenas, Base64 encode.
 */

import { SeloApiClient } from './seloApiClient';

export interface AnexoValidationResult {
  valid: boolean;
  error?: string;
}

export interface AnexoResponse {
  nrProtocolo: string;
  dataHora: string;
}

export class AnexosService {
  private client: SeloApiClient;
  private maxSizeBytes: number = 2 * 1024 * 1024; // 2MB

  constructor(client: SeloApiClient) {
    this.client = client;
  }

  /**
   * Valida arquivo antes do upload
   */
  validateFile(file: File): AnexoValidationResult {
    // Valida tipo
    if (file.type !== 'application/pdf') {
      return {
        valid: false,
        error: 'Apenas arquivos PDF são aceitos',
      };
    }

    // Valida tamanho
    if (file.size > this.maxSizeBytes) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return {
        valid: false,
        error: `Arquivo muito grande: ${sizeMB}MB. Máximo permitido: 2MB`,
      };
    }

    return { valid: true };
  }

  /**
   * Converte File para Base64
   */
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Remove prefixo "data:application/pdf;base64,"
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Erro ao converter arquivo para Base64'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Erro ao ler arquivo'));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Envia anexo para a API
   */
  async adicionarAnexo(params: {
    codIsencao: number;
    codCartorio: number;
    nomeArquivo: string;
    base64Content: string;
    descricao?: string;
  }): Promise<AnexoResponse> {
    const xml = this.buildAnexoXml(params);
    const response = await this.client.adicionaAnexo(xml);
    
    return this.parseAnexoResponse(response);
  }

  /**
   * Fluxo completo: validar + converter + enviar
   */
  async uploadAnexo(params: {
    file: File;
    codIsencao: number;
    codCartorio: number;
    descricao?: string;
  }): Promise<{ success: boolean; data?: AnexoResponse; error?: string }> {
    // Valida arquivo
    const validation = this.validateFile(params.file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      // Converte para Base64
      const base64Content = await this.fileToBase64(params.file);

      // Envia para API
      const response = await this.adicionarAnexo({
        codIsencao: params.codIsencao,
        codCartorio: params.codCartorio,
        nomeArquivo: params.file.name,
        base64Content,
        descricao: params.descricao,
      });

      return { success: true, data: response };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao enviar anexo',
      };
    }
  }

  /**
   * Constrói XML para adicionaAnexo
   */
  private buildAnexoXml(params: {
    codIsencao: number;
    codCartorio: number;
    nomeArquivo: string;
    base64Content: string;
    descricao?: string;
  }): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<anexo>
  <codIsencao>${params.codIsencao}</codIsencao>
  <codCartorio>${params.codCartorio}</codCartorio>
  <nomeArquivo>${this.escapeXml(params.nomeArquivo)}</nomeArquivo>
  <conteudo>${params.base64Content}</conteudo>
  ${params.descricao ? `<descricao>${this.escapeXml(params.descricao)}</descricao>` : ''}
</anexo>`;
  }

  /**
   * Parse da resposta de adicionaAnexo
   */
  private parseAnexoResponse(response: any): AnexoResponse {
    return {
      nrProtocolo: response.anexo?.nrProtocolo || response.nrProtocolo,
      dataHora: response.anexo?.dataHora || response.dataHora,
    };
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
let instance: AnexosService | null = null;

export function createAnexosService(client: SeloApiClient): AnexosService {
  if (!instance) {
    instance = new AnexosService(client);
  }
  return instance;
}
