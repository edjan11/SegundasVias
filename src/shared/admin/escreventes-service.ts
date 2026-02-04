/**
 * Serviço de Gerenciamento de Escreventes
 * Implementa CRUD completo com validação e busca
 */

import type {
  Escrevente,
  EscreventeCreateDTO,
  EscreventeUpdateDTO,
  EscreventeSearchParams,
  EscreventeSearchResult,
} from './escrevente.schema';
import { validateEscrevente, sanitizeCPF } from './escrevente.schema';

/**
 * Gera UUID v4 simples
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Normaliza string para busca (remove acentos, lowercase)
 */
function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Storage abstrato - será implementado com JSON ou PostgreSQL
 */
export interface EscreventeStorage {
  loadAll(): Promise<Escrevente[]>;
  save(escreventes: Escrevente[]): Promise<void>;
}

/**
 * Serviço de Escreventes (singleton)
 */
export class EscreventesService {
  private storage: EscreventeStorage;
  private cache: Map<string, Escrevente> = new Map();
  private indexByCPF: Map<string, string> = new Map();
  private indexByCartorio: Map<string, Set<string>> = new Map();
  private loaded = false;

  constructor(storage: EscreventeStorage) {
    this.storage = storage;
  }

  /**
   * Carrega dados do storage e atualiza índices
   */
  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;

    const escreventes = await this.storage.loadAll();
    this.cache.clear();
    this.indexByCPF.clear();
    this.indexByCartorio.clear();

    for (const e of escreventes) {
      this.cache.set(e.id, e);
      
      if (e.cpf) {
        this.indexByCPF.set(sanitizeCPF(e.cpf), e.id);
      }
      
      if (!this.indexByCartorio.has(e.cartorioId)) {
        this.indexByCartorio.set(e.cartorioId, new Set());
      }
      this.indexByCartorio.get(e.cartorioId)!.add(e.id);
    }

