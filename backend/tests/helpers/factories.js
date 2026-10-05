const bcrypt = require('bcryptjs');
const { prisma } = require('../../src/db/prisma');

let counter = 0;
function unique(prefix) {
  counter += 1;
  return `${prefix}${Date.now()}_${counter}`;
}

async function createUser({ role = 'VENDEDOR', password = 'Password123!', active = true } = {}) {
  const email = `${unique('user')}@example.com`;
  const passwordHash = await bcrypt.hash(password, 4); // low rounds: tests only
  const user = await prisma.user.create({
    data: { name: unique('Nombre '), email, passwordHash, role, active },
  });
  return { ...user, plainPassword: password };
}

async function createRaffleWithTickets({ ticketPrice = 10000 } = {}) {
  const raffle = await prisma.raffle.create({
    data: { name: unique('Rifa '), ticketPrice },
  });
  await prisma.ticket.createMany({
    data: Array.from({ length: 1000 }, (_, number) => ({ raffleId: raffle.id, number, price: ticketPrice })),
  });
  return raffle;
}

module.exports = { createUser, createRaffleWithTickets };
