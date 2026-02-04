/**
 * Sistema de Selo - Módulo de Dados
 * 
 * Armazena e gerencia os dados do selo de forma completamente isolada
 * das demais lógicas de 2ª via.
 */

export interface StampData {
  livro: string;
  folha: string;
  termo: string;
  numero_protocolo: string;
  valor_selo: string;
}

export interface StampValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Classe para gerenciar dados do selo de forma isolada
 */
export class StampDataManager {
  private data: Partial<StampData> = {};
  private storageKey: string;

  constructor(actType: 'nascimento' | 'casamento') {
    this.storageKey = `stamp_data_${actType}`;
    this.loadFromStorage();
  }

  /**
   * Define um campo do selo
   */
  setField(field: keyof StampData, value: string): void {
    this.data[field] = value;
    this.saveToStorage();
  }

  /**
   * Obtém um campo do selo
   */
  getField(field: keyof StampData): string | undefined {
    return this.data[field];
  }

  /**
   * Obtém todos os dados do selo
   */
  getAllData(): Partial<StampData> {
    return { ...this.data };
  }

  /**
   * Define todos os dados do selo
   */
  setAllData(data: Partial<StampData>): void {
    this.data = { ...data };
    this.saveToStorage();
  }

  /**
   * Limpa todos os dados do selo
   */
  clear(): void {
    this.data = {};
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Verifica se há dados do selo
   */
  hasData(): boolean {
    return Object.keys(this.data).length > 0;
  }

  /**
   * Carrega dados do localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.data = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do selo:', error);
    }
  }

  /**
   * Salva dados no localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (error) {
      console.error('Erro ao salvar dados do selo:', error);
    }
  }
}
