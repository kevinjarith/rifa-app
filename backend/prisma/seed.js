require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  if (process.env.ALLOW_SEED !== 'true') {
    console.log('Seed deshabilitado (ALLOW_SEED != "true"). No se hizo ningún cambio.');
    return;
  }

  const existingDemo = await prisma.raffle.findFirst({ where: { isDemo: true } });
  if (existingDemo) {
    console.log('Ya existen datos demo (rifa "Rifa Demo"). Use `npm run seed:clean` antes de volver a sembrar.');
    return;
  }

  const raffle = await prisma.raffle.create({
    data: { name: 'Rifa Demo', ticketPrice: 3000, isDemo: true },
  });

  await prisma.ticket.createMany({
    data: Array.from({ length: 1000 }, (_, number) => ({
      raffleId: raffle.id,
      number,
      price: raffle.ticketPrice,
    })),
  });

  const demoCustomer1 = await prisma.customer.create({
    data: { fullName: 'Cliente Demo Reservado', phone: '3000000001', isDemo: true },
  });
  const demoCustomer2 = await prisma.customer.create({
    data: { fullName: 'Cliente Demo Pagado', phone: '3000000002', isDemo: true },
  });

  const users = [
    { name: 'Super Admin Demo', email: 'demo.superadmin@example.com', role: 'SUPER_ADMIN' },
    { name: 'Admin Demo', email: 'demo.admin@example.com', role: 'ADMIN' },
    { name: 'Vendedor Demo', email: 'demo.vendedor@example.com', role: 'VENDEDOR' },
  ];
  const demoPassword = 'Demo1234!';
  const createdUsers = [];
  for (const u of users) {
    const passwordHash = await bcrypt.hash(demoPassword, 12);
    const created = await prisma.user.create({
      data: { ...u, passwordHash, isDemo: true },
    });
    createdUsers.push(created);
  }
  const vendedor = createdUsers.find((u) => u.role === 'VENDEDOR');

  // 000 DISPONIBLE (default, nothing to do)
  // 001 RESERVADO
  await prisma.ticket.update({
    where: { raffleId_number: { raffleId: raffle.id, number: 1 } },
    data: {
      status: 'RESERVADO',
      customerId: demoCustomer1.id,
      soldByUserId: vendedor.id,
      reservedAt: new Date(),
      observations: 'Ticket demo reservado',
    },
  });

  // 002 PAGADO
  const ticket002 = await prisma.ticket.update({
    where: { raffleId_number: { raffleId: raffle.id, number: 2 } },
    data: {
      status: 'PAGADO',
      customerId: demoCustomer2.id,
      soldByUserId: vendedor.id,
      reservedAt: new Date(),
      paidAt: new Date(),
    },
  });
  await prisma.payment.create({
    data: { ticketId: ticket002.id, amount: raffle.ticketPrice, method: 'EFECTIVO', status: 'PAGADO', paidAt: new Date() },
  });

  // 003 BLOQUEADO
  await prisma.ticket.update({
    where: { raffleId_number: { raffleId: raffle.id, number: 3 } },
    data: { status: 'BLOQUEADO', observations: 'Bloqueado de ejemplo' },
  });

  console.log('Datos demo creados.');
  console.log('Usuarios demo (contraseña para todos: %s):', demoPassword);
  for (const u of users) console.log(`  - ${u.role}: ${u.email}`);
  console.log('Rifa demo: "Rifa Demo" con 000 disponible, 001 reservado, 002 pagado, 003 bloqueado.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
