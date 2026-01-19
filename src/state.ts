// Gerenciamento de estado global (TypeScript)

export const state: Record<string, unknown> = {
  // Definição inicial do estado global
};

export function updateState(key: string, value: unknown): void {
  if (Object.prototype.hasOwnProperty.call(state, key)) {
    state[key] = value;
  }
}

export function getState(key: string): unknown {
  return state[key];
}
