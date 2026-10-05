// Shared topbar: fetches the current user, redirects to /login.html if not
// authenticated, and renders role-gated navigation links. Used on every
// authenticated page. Hiding links here is a UX convenience only — the real
// authorization check happens on the server for every API call.
async function initNav(activePage) {
  let me;
  try {
    const result = await window.api.get('/auth/me');
    me = result.user;
  } catch (err) {
    window.location.replace('/login.html');
    throw err;
  }

  const root = document.getElementById('topbar-root');
  const links = [{ href: '/dashboard.html', label: 'Dashboard', page: 'dashboard' }];
  links.push({ href: '/reports.html', label: 'Reportes', page: 'reports' });
  if (me.role === 'SUPER_ADMIN') {
    links.push({ href: '/users.html', label: 'Usuarios', page: 'users' });
    links.push({ href: '/audit.html', label: 'Auditoría', page: 'audit' });
  }

  root.innerHTML = `
    <div class="topbar-brand">🎟️ Rifa</div>
    <nav class="topbar-nav" aria-label="Navegación principal">
      ${links
        .map(
          (l) =>
            `<a href="${l.href}" class="${l.page === activePage ? 'active' : ''}">${l.label}</a>`
        )
        .join('')}
    </nav>
    <div class="topbar-user">
      <span>${me.name} · ${me.role}</span>
      <button class="btn" id="logout-btn" type="button">Salir</button>
    </div>
  `;

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await window.api.post('/auth/logout');
    window.location.replace('/login.html');
  });

  return me;
}

window.initNav = initNav;
