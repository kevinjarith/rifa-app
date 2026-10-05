const { prisma } = require('../../db/prisma');
const { recordAudit } = require('../auditLogs/auditLogs.service');
const { NotFoundError } = require('../../utils/errors');

// Precio fijo de la boleta: una constante de código, no un parámetro que
// alguien pueda enviar ni cambiar después — no existe ninguna ruta para
// editarlo. Si el precio real de la rifa cambia, se actualiza aquí y se
// vuelve a desplegar.
const TICKET_PRICE = 3000;

async function listRaffles() {
  return prisma.raffle.findMany({ orderBy: { createdAt: 'desc' } });
}

async function createRaffleWithTickets({ name, isDemo }, actorUserId) {
  return prisma.$transaction(
    async (tx) => {
      const raffle = await tx.raffle.create({
        data: { name, ticketPrice: TICKET_PRICE, isDemo: Boolean(isDemo) },
      });

      const ticketsData = Array.from({ length: 1000 }, (_, number) => ({
        raffleId: raffle.id,
        number,
        price: TICKET_PRICE,
      }));
      await tx.ticket.createMany({ data: ticketsData });

      await recordAudit(tx, {
        userId: actorUserId,
        action: 'CREATE_RAFFLE',
        raffleId: raffle.id,
        metadata: { name: raffle.name, ticketPrice: String(TICKET_PRICE) },
      });

      return raffle;
    },
    { timeout: 20000 }
  );
}

async function setActive(id, isActive) {
  const raffle = await prisma.raffle.findUnique({ where: { id } });
  if (!raffle) throw new NotFoundError('Rifa no encontrada');
  return prisma.raffle.update({ where: { id }, data: { isActive } });
}

async function getStats(raffleId) {
  const raffle = await prisma.raffle.findUnique({ where: { id: raffleId } });
  if (!raffle) throw new NotFoundError('Rifa no encontrada');

  const grouped = await prisma.ticket.groupBy({
    by: ['status'],
    where: { raffleId },
    _count: { _all: true },
    _sum: { price: true },
  });

  const counts = { DISPONIBLE: 0, RESERVADO: 0, PAGADO: 0, BLOQUEADO: 0 };
  const sums = { DISPONIBLE: 0, RESERVADO: 0, PAGADO: 0, BLOQUEADO: 0 };
  for (const row of grouped) {
    counts[row.status] = row._count._all;
    sums[row.status] = Number(row._sum.price ?? 0);
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return {
    raffleId,
    total,
    disponibles: counts.DISPONIBLE,
    reservados: counts.RESERVADO,
    pagados: counts.PAGADO,
    bloqueados: counts.BLOQUEADO,
    dineroRecibido: sums.PAGADO,
    dineroPendiente: sums.RESERVADO,
  };
}

module.exports = { TICKET_PRICE, listRaffles, createRaffleWithTickets, setActive, getStats };
