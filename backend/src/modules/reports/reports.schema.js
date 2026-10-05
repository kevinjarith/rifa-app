const { z } = require('zod');

const baseReportQuery = z.object({
  raffleId: z.string().uuid('raffleId inválido'),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

const exportQuery = z.object({
  raffleId: z.string().uuid('raffleId inválido'),
  status: z.enum(['DISPONIBLE', 'RESERVADO', 'PAGADO', 'BLOQUEADO']).optional(),
});

module.exports = { baseReportQuery, exportQuery };
