const { z } = require('zod');

const idInteiro = z.coerce.number().int().positive();
const email = z.string().trim().toLowerCase().email('E-mail inválido').max(150);
const nome = z.string().trim().min(2, 'Nome muito curto').max(100);
const senha = z
  .string()
  .min(10, 'A senha precisa ter no mínimo 10 caracteres')
  .max(128)
  .regex(/[a-z]/, 'A senha precisa ter uma letra minúscula')
  .regex(/[A-Z]/, 'A senha precisa ter uma letra maiúscula')
  .regex(/\d/, 'A senha precisa ter um número');
const perfil = z.enum(['PRODUTOR', 'ANALISTA', 'ADMIN']);

const frutaBase = z
  .object({
    nome: z.string().trim().min(2).max(60),
    tempMin: z.coerce.number().min(-30).max(80),
    tempMax: z.coerce.number().min(-30).max(80),
    umidadeMin: z.coerce.number().min(0).max(100),
    umidadeMax: z.coerce.number().min(0).max(100),
  })
  .strict();

const setorBase = z
  .object({
    idPropriedade: idInteiro,
    idFruta: idInteiro,
    codigo: z.string().trim().min(1).max(20),
    areaHa: z.coerce.number().positive().max(99999999.99),
  })
  .strict();

const sensorBase = z
  .object({
    idSetor: idInteiro,
    codigo: z.string().trim().min(1).max(30),
    thingspeakChannelId: z.string().trim().max(30).optional(),
    status: z.enum(['ATIVO', 'INATIVO', 'MANUTENCAO']).optional(),
  })
  .strict();

const register = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  password: senha,
}).strict();

const login = z.object({
  email,
  password: z.string().min(1).max(128),
}).strict();

const changePassword = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: senha,
}).strict();

const deviceCreate = z.object({
  name: z.string().trim().min(1).max(80),
  simulate: z.boolean().optional(),
  thingSpeakChannelId: z.string().trim().max(30).optional(),
}).strict();

const deviceUpdate = deviceCreate.partial();
const deviceFruit = z.object({ fruit: idInteiro.optional() }).strict();

const fruitCreate = z.object({
  name: z.string().trim().min(2).max(60),
  tempMin: z.coerce.number().min(-30).max(80),
  tempMax: z.coerce.number().min(-30).max(80),
  humMin: z.coerce.number().min(0).max(100),
  humMax: z.coerce.number().min(0).max(100),
}).strict().refine((f) => f.tempMin < f.tempMax, { message: 'temp_min precisa ser menor que temp_max', path: ['tempMax'] })
  .refine((f) => f.humMin < f.humMax && f.humMin >= 0 && f.humMax <= 100, { message: 'humMin precisa ser menor que humMax, entre 0 e 100', path: ['humMax'] });

const fruitUpdate = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  tempMin: z.coerce.number().min(-30).max(80).optional(),
  tempMax: z.coerce.number().min(-30).max(80).optional(),
  humMin: z.coerce.number().min(0).max(100).optional(),
  humMax: z.coerce.number().min(0).max(100).optional(),
}).strict();

const createUser = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  password: senha,
  role: z.enum(['cliente', 'admin']).optional(),
}).strict();

const updateUser = z.object({
  name: nome.optional(),
  email: email.optional(),
  role: z.enum(['cliente', 'admin']).optional(),
  active: z.boolean().optional(),
}).strict();

const predictionQuery = z.object({
  fruit: idInteiro.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
}).strict();

const predictionHistoryQuery = z.object({
  fruit: idInteiro,
  limit: z.coerce.number().int().min(1).max(300).default(100),
}).strict();

const predictionGenerate = z.object({
  fruit: idInteiro,
  device: idInteiro.optional(),
  user: idInteiro.optional(),
}).strict();

const atualizarConfiguracaoModelo = z.object({
  pesoClima: z.coerce.number().min(0).max(1)
    .refine((peso) => Number.isInteger(peso * 1000), 'O peso do clima aceita até três casas decimais'),
  limiarColher: z.coerce.number().int().min(1).max(100),
  limiarMonitorar: z.coerce.number().int().min(0).max(99),
}).strict().refine((configuracao) => configuracao.limiarColher > configuracao.limiarMonitorar, {
  message: 'O limiar para colher precisa ser maior que o limiar para monitorar',
  path: ['limiarColher'],
});

