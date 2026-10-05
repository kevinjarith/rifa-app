// One-off bootstrap script: creates a user directly in the database.
// Needed at least once because every write endpoint (including POST /users)
// requires an authenticated SUPER_ADMIN — on a brand-new database there is
// no one who could log in to create that very first account.
//
// Usage:
//   DATABASE_URL="..." ADMIN_NAME="..." ADMIN_EMAIL="..." ADMIN_PASSWORD="..." [ADMIN_ROLE="SUPER_ADMIN|ADMIN|VENDEDOR"] \
//     node prisma/createSuperAdmin.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const VALID_ROLES = ['SUPER_ADMIN', 'ADMIN', 'VENDEDOR'];

async function main() {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const role = process.env.ADMIN_ROLE || 'SUPER_ADMIN';

  if (!name || !email || !password) {
    console.error(
      'Uso: ADMIN_NAME="..." ADMIN_EMAIL="..." ADMIN_PASSWORD="..." [ADMIN_ROLE="SUPER_ADMIN|ADMIN|VENDEDOR"] node prisma/createSuperAdmin.js'
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('ADMIN_PASSWORD debe tener al menos 8 caracteres.');
    process.exit(1);
  }
  if (!VALID_ROLES.includes(role)) {
    console.error(`ADMIN_ROLE inválido: ${role}. Debe ser uno de ${VALID_ROLES.join(', ')}.`);
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`Ya existe un usuario con el correo ${email}.`);
    process.exit(1);
  }

  const count = await prisma.user.count();
  if (count >= 7) {
    console.error('Ya existen 7 usuarios en esta base de datos (el máximo permitido).');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role },
  });

  console.log(`Usuario ${user.role} creado: ${user.email} (id ${user.id}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
