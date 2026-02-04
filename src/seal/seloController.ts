/**
 * seloController.ts
 * 
 * Controller Layer - Orchestrates seal generation workflows
 * Coordinates services, manages state, handles errors
 * 
 * Architecture:
 * - Uses all 6 foundation services + seloHistoryStore
 * - Manages 3 seal paths: sem-selo, com-guia, com-isencao
 * - Tracks operation state (idle/validating/generating/success/error)
 * - Persists results to localStorage audit trail
 * - Provides hooks for UI components (modal, panel)
 */

import type { 
  TaxaInfo, 
  VariavelModelo, 
  GerarSeloParams, 
  GerarSeloResponse,
  AnexoParams,
  GuiaPagaResponse,
  SeloAplicadoResponse,
  DadosGuiaResponse
} from './types';

import { createSeloApiClient, type SeloApiClient } from './seloApiClient';
import { createTaxasService } from './taxasService';
import { createModeloService } from './modeloService';
import { createAnexosService } from './anexosService';
import { createGeracaoService } from './geracaoService';
import { createImagemService } from './imagemService';
import { createRecuperacaoService } from './recuperacaoService';
import { getSeloHistoryStore, type SeloRecord, type SeloRecordFilter, type PaginatedResult } from './seloHistoryStore';
import { ENDPOINTS, LIMITS } from './endpoints';
import type { SeloApiConfig } from './types';

/**
 * Seal generation path types
 */
export type SeloPath = 'sem-selo' | 'com-guia' | 'com-isencao';

/**
 * Controller operation state
 */
export type OperationState = 'idle' | 'validating' | 'generating' | 'success' | 'error';

/**
 * Base parameters for seal generation (common across all paths)
 */
export interface SeloBaseParams {
  certType: 'nascimento' | 'casamento' | 'obito';
  matricula: string;
  codCartorio: string;
  codTaxa: string;
  nomeRegistrado: string;
  nomeConjuge?: string;
  nomeSolicitante: string;
  campos: Record<string, string>; // Dynamic fields from modelo
  metadados?: Record<string, any>; // Additional metadata
}

/**
 * Parameters for "sem-selo" path (without guide)
 */
export interface SeloSemGuiaParams extends SeloBaseParams {
  // No additional fields - seal generated without existing guide
}

/**
 * Parameters for "com-guia" path (with existing paid guide)
 */
export interface SeloComGuiaParams extends SeloBaseParams {
  numGuia: string; // Existing guide number
}

/**
 * Parameters for "com-isencao" path (with exemption + PDF anexo)
 */
export interface SeloComIsencaoParams extends SeloBaseParams {
  codIsencao: string; // Exemption code
  pdfFile: File; // PDF document for anexo
}

/**
 * Result of seal generation operation
 */
export interface SeloOperationResult {
  success: boolean;
  record?: SeloRecord; // Persisted history record
  seal?: GerarSeloResponse; // API response
  error?: string; // Error message if failed
  imageDataUrl?: string; // Base64 data URL for immediate display
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Controller state
 */
interface ControllerState {
  currentState: OperationState;
  currentPath: SeloPath | null;
  currentParams: SeloBaseParams | null;
  lastResult: SeloOperationResult | null;
  lastError: string | null;
}

/**
 * Event listener for state changes
 */
export type StateChangeListener = (state: ControllerState) => void;

/**
 * SeloController - Main orchestration class
 */
export class SeloController {
  // API Client (singleton)
  private apiClient: SeloApiClient;

  // Services (singletons)
  private taxasService;
  private modeloService;
  private anexosService;
  private geracaoService;
  private imagemService;
  private recuperacaoService;
  private historyStore = getSeloHistoryStore();

  // Controller state
  private state: ControllerState = {
    currentState: 'idle',
    currentPath: null,
    currentParams: null,
    lastResult: null,
    lastError: null
  };

  // Event listeners
  private stateListeners: Set<StateChangeListener> = new Set();

