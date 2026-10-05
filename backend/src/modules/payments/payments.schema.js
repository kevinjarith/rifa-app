const { z } = require('zod');

const listPaymentsQuerySchema = z.object({
  status: z.enum(['PENDIENTE', 'PAGADO', 'CANCELADO', 'DEVUELTO']).optional(),
  method: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'NEQUI', 'DAVIPLATA', 'OTRO']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

const cancelPaymentSchema = z.object({
  reason: z.string().trim().min(1, 'El motivo es obligatorio'),
});

module.exports = { listPaymentsQuerySchema, cancelPaymentSchema };
