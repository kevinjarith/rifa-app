const { ForbiddenError } = require('../utils/errors');

// Lightweight CSRF mitigation for a cookie-session app with no public cross-site
// form targets: a simple cross-origin form POST cannot set this custom header,
// so its presence (combined with SameSite=Lax cookies) is enough for this
// small, internal (<=7 users) tool without the complexity of token-based CSRF.
const csrfLite = (req, res, next) => {
  const isMutating = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method);
  if (isMutating && req.headers['x-requested-with'] !== 'fetch') {
    return next(new ForbiddenError('Solicitud rechazada por seguridad'));
  }
  next();
};

module.exports = { csrfLite };
