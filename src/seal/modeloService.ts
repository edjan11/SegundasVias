/**
 * Serviço de Modelo
 * 
 * Consulta estrutura de campos da taxa (exibeModelo).
 * NUNCA hardcode mapeamentos - sempre consulte a API.
 */

import { SeloApiClient } from './seloApiClient';
import { VariavelModelo, TipoVariavel } from './types';

interface ModeloCache {
  variaveis: VariavelModelo[];
  timestamp: number;
}

export class ModeloService {
  private client: SeloApiClient;
  private cache: Map<number, ModeloCache> = new Map();
  private cacheTTL: number = 1000 * 60 * 60 * 24; // 24 horas

  constructor(client: SeloApiClient) {
    this.client = client;
  }

  /**
   * Consulta modelo com cache
   */
  async exibeModelo(codTaxa: number): Promise<VariavelModelo[]> {
    const cached = this.cache.get(codTaxa);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.cacheTTL) {
      return cached.variaveis;
    }

    const response = await this.client.exibeModelo(codTaxa);
    const variaveis = this.parseExibeModeloResponse(response);

    this.cache.set(codTaxa, {
      variaveis,
      timestamp: now,
    });

    return variaveis;
  }

  /**
   * Valida dados do formulário contra o modelo
   */
  async validateFields(codTaxa: number, campos: Record<string, any>): Promise<{
    valid: boolean;
    errors: Array<{ campo: string; mensagem: string }>;
  }> {
    const modelo = await this.exibeModelo(codTaxa);
    const errors: Array<{ campo: string; mensagem: string }> = [];

    for (const variavel of modelo) {
      const valor = campos[variavel.nome];

      // Campo obrigatório sem valor
      if (variavel.obrigatorio && !valor) {
        errors.push({
          campo: variavel.nome,
          mensagem: `Campo obrigatório: ${variavel.rotulo}`,
        });
        continue;
      }

      // Valida tipo se valor presente
      if (valor && !this.validateTipo(valor, variavel.tipo)) {
        errors.push({
          campo: variavel.nome,
          mensagem: `Tipo inválido para ${variavel.rotulo}. Esperado: ${variavel.tipo}`,
        });
      }

      // Valida tamanho máximo
      if (valor && variavel.tamanhoMaximo && String(valor).length > variavel.tamanhoMaximo) {
        errors.push({
          campo: variavel.nome,
          mensagem: `${variavel.rotulo} excede tamanho máximo de ${variavel.tamanhoMaximo} caracteres`,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Gera objeto de campos formatados para XML
   */
  async formatCampos(codTaxa: number, campos: Record<string, any>): Promise<Record<string, string>> {
    const modelo = await this.exibeModelo(codTaxa);
    const formatted: Record<string, string> = {};

    for (const variavel of modelo) {
      const valor = campos[variavel.nome];
      if (valor !== undefined && valor !== null && valor !== '') {
        formatted[variavel.nome] = this.formatValue(valor, variavel.tipo);
      }
    }

    return formatted;
  }

  /**
   * Invalida cache
   */
  invalidateCache(codTaxa?: number): void {
    if (codTaxa) {
      this.cache.delete(codTaxa);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Parse da resposta de exibeModelo
   */
  private parseExibeModeloResponse(response: any): VariavelModelo[] {
    const variaveisArray = Array.isArray(response.modelo?.variaveis?.variavel)
      ? response.modelo.variaveis.variavel
      : [response.modelo?.variaveis?.variavel].filter(Boolean);

    return variaveisArray.map((v: any) => ({
      nome: v.nome,
      rotulo: v.rotulo,
      tipo: this.parseTipo(v.tipo),
      obrigatorio: v.obrigatorio === 'true' || v.obrigatorio === true,
      tamanhoMaximo: v.tamanhoMaximo ? parseInt(v.tamanhoMaximo) : undefined,
      opcoes: v.opcoes ? this.parseOpcoes(v.opcoes) : undefined,
      mascara: v.mascara,
      ajuda: v.ajuda,
    }));
  }

  /**
   * Converte string da API para TipoVariavel
   */
  private parseTipo(tipo: string): TipoVariavel {
    const normalized = tipo.toLowerCase();
    if (normalized.includes('texto') || normalized.includes('string')) return 'TEXTO';
    if (normalized.includes('num') || normalized.includes('int')) return 'NUMERO';
    if (normalized.includes('data') || normalized.includes('date')) return 'DATA';
    if (normalized.includes('cpf')) return 'CPF';
    if (normalized.includes('email')) return 'EMAIL';
    if (normalized.includes('tel')) return 'TELEFONE';
    if (normalized.includes('select') || normalized.includes('combo')) return 'SELECT';
    if (normalized.includes('bool')) return 'BOOLEAN';
    return 'TEXTO';
  }

  /**
   * Parse opções de SELECT
   */
  private parseOpcoes(opcoes: any): Array<{ valor: string; rotulo: string }> {
    const opcoesArray = Array.isArray(opcoes.opcao)
      ? opcoes.opcao
      : [opcoes.opcao].filter(Boolean);

    return opcoesArray.map((o: any) => ({
      valor: o.valor,
      rotulo: o.rotulo || o.valor,
    }));
  }

  /**
   * Valida tipo do valor
   */
  private validateTipo(valor: any, tipo: TipoVariavel): boolean {
    switch (tipo) {
      case 'NUMERO':
        return !isNaN(Number(valor));
      case 'DATA':
        return /^\d{2}\/\d{2}\/\d{4}$/.test(valor) || /^\d{4}-\d{2}-\d{2}$/.test(valor);
      case 'CPF':
        return /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(valor) || /^\d{11}$/.test(valor);
      case 'EMAIL':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
      case 'TELEFONE':
        return /^\(\d{2}\)\s?\d{4,5}-\d{4}$/.test(valor) || /^\d{10,11}$/.test(valor);
      case 'BOOLEAN':
        return valor === true || valor === false || valor === 'true' || valor === 'false';
      default:
        return true; // TEXTO e SELECT aceitam qualquer coisa
    }
  }

  /**
   * Formata valor para XML
   */
  private formatValue(valor: any, tipo: TipoVariavel): string {
    switch (tipo) {
      case 'DATA':
        // Converte DD/MM/YYYY para YYYY-MM-DD se necessário
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
          const [dia, mes, ano] = valor.split('/');
          return `${ano}-${mes}-${dia}`;
        }
        return valor;
      case 'CPF':
        // Remove formatação
        return valor.replace(/\D/g, '');
      case 'TELEFONE':
        return valor.replace(/\D/g, '');
      case 'BOOLEAN':
        return valor === true || valor === 'true' ? 'true' : 'false';
      default:
        return String(valor);
    }
  }
}

/**
 * Factory singleton
 */
let instance: ModeloService | null = null;

export function createModeloService(client: SeloApiClient): ModeloService {
  if (!instance) {
    instance = new ModeloService(client);
  }
  return instance;
}
