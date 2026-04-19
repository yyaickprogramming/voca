async function getCurrentUser() {
  try {
    const response = await fetch('/api/auth/me', {
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    return null;
  }
}

function showToast(message, type = 'info') {
  if (!message) {
    return;
  }

  let container = document.querySelector('.toast-container');

  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('toast-visible');
  });

  setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 260);
  }, 2600);
}

function toggleVisibilityByAuth(isAuthenticated) {
  document.body.classList.remove('is-authenticated', 'is-guest');
  document.body.classList.add(isAuthenticated ? 'is-authenticated' : 'is-guest');

  document.querySelectorAll('[data-auth-only]').forEach((element) => {
    element.hidden = !isAuthenticated;
  });

  document.querySelectorAll('[data-guest-only]').forEach((element) => {
    element.hidden = isAuthenticated;
  });
}

function redirectToLogin(reason = 'auth') {
  const loginUrl = new URL('/login.html', window.location.origin);
  loginUrl.searchParams.set('reason', reason);
  loginUrl.searchParams.set('returnTo', window.location.pathname);
  window.location.replace(`${loginUrl.pathname}${loginUrl.search}`);
}

function handlePageAccess(user) {
  const isAuthenticated = Boolean(user && user.username);
  const body = document.body;

  if (body.dataset.requiresAuth !== undefined && !isAuthenticated) {
    redirectToLogin(body.dataset.authReason || 'auth');
    return false;
  }

  if (body.dataset.guestOnly !== undefined && isAuthenticated) {
    window.location.replace('/index.html');
    return false;
  }

  return true;
}

function showToastFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const reason = params.get('reason');

  if (reason === 'auth') {
    showToast('Сначала войдите в аккаунт, чтобы открыть этот раздел.', 'warning');
  }
}

const authStatePromise = getCurrentUser();
window.authStatePromise = authStatePromise;
window.showToast = showToast;

document.addEventListener('DOMContentLoaded', async () => {
  const user = await authStatePromise;
  const isAuthenticated = Boolean(user && user.username);

  toggleVisibilityByAuth(isAuthenticated);
  showToastFromQuery();

  if (!handlePageAccess(user)) {
    return;
  }

  document.body.classList.remove('auth-pending');
  document.body.classList.add('page-ready');
});
