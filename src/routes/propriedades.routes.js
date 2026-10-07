const router = require('express').Router();
const propriedadesRepo = require('../repositorios/propriedades');
const usuariosRepo = require('../repositorios/usuarios');
const schemas = require('../validators');
const { validar, idValido } = require('../middleware/validate');
const { autenticar, autorizar } = require('../middleware/auth');
const { assincrono, ErroHttp } = require('../utils/httpError');
const { ehAdmin } = require('../utils/acesso');

router.use(autenticar);

async function conferirUsuarios(idsUsuarios) {
  if (!idsUsuarios || !idsUsuarios.length) return;
  for (const id of idsUsuarios) {
    if (!(await usuariosRepo.buscarPorId(id))) throw new ErroHttp(400, `Usuário ${id} não existe`);
  }
}

async function exigirAcesso(req, idPropriedade) {
  if (ehAdmin(req.usuario)) return;
  if (!(await propriedadesRepo.usuarioTemAcesso(req.usuario.id_usuario, idPropriedade))) {
    throw new ErroHttp(404, 'Propriedade não encontrada');
  }
}

router.get('/', assincrono(async (req, res) => {
  const propriedades = await propriedadesRepo.listar({ idUsuario: req.usuario.id_usuario, somenteVinculadas: !ehAdmin(req.usuario) });
  res.json({ propriedades });
}));

router.get('/:id', idValido(), assincrono(async (req, res) => {
  const idPropriedade = Number(req.params.id);
  await exigirAcesso(req, idPropriedade);
  const propriedade = await propriedadesRepo.buscarPorId(idPropriedade);
  if (!propriedade) throw new ErroHttp(404, 'Propriedade não encontrada');
  propriedade.usuarios = await propriedadesRepo.listarUsuariosVinculados(idPropriedade);
  res.json({ propriedade });
}));

router.post('/', autorizar('ADMIN'), validar(schemas.propriedadeBase), assincrono(async (req, res) => {
  const { idsUsuarios, ...dados } = req.body;
  await conferirUsuarios(idsUsuarios);
  const propriedade = await propriedadesRepo.criar(dados);
  if (idsUsuarios?.length) await propriedadesRepo.definirUsuariosVinculados(propriedade.id_propriedade, idsUsuarios);
  res.status(201).json({ propriedade });
}));

router.put('/:id', idValido(), autorizar('ADMIN'), validar(schemas.propriedadeAtualizar), assincrono(async (req, res) => {
  const idPropriedade = Number(req.params.id);
  const { idsUsuarios, ...dados } = req.body;
  await conferirUsuarios(idsUsuarios);
  const propriedade = await propriedadesRepo.atualizar(idPropriedade, dados);
  if (!propriedade) throw new ErroHttp(404, 'Propriedade não encontrada');
  if (idsUsuarios !== undefined) await propriedadesRepo.definirUsuariosVinculados(idPropriedade, idsUsuarios);
  res.json({ propriedade });
}));

router.delete('/:id', idValido(), autorizar('ADMIN'), assincrono(async (req, res) => {
  if (!(await propriedadesRepo.excluir(Number(req.params.id)))) throw new ErroHttp(404, 'Propriedade não encontrada');
  res.json({ ok: true });
}));

module.exports = router;
