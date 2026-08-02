
import { State } from './state.js';
import { saveStateToStorage } from './storage.js';

export function applyTheme(themeName) {
  const currentTheme = themeName || State.theme || 'dark';
  document.body.className = ''; // Clear all theme classes
  if (currentTheme !== 'dark') {
    document.body.classList.add(`theme-${currentTheme}`);
  }
  State.theme = currentTheme;
}

export function setTheme(themeName) {
  applyTheme(themeName);
  saveStateToStorage();
}
