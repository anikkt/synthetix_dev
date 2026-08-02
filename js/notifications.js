
export function showNotification(message, type = 'info') {
  let center = document.getElementById('notification-center');
  if (!center) {
    center = document.createElement('div');
    center.id = 'notification-center';
    document.body.appendChild(center);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<div>${message}</div>`;

  center.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
