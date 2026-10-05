const { UnauthorizedError, ForbiddenError } = require('../utils/errors');

const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return next(new UnauthorizedError());
  if (!allowedRoles.includes(req.user.role)) {
    return next(new ForbiddenError('No tiene permisos para esta acción'));
  }
  next();
};

module.exports = { requireRole };
