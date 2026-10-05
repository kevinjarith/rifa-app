(async function init() {
  await window.initNav('reports');

  const { raffles } = await window.api.get('/raffles');
  const raffle = raffles.find((r) => r.isActive);
  if (!raffle) return;

  document.getElementById('export-csv-link').href = `/api/reports/tickets.csv?raffleId=${raffle.id}`;

  const { formatMoney } = window.rifaFormat;

  const [{ rows: byDay }, { rows: byUser }, { rows: byMethod }] = await Promise.all([
    window.api.get(`/reports/sales-by-day?raffleId=${raffle.id}`),
    window.api.get(`/reports/sales-by-user?raffleId=${raffle.id}`),
    window.api.get(`/reports/sales-by-method?raffleId=${raffle.id}`),
  ]);

  document.querySelector('#table-by-day tbody').innerHTML = byDay
    .map((r) => `<tr><td>${r.day}</td><td>${r.count}</td><td>${formatMoney(r.total)}</td></tr>`)
    .join('') || '<tr><td colspan="3">Sin datos</td></tr>';

  document.querySelector('#table-by-user tbody').innerHTML = byUser
    .map((r) => `<tr><td>${r.userName}</td><td>${r.count}</td><td>${formatMoney(r.total)}</td></tr>`)
    .join('') || '<tr><td colspan="3">Sin datos</td></tr>';

  document.querySelector('#table-by-method tbody').innerHTML = byMethod
    .map((r) => `<tr><td>${r.method}</td><td>${r.count}</td><td>${formatMoney(r.total)}</td></tr>`)
    .join('') || '<tr><td colspan="3">Sin datos</td></tr>';
})();
