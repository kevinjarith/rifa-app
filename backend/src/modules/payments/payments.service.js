const { prisma } = require('../../db/prisma');
const { recordAudit } = require('../auditLogs/auditLogs.service');
const { NotFoundError, ValidationError } = require('../../utils/errors');

async function listPayments({ status, method, from, to } = {}) {
  const where = {
    ...(status ? { status } : {}),
    ...(method ? { method } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  return prisma.payment.findMany({
    where,
    include: { ticket: { include: { customer: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

// Cancelling a payment also releases the ticket back to DISPONIBLE (PAGADO was
// the only state that could have an active payment) — uses the same atomic
// updateMany-with-WHERE pattern as tickets.service so this cannot race either.
async function cancelPayment(paymentId, reason, actorUserId) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { ticket: true } });
    if (!payment) throw new NotFoundError('Pago no encontrado');
    if (payment.status === 'CANCELADO') {
      throw new ValidationError('Este pago ya está cancelado');
    }

    await tx.payment.update({ where: { id: paymentId }, data: { status: 'CANCELADO' } });

    const result = await tx.ticket.updateMany({
      where: { id: payment.ticketId, status: 'PAGADO' },
      data: {
        status: 'DISPONIBLE',
        customerId: null,
        soldByUserId: null,
        reservedAt: null,
        paidAt: null,
        observations: null,
      },
    });

    await recordAudit(tx, {
      userId: actorUserId,
      action: 'CANCEL_PAYMENT',
      ticketNumber: payment.ticket.number,
      raffleId: payment.ticket.raffleId,
      previousStatus: 'PAGADO',
      newStatus: result.count > 0 ? 'DISPONIBLE' : payment.ticket.status,
      metadata: { reason, paymentId },
    });

    return { ok: true };
  });
}

module.exports = { listPayments, cancelPayment };
