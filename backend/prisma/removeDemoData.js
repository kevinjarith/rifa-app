require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const demoRaffles = await prisma.raffle.findMany({ where: { isDemo: true } });

  for (const raffle of demoRaffles) {
    await prisma.payment.deleteMany({ where: { ticket: { raffleId: raffle.id } } });
    await prisma.ticket.deleteMany({ where: { raffleId: raffle.id } });
    await prisma.raffle.delete({ where: { id: raffle.id } });
  }

  await prisma.customer.deleteMany({ where: { isDemo: true } });
  await prisma.user.deleteMany({ where: { isDemo: true } });

  console.log(`Datos demo eliminados (${demoRaffles.length} rifa(s) demo y sus registros asociados).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
