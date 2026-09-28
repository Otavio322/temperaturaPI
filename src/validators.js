const { z } = require('zod');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'ID inválido');
const email = z.string().trim().toLowerCase().email('E-mail inválido').max(120);
const name = z.string().trim().min(2, 'Nome muito curto').max(80);
const password = z
  .string()
  .min(10, 'A senha precisa ter no mínimo 10 caracteres')
  .max(128)
  .regex(/[a-z]/, 'A senha precisa ter uma letra minúscula')
  .regex(/[A-Z]/, 'A senha precisa ter uma letra maiúscula')
  .regex(/\d/, 'A senha precisa ter um número');
const role = z.enum(['admin', 'analista', 'cliente']);

const fruitBase = z
  .object({
    name: z.string().trim().min(2).max(60),
    tempMin: z.number().min(-30).max(60),
    tempMax: z.number().min(-30).max(60),
    humMin: z.number().min(0).max(100),
    humMax: z.number().min(0).max(100),
    notes: z.string().trim().max(300).optional(),
  })
  .strict();

const deviceBase = z
  .object({
    name: z.string().trim().min(2).max(80),
    location: z.string().trim().max(120).optional(),
    fruit: objectId.nullable().optional(),
    clients: z.array(objectId).max(50).optional(),
    active: z.boolean().optional(),
    
    simulate: z.boolean().optional(), 
    thingSpeakChannelId: z.string().trim().max(40).optional(),
    thingSpeakReadApiKey: z.string().trim().min(4).max(120).optional(), 
    fieldTemperature: z.string().trim().max(10).optional(),
    fieldHumidity: z.string().trim().max(10).optional(),
  })
  .strict();

module.exports = {
  register: z.object({ name, email, password }).strict(),
  login: z.object({ email, password: z.string().min(1).max(128) }).strict(),
  changePassword: z.object({ currentPassword: z.string().min(1).max(128), newPassword: password }).strict(),

  createUser: z.object({ name, email, password, role }).strict(),
  updateUser: z
    .object({
      name: name.optional(),
      email: email.optional(),
      password: password.optional(),
      role: role.optional(),
      active: z.boolean().optional(),
      unlock: z.boolean().optional(),
    })
    .strict(),

  fruitCreate: fruitBase.refine((f) => f.tempMin < f.tempMax && f.humMin < f.humMax, {
    message: 'Os valores máximos devem ser maiores que os mínimos',
  }),
  fruitUpdate: fruitBase.partial(),

  deviceCreate: deviceBase,
  deviceUpdate: deviceBase.partial(),
  deviceFruit: z.object({ fruit: objectId.nullable() }).strict(),

  readingsQuery: z.object({
    device: objectId,
    hours: z.coerce.number().min(1).max(720).default(24),
    points: z.coerce.number().int().min(10).max(500).default(120),
  }),

  
  marketCreate: z
    .object({
      fruit: objectId,
      price: z.number().min(0).max(1000),
      demandIndex: z.number().min(0).max(100),
    })
    .strict(),
  marketQuery: z.object({
    fruit: objectId,
    limit: z.coerce.number().int().min(1).max(200).default(30),
  }),

  
  predictionGenerate: z
    .object({ fruit: objectId, device: objectId.optional() })
    .strict(),
  predictionQuery: z.object({
    fruit: objectId,
    limit: z.coerce.number().int().min(1).max(50).default(10),
  }),

 
  accountDelete: z.object({ password: z.string().min(1).max(128) }).strict(),
};