    this.loaded = true;
  }

  /**
   * Persiste cache no storage
   */
  private async persist(): Promise<void> {
    const escreventes = Array.from(this.cache.values());
    await this.storage.save(escreventes);
  }

  /**
   * Cria novo escrevente
   */
  async create(data: EscreventeCreateDTO, createdBy?: string): Promise<Escrevente> {
    await this.ensureLoaded();

    // Validação
    const errors = validateEscrevente(data);
    if (errors.length > 0) {
      throw new Error(`Validação falhou: ${errors.join(', ')}`);
    }

    // Verifica duplicação de CPF
    if (data.cpf) {
      const cpfClean = sanitizeCPF(data.cpf);
      if (this.indexByCPF.has(cpfClean)) {
        throw new Error('CPF já cadastrado');
      }
    }

    const now = new Date().toISOString();
    const escrevente: Escrevente = {
      id: generateUUID(),
      nome: data.nome.trim(),
      cpf: data.cpf ? sanitizeCPF(data.cpf) : undefined,
      matriculaInterna: data.matriculaInterna?.trim(),
      cartorioId: data.cartorioId.trim(),
      cargo: data.cargo,
      funcao: data.funcao?.trim(),
      ativo: data.ativo ?? true,
      permissoes: data.permissoes ?? [],
      createdAt: now,
      updatedAt: now,
      createdBy,
    };

    this.cache.set(escrevente.id, escrevente);
    
    if (escrevente.cpf) {
      this.indexByCPF.set(escrevente.cpf, escrevente.id);
    }
    
    if (!this.indexByCartorio.has(escrevente.cartorioId)) {
      this.indexByCartorio.set(escrevente.cartorioId, new Set());
    }
    this.indexByCartorio.get(escrevente.cartorioId)!.add(escrevente.id);

    await this.persist();
    return escrevente;
  }

  /**
   * Busca escrevente por ID
   */
  async findById(id: string): Promise<Escrevente | null> {
    await this.ensureLoaded();
    return this.cache.get(id) || null;
  }

  /**
   * Busca escrevente por CPF
   */
  async findByCPF(cpf: string): Promise<Escrevente | null> {
    await this.ensureLoaded();
    const cpfClean = sanitizeCPF(cpf);
    const id = this.indexByCPF.get(cpfClean);
    return id ? this.cache.get(id) || null : null;
  }

  /**
   * Lista escreventes de um cartório
   */
  async findByCartorio(cartorioId: string): Promise<Escrevente[]> {
    await this.ensureLoaded();
    const ids = this.indexByCartorio.get(cartorioId);
    if (!ids) return [];
    
    return Array.from(ids)
      .map(id => this.cache.get(id))
      .filter((e): e is Escrevente => e !== undefined);
  }

  /**
   * Busca avançada com paginação
   */
  async search(params: EscreventeSearchParams): Promise<EscreventeSearchResult> {
    await this.ensureLoaded();

    let results = Array.from(this.cache.values());

    // Filtro por cartório
    if (params.cartorioId) {
      results = results.filter(e => e.cartorioId === params.cartorioId);
    }

    // Filtro por cargo
    if (params.cargo) {
      results = results.filter(e => e.cargo === params.cargo);
    }

    // Filtro por ativo
    if (params.ativo !== undefined) {
      results = results.filter(e => e.ativo === params.ativo);
    }

    // Busca textual (nome, CPF, matrícula)
    if (params.query) {
      const queryNorm = normalizeSearch(params.query);
      results = results.filter(e => {
        const nomeNorm = normalizeSearch(e.nome);
        const cpfMatch = e.cpf?.includes(params.query!) || false;
        const matMatch = e.matriculaInterna?.includes(params.query!) || false;
        return nomeNorm.includes(queryNorm) || cpfMatch || matMatch;
      });
    }

    // Ordenação por nome
    results.sort((a, b) => a.nome.localeCompare(b.nome));

    const total = results.length;
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 50;

    const items = results.slice(offset, offset + limit);

    return {
      items,
      total,
      offset,
      limit,
    };
  }

  /**
   * Atualiza escrevente
   */
  async update(id: string, data: EscreventeUpdateDTO, updatedBy?: string): Promise<Escrevente> {
    await this.ensureLoaded();

    const existing = this.cache.get(id);
    if (!existing) {
      throw new Error('Escrevente não encontrado');
    }

    // Validação
    const errors = validateEscrevente(data);
    if (errors.length > 0) {
      throw new Error(`Validação falhou: ${errors.join(', ')}`);
    }

    // Verifica duplicação de CPF
    if (data.cpf) {
      const cpfClean = sanitizeCPF(data.cpf);
      const existingId = this.indexByCPF.get(cpfClean);
      if (existingId && existingId !== id) {
        throw new Error('CPF já cadastrado');
      }
    }

    // Remove índices antigos
    if (existing.cpf) {
      this.indexByCPF.delete(existing.cpf);
    }
    if (this.indexByCartorio.has(existing.cartorioId)) {
      this.indexByCartorio.get(existing.cartorioId)!.delete(id);
    }

    // Atualiza dados
    const updated: Escrevente = {
      ...existing,
      nome: data.nome !== undefined ? data.nome.trim() : existing.nome,
      cpf: data.cpf !== undefined ? (data.cpf ? sanitizeCPF(data.cpf) : undefined) : existing.cpf,
      matriculaInterna: data.matriculaInterna !== undefined ? data.matriculaInterna?.trim() : existing.matriculaInterna,
      cartorioId: data.cartorioId !== undefined ? data.cartorioId.trim() : existing.cartorioId,
      cargo: data.cargo !== undefined ? data.cargo : existing.cargo,
      funcao: data.funcao !== undefined ? data.funcao?.trim() : existing.funcao,
      ativo: data.ativo !== undefined ? data.ativo : existing.ativo,
      permissoes: data.permissoes !== undefined ? data.permissoes : existing.permissoes,
      updatedAt: new Date().toISOString(),
      updatedBy,
    };

    this.cache.set(id, updated);

    // Reindexação
    if (updated.cpf) {
      this.indexByCPF.set(updated.cpf, id);
    }
    if (!this.indexByCartorio.has(updated.cartorioId)) {
      this.indexByCartorio.set(updated.cartorioId, new Set());
    }
    this.indexByCartorio.get(updated.cartorioId)!.add(id);

    await this.persist();
    return updated;
  }

  /**
   * Deleta escrevente
   */
  async delete(id: string): Promise<void> {
    await this.ensureLoaded();

    const existing = this.cache.get(id);
    if (!existing) {
      throw new Error('Escrevente não encontrado');
    }

    // Remove índices
    if (existing.cpf) {
      this.indexByCPF.delete(existing.cpf);
    }
    if (this.indexByCartorio.has(existing.cartorioId)) {
      this.indexByCartorio.get(existing.cartorioId)!.delete(id);
    }

    this.cache.delete(id);
    await this.persist();
  }

  /**
   * Lista todos os escreventes ativos
   */
  async listActive(): Promise<Escrevente[]> {
    await this.ensureLoaded();
    return Array.from(this.cache.values())
      .filter(e => e.ativo)
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }

  /**
   * Força recarregamento do cache
   */
  async reload(): Promise<void> {
    this.loaded = false;
    await this.ensureLoaded();
  }
}
