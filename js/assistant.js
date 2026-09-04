function openAssistant() {
  const drawer = document.getElementById('assistantDrawer');
  drawer.classList.add('open');
  if (!drawer.dataset.initialized) {
    document.getElementById('assistantChips').innerHTML = FAQ_ITEMS.map((item, i) =>
      `<div class="assistant-chip" onclick="askFAQ(${i})">${item.q}</div>`
    ).join('');
    document.getElementById('assistantChat').innerHTML =
      '<div class="assistant-bubble bot">Hi! I\'m the Assistant. Tap a question below and I\'ll answer it.</div>';
    drawer.dataset.initialized = '1';
  }
}

function closeAssistant() {
  document.getElementById('assistantDrawer').classList.remove('open');
}

function askFAQ(i) {
  const item = FAQ_ITEMS[i];
  const chat = document.getElementById('assistantChat');
  chat.innerHTML += `<div class="assistant-bubble user">${item.q}</div>`;
  chat.innerHTML += `<div class="assistant-bubble bot">${item.a}</div>`;
  chat.scrollTop = chat.scrollHeight;
}
