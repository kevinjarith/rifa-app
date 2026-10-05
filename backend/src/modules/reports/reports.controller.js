const { stringify } = require('csv-stringify/sync');
const { asyncHandler } = require('../../utils/asyncHandler');
const { formatNumber } = require('../tickets/tickets.service');
const reportsService = require('./reports.service');

const byDay = asyncHandler(async (req, res) => {
  res.json({ rows: await reportsService.salesByDay(req.query.raffleId, req.query) });
});

const byUser = asyncHandler(async (req, res) => {
  res.json({ rows: await reportsService.salesByUser(req.query.raffleId) });
});

const byMethod = asyncHandler(async (req, res) => {
  res.json({ rows: await reportsService.salesByMethod(req.query.raffleId) });
});

const ticketsCsv = asyncHandler(async (req, res) => {
  const tickets = await reportsService.ticketsForExport(req.query.raffleId, req.query.status);

  const rows = tickets.map((t) => ({
    numero: formatNumber(t.number),
    estado: t.status,
    cliente: t.customer?.fullName ?? '',
    telefono: t.customer?.phone ?? '',
    documento: t.customer?.documentId ?? '',
    precio: t.price.toString(),
    vendedor: t.soldBy?.name ?? '',
    reservado_en: t.reservedAt ? t.reservedAt.toISOString() : '',
    pagado_en: t.paidAt ? t.paidAt.toISOString() : '',
    observaciones: t.observations ?? '',
  }));

  const csv = stringify(rows, {
    header: true,
    columns: [
      'numero',
      'estado',
      'cliente',
      'telefono',
      'documento',
      'precio',
      'vendedor',
      'reservado_en',
      'pagado_en',
      'observaciones',
    ],
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="tickets.csv"');
  res.send(csv);
});

module.exports = { byDay, byUser, byMethod, ticketsCsv };
