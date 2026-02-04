/**
 * Instância singleton do serviço de Escreventes
 */

import { EscreventesService } from './escreventes-service';
import { EscreventesJSONStorage } from '../storage/escreventes-store';

let serviceInstance: EscreventesService | null = null;

/**
 * Retorna a instância singleton do serviço de Escreventes
 */
export function getEscreventesService(): EscreventesService {
  if (!serviceInstance) {
    const storage = new EscreventesJSONStorage('./data');
    serviceInstance = new EscreventesService(storage);
  }
  return serviceInstance;
}

/**
 * Reinicia o serviço (útil para testes)
 */
export function resetEscreventesService(): void {
  serviceInstance = null;
}
