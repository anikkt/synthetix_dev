/* ============================================================
   AUTH — gates the whole app behind Firebase sign-in.
   On sign-in: ensure a users/{uid} doc exists, then load that
   user's data from Firestore and reveal the app.
   On sign-out: show the login screen, hide the app.
   ============================================================ */

function initAuthListener() {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      await ensureUserDoc(user);
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('app').style.display = 'flex';
      await initAppData();
    } else {
      currentUser = null;
      document.getElementById('app').style.display = 'none';
      document.getElementById('loginScreen').style.display = 'flex';
    }
  });
}

async function ensureUserDoc(user) {
  const ref = db.collection('users').doc(user.uid);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      email: user.email,
      name: user.email.split('@')[0],
      role: 'admin', // Phase 1: everyone who signs in is admin. Role management comes in a later phase.
      createdAt: new Date().toISOString()
    });
  }
  const data = (await ref.get()).data();
  currentUserRole = data.role || 'admin';
  const nameEl = document.getElementById('profName');
  if (nameEl) nameEl.value = data.name;
  const emailEl = document.getElementById('profEmail');
  if (emailEl) emailEl.textContent = data.email;
}

async function loginWithEmail() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPassword').value;
  const msg = document.getElementById('loginMsg');
  msg.textContent = '';
  if (!email || !pass) { msg.textContent = 'Enter both email and password.'; return; }
  try {
    await auth.signInWithEmailAndPassword(email, pass);
  } catch (e) {
    msg.textContent = describeAuthError(e);
  }
}

function describeAuthError(e) {
  const map = {
    'auth/invalid-email': 'That email address looks invalid.',
    'auth/user-not-found': 'No account found for that email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/too-many-requests': 'Too many attempts — wait a bit and try again.',
    'auth/network-request-failed': 'Network error — check your internet connection.'
  };
  return map[e.code] || `Sign-in failed: ${e.message}`;
}

function logout() {
  auth.signOut();
}
