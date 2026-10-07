const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
const { z } = require('zod');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().default(3000),

  DB_HOST: z.string().min(1).default('localhost'),
  DB_PORT: z.coerce.number().int().default(3306),
  DB_USER: z.string().min(1, 'DB_USER é obrigatório'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().min(1).default('climora'),

  DB_SSL: z.enum(['true', 'false']).default('false'),
  DB_POOL_SIZE: z.coerce.number().int().min(1).max(50).default(10),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET precisa ter no mínimo 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('2h'),
  CORS_ORIGINS: z.string().default(''),
  ALLOW_PUBLIC_REGISTER: z.enum(['true', 'false']).default('true'),

  THINGSPEAK_POLL_INTERVAL_MS: z.coerce.number().int().min(15000).default(20000),
  THINGSPEAK_BASE_URL: z.string().url().default('https://api.thingspeak.com'),

  THINGSPEAK_SIMULATE_SEM_CANAL: z.enum(['true', 'false']).default('true'),

  SENSOR_OFFLINE_APOS_MIN: z.coerce.number().int().min(1).default(30),

  ENABLE_SCHEDULERS: z.enum(['true', 'false']).default('true'),

  SLOW_REQUEST_MS: z.coerce.number().int().default(3000),

  ADMIN_NAME: z.string().default('Administrador'),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(10).optional(),
});

const bruto = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ''));
const resultado = schema.safeParse(bruto);

if (!resultado.success) {
  console.error('Configuração inválida:');
  for (const problema of resultado.error.issues) console.error(` - ${problema.path.join('.')}: ${problema.message}`);
  process.exit(1);
}

const env = resultado.data;
module.exports = {
  ...env,
  ehProducao: env.NODE_ENV === 'production',
  permiteCadastroPublico: env.ALLOW_PUBLIC_REGISTER === 'true',
  origensCors: env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
  thingspeakSimularSemCanal: env.THINGSPEAK_SIMULATE_SEM_CANAL === 'true',
  agendadoresAtivos: env.ENABLE_SCHEDULERS === 'true' && env.NODE_ENV !== 'test',
};
