const { prisma } = require('../../db/prisma');

// Called inside the caller's transaction (e.g. ticket reservation) so the
// customer row and the ticket update commit/roll back together.
async function findOrCreateCustomer(tx, { fullName, phone, documentId }) {
  return tx.customer.create({
    data: { fullName, phone, documentId: documentId || null },
  });
}

async function listCustomers({ search } = {}) {
  return prisma.customer.findMany({
    where: search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: { createdAt: 'desc' },
  });
}

module.exports = { findOrCreateCustomer, listCustomers };
