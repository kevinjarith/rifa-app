const { z } = require('zod');

const customerInputSchema = z.object({
  fullName: z.string().trim().min(1, 'El nombre del cliente es obligatorio'),
  phone: z.string().trim().min(1, 'El teléfono es obligatorio'),
  documentId: z.string().trim().optional().nullable(),
});

module.exports = { customerInputSchema };
