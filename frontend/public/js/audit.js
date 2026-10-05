(async function init() {
  const me = await window.initNav('audit');

  const guard = document.getElementById('guard');
  const content = document.getElementById('audit-content');
  if (me.role !== 'SUPER_ADMIN') {
    guard.hidden = false;
    content.hidden = true;
    return;
  }
  content.hidden = false;

  const tbody = document.getElementById('audit-tbody');
  const { items } = await window.api.get('/audit-logs');

  tbody.innerHTML = items
    .map(
      (log) => `
      <tr>
        <td>${window.rifaFormat.formatDateTime(log.createdAt)}</td>
        <td>${log.user ? log.user.name : '—'}</td>
        <td>${log.action}</td>
        <td>${log.ticketNumber != null ? window.rifaFormat.pad3(log.ticketNumber) : '—'}</td>
        <td>${log.previousStatus || '—'}</td>
        <td>${log.newStatus || '—'}</td>
      </tr>`
    )
    .join('');
})();