const readingsQuery = z.object({
  device: idInteiro.optional(),
  hours: z.coerce.number().min(1).max(720).default(24),
  points: z.coerce.number().int().min(10).max(500).default(120),
}).strict();

const accountDelete = z.object({ confirm: z.boolean().optional() }).strict();

module.exports = {
  registrar: z.object({ nome, email, senha }).strict(),
  login: z.object({ email, senha: z.string().min(1).max(128) }).strict(),
  trocarSenha: z.object({ senhaAtual: z.string().min(1).max(128), novaSenha: senha }).strict(),

  criarUsuario: z.object({ nome, email, senha, perfil }).strict(),
  atualizarUsuario: z
    .object({ nome: nome.optional(), email: email.optional(), perfil: perfil.optional(), ativo: z.boolean().optional() })
    .strict(),

  propriedadeBase: z
    .object({
      nome: z.string().trim().min(2).max(100),
      municipio: z.string().trim().min(2).max(100),
      uf: z.string().trim().length(2).toUpperCase(),
      latitude: z.coerce.number().min(-90).max(90).optional(),
      longitude: z.coerce.number().min(-180).max(180).optional(),
      idsUsuarios: z.array(idInteiro).max(50).optional(),
    })
    .strict(),
  propriedadeAtualizar: z
    .object({
      nome: z.string().trim().min(2).max(100).optional(),
      municipio: z.string().trim().min(2).max(100).optional(),
      uf: z.string().trim().length(2).toUpperCase().optional(),
      latitude: z.coerce.number().min(-90).max(90).optional(),
      longitude: z.coerce.number().min(-180).max(180).optional(),
      idsUsuarios: z.array(idInteiro).max(50).optional(),
    })
    .strict(),

  criarFruta: frutaBase.refine((f) => f.tempMin < f.tempMax, { message: 'temp_min precisa ser menor que temp_max', path: ['tempMax'] })
    .refine((f) => f.umidadeMin < f.umidadeMax && f.umidadeMin >= 0 && f.umidadeMax <= 100, { message: 'umidade_min precisa ser menor que umidade_max, entre 0 e 100', path: ['umidadeMax'] }),
  atualizarFruta: frutaBase.partial(),

  criarSetor: setorBase,
  atualizarSetor: setorBase.partial().omit({ idPropriedade: true }),

  criarSensor: sensorBase,
  atualizarSensor: sensorBase.partial(),

  consultaLeituras: z.object({
    horas: z.coerce.number().min(1).max(720).default(24),
    pontos: z.coerce.number().int().min(10).max(500).default(120),
  }),
  consultaHistoricoThingSpeak: z.object({}).strict(),

  consultaAlertas: z.object({
    apenasNaoLidos: z.coerce.boolean().optional(),
    limite: z.coerce.number().int().min(1).max(200).default(50),
  }),

  consultaMercado: z.object({
    idFruta: idInteiro.optional(),
    limite: z.coerce.number().int().min(1).max(300).default(30),
  }).strict(),

  criarMercado: z.object({
    idFruta: idInteiro,
    price: z.coerce.number().min(0).max(10000).optional(),
    demandIndex: z.coerce.number().min(0).max(100).optional(),
    source: z.enum(['simulado', 'externo']).optional(),
  }).strict().refine((dados) => dados.price !== undefined && dados.demandIndex !== undefined, {
    message: 'price e demandIndex são obrigatórios',
    path: ['price'],
  }),

  register,
  changePassword,
  createUser,
  updateUser,
  deviceCreate,
  deviceUpdate,
  deviceFruit,
  fruitCreate,
  fruitUpdate,
  predictionQuery,
  predictionHistoryQuery,
  predictionGenerate,
  atualizarConfiguracaoModelo,
  readingsQuery,
  accountDelete,
};
