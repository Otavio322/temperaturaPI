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
const perfil = z.enum(['PRODUTOR', 'ADMIN']);

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

  consultaAlertas: z.object({
    apenasNaoLidos: z.coerce.boolean().optional(),
    limite: z.coerce.number().int().min(1).max(200).default(50),
  }),
};
