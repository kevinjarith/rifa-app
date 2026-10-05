const bcrypt = require('bcryptjs');
const { prisma } = require('../../db/prisma');
const { recordAudit } = require('../auditLogs/auditLogs.service');
const { ConflictError, NotFoundError, ValidationError } = require('../../utils/errors');

const MAX_USERS = 7;
const BCRYPT_ROUNDS = 12;

async function listUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      isDemo: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });
}

// Enforces the 7-user cap atomically: the count check and the insert happen in
// the same transaction, so two simultaneous "create user" requests at the cap
// cannot both slip through and leave 8 rows.
async function createUser({ name, email, password, role }, actorUserId) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  return prisma.$transaction(async (tx) => {
    // Postgres advisory lock scoped to this transaction: serializes concurrent
    // createUser calls so the count-then-insert below can't race (two requests
    // both reading count=6 and both inserting, landing on 8 users).
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('rifa_create_user'))`;

    const existing = await tx.user.findUnique({ where: { email } });
    if (existing) {
      throw new ValidationError('Ya existe un usuario con ese correo');
    }

    const count = await tx.user.count();
    if (count >= MAX_USERS) {
      throw new ConflictError(
        `No se puede crear el usuario: ya existen ${MAX_USERS} usuarios, el máximo permitido.`,
        'USER_LIMIT_REACHED'
      );
    }

    const user = await tx.user.create({
      data: { name, email, passwordHash, role },
    });

    await recordAudit(tx, {
      userId: actorUserId,
      action: 'CREATE_USER',
      metadata: { createdUserId: user.id, email: user.email, role: user.role },
    });

    return user;
  });
}

async function changeRole(userId, role, actorUserId) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('Usuario no encontrado');

    const previousRole = user.role;
    const updated = await tx.user.update({ where: { id: userId }, data: { role } });

    await recordAudit(tx, {
      userId: actorUserId,
      action: 'CHANGE_ROLE',
      previousStatus: previousRole,
      newStatus: role,
      metadata: { targetUserId: userId },
    });

    return updated;
  });
}

async function changeActive(userId, active, actorUserId) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('Usuario no encontrado');

    const updated = await tx.user.update({ where: { id: userId }, data: { active } });

    await recordAudit(tx, {
      userId: actorUserId,
      action: active ? 'REACTIVATE_USER' : 'DEACTIVATE_USER',
      metadata: { targetUserId: userId },
    });

    return updated;
  });
}

async function resetPassword(userId, newPassword, actorUserId) {
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('Usuario no encontrado');

    await tx.user.update({ where: { id: userId }, data: { passwordHash } });

    await recordAudit(tx, {
      userId: actorUserId,
      action: 'RESET_PASSWORD',
      metadata: { targetUserId: userId },
    });

    return { ok: true };
  });
}

module.exports = { MAX_USERS, listUsers, createUser, changeRole, changeActive, resetPassword };
