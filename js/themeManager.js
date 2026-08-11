function applyTheme() {
  const light = State.theme === 'light';
  document.body.classList.toggle('light-theme', light);
  const toggle = document.getElementById('themeToggle');
  if (toggle) toggle.checked = light;
}

function toggleTheme() {
  State.theme = document.getElementById('themeToggle').checked ? 'light' : 'dark';
  applyTheme();
  saveStateToStorage();
}

