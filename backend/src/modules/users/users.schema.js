const { z } = require('zod');

const roleEnum = z.enum(['SUPER_ADMIN', 'ADMIN', 'VENDEDOR']);

const createUserSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio'),
  email: z.string().email('Correo inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  role: roleEnum,
});

const changeRoleSchema = z.object({
  role: roleEnum,
});

const changeActiveSchema = z.object({
  active: z.boolean(),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

module.exports = { createUserSchema, changeRoleSchema, changeActiveSchema, resetPasswordSchema };
