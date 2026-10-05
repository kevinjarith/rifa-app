require('dotenv').config();
const { z } = require('zod');

// NOTE: z.coerce.boolean() would turn the *string* "false" into `true` (any
// non-empty string is truthy) — these env vars arrive as the literal text
// "true"/"false", so they need an explicit string->boolean mapping instead.
const booleanFromEnv = (defaultValue) =>
  z
    .enum(['true', 'false'])
    .default(defaultValue ? 'true' : 'false')
    .transform((v) => v === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatorio'),
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET debe tener al menos 16 caracteres'),
  ALLOW_SEED: booleanFromEnv(false),
  COOKIE_SECURE: booleanFromEnv(false),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variables de entorno inválidas:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

module.exports = parsed.data;
