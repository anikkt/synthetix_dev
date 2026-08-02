
import { showView } from './router.js';

export function initCommandPalette() {
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      toggleCommandPalette();
    }
  });
}

function toggleCommandPalette() {
  let palette = document.getElementById('command-palette-modal');
  if (palette) {
    palette.classList.toggle('active');
    if (palette.classList.contains('active')) {
      document.getElementById('cmd-input').focus();
    }
  }
}
