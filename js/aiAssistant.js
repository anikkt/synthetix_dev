
export function initAIAssistant() {
  const sendBtn = document.getElementById('ai-send-btn');
  const inputEl = document.getElementById('ai-input');
  
  if (sendBtn && inputEl) {
    sendBtn.addEventListener('click', () => {
      const text = inputEl.value.trim();
      if (!text) return;
      appendMessage('user', text);
      inputEl.value = '';
      setTimeout(() => {
        appendMessage('assistant', `Analyzed query: "${text}". Process bottlenecks detected in Purchase Order Approval step with 4.2 days mean duration.`);
      }, 600);
    });
  }
}

function appendMessage(sender, text) {
  const chatLog = document.getElementById('ai-chat-log');
  if (!chatLog) return;
  const msg = document.createElement('div');
  msg.className = `ai-message ai-${sender}`;
  msg.style.margin = '8px 0';
  msg.style.padding = '10px 14px';
  msg.style.borderRadius = '8px';
  msg.style.background = sender === 'user' ? 'var(--panel-hover)' : 'var(--panel-solid)';
  msg.style.border = 'var(--glass-border)';
  msg.style.fontSize = '12px';
  msg.textContent = text;
  chatLog.appendChild(msg);
  chatLog.scrollTop = chatLog.scrollHeight;
}
