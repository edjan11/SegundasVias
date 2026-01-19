export {};

declare global {
  interface Window {
    api?: {
      dbSaveDraft?: (args?: any) => Promise<any>;
      saveXml?: (opts?: any) => Promise<string>;
      saveJson?: (opts?: any) => Promise<string>;
      getConfig?: () => Promise<any>;
      pickJsonDir?: () => Promise<string>;
      pickXmlDir?: () => Promise<string>;
      dbSave?: (...args: any[]) => Promise<any>;
      [key: string]: any;
    };
  }
}
