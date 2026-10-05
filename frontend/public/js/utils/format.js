function pad3(value) {
  return String(value).padStart(3, '0');
}

function formatMoney(value) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

function formatDateTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

const STATUS_LABEL = {
  DISPONIBLE: 'Disponible',
  RESERVADO: 'Reservado',
  PAGADO: 'Pagado',
  BLOQUEADO: 'Bloqueado',
};

const STATUS_ICON = {
  DISPONIBLE: '●',
  RESERVADO: '⏳',
  PAGADO: '✔',
  BLOQUEADO: '🔒',
};

window.rifaFormat = { pad3, formatMoney, formatDateTime, STATUS_LABEL, STATUS_ICON };
