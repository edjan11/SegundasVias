export {};

declare global {
  interface Window {
    api?: {
      dbSaveDraft?: (args?: Record<string, unknown>) => Promise<unknown>;
      saveXml?: (opts?: Record<string, unknown>) => Promise<string>;
      saveJson?: (opts?: Record<string, unknown>) => Promise<string>;
      getConfig?: () => Promise<Record<string, unknown>>;
      pickJsonDir?: () => Promise<string>;
      pickXmlDir?: () => Promise<string>;
      dbSave?: (...args: unknown[]) => Promise<unknown>;
      [key: string]: unknown;
    };
  }
}
