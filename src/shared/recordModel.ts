export type Registro = { [key: string]: any };

/**
 * RecordModel: canonical wrapper for a registro object.
 * Keeps a single source of truth for normalization and export.
 */
export class RecordModel {
  private readonly data: Registro;

  constructor(raw: Registro) {
    // Shallow copy to avoid accidental external mutation
    this.data = { ...(raw || {}) };
  }

  /** Return a plain object representation suitable for exporting. */
  toObject(): Registro {
    // Create a shallow clone to avoid callers mutating internal state
    return { ...this.data };
  }

  /** Access raw value by key */
  get(key: string) {
    return this.data[key];
  }
}
