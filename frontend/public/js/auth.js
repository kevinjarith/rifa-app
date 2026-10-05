const form = document.getElementById('login-form');
const errorEl = document.getElementById('login-error');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.textContent = '';
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    await window.api.post('/auth/login', { email, password });
    window.location.href = '/dashboard.html';
  } catch (err) {
    errorEl.textContent = err.message || 'No se pudo iniciar sesión';
  }
});
