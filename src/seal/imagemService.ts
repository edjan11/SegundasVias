/**
 * Serviço de Imagem
 * 
 * Busca imagem do selo (exibeImagem) de forma stateless.
 * NUNCA persiste Base64/PNG - sempre busca on-demand.
 */

import { SeloApiClient } from './seloApiClient';

export interface ImagemSeloResponse {
  base64: string;
  mimeType: string;
  tamanhoBytes: number;
}

export class ImagemService {
  private client: SeloApiClient;

  constructor(client: SeloApiClient) {
    this.client = client;
  }

  /**
   * Busca imagem do selo (stateless)
   */
  async exibirImagem(numSelo: string): Promise<ImagemSeloResponse> {
    const response = await this.client.exibeImagem(numSelo);
    return this.parseImagemResponse(response);
  }

  /**
   * Converte Base64 para Blob (para download)
   */
  base64ToBlob(base64: string, mimeType: string = 'image/png'): Blob {
    // Decodifica Base64
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  /**
   * Download de imagem do selo
   */
  async downloadImagem(numSelo: string, nomeArquivo?: string): Promise<void> {
    const imagem = await this.exibirImagem(numSelo);
    const blob = this.base64ToBlob(imagem.base64, imagem.mimeType);

    // Cria link temporário para download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo || `selo-${numSelo}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Libera memória
    URL.revokeObjectURL(url);
  }

  /**
   * Retorna data URL para uso em <img>
   */
  async getImageDataUrl(numSelo: string): Promise<string> {
    const imagem = await this.exibirImagem(numSelo);
    return `data:${imagem.mimeType};base64,${imagem.base64}`;
  }

  /**
   * Parse da resposta de exibeImagem
   */
  private parseImagemResponse(response: any): ImagemSeloResponse {
    const imagem = response.imagem || response;

    // A API pode retornar o Base64 diretamente ou dentro de um campo
    const base64 = imagem.conteudo || imagem.base64 || imagem.imagem || imagem;

    // Remove prefixos se houver (data:image/png;base64,)
    const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');

    // Detecta mime type (geralmente PNG)
    let mimeType = imagem.mimeType || imagem.tipo || 'image/png';
    if (base64.startsWith('data:image/')) {
      mimeType = base64.split(';')[0].replace('data:', '');
    }

    // Calcula tamanho aproximado em bytes
    const tamanhoBytes = Math.ceil((cleanBase64.length * 3) / 4);

    return {
      base64: cleanBase64,
      mimeType,
      tamanhoBytes,
    };
  }

  /**
   * Valida se Base64 é válido
   */
  isValidBase64(str: string): boolean {
    try {
      return btoa(atob(str)) === str;
    } catch {
      return false;
    }
  }

  /**
   * Limpa memória (nada a fazer pois é stateless)
   */
  cleanup(): void {
    // Nada a fazer - não mantemos cache de imagens
  }
}

/**
 * Factory singleton
 */
let instance: ImagemService | null = null;

export function createImagemService(client: SeloApiClient): ImagemService {
  if (!instance) {
    instance = new ImagemService(client);
  }
  return instance;
}
