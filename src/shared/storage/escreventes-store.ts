/**
 * Storage JSON para Escreventes
 * Implementa persistência em arquivo JSON local com backup automático
 */

import type { Escrevente } from '../admin/escrevente.schema';
import type { EscreventeStorage } from '../admin/escreventes-service';
import * as fs from 'fs';
import * as path from 'path';

interface EscreventesData {
  version: number;
  data: Escrevente[];
  lastBackup?: string;
}

/**
 * Storage em JSON com versionamento e backup
 */
export class EscreventesJSONStorage implements EscreventeStorage {
  private dataPath: string;
  private backupPath: string;
  private lockPath: string;

  constructor(dataDir: string = './data') {
    this.dataPath = path.join(dataDir, 'escreventes.json');
    this.backupPath = path.join(dataDir, 'escreventes.backup.json');
    this.lockPath = path.join(dataDir, 'escreventes.lock');

    // Garante que o diretório existe
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  /**
   * Carrega todos os escreventes do arquivo JSON
   */
  async loadAll(): Promise<Escrevente[]> {
    try {
      if (!fs.existsSync(this.dataPath)) {
        // Arquivo não existe, retorna array vazio
        return [];
      }

      const content = fs.readFileSync(this.dataPath, 'utf-8');
      const parsed: EscreventesData = JSON.parse(content);

      // Validação de versão (para migrações futuras)
      if (parsed.version !== 1) {
        console.warn(`[EscreventesStorage] Versão ${parsed.version} detectada, esperado 1`);
      }

      return parsed.data || [];
    } catch (error) {
      console.error('[EscreventesStorage] Erro ao carregar:', error);
      
      // Tenta carregar backup
      if (fs.existsSync(this.backupPath)) {
        console.log('[EscreventesStorage] Tentando carregar backup...');
        try {
          const backupContent = fs.readFileSync(this.backupPath, 'utf-8');
          const backupParsed: EscreventesData = JSON.parse(backupContent);
          return backupParsed.data || [];
        } catch (backupError) {
          console.error('[EscreventesStorage] Erro ao carregar backup:', backupError);
        }
      }

      return [];
    }
  }

  /**
   * Salva todos os escreventes no arquivo JSON com backup
   */
  async save(escreventes: Escrevente[]): Promise<void> {
    // Tenta adquirir lock (prevenção de escrita simultânea)
    const lockAcquired = this.acquireLock();
    if (!lockAcquired) {
      throw new Error('Não foi possível adquirir lock de escrita');
    }

    try {
      // Backup do arquivo atual antes de sobrescrever
      if (fs.existsSync(this.dataPath)) {
        fs.copyFileSync(this.dataPath, this.backupPath);
      }

      const data: EscreventesData = {
        version: 1,
        data: escreventes,
        lastBackup: new Date().toISOString(),
      };

      const json = JSON.stringify(data, null, 2);

      // Escrita atômica: escreve em arquivo temporário e renomeia
      const tempPath = `${this.dataPath}.tmp`;
      fs.writeFileSync(tempPath, json, 'utf-8');
      fs.renameSync(tempPath, this.dataPath);

      console.log(`[EscreventesStorage] ${escreventes.length} escrevente(s) salvos com sucesso`);
    } catch (error) {
      console.error('[EscreventesStorage] Erro ao salvar:', error);
      throw error;
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Tenta adquirir lock de escrita
   */
  private acquireLock(): boolean {
    try {
      if (fs.existsSync(this.lockPath)) {
        // Verifica se lock é muito antigo (> 5 segundos)
        const stats = fs.statSync(this.lockPath);
        const age = Date.now() - stats.mtimeMs;
        if (age > 5000) {
          // Lock stale, remove
          fs.unlinkSync(this.lockPath);
        } else {
          return false;
        }
      }

      fs.writeFileSync(this.lockPath, process.pid.toString(), 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Libera lock de escrita
   */
  private releaseLock(): void {
    try {
      if (fs.existsSync(this.lockPath)) {
        fs.unlinkSync(this.lockPath);
      }
    } catch {
      // Ignora erros ao liberar lock
    }
  }

  /**
   * Exporta dados para backup manual
   */
  async exportBackup(targetPath: string): Promise<void> {
    const escreventes = await this.loadAll();
    const data: EscreventesData = {
      version: 1,
      data: escreventes,
      lastBackup: new Date().toISOString(),
    };
    const json = JSON.stringify(data, null, 2);
    fs.writeFileSync(targetPath, json, 'utf-8');
    console.log(`[EscreventesStorage] Backup exportado para ${targetPath}`);
  }

  /**
   * Importa dados de backup manual
   */
  async importBackup(sourcePath: string): Promise<void> {
    const content = fs.readFileSync(sourcePath, 'utf-8');
    const parsed: EscreventesData = JSON.parse(content);
    await this.save(parsed.data);
    console.log(`[EscreventesStorage] Backup importado de ${sourcePath}`);
  }
}
