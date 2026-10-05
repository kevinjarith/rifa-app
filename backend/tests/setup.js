const { prisma } = require('../src/db/prisma');
const { pool } = require('../src/config/session');

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "audit_logs", "payments", "tickets", "customers", "raffles", "users" CASCADE;'
  );
});

afterAll(async () => {
  await prisma.$disconnect();
  await pool.end();
});
