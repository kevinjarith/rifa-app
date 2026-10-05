(async function init() {
  const me = await window.initNav('dashboard');

  let raffle = null;
  let allTickets = [];
  let activeFilter = 'TODOS';
  let searchTerm = '';

  const noRaffleEl = document.getElementById('no-raffle');
  const contentEl = document.getElementById('dashboard-content');
  const createBtn = document.getElementById('create-raffle-btn');
  const statsGrid = document.getElementById('stats-grid');
  const grid = document.getElementById('ticket-grid');
  const searchInput = document.getElementById('search-input');
  const filterGroup = document.getElementById('filter-group');

  if (!['SUPER_ADMIN', 'ADMIN'].includes(me.role)) {
    createBtn.hidden = true;
  }

  async function loadRaffle() {
    const { raffles } = await window.api.get('/raffles');
    raffle = raffles.find((r) => r.isActive) || null;
  }

  async function loadTickets() {
    const { tickets } = await window.api.get(`/tickets?raffleId=${raffle.id}`);
    allTickets = tickets;
  }

  async function loadStats() {
    const stats = await window.api.get(`/raffles/${raffle.id}/stats`);
    statsGrid.innerHTML = [
      ['Total', stats.total],
      ['Disponibles', stats.disponibles],
      ['Reservados', stats.reservados],
      ['Pagados', stats.pagados],
      ['Bloqueados', stats.bloqueados],
      ['Recaudado', window.rifaFormat.formatMoney(stats.dineroRecibido)],
      ['Pendiente', window.rifaFormat.formatMoney(stats.dineroPendiente)],
    ]
      .map(
        ([label, value]) =>
          `<div class="card stat-card"><div class="value">${value}</div><div class="label">${label}</div></div>`
      )
      .join('');
  }

  function renderGrid() {
    const { pad3, STATUS_ICON, STATUS_LABEL } = window.rifaFormat;
    const term = searchTerm.trim().toLowerCase();

    const filtered = allTickets.filter((t) => {
      if (activeFilter !== 'TODOS' && t.status !== activeFilter) return false;
      if (!term) return true;
      const numStr = pad3(t.number);
      const name = t.customer?.fullName?.toLowerCase() || '';
      const phone = t.customer?.phone || '';
      return numStr.includes(term) || name.includes(term) || phone.includes(term);
    });

    grid.innerHTML = filtered
      .map(
        (t) => `
        <button type="button" class="ticket-cell ${t.status}" data-number="${t.number}"
          aria-label="Número ${pad3(t.number)}, ${STATUS_LABEL[t.status]}">
          <span>${pad3(t.number)}</span>
          <span class="icon">${STATUS_ICON[t.status]}</span>
        </button>`
      )
      .join('');

    grid.querySelectorAll('.ticket-cell').forEach((cell) => {
      cell.addEventListener('click', () => {
        window.TicketModal.open({
          number: Number(cell.dataset.number),
          raffleId: raffle.id,
          user: me,
          onChange: refresh,
        });
      });
    });
  }

  async function refresh() {
    await Promise.all([loadTickets(), loadStats()]);
    renderGrid();
  }

  filterGroup.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    filterGroup.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderGrid();
  });

  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchTerm = searchInput.value;
      renderGrid();
    }, 150);
  });

  createBtn?.addEventListener('click', async () => {
    try {
      await window.api.post('/raffles', { name: 'Rifa', isDemo: false });
      await bootstrap();
    } catch (err) {
      window.TicketModal.showToast(err.message, true);
    }
  });

  async function bootstrap() {
    await loadRaffle();
    if (!raffle) {
      noRaffleEl.hidden = false;
      contentEl.hidden = true;
      return;
    }
    noRaffleEl.hidden = true;
    contentEl.hidden = false;
    await refresh();
  }

  await bootstrap();
})();
