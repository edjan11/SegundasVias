declare global {
  interface HTMLElement {
    /** timeout id used by UI helpers (returned by setTimeout) */
    _timer?: number;
  }
}

export {};
