/**
 * Sistema de Selo - Camada de Dados
 * 
 * Armazenamento isolado usando IndexedDB.
 * Este módulo NÃO depende de nenhum outro módulo do sistema.
 */

import type { Selo, SeloState, SeloConfig } from './types';

const DB_NAME = 'SeloDatabase';
const DB_VERSION = 1;
const STORE_NAME = 'selos';
const CONFIG_STORE = 'seloConfig';

/**
 * Inicializa o banco de dados
 */
function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Store de selos
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const seloStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        seloStore.createIndex('numero', 'numero', { unique: false });
        seloStore.createIndex('ato', 'ato', { unique: false });
        seloStore.createIndex('matricula', 'matricula', { unique: false });
      }

      // Store de configuração
      if (!db.objectStoreNames.contains(CONFIG_STORE)) {
        db.createObjectStore(CONFIG_STORE, { keyPath: 'ato' });
      }
    };
  });
}

/**
 * Salva um selo no banco
 */
export async function saveSelo(selo: Selo): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(selo);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Busca um selo por ID
 */
export async function getSeloById(id: string): Promise<Selo | undefined> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Busca selos por ato
 */
export async function getSelosByAto(
  ato: 'nascimento' | 'casamento' | 'obito'
): Promise<Selo[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('ato');
    const request = index.getAll(ato);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Busca selo por número
 */
export async function getSeloByNumero(numero: string): Promise<Selo | undefined> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('numero');
    const request = index.get(numero);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Lista todos os selos
 */
export async function getAllSelos(): Promise<Selo[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Deleta um selo
 */
export async function deleteSelo(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Salva configuração de selo para um ato
 */
export async function saveSeloConfig(
  ato: string,
  config: SeloConfig
): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CONFIG_STORE], 'readwrite');
    const store = transaction.objectStore(CONFIG_STORE);
    const request = store.put({ ato, ...config });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Busca configuração de selo para um ato
 */
export async function getSeloConfig(ato: string): Promise<SeloConfig | undefined> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CONFIG_STORE], 'readonly');
    const store = transaction.objectStore(CONFIG_STORE);
    const request = store.get(ato);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const result = request.result;
      if (result) {
        // Remove o campo 'ato' do resultado
        const { ato: _, ...config } = result;
        resolve(config as SeloConfig);
      } else {
        resolve(undefined);
      }
    };
  });
}
