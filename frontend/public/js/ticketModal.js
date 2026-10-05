const TicketModal = (() => {
  const dialog = document.getElementById('ticket-modal');
  let currentRaffleId = null;
  let currentUser = null;
  let onChangeCallback = null;

  function isPrivileged() {
    return currentUser && ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[c]));
  }

  async function open({ number, raffleId, user, onChange }) {
    currentRaffleId = raffleId;
    currentUser = user;
    onChangeCallback = onChange;
    renderLoading(number);
    dialog.showModal();
    try {
      const { ticket } = await window.api.get(`/tickets/${number}?raffleId=${raffleId}`);
      render(ticket);
    } catch (err) {
      renderError(number, err.message);
    }
  }

  function renderLoading(number) {
    dialog.innerHTML = `
      <div class="modal-header"><strong>Número ${window.rifaFormat.pad3(number)}</strong>
        <button class="icon-btn" data-action="close" aria-label="Cerrar">✕</button></div>
      <div class="modal-body"><p>Cargando...</p></div>
    `;
    dialog.querySelector('[data-action="close"]').addEventListener('click', () => dialog.close());
  }

  function renderError(number, message) {
    dialog.innerHTML = `
      <div class="modal-header"><strong>Número ${window.rifaFormat.pad3(number)}</strong>
        <button class="icon-btn" data-action="close" aria-label="Cerrar">✕</button></div>
      <div class="modal-body"><p class="error-text">${escapeHtml(message)}</p></div>
    `;
    dialog.querySelector('[data-action="close"]').addEventListener('click', () => dialog.close());
  }

  function render(ticket) {
    const { STATUS_LABEL, STATUS_ICON, formatMoney, formatDateTime, pad3 } = window.rifaFormat;
    const n = ticket.number;

    let body = `
      <div class="modal-detail-row"><span>Estado</span>
        <span class="badge badge-${ticket.status}">${STATUS_ICON[ticket.status]} ${STATUS_LABEL[ticket.status]}</span></div>
      <div class="modal-detail-row"><span>Precio</span><span>${formatMoney(ticket.price)}</span></div>
    `;

    if (ticket.customer) {
      body += `
        <div class="modal-detail-row"><span>Cliente</span><span>${escapeHtml(ticket.customer.fullName)}</span></div>
        <div class="modal-detail-row"><span>Teléfono</span><span>${escapeHtml(ticket.customer.phone)}</span></div>
        ${
          ticket.customer.documentId
            ? `<div class="modal-detail-row"><span>Documento</span><span>${escapeHtml(ticket.customer.documentId)}</span></div>`
            : ''
        }
      `;
    }
    if (ticket.soldBy) {
      body += `<div class="modal-detail-row"><span>Vendedor</span><span>${escapeHtml(ticket.soldBy.name)}</span></div>`;
    }
    if (ticket.reservedAt) {
      body += `<div class="modal-detail-row"><span>Reservado</span><span>${formatDateTime(ticket.reservedAt)}</span></div>`;
    }
    if (ticket.payment) {
      body += `<div class="modal-detail-row"><span>Método de pago</span><span>${escapeHtml(ticket.payment.method)}</span></div>`;
    }
    if (ticket.paidAt) {
      body += `<div class="modal-detail-row"><span>Pagado</span><span>${formatDateTime(ticket.paidAt)}</span></div>`;
    }
    if (ticket.observations) {
      body += `<div class="modal-detail-row"><span>Observaciones</span><span>${escapeHtml(ticket.observations)}</span></div>`;
    }

    if (ticket.status === 'DISPONIBLE') {
      body += reserveForm();
    } else if (ticket.status === 'RESERVADO') {
      body += payForm(ticket);
    }

    dialog.innerHTML = `
      <div class="modal-header"><strong>Número ${pad3(n)}</strong>
        <button class="icon-btn" data-action="close" aria-label="Cerrar">✕</button></div>
      <div class="modal-body">${body}</div>
      <div class="modal-footer" id="modal-actions"></div>
    `;

    dialog.querySelector('[data-action="close"]').addEventListener('click', () => dialog.close());
    wireForms(ticket);
    renderActions(ticket);
  }

  function reserveForm() {
    return `
      <form id="reserve-form" style="margin-top:0.8rem;">
        <div class="field"><label for="r-name">Nombre del cliente</label>
          <input id="r-name" required /></div>
        <div class="field"><label for="r-phone">Teléfono</label>
          <input id="r-phone" required /></div>
        <div class="field"><label for="r-doc">Documento (opcional)</label>
          <input id="r-doc" /></div>
        <div class="field"><label for="r-obs">Observaciones (opcional)</label>
          <textarea id="r-obs"></textarea></div>
        <p class="error-text" id="reserve-error" role="alert"></p>
        <button type="submit" class="btn btn-primary btn-block">Reservar</button>
      </form>
    `;
  }

  function payForm(ticket) {
    return `
      <form id="pay-form" style="margin-top:0.8rem;">
        <div class="field"><label for="p-method">Método de pago</label>
          <select id="p-method">
            <option value="EFECTIVO">Efectivo</option>
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="NEQUI">Nequi</option>
            <option value="DAVIPLATA">Daviplata</option>
            <option value="OTRO">Otro</option>
          </select>
        </div>
        <div class="modal-detail-row"><span>Monto a cobrar</span><span>${window.rifaFormat.formatMoney(ticket.price)}</span></div>
        <p class="error-text" id="pay-error" role="alert"></p>
        <button type="submit" class="btn btn-primary btn-block">Marcar como pagado</button>
      </form>
    `;
  }

  function wireForms(ticket) {
    const reserveFormEl = dialog.querySelector('#reserve-form');
    if (reserveFormEl) {
      reserveFormEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errEl = dialog.querySelector('#reserve-error');
        errEl.textContent = '';
        try {
          await window.api.post(`/tickets/${ticket.number}/reserve`, {
            raffleId: currentRaffleId,
            customer: {
              fullName: dialog.querySelector('#r-name').value.trim(),
              phone: dialog.querySelector('#r-phone').value.trim(),
              documentId: dialog.querySelector('#r-doc').value.trim() || null,
            },
            observations: dialog.querySelector('#r-obs').value.trim() || null,
          });
          notifyChangeAndClose();
        } catch (err) {
          errEl.textContent = err.message;
        }
      });
    }

    const payFormEl = dialog.querySelector('#pay-form');
    if (payFormEl) {
      payFormEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errEl = dialog.querySelector('#pay-error');
        errEl.textContent = '';
        try {
          await window.api.post(`/tickets/${ticket.number}/pay`, {
            raffleId: currentRaffleId,
            method: dialog.querySelector('#p-method').value,
          });
          notifyChangeAndClose();
        } catch (err) {
          errEl.textContent = err.message;
        }
      });
    }
  }

  function renderActions(ticket) {
    const actionsEl = dialog.querySelector('#modal-actions');
    const buttons = [];

    if (ticket.status === 'RESERVADO') {
      buttons.push({ label: 'Liberar', danger: false, action: () => releaseTicket(ticket) });
    }
    if (ticket.status === 'DISPONIBLE' && isPrivileged()) {
      buttons.push({ label: 'Bloquear', danger: false, action: () => blockTicket(ticket) });
    }
    if (ticket.status === 'BLOQUEADO' && isPrivileged()) {
      buttons.push({ label: 'Desbloquear', danger: false, action: () => unblockTicket(ticket) });
    }
    if (ticket.status === 'PAGADO' && isPrivileged()) {
      buttons.push({ label: 'Des-vender', danger: true, action: () => unsellTicket(ticket) });
    }

    actionsEl.innerHTML = buttons
      .map((b, i) => `<button class="btn ${b.danger ? 'btn-danger' : ''}" data-idx="${i}">${b.label}</button>`)
      .join('');

    actionsEl.querySelectorAll('button').forEach((btn, i) => {
      btn.addEventListener('click', buttons[i].action);
    });
  }

  async function releaseTicket(ticket) {
    const ok = await window.confirmAction(`¿Está seguro de liberar el número ${window.rifaFormat.pad3(ticket.number)}?`);
    if (!ok) return;
    try {
      await window.api.post(`/tickets/${ticket.number}/release`, { raffleId: currentRaffleId });
      notifyChangeAndClose();
    } catch (err) {
      showToast(err.message, true);
    }
  }

  async function blockTicket(ticket) {
    const ok = await window.confirmAction(`¿Bloquear el número ${window.rifaFormat.pad3(ticket.number)}?`);
    if (!ok) return;
    try {
      await window.api.post(`/tickets/${ticket.number}/block`, { raffleId: currentRaffleId });
      notifyChangeAndClose();
    } catch (err) {
      showToast(err.message, true);
    }
  }

  async function unblockTicket(ticket) {
    const ok = await window.confirmAction(`¿Desbloquear el número ${window.rifaFormat.pad3(ticket.number)}?`);
    if (!ok) return;
    try {
      await window.api.post(`/tickets/${ticket.number}/unblock`, { raffleId: currentRaffleId });
      notifyChangeAndClose();
    } catch (err) {
      showToast(err.message, true);
    }
  }

  async function unsellTicket(ticket) {
    const ok = await window.confirmAction(
      `¿Está seguro de des-vender el número ${window.rifaFormat.pad3(ticket.number)}? Esta acción vuelve a dejarlo disponible y no se puede deshacer.`
    );
    if (!ok) return;
    try {
      await window.api.post(`/tickets/${ticket.number}/unsell`, {
        raffleId: currentRaffleId,
        reason: 'Des-venta solicitada desde el panel',
      });
      notifyChangeAndClose();
    } catch (err) {
      showToast(err.message, true);
    }
  }

  function notifyChangeAndClose() {
    dialog.close();
    if (onChangeCallback) onChangeCallback();
  }

  function showToast(message, isError) {
    const el = document.createElement('div');
    el.className = `toast ${isError ? 'error' : ''}`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  return { open, showToast };
})();

window.TicketModal = TicketModal;
