(async function init() {
  const me = await window.initNav('users');

  const guard = document.getElementById('guard');
  const content = document.getElementById('users-content');

  if (me.role !== 'SUPER_ADMIN') {
    guard.hidden = false;
    content.hidden = true;
    return;
  }
  content.hidden = false;

  const tbody = document.getElementById('users-tbody');
  const countEl = document.getElementById('users-count');
  const newUserBtn = document.getElementById('new-user-btn');
  const dialog = document.getElementById('user-modal');

  async function refresh() {
    const { users, max } = await window.api.get('/users');
    countEl.textContent = `${users.length} de ${max} usuarios autorizados`;
    newUserBtn.disabled = users.length >= max;
    newUserBtn.title = users.length >= max ? `Se alcanzó el máximo de ${max} usuarios` : '';

    tbody.innerHTML = users
      .map(
        (u) => `
        <tr>
          <td>${escapeHtml(u.name)}</td>
          <td>${escapeHtml(u.email)}</td>
          <td>${u.role}</td>
          <td>${u.active ? 'Activo' : 'Inactivo'}</td>
          <td>${u.lastLoginAt ? window.rifaFormat.formatDateTime(u.lastLoginAt) : 'Nunca'}</td>
          <td>
            <button class="btn" data-action="role" data-id="${u.id}">Cambiar rol</button>
            <button class="btn" data-action="active" data-id="${u.id}" data-active="${u.active}">${
          u.active ? 'Desactivar' : 'Reactivar'
        }</button>
            <button class="btn" data-action="reset" data-id="${u.id}">Restablecer clave</button>
          </td>
        </tr>`
      )
      .join('');

    tbody.querySelectorAll('[data-action="role"]').forEach((btn) =>
      btn.addEventListener('click', () => openRoleDialog(btn.dataset.id))
    );
    tbody.querySelectorAll('[data-action="active"]').forEach((btn) =>
      btn.addEventListener('click', () => toggleActive(btn.dataset.id, btn.dataset.active === 'true'))
    );
    tbody.querySelectorAll('[data-action="reset"]').forEach((btn) =>
      btn.addEventListener('click', () => openResetDialog(btn.dataset.id))
    );
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function closeDialog() {
    dialog.close();
  }

  newUserBtn.addEventListener('click', () => {
    dialog.innerHTML = `
      <div class="modal-header"><strong>Nuevo usuario</strong>
        <button class="icon-btn" data-action="close">✕</button></div>
      <div class="modal-body">
        <form id="create-form">
          <div class="field"><label>Nombre</label><input id="nu-name" required /></div>
          <div class="field"><label>Correo</label><input id="nu-email" type="email" required /></div>
          <div class="field"><label>Contraseña</label><input id="nu-password" type="password" minlength="8" required /></div>
          <div class="field"><label>Rol</label>
            <select id="nu-role">
              <option value="VENDEDOR">Vendedor</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>
          <p class="error-text" id="create-error"></p>
          <button type="submit" class="btn btn-primary btn-block">Crear</button>
        </form>
      </div>`;
    dialog.querySelector('[data-action="close"]').addEventListener('click', closeDialog);
    dialog.querySelector('#create-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = dialog.querySelector('#create-error');
      try {
        await window.api.post('/users', {
          name: dialog.querySelector('#nu-name').value.trim(),
          email: dialog.querySelector('#nu-email').value.trim(),
          password: dialog.querySelector('#nu-password').value,
          role: dialog.querySelector('#nu-role').value,
        });
        closeDialog();
        await refresh();
      } catch (err) {
        errEl.textContent = err.message;
      }
    });
    dialog.showModal();
  });

  function openRoleDialog(id) {
    dialog.innerHTML = `
      <div class="modal-header"><strong>Cambiar rol</strong>
        <button class="icon-btn" data-action="close">✕</button></div>
      <div class="modal-body">
        <form id="role-form">
          <div class="field"><label>Nuevo rol</label>
            <select id="role-select">
              <option value="VENDEDOR">Vendedor</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>
          <p class="error-text" id="role-error"></p>
          <button type="submit" class="btn btn-primary btn-block">Guardar</button>
        </form>
      </div>`;
    dialog.querySelector('[data-action="close"]').addEventListener('click', closeDialog);
    dialog.querySelector('#role-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await window.api.patch(`/users/${id}/role`, { role: dialog.querySelector('#role-select').value });
        closeDialog();
        await refresh();
      } catch (err) {
        dialog.querySelector('#role-error').textContent = err.message;
      }
    });
    dialog.showModal();
  }

  async function toggleActive(id, currentlyActive) {
    const verb = currentlyActive ? 'desactivar' : 'reactivar';
    const ok = await window.confirmAction(`¿Está seguro de ${verb} este usuario?`);
    if (!ok) return;
    await window.api.patch(`/users/${id}/active`, { active: !currentlyActive });
    await refresh();
  }

  function openResetDialog(id) {
    dialog.innerHTML = `
      <div class="modal-header"><strong>Restablecer contraseña</strong>
        <button class="icon-btn" data-action="close">✕</button></div>
      <div class="modal-body">
        <form id="reset-form">
          <div class="field"><label>Nueva contraseña</label><input id="reset-password" type="password" minlength="8" required /></div>
          <p class="error-text" id="reset-error"></p>
          <button type="submit" class="btn btn-primary btn-block">Restablecer</button>
        </form>
      </div>`;
    dialog.querySelector('[data-action="close"]').addEventListener('click', closeDialog);
    dialog.querySelector('#reset-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await window.api.post(`/users/${id}/reset-password`, {
          newPassword: dialog.querySelector('#reset-password').value,
        });
        closeDialog();
      } catch (err) {
        dialog.querySelector('#reset-error').textContent = err.message;
      }
    });
    dialog.showModal();
  }

  await refresh();
})();
