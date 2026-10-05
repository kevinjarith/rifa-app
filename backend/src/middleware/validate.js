const { ValidationError } = require('../utils/errors');

// Wraps a zod schema: validates req.body (or another part of the request) and
// replaces it with the parsed/coerced value so downstream code trusts the shape.
const validate = (schema, part = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[part]);
  if (!result.success) {
    return next(new ValidationError('Datos inválidos', result.error.flatten().fieldErrors));
  }
  req[part] = result.data;
  next();
};

module.exports = { validate };
