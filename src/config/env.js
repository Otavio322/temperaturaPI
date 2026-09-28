
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
const { z } = require('zod');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().default(3000),
  MONGODB_URI: z.string().min(10, 'MONGODB_URI é obrigatório (string de conexão do MongoDB Atlas)'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET precisa ter no mínimo 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('2h'),
  CORS_ORIGINS: z.string().default(''),
  ALLOW_PUBLIC_REGISTER: z.enum(['true', 'false']).default('true'),
  READINGS_TTL_DAYS: z.coerce.number().int().min(1).default(90),
  ADMIN_NAME: z.string().default('Administrador'),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(10).optional(),

  
  ENCRYPTION_KEY: z.string().regex(/^[0-9a-f]{64}$/i, 'ENCRYPTION_KEY precisa ter 64 caracteres hexadecimais (32 bytes)'),

  
  THINGSPEAK_POLL_INTERVAL_MS: z.coerce.number().int().min(15000).default(20000),
  THINGSPEAK_BASE_URL: z.string().url().default('https://api.thingspeak.com'),
  
  THINGSPEAK_SIMULATE_DEFAULT: z.enum(['true', 'false']).default('true'),

  
  MARKET_POLL_INTERVAL_MS: z.coerce.number().int().min(60000).default(6 * 3600 * 1000),
  MARKET_SIMULATE: z.enum(['true', 'false']).default('true'),

  
  ENABLE_SCHEDULERS: z.enum(['true', 'false']).default('true'),

  
  SLOW_REQUEST_MS: z.coerce.number().int().default(3000),
});


const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ''));
const parsed = schema.safeParse(raw);

if (!parsed.success) {
  console.error('Configuração inválida:');
  for (const issue of parsed.error.issues) console.error(` - ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}

const env = parsed.data;
module.exports = {
  ...env,
  isProd: env.NODE_ENV === 'production',
  allowPublicRegister: env.ALLOW_PUBLIC_REGISTER === 'true',
  corsOrigins: env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
  thingspeakSimulateDefault: env.THINGSPEAK_SIMULATE_DEFAULT === 'true',
  marketSimulate: env.MARKET_SIMULATE === 'true',
  schedulersEnabled: env.ENABLE_SCHEDULERS === 'true' && env.NODE_ENV !== 'test',
};
