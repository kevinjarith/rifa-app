const { prisma } = require('../db/prisma');
const { UnauthorizedError } = require('../utils/errors');
const { asyncHandler } = require('../utils/asyncHandler');

// Reloads the user from the DB on every request (not just from the session payload)
// so a deactivated user is locked out immediately, not only on their next login.
const requireAuth = asyncHandler(async (req, res, next) => {
  const userId = req.session?.userId;
  if (!userId) throw new UnauthorizedError();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.active) {
    req.session.destroy(() => {});
    throw new UnauthorizedError('Su sesión ya no es válida. Inicie sesión de nuevo.');
  }

  req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  next();
});

module.exports = { requireAuth };
