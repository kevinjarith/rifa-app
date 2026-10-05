const { prisma } = require('../../db/prisma');

async function salesByDay(raffleId, { from, to } = {}) {
  const payments = await prisma.payment.findMany({
    where: {
      status: 'PAGADO',
      ticket: { raffleId },
      ...(from || to
        ? { paidAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
        : {}),
    },
    select: { amount: true, paidAt: true },
  });

  const byDay = new Map();
  for (const p of payments) {
    const day = p.paidAt.toISOString().slice(0, 10);
    const entry = byDay.get(day) || { day, count: 0, total: 0 };
    entry.count += 1;
    entry.total += Number(p.amount);
    byDay.set(day, entry);
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

async function salesByUser(raffleId) {
  const tickets = await prisma.ticket.findMany({
    where: { raffleId, status: 'PAGADO' },
    select: { price: true, soldBy: { select: { id: true, name: true } } },
  });

  const byUser = new Map();
  for (const t of tickets) {
    const key = t.soldBy?.id ?? 'desconocido';
    const entry = byUser.get(key) || { userId: key, userName: t.soldBy?.name ?? 'Desconocido', count: 0, total: 0 };
    entry.count += 1;
    entry.total += Number(t.price);
    byUser.set(key, entry);
  }
  return [...byUser.values()];
}

async function salesByMethod(raffleId) {
  const grouped = await prisma.payment.groupBy({
    by: ['method'],
    where: { status: 'PAGADO', ticket: { raffleId } },
    _count: { _all: true },
    _sum: { amount: true },
  });
  return grouped.map((g) => ({ method: g.method, count: g._count._all, total: Number(g._sum.amount ?? 0) }));
}

async function ticketsForExport(raffleId, status) {
  return prisma.ticket.findMany({
    where: { raffleId, ...(status ? { status } : {}) },
    include: { customer: true, soldBy: { select: { name: true } } },
    orderBy: { number: 'asc' },
  });
}

module.exports = { salesByDay, salesByUser, salesByMethod, ticketsForExport };
