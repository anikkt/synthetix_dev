async function renderAdminUsers() {
  await loadUserDirectory();
  const tbody = document.querySelector('#adminUsersTable tbody');
  const users = Object.values(State.userDirectory);
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="subtitle">No users found.</td></tr>';
    return;
  }
  tbody.innerHTML = users.map(u => `
    <tr>
      <td>${u.name || '—'}</td>
      <td>${u.email}</td>
      <td>
        <select onchange="changeUserRole('${u.uid}', this.value)" ${currentUserRole !== 'admin' ? 'disabled' : ''}>
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
          <option value="analyst" ${u.role === 'analyst' ? 'selected' : ''}>Analyst</option>
          <option value="viewer" ${u.role === 'viewer' ? 'selected' : ''}>Viewer</option>
        </select>
      </td>
    </tr>`).join('');
}

async function changeUserRole(uid, role) {
  try {
    await db.collection('users').doc(uid).update({ role });
    State.userDirectory[uid].role = role;
    if (uid === currentUser.uid) {
      currentUserRole = role;
      document.getElementById('nav-admin-item').style.display = role === 'admin' ? '' : 'none';
    }
  } catch (e) {
    alert('Could not change role: ' + e.message);
    renderAdminUsers();
  }
}
