const { ValidationError } = require('../../utils/errors');

// Accepts "5", "05" or "005" and normalizes to an integer 0-999. Rejects
// anything else (letters, out-of-range, more than 3 digits) with a clear message.
function parseNumberParam(req, res, next) {
  const raw = req.params.number;
  if (!/^\d{1,3}$/.test(raw)) {
    return next(new ValidationError(`"${raw}" no es un número de boleta válido (debe ser 000-999)`));
  }
  const number = Number(raw);
  if (number < 0 || number > 999) {
    return next(new ValidationError(`"${raw}" está fuera del rango de la rifa (000-999)`));
  }
  req.ticketNumber = number;
  next();
}

module.exports = { parseNumberParam };
