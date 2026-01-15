import type { AppState } from "./types";

export function saveDraft(state: AppState) {
  localStorage.setItem('svias_web_draft', JSON.stringify(state));
}

export function loadDraft(): Partial<AppState> | null {
  const raw = localStorage.getItem('svias_web_draft');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
