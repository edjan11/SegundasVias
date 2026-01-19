// Gerenciamento de estado global

export const state = {
  // Definição inicial do estado global
};

export function updateState(key, value) {
  if (state.hasOwnProperty(key)) {
    state[key] = value;
  }
}

export function getState(key) {
  return state[key];
}