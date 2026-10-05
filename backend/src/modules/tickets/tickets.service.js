const { prisma } = require('../../db/prisma');
const { recordAudit } = require('../auditLogs/auditLogs.service');
const { findOrCreateCustomer } = require('../customers/customers.service');
const { ConflictError, NotFoundError, ValidationError } = require('../../utils/errors');

function formatNumber(n) {
  return String(n).padStart(3, '0');
}

async function getTicketOrThrow(tx, raffleId, number) {
  const ticket = await tx.ticket.findUnique({
    where: { raffleId_number: { raffleId, number } },
    include: { customer: true, payment: true, soldBy: { select: { id: true, name: true } } },
  });
  if (!ticket) throw new NotFoundError(`El número ${formatNumber(number)} no existe en esta rifa`);
  return ticket;
}

// The concurrency-safe core: a single atomic UPDATE ... WHERE status IN (...)
// executed via Prisma updateMany. Postgres serializes concurrent UPDATEs on the
// same row, so of two simultaneous calls targeting the same ticket, only one
// can affect a row (count=1) — the other affects 0 rows and must be treated as
// a conflict. There is no read-then-write window in application code.
async function atomicTransition(tx, { raffleId, number, fromStatuses, toStatus, data }) {
  const result = await tx.ticket.updateMany({
    where: { raffleId, number, status: { in: fromStatuses } },
    data: { status: toStatus, ...data },
  });

  if (result.count === 0) {
    throw new ConflictError(
      `El número ${formatNumber(number)} ya no está disponible para esta operación (puede haber cambiado de estado).`,
      'TICKET_STATE_CONFLICT'
    );
  }

  return getTicketOrThrow(tx, raffleId, number);
}

async function listTickets({ raffleId, status, search }) {
  const where = { raffleId, ...(status ? { status } : {}) };

  if (search) {
    const asNumber = Number(search);
    where.OR = [
      ...(Number.isInteger(asNumber) && asNumber >= 0 && asNumber <= 999 ? [{ number: asNumber }] : []),
      { customer: { fullName: { contains: search, mode: 'insensitive' } } },
      { customer: { phone: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const tickets = await prisma.ticket.findMany({
    where,
    include: { customer: true, payment: true, soldBy: { select: { id: true, name: true } } },
    orderBy: { number: 'asc' },
  });

  return tickets.map(serializeTicket);
}

async function getTicket(raffleId, number) {
  const ticket = await getTicketOrThrow(prisma, raffleId, number);
  return serializeTicket(ticket);
}

function serializeTicket(ticket) {
  return {
    ...ticket,
    numberFormatted: formatNumber(ticket.number),
  };
}

async function reserve({ raffleId, number, customer, observations }, actorUserId) {
  return prisma.$transaction(async (tx) => {
    const createdCustomer = await findOrCreateCustomer(tx, customer);

    const ticket = await atomicTransition(tx, {
      raffleId,
      number,
      fromStatuses: ['DISPONIBLE'],
      toStatus: 'RESERVADO',
      data: {
        customerId: createdCustomer.id,
        soldByUserId: actorUserId,
        reservedAt: new Date(),
        observations: observations ?? null,
        paidAt: null,
      },
    });

    await recordAudit(tx, {
      userId: actorUserId,
      action: 'RESERVE',
      ticketNumber: number,
      raffleId,
      previousStatus: 'DISPONIBLE',
      newStatus: 'RESERVADO',
      metadata: { customerId: createdCustomer.id },
    });

    return serializeTicket(ticket);
  });
}

async function pay({ raffleId, number, method, paidAt }, actorUserId) {
  return prisma.$transaction(async (tx) => {
    const current = await getTicketOrThrow(tx, raffleId, number);
    if (current.status !== 'RESERVADO') {
      throw new ValidationError(
        `Solo se puede confirmar el pago de un número reservado. El número ${formatNumber(
          number
        )} está en estado ${current.status}.`
      );
    }

    // El monto cobrado es siempre el precio fijo de la boleta, nunca un valor
    // que el cliente pueda enviar — ver nota en tickets.schema.js.
    const amount = current.price;
    const paidAtDate = paidAt ? new Date(paidAt) : new Date();

    const ticket = await atomicTransition(tx, {
      raffleId,
      number,
      fromStatuses: ['RESERVADO'],
      toStatus: 'PAGADO',
      data: { paidAt: paidAtDate },
    });

    await tx.payment.upsert({
      where: { ticketId: ticket.id },
      create: { ticketId: ticket.id, amount, method, status: 'PAGADO', paidAt: paidAtDate },
      update: { amount, method, status: 'PAGADO', paidAt: paidAtDate },
    });

    await recordAudit(tx, {
      userId: actorUserId,
      action: 'PAY',
      ticketNumber: number,
      raffleId,
      previousStatus: 'RESERVADO',
      newStatus: 'PAGADO',
      metadata: { method, amount: String(amount) },
    });

    return serializeTicket(await getTicketOrThrow(tx, raffleId, number));
  });
}

async function release({ raffleId, number }, actorUserId) {
  return prisma.$transaction(async (tx) => {
    const ticket = await atomicTransition(tx, {
      raffleId,
      number,
      fromStatuses: ['RESERVADO'],
      toStatus: 'DISPONIBLE',
      data: {
        customerId: null,
        soldByUserId: null,
        reservedAt: null,
        paidAt: null,
        observations: null,
      },
    });

    await recordAudit(tx, {
      userId: actorUserId,
      action: 'RELEASE',
      ticketNumber: number,
      raffleId,
      previousStatus: 'RESERVADO',
      newStatus: 'DISPONIBLE',
    });

    return serializeTicket(ticket);
  });
}

async function block({ raffleId, number, observations }, actorUserId) {
  return prisma.$transaction(async (tx) => {
    const ticket = await atomicTransition(tx, {
      raffleId,
      number,
      fromStatuses: ['DISPONIBLE'],
      toStatus: 'BLOQUEADO',
      data: { observations: observations ?? null },
    });

    await recordAudit(tx, {
      userId: actorUserId,
      action: 'BLOCK',
      ticketNumber: number,
      raffleId,
      previousStatus: 'DISPONIBLE',
      newStatus: 'BLOQUEADO',
    });

    return serializeTicket(ticket);
  });
}

async function unblock({ raffleId, number }, actorUserId) {
  return prisma.$transaction(async (tx) => {
    const ticket = await atomicTransition(tx, {
      raffleId,
      number,
      fromStatuses: ['BLOQUEADO'],
      toStatus: 'DISPONIBLE',
      data: { observations: null },
    });

    await recordAudit(tx, {
      userId: actorUserId,
      action: 'UNBLOCK',
      ticketNumber: number,
      raffleId,
      previousStatus: 'BLOQUEADO',
      newStatus: 'DISPONIBLE',
    });

    return serializeTicket(ticket);
  });
}

// PAGADO -> DISPONIBLE: an "undo sale". Deliberately restricted to ADMIN/SUPER_ADMIN
// at the route level — a VENDEDOR must never be able to free a paid ticket.
async function unsell({ raffleId, number, reason }, actorUserId) {
  return prisma.$transaction(async (tx) => {
    const current = await getTicketOrThrow(tx, raffleId, number);

    if (current.payment) {
      await tx.payment.update({ where: { id: current.payment.id }, data: { status: 'DEVUELTO' } });
    }

    const ticket = await atomicTransition(tx, {
      raffleId,
      number,
      fromStatuses: ['PAGADO'],
      toStatus: 'DISPONIBLE',
      data: {
        customerId: null,
        soldByUserId: null,
        reservedAt: null,
        paidAt: null,
        observations: null,
      },
    });

    await recordAudit(tx, {
      userId: actorUserId,
      action: 'UNSELL',
      ticketNumber: number,
      raffleId,
      previousStatus: 'PAGADO',
      newStatus: 'DISPONIBLE',
      metadata: { reason },
    });

    return serializeTicket(ticket);
  });
}

async function editTicket({ raffleId, number, observations, customer }, actorUser) {
  return prisma.$transaction(async (tx) => {
    const current = await getTicketOrThrow(tx, raffleId, number);

    const isOwner = current.soldByUserId === actorUser.id;
    const isPrivileged = ['ADMIN', 'SUPER_ADMIN'].includes(actorUser.role);
    if (!isOwner && !isPrivileged) {
      throw new ValidationError('Solo el vendedor original o un administrador puede editar esta boleta');
    }

    if (customer && current.customerId) {
      await tx.customer.update({
        where: { id: current.customerId },
        data: {
          ...(customer.fullName ? { fullName: customer.fullName } : {}),
          ...(customer.phone ? { phone: customer.phone } : {}),
          ...(customer.documentId !== undefined ? { documentId: customer.documentId } : {}),
        },
      });
    }

    const updated = await tx.ticket.update({
      where: { raffleId_number: { raffleId, number } },
      data: { ...(observations !== undefined ? { observations } : {}) },
    });

    await recordAudit(tx, {
      userId: actorUser.id,
      action: 'EDIT_TICKET',
      ticketNumber: number,
      raffleId,
      metadata: { observations },
    });

    return serializeTicket(await getTicketOrThrow(tx, raffleId, number));
  });
}

module.exports = {
  formatNumber,
  listTickets,
  getTicket,
  reserve,
  pay,
  release,
  block,
  unblock,
  unsell,
  editTicket,
};
