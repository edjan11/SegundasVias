/**
 * Cliente para serviço de Escreventes - Side Electron Renderer
 * 
 * Este módulo fornece a interface do lado do cliente (renderer process)
 * para comunicação com o serviço de Escreventes via IPC do Electron.
 */

import type {
  Escrevente,
  EscreventeCreateDTO,
  EscreventeUpdateDTO,
  EscreventeSearchParams,
} from '../../shared/admin/escrevente.schema';

/**
 * Cliente para operações CRUD de Escreventes via IPC
 */
export class EscreventesClient {
  /**
   * Busca escreventes com paginação e filtros
   */
  async search(filters: EscreventeSearchParams): Promise<Escrevente[]> {
    try {
      // @ts-ignore - window.api é definido pelo preload.ts
      const result = await window.api.invoke('escreventes:search', filters);
      return result;
    } catch (error) {
      console.error('[EscreventesClient] Erro ao buscar:', error);
      throw new Error('Erro ao buscar escreventes. Verifique o console.');
    }
  }

  /**
   * Busca escrevente por ID
   */
  async getById(id: string): Promise<Escrevente | null> {
    try {
      // @ts-ignore
      const result = await window.api.invoke('escreventes:getById', id);
      return result;
    } catch (error) {
      console.error('[EscreventesClient] Erro ao buscar por ID:', error);
      throw new Error('Erro ao buscar escrevente. Verifique o console.');
    }
  }

  /**
   * Cria novo escrevente
   */
  async create(dto: EscreventeCreateDTO): Promise<Escrevente> {
    try {
      // @ts-ignore
      const result = await window.api.invoke('escreventes:create', dto);
      return result;
    } catch (error) {
      console.error('[EscreventesClient] Erro ao criar:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Erro ao criar escrevente'
      );
    }
  }

  /**
   * Atualiza escrevente existente
   */
  async update(id: string, dto: EscreventeUpdateDTO): Promise<Escrevente> {
    try {
      // @ts-ignore
      const result = await window.api.invoke('escreventes:update', { id, dto });
      return result;
    } catch (error) {
      console.error('[EscreventesClient] Erro ao atualizar:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Erro ao atualizar escrevente'
      );
    }
  }

  /**
   * Exclui escrevente
   */
  async delete(id: string): Promise<void> {
    try {
      // @ts-ignore
      await window.api.invoke('escreventes:delete', id);
    } catch (error) {
      console.error('[EscreventesClient] Erro ao excluir:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Erro ao excluir escrevente'
      );
    }
  }

  /**
   * Lista todos escreventes ativos (para dropdowns)
   */
  async listActive(): Promise<Escrevente[]> {
    try {
      // @ts-ignore
      const result = await window.api.invoke('escreventes:listActive');
      return result;
    } catch (error) {
      console.error('[EscreventesClient] Erro ao listar ativos:', error);
      throw new Error('Erro ao listar escreventes ativos.');
    }
  }
}

// Singleton
let clientInstance: EscreventesClient | null = null;

/**
 * Obtém instância singleton do cliente
 */
export function getEscreventesClient(): EscreventesClient {
  if (!clientInstance) {
    clientInstance = new EscreventesClient();
  }
  return clientInstance;
}
