const { z } = require('zod');

const statusEnum = z.enum(['DISPONIBLE', 'RESERVADO', 'PAGADO', 'BLOQUEADO']);
const methodEnum = z.enum(['EFECTIVO', 'TRANSFERENCIA', 'NEQUI', 'DAVIPLATA', 'OTRO']);

const customerSchema = z.object({
  fullName: z.string().trim().min(1, 'El nombre del cliente es obligatorio'),
  phone: z.string().trim().min(1, 'El teléfono es obligatorio'),
  documentId: z.string().trim().optional().nullable(),
});

const listTicketsQuerySchema = z.object({
  raffleId: z.string().uuid('raffleId inválido'),
  status: statusEnum.optional(),
  search: z.string().trim().optional(),
});

const reserveSchema = z.object({
  raffleId: z.string().uuid('raffleId inválido'),
  customer: customerSchema,
  observations: z.string().trim().optional().nullable(),
});

// El monto no se acepta del cliente: siempre se cobra el precio fijo de la
// boleta (ticket.price, fijado en raffles.service.js al crear la rifa) — no
// hay forma de pagar un monto distinto, ni editándolo en el frontend ni
// mandándolo manipulado directamente a la API.
const paySchema = z.object({
  raffleId: z.string().uuid('raffleId inválido'),
  method: methodEnum,
  paidAt: z.string().datetime().optional(),
});

const simpleRaffleSchema = z.object({
  raffleId: z.string().uuid('raffleId inválido'),
});

const blockSchema = z.object({
  raffleId: z.string().uuid('raffleId inválido'),
  observations: z.string().trim().optional().nullable(),
});

const unsellSchema = z.object({
  raffleId: z.string().uuid('raffleId inválido'),
  reason: z.string().trim().min(1, 'El motivo es obligatorio'),
});

const editTicketSchema = z.object({
  raffleId: z.string().uuid('raffleId inválido'),
  observations: z.string().trim().optional().nullable(),
  customer: customerSchema.partial().optional(),
});

module.exports = {
  listTicketsQuerySchema,
  reserveSchema,
  paySchema,
  simpleRaffleSchema,
  blockSchema,
  unsellSchema,
  editTicketSchema,
};
