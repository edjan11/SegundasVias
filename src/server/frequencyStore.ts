export type FrequencyKey = string; // format: "<scopeId>::<city>::<uf>"

export interface FrequencyStore {
  get(key: FrequencyKey): Promise<number>;
  increment(key: FrequencyKey, delta?: number): Promise<number>;
  reset(scopeId?: string): Promise<void>;
  prune(): Promise<void>;
}

export type InMemoryOptions = {
  ttlMs?: number; // default 30 days
  maxEntries?: number; // default 50_000
};

type Entry = {
  count: number;
  createdAt: number;
  lastAccess: number;
};

export class InMemoryFrequencyStore implements FrequencyStore {
  private map: Map<FrequencyKey, Entry> = new Map();
  private ttlMs: number;
  private maxEntries: number;
  private now: () => number;

  constructor(options?: InMemoryOptions & { now?: () => number }) {
    this.ttlMs = (options && options.ttlMs) || 30 * 24 * 60 * 60 * 1000;
    this.maxEntries = (options && options.maxEntries) || 50_000;
    this.now = (options && options.now) || (() => Date.now());
  }

  async get(key: FrequencyKey): Promise<number> {
    const e = this.map.get(key);
    if (!e) return 0;
    const now = this.now();
    if (now - e.lastAccess > this.ttlMs || now - e.createdAt > this.ttlMs) {
      this.map.delete(key);
      return 0;
    }
    e.lastAccess = now;
    return e.count;
  }

  async increment(key: FrequencyKey, delta = 1): Promise<number> {
    try {
      const now = this.now();
      let e = this.map.get(key);
      if (!e) {
        e = { count: delta, createdAt: now, lastAccess: now };
        this.map.set(key, e);
        await this.enforceLimit();
        return e.count;
      }
      e.count += delta;
      e.lastAccess = now;
      return e.count;
    } catch (err) {
      // Fail-safe: do not throw, return 0 as per specification
      return 0;
    }
  }

  async reset(scopeId?: string): Promise<void> {
    if (!scopeId) {
      this.map.clear();
      return;
    }
    const prefix = `${scopeId}::`;
    for (const key of Array.from(this.map.keys())) {
      if (key.startsWith(prefix)) this.map.delete(key);
    }
  }

  async prune(): Promise<void> {
    const now = this.now();
    for (const [k, v] of Array.from(this.map.entries())) {
      if (now - v.lastAccess > this.ttlMs || now - v.createdAt > this.ttlMs) {
        this.map.delete(k);
      }
    }
    await this.enforceLimit();
  }

  private async enforceLimit() {
    if (this.map.size <= this.maxEntries) return;
    // Evict by LRU: sort keys by lastAccess ascending
    const items = Array.from(this.map.entries());
    items.sort((a, b) => a[1].lastAccess - b[1].lastAccess);
    const toRemove = items.slice(0, items.length - this.maxEntries);
    for (const [k] of toRemove) this.map.delete(k);
  }
}

// Optional File-backed store (not used by default)
import fs from 'fs';
import path from 'path';

export class FileBackedFrequencyStore extends InMemoryFrequencyStore {
  private filePath: string;
  private snapshotIntervalMs: number;
  private timer: NodeJS.Timeout | null = null;

  constructor(filePath: string, options?: InMemoryOptions & { snapshotIntervalMs?: number; now?: () => number }) {
    super(options);
    this.filePath = filePath;
    this.snapshotIntervalMs = (options && options.snapshotIntervalMs) || 60 * 60 * 1000; // default 1h
    this.loadSnapshot();
    this.timer = setInterval(() => this.saveSnapshot(), this.snapshotIntervalMs);
  }

  private loadSnapshot() {
    try {
      if (!fs.existsSync(this.filePath)) return;
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const obj = JSON.parse(raw);
      const now = Date.now();
      for (const key of Object.keys(obj)) {
        const v = obj[key];
        // v should be { count, createdAt, lastAccess }
        (this as any).map.set(key, v);
      }
    } catch (e) {
      // ignore
    }
  }

  private saveSnapshot() {
    try {
      const tmp = `${this.filePath}.${process.pid}.tmp`;
      const dump: Record<string, Entry> = {};
      for (const [k, v] of (this as any).map.entries()) dump[k] = v;
      fs.writeFileSync(tmp, JSON.stringify(dump));
      fs.renameSync(tmp, this.filePath);
    } catch (e) {
      // ignore
    }
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }
}
