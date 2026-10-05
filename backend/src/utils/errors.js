class AppError extends Error {
  constructor(message, { status = 500, code = 'ERROR', expose = true } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.expose = expose;
  }
}

class ValidationError extends AppError {
  constructor(message = 'Datos inválidos', details) {
    super(message, { status: 400, code: 'VALIDATION_ERROR' });
    this.details = details;
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Debe iniciar sesión para continuar') {
    super(message, { status: 401, code: 'UNAUTHORIZED' });
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'No tiene permisos para realizar esta acción') {
    super(message, { status: 403, code: 'FORBIDDEN' });
  }
}

class NotFoundError extends AppError {
  constructor(message = 'No se encontró el recurso solicitado') {
    super(message, { status: 404, code: 'NOT_FOUND' });
  }
}

class ConflictError extends AppError {
  constructor(message = 'La operación no se puede completar por un conflicto de estado', code = 'CONFLICT') {
    super(message, { status: 409, code });
  }
}

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
};
