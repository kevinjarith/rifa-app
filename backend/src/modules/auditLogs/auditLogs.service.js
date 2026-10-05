// Always call this inside the same Prisma transaction as the mutation it is
// auditing, so the audit row and the business change commit or roll back together.
async function recordAudit(tx, { userId, action, ticketNumber, raffleId, previousStatus, newStatus, metadata }) {
  return tx.auditLog.create({
    data: {
      userId: userId ?? null,
      action,
      ticketNumber: ticketNumber ?? null,
      raffleId: raffleId ?? null,
      previousStatus: previousStatus ?? null,
      newStatus: newStatus ?? null,
      metadata: metadata ?? undefined,
    },
  });
}

async function listAuditLogs(prisma, { userId, action, from, to, page = 1, pageSize = 50 } = {}) {
  const where = {
    ...(userId ? { userId } : {}),
    ...(action ? { action } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

module.exports = { recordAudit, listAuditLogs };