  constructor(apiConfig?: SeloApiConfig) {
    // Use provided config or create default
    const config = apiConfig || this.getDefaultConfig();
    
    // Initialize API client
    this.apiClient = createSeloApiClient(config);
    
    // Initialize services with API client
    this.taxasService = createTaxasService(this.apiClient);
    this.modeloService = createModeloService(this.apiClient);
    this.anexosService = createAnexosService(this.apiClient);
    this.geracaoService = createGeracaoService(this.apiClient);
    this.imagemService = createImagemService(this.apiClient);
    this.recuperacaoService = createRecuperacaoService(this.apiClient);
  }

  /**
   * Get default API configuration from environment
   */
  private getDefaultConfig(): SeloApiConfig {
    // Get config from window object or environment variables (Node.js)
    const getEnv = (key: string, defaultValue: string = ''): string => {
      if (typeof window !== 'undefined' && (window as any).SEAL_CONFIG) {
        return (window as any).SEAL_CONFIG[key] || defaultValue;
      }
      if (typeof process !== 'undefined' && process.env) {
        return process.env[key] || defaultValue;
      }
      return defaultValue;
    };

    return {
      baseUrl: getEnv('SEAL_API_URL', 'https://homologacao.tjse.jus.br'),
      usuario: getEnv('SEAL_API_USER', ''),
      senhaMD5: getEnv('SEAL_API_PASSWORD', ''),
      chaveApi: getEnv('SEAL_API_KEY', ''),
      codCartorio: parseInt(getEnv('SEAL_API_CARTORIO', '0'), 10),
      timeout: LIMITS.REQUEST_TIMEOUT_MS,
    };
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(listener: StateChangeListener): () => void {
    this.stateListeners.add(listener);
    // Return unsubscribe function
    return () => this.stateListeners.delete(listener);
  }

  /**
   * Update state and notify listeners
   */
  private updateState(updates: Partial<ControllerState>): void {
    this.state = { ...this.state, ...updates };
    this.stateListeners.forEach(listener => listener(this.state));
  }

  /**
   * Get current state (read-only)
   */
  getState(): Readonly<ControllerState> {
    return { ...this.state };
  }

  // ==================== TAXA OPERATIONS ====================

  /**
   * List available taxas for a cartÃ³rio
   */
  async listarTaxas(codCartorio: string): Promise<TaxaInfo[]> {
    try {
      return await this.taxasService.listarTaxas(codCartorio);
    } catch (error) {
      console.error('[SeloController] Error listing taxas:', error);
      throw new Error(`Falha ao listar taxas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Get taxas filtered by document type
   */
  async getTaxasByCertType(codCartorio: string, certType: 'nascimento' | 'casamento' | 'obito'): Promise<TaxaInfo[]> {
    try {
      return await this.taxasService.getTaxasByCertType(codCartorio, certType);
    } catch (error) {
      console.error('[SeloController] Error getting taxas by cert type:', error);
      throw new Error(`Falha ao buscar taxas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Get single taxa details
   */
  async getTaxa(codCartorio: string, codTaxa: string): Promise<TaxaInfo | null> {
    try {
      return await this.taxasService.getTaxa(codCartorio, codTaxa);
    } catch (error) {
      console.error('[SeloController] Error getting taxa:', error);
      return null;
    }
  }

  // ==================== MODELO OPERATIONS ====================

  /**
   * Get field definitions for a taxa
   */
  async getModelo(codTaxa: string): Promise<VariavelModelo[]> {
    try {
      return await this.modeloService.exibeModelo(codTaxa);
    } catch (error) {
      console.error('[SeloController] Error getting modelo:', error);
      throw new Error(`Falha ao carregar campos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Validate form fields against modelo schema
   */
  async validateFields(codTaxa: string, campos: Record<string, string>): Promise<ValidationResult> {
    try {
      const result = await this.modeloService.validateFields(codTaxa, campos);
      return result;
    } catch (error) {
      console.error('[SeloController] Error validating fields:', error);
      return {
        valid: false,
        errors: [`Erro na validaÃ§Ã£o: ${error instanceof Error ? error.message : 'Erro desconhecido'}`]
      };
    }
  }

  // ==================== MAIN SEAL GENERATION WORKFLOWS ====================

  /**
   * Path 1: Generate seal WITHOUT existing guide (sem-selo)
   * 
   * Flow:
   * 1. Validate parameters and fields
   * 2. Check if seal already exists (by control number)
   * 3. Generate seal via API
   * 4. Persist to history store
   * 5. Return result with image data URL
   */
  async gerarSeloSemGuia(params: SeloSemGuiaParams): Promise<SeloOperationResult> {
    this.updateState({ currentState: 'validating', currentPath: 'sem-selo', currentParams: params });

    try {
      // Step 1: Validate fields
      const validation = await this.validateFields(params.codTaxa, params.campos);
      if (!validation.valid) {
        throw new Error(`ValidaÃ§Ã£o falhou: ${validation.errors.join(', ')}`);
      }

      this.updateState({ currentState: 'generating' });

      // Step 2: Format campos for API
      const camposFormatados = await this.modeloService.formatCampos(params.codTaxa, params.campos);

      // Step 3: Generate seal
      const apiParams: GerarSeloParams = {
        codCartorio: parseInt(params.codCartorio, 10),
        codTaxa: parseInt(params.codTaxa, 10),
        campos: camposFormatados,
        tipoEmissao: 'ordinaria',
        // No numGuia or codIsencao for this path
      };

      const sealResponse = await this.geracaoService.gerarSelo(apiParams);

      // Step 4: Fetch image data URL
      const imageDataUrl = await this.imagemService.getImageDataUrl(sealResponse.numSelo);

      // Step 5: Persist to history
      const record = this.historyStore.save({
        certType: params.certType,
        matricula: params.matricula,
        codCartorio: params.codCartorio,
        codTaxa: params.codTaxa,
        codIsencao: null,
        numGuia: null,
        nrControleSelo: sealResponse.nrControleSelo,
        numSelo: sealResponse.numSelo,
        numChavePublica: sealResponse.numChavePublica,
        nomeRegistrado: params.nomeRegistrado,
        nomeConjuge: params.nomeConjuge || null,
        nomeSolicitante: params.nomeSolicitante,
        status: 'generated',
        metadados: {
          ...params.metadados,
          path: 'sem-guia',
          campos: params.campos
        }
      });

      const result: SeloOperationResult = {
        success: true,
        record,
        seal: sealResponse,
        imageDataUrl
      };

      this.updateState({ currentState: 'success', lastResult: result, lastError: null });
      return result;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('[SeloController] Error in gerarSeloSemGuia:', error);

      // Try to persist failed attempt
      try {
        this.historyStore.save({
          certType: params.certType,
          matricula: params.matricula,
          codCartorio: params.codCartorio,
          codTaxa: params.codTaxa,
          codIsencao: null,
          numGuia: null,
          nrControleSelo: `FAILED-${Date.now()}`,
          numSelo: '',
          numChavePublica: '',
          nomeRegistrado: params.nomeRegistrado,
          nomeConjuge: params.nomeConjuge || null,
          nomeSolicitante: params.nomeSolicitante,
          status: 'failed',
          erro: errorMsg,
          metadados: {
            ...params.metadados,
            path: 'sem-guia',
            campos: params.campos
          }
        });
      } catch (saveError) {
        console.error('[SeloController] Failed to save error record:', saveError);
      }

      const result: SeloOperationResult = { success: false, error: errorMsg };
      this.updateState({ currentState: 'error', lastResult: result, lastError: errorMsg });
      return result;
    }
  }

  /**
   * Path 2: Generate seal WITH existing paid guide (com-guia)
   * 
   * Flow:
   * 1. Validate guide exists and is paid
   * 2. Validate parameters and fields
   * 3. Check if seal already exists for this guide
   * 4. Generate seal linked to guide
   * 5. Persist to history store
   * 6. Return result with image data URL
   */
  async gerarSeloComGuia(params: SeloComGuiaParams): Promise<SeloOperationResult> {
    this.updateState({ currentState: 'validating', currentPath: 'com-guia', currentParams: params });

    try {
      // Step 1: Validate guide
      const guiaValidation = await this.recuperacaoService.validarGuiaParaSelo(params.numGuia, params.codCartorio);
      if (!guiaValidation.valida) {
        throw new Error(`Guia invalida: ${guiaValidation.motivo}`);
      }
      if (
        guiaValidation.dadosGuia?.codTaxa &&
        String(guiaValidation.dadosGuia.codTaxa) !== String(params.codTaxa)
      ) {
        throw new Error(
          `Taxa da guia (${guiaValidation.dadosGuia.codTaxa}) diferente da taxa selecionada (${params.codTaxa}).`,
        );
      }

      // Step 2: Validate fields
      const validation = await this.validateFields(params.codTaxa, params.campos);
      if (!validation.valid) {
        throw new Error(`ValidaÃ§Ã£o falhou: ${validation.errors.join(', ')}`);
      }

      this.updateState({ currentState: 'generating' });

      // Step 3: Format campos for API
      const camposFormatados = await this.modeloService.formatCampos(params.codTaxa, params.campos);

      // Step 4: Generate seal with guide
      const apiParams: GerarSeloParams = {
        codCartorio: parseInt(params.codCartorio, 10),
        codTaxa: parseInt(params.codTaxa, 10),
        numGuia: params.numGuia,
        campos: camposFormatados,
        tipoEmissao: 'ordinaria'
      };

      const sealResponse = await this.geracaoService.gerarSelo(apiParams);

      // Step 5: Fetch image data URL
      const imageDataUrl = await this.imagemService.getImageDataUrl(sealResponse.numSelo);

      // Step 6: Persist to history
      const record = this.historyStore.save({
        certType: params.certType,
        matricula: params.matricula,
        codCartorio: params.codCartorio,
        codTaxa: params.codTaxa,
        codIsencao: null,
        numGuia: params.numGuia,
        nrControleSelo: sealResponse.nrControleSelo,
        numSelo: sealResponse.numSelo,
        numChavePublica: sealResponse.numChavePublica,
        nomeRegistrado: params.nomeRegistrado,
        nomeConjuge: params.nomeConjuge || null,
        nomeSolicitante: params.nomeSolicitante,
        status: 'generated',
        metadados: {
          ...params.metadados,
          path: 'com-guia',
          campos: params.campos,
          dadosGuia: guiaValidation.dadosGuia
        }
      });

      const result: SeloOperationResult = {
        success: true,
        record,
        seal: sealResponse,
        imageDataUrl
      };

      this.updateState({ currentState: 'success', lastResult: result, lastError: null });
      return result;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('[SeloController] Error in gerarSeloComGuia:', error);

      // Try to persist failed attempt
      try {
        this.historyStore.save({
          certType: params.certType,
          matricula: params.matricula,
          codCartorio: params.codCartorio,
          codTaxa: params.codTaxa,
          codIsencao: null,
          numGuia: params.numGuia,
          nrControleSelo: `FAILED-${Date.now()}`,
          numSelo: '',
          numChavePublica: '',
          nomeRegistrado: params.nomeRegistrado,
          nomeConjuge: params.nomeConjuge || null,
          nomeSolicitante: params.nomeSolicitante,
          status: 'failed',
          erro: errorMsg,
          metadados: {
            ...params.metadados,
            path: 'com-guia',
            campos: params.campos
          }
        });
      } catch (saveError) {
        console.error('[SeloController] Failed to save error record:', saveError);
      }

      const result: SeloOperationResult = { success: false, error: errorMsg };
      this.updateState({ currentState: 'error', lastResult: result, lastError: errorMsg });
      return result;
    }
  }

  /**
   * Path 3: Generate seal WITH exemption + PDF anexo (com-isencao)
   * 
   * Flow:
   * 1. Validate PDF file (type, size)
   * 2. Validate parameters and fields
   * 3. Upload PDF anexo
   * 4. Generate seal with exemption code
   * 5. Persist to history store
   * 6. Return result with image data URL
   */
  async gerarSeloComIsencao(params: SeloComIsencaoParams): Promise<SeloOperationResult> {
    this.updateState({ currentState: 'validating', currentPath: 'com-isencao', currentParams: params });

    try {
      // Step 1: Validate PDF file
      const fileValidation = await this.anexosService.validateFile(params.pdfFile);
      if (!fileValidation.valid) {
        throw new Error(`Arquivo invÃ¡lido: ${fileValidation.error}`);
      }

      // Step 2: Validate fields
      const validation = await this.validateFields(params.codTaxa, params.campos);
      if (!validation.valid) {
        throw new Error(`ValidaÃ§Ã£o falhou: ${validation.errors.join(', ')}`);
      }

      this.updateState({ currentState: 'generating' });

      // Step 3: Upload anexo
      const anexoResult = await this.anexosService.uploadAnexo({
        codCartorio: params.codCartorio,
        codIsencao: params.codIsencao,
        file: params.pdfFile
      });

      if (!anexoResult.success || !anexoResult.data) {
        throw new Error(`Falha ao enviar anexo: ${anexoResult.error || 'Erro desconhecido'}`);
      }

      // Step 4: Format campos for API
      const camposFormatados = await this.modeloService.formatCampos(params.codTaxa, params.campos);

      // Step 5: Generate seal with exemption
      const apiParams: GerarSeloParams = {
        codCartorio: parseInt(params.codCartorio, 10),
        codTaxa: parseInt(params.codTaxa, 10),
        codIsencao: parseInt(params.codIsencao, 10),
        campos: camposFormatados,
        tipoEmissao: 'ordinaria'
      };

      const sealResponse = await this.geracaoService.gerarSelo(apiParams);

      // Step 6: Fetch image data URL
      const imageDataUrl = await this.imagemService.getImageDataUrl(sealResponse.numSelo);

      // Step 7: Persist to history
      const record = this.historyStore.save({
        certType: params.certType,
        matricula: params.matricula,
        codCartorio: params.codCartorio,
        codTaxa: params.codTaxa,
        codIsencao: params.codIsencao,
        numGuia: null,
        nrControleSelo: sealResponse.nrControleSelo,
        numSelo: sealResponse.numSelo,
        numChavePublica: sealResponse.numChavePublica,
        nomeRegistrado: params.nomeRegistrado,
        nomeConjuge: params.nomeConjuge || null,
        nomeSolicitante: params.nomeSolicitante,
        status: 'generated',
        metadados: {
          ...params.metadados,
          path: 'com-isencao',
          campos: params.campos,
          anexo: {
            nomeArquivo: params.pdfFile.name,
            tamanho: params.pdfFile.size,
            numProtocolo: anexoResult.data.numProtocolo
          }
        }
      });

      const result: SeloOperationResult = {
        success: true,
        record,
        seal: sealResponse,
        imageDataUrl
      };

      this.updateState({ currentState: 'success', lastResult: result, lastError: null });
      return result;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('[SeloController] Error in gerarSeloComIsencao:', error);

      // Try to persist failed attempt
      try {
        this.historyStore.save({
          certType: params.certType,
          matricula: params.matricula,
          codCartorio: params.codCartorio,
          codTaxa: params.codTaxa,
          codIsencao: params.codIsencao,
          numGuia: null,
          nrControleSelo: `FAILED-${Date.now()}`,
          numSelo: '',
          numChavePublica: '',
          nomeRegistrado: params.nomeRegistrado,
          nomeConjuge: params.nomeConjuge || null,
          nomeSolicitante: params.nomeSolicitante,
          status: 'failed',
          erro: errorMsg,
          metadados: {
            ...params.metadados,
            path: 'com-isencao',
            campos: params.campos,
            pdfFileName: params.pdfFile.name
          }
        });
      } catch (saveError) {
        console.error('[SeloController] Failed to save error record:', saveError);
      }

      const result: SeloOperationResult = { success: false, error: errorMsg };
      this.updateState({ currentState: 'error', lastResult: result, lastError: errorMsg });
      return result;
    }
  }

  // ==================== RECOVERY & QUERY OPERATIONS ====================

  /**
   * Query existing seal by number
   */
  async consultarSelo(numSelo: string): Promise<SeloAplicadoResponse | null> {
    try {
      return await this.recuperacaoService.consultarSeloAplicado(numSelo);
    } catch (error) {
      console.error('[SeloController] Error querying seal:', error);
      return null;
    }
  }

  /**
   * Query existing guide data
   */
  async consultarGuia(numGuia: string, codCartorio: string): Promise<DadosGuiaResponse | null> {
    try {
      return await this.recuperacaoService.consultarDadosGuia(numGuia, codCartorio);
    } catch (error) {
      console.error('[SeloController] Error querying guide:', error);
      return null;
    }
  }

  /**
   * Check if guide is paid
   */
  async verificarGuiaPaga(numGuia: string, codCartorio: string): Promise<GuiaPagaResponse | null> {
    try {
      return await this.recuperacaoService.verificarGuiaPaga(numGuia, codCartorio);
    } catch (error) {
      console.error('[SeloController] Error verifying guide:', error);
      return null;
    }
  }

  // ==================== HISTORY OPERATIONS ====================

  /**
   * Query history with filters and pagination
   */
  queryHistory(filter?: SeloRecordFilter, page = 1, pageSize = 20): PaginatedResult<SeloRecord> {
    return this.historyStore.query(filter, page, pageSize);
  }

  /**
   * Search history by name
   */
  searchByNome(nome: string, page = 1, pageSize = 20): PaginatedResult<SeloRecord> {
    return this.historyStore.searchByNome(nome, page, pageSize);
  }

  /**
   * Get failed seals for retry
   */
  getFailedSeals(): SeloRecord[] {
    return this.historyStore.getFailedRecords();
  }

  /**
   * Get recent seals
   */
  getRecentSeals(days = 7, page = 1, pageSize = 20): PaginatedResult<SeloRecord> {
    return this.historyStore.getRecentRecords(days, page, pageSize);
  }

  /**
   * Get history statistics
   */
  getHistoryStats() {
    return this.historyStore.getStats();
  }

  /**
   * Mark seal as applied to document
   */
  markSealApplied(id: string): SeloRecord | null {
    return this.historyStore.update(id, {
      status: 'applied',
      dataAplicacao: new Date().toISOString()
    });
  }

  /**
   * Cancel seal
   */
  cancelSeal(id: string): SeloRecord | null {
    return this.historyStore.update(id, {
      status: 'cancelled'
    });
  }

  // ==================== IMAGE OPERATIONS ====================

  /**
   * Get image data URL for display
   */
  async getImageDataUrl(numSelo: string): Promise<string> {
    return await this.imagemService.getImageDataUrl(numSelo);
  }

  /**
   * Download seal image as file
   */
  async downloadSealImage(numSelo: string, nomeArquivo?: string): Promise<void> {
    await this.imagemService.downloadImagem(numSelo, nomeArquivo);
  }
}

// ==================== FACTORY & SINGLETON ====================

let seloControllerInstance: SeloController | null = null;

/**
 * Create SeloController singleton instance
 */
export function createSeloController(): SeloController {
  if (!seloControllerInstance) {
    seloControllerInstance = new SeloController();
    console.log('[SeloController] Singleton created');
  }
  return seloControllerInstance;
}

/**
 * Get existing SeloController singleton
 */
export function getSeloController(): SeloController {
  return createSeloController();
}


