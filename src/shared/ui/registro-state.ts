export type RegistroState = {
  json: unknown | null;
  xml: string;
  dirty: boolean;
  savedAt?: string;
  linked?: boolean;
};

export type RegistroStateController = {
  get: () => RegistroState;
  setJson: (json: unknown) => void;
  setXml: (xml: string) => void;
  clearXml: () => void;
  markSaved: () => void;
  markDirty: () => void;
  setLinked: (linked: boolean) => void;
  reset: () => void;
};

export function createRegistroState(initial?: Partial<RegistroState>): RegistroStateController {
  const base: RegistroState = {
    json: null,
    xml: '',
    dirty: true,
    savedAt: undefined,
    linked: false,
  };

  let state: RegistroState = { ...base, ...(initial || {}) };

  const get = () => ({ ...state });
  const setJson = (json: unknown) => {
    state = { ...state, json };
  };
  const setXml = (xml: string) => {
    state = { ...state, xml: String(xml || '') };
  };
  const clearXml = () => {
    state = { ...state, xml: '' };
  };
  const markSaved = () => {
    state = { ...state, dirty: false, savedAt: new Date().toISOString() };
  };
  const markDirty = () => {
    state = { ...state, dirty: true };
  };
  const setLinked = (linked: boolean) => {
    state = { ...state, linked: !!linked };
  };
  const reset = () => {
    state = { ...base };
  };

  return { get, setJson, setXml, clearXml, markSaved, markDirty, setLinked, reset };
}
