require('dotenv').config();
const { z } = require('zod');

// NOTE: z.coerce.boolean() would turn the *string* "false" into `true` (any
// non-empty string is truthy) — these env vars arrive as the literal text
// "true"/"false", so they need an explicit string->boolean mapping instead.
// Trimmed/lowercased first so a stray space or "True" typed into a dashboard
// (Vercel, Render, ...) doesn't fail validation and crash the whole function.
const booleanFromEnv = (defaultValue) =>
  z
    .string()
    .trim()
    .toLowerCase()
    .default(defaultValue ? 'true' : 'false')
    .pipe(z.enum(['true', 'false']))
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
  const details = JSON.stringify(parsed.error.flatten().fieldErrors);
  // Throwing (not process.exit) is the right failure mode in a serverless
  // function: it still fails the request/cold-start, but logs *which*
  // variable was wrong instead of silently killing the process.
  throw new Error(`Variables de entorno inválidas: ${details}`);
}

module.exports = parsed.data;
