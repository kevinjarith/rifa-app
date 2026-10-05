const bcrypt = require('bcryptjs');
const { prisma } = require('../../db/prisma');
const { recordAudit } = require('../auditLogs/auditLogs.service');
const { UnauthorizedError } = require('../../utils/errors');

const GENERIC_INVALID_CREDENTIALS = 'Correo o contraseña incorrectos';

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Same generic message whether the email doesn't exist or the password is
  // wrong, and whether the account is inactive — never reveal which case it is.
  if (!user || !user.active) {
    await prisma.auditLog.create({
      data: { action: 'LOGIN_FAILED', metadata: { email } },
    });
    throw new UnauthorizedError(GENERIC_INVALID_CREDENTIALS);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    await prisma.auditLog.create({
      data: { userId: user.id, action: 'LOGIN_FAILED', metadata: { email } },
    });
    throw new UnauthorizedError(GENERIC_INVALID_CREDENTIALS);
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await recordAudit(tx, { userId: user.id, action: 'LOGIN' });
  });

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

async function logout(userId) {
  if (userId) {
    await prisma.auditLog.create({ data: { userId, action: 'LOGOUT' } });
  }
}

module.exports = { login, logout };
