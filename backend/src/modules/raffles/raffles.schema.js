const { z } = require('zod');

// El precio de la boleta es fijo (ver TICKET_PRICE en raffles.service.js) y no
// se acepta del cliente: no existe ninguna forma de modificarlo, ni siquiera
// para un SUPER_ADMIN, salvo cambiando esa constante en el código.
const createRaffleSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio'),
  isDemo: z.boolean().optional().default(false),
});

const setActiveSchema = z.object({
  isActive: z.boolean(),
});

module.exports = { createRaffleSchema, setActiveSchema };
