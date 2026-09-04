/* ============================================================
   MINI MENU — a small popup anchored to a trigger element.
   items: [{ label, fn }] where fn is a global function name (string) to call.
   Used for the sidebar profile popup and the dashboard card 3-dot
   menus (Open/Duplicate/Share/Delete).
   ============================================================ */
function showMiniMenu(anchorEl, items) {
  const menu = document.getElementById('miniMenu');
  menu.innerHTML = items.map(it =>
    it.divider
      ? '<div class="mini-menu-divider"></div>'
      : `<div class="mini-menu-item" onclick="closeMiniMenu();${it.fn}">${it.label}</div>`
  ).join('');
  menu.classList.add('open');

  const rect = anchorEl.getBoundingClientRect();
  // Open upward if the anchor is in the lower half of the screen (e.g. sidebar bottom).
  const openUpward = rect.top > window.innerHeight / 2;
  menu.style.left = Math.min(rect.left, window.innerWidth - 200) + 'px';
  if (openUpward) {
    menu.style.bottom = (window.innerHeight - rect.top + 6) + 'px';
    menu.style.top = 'auto';
  } else {
    menu.style.top = (rect.bottom + 6) + 'px';
    menu.style.bottom = 'auto';
  }

  setTimeout(() => document.addEventListener('click', _miniMenuOutsideClick), 0);
}

function closeMiniMenu() {
  document.getElementById('miniMenu').classList.remove('open');
  document.removeEventListener('click', _miniMenuOutsideClick);
}

function _miniMenuOutsideClick(e) {
  const menu = document.getElementById('miniMenu');
  if (!menu.contains(e.target)) closeMiniMenu();
}
