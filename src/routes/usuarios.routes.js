const router = require('express').Router();
const bcrypt = require('bcryptjs');
const usuariosRepo = require('../repositorios/usuarios');
const schemas = require('../validators');
const { validar, idValido } = require('../middleware/validate');
const { autenticar, autorizar } = require('../middleware/auth');
const { assincrono, ErroHttp } = require('../utils/httpError');

router.use(autenticar, autorizar('ADMIN'));

router.get('/', assincrono(async (req, res) => {
  res.json({ usuarios: await usuariosRepo.listar({ perfil: req.query.perfil }) });
}));

router.post('/', validar(schemas.criarUsuario), assincrono(async (req, res) => {
  const { nome, email, senha, perfil } = req.body;
  if (await usuariosRepo.emailEmUso(email)) throw new ErroHttp(409, 'Já existe uma conta com esse e-mail');
  const senhaHash = await bcrypt.hash(senha, 12);
  res.status(201).json({ usuario: await usuariosRepo.criar({ nome, email, senhaHash, perfil }) });
}));

router.put('/:id', idValido(), validar(schemas.atualizarUsuario), assincrono(async (req, res) => {
  const idUsuario = Number(req.params.id);
  const existente = await usuariosRepo.buscarPorId(idUsuario);
  if (!existente) throw new ErroHttp(404, 'Usuário não encontrado');

  const ehEleMesmo = idUsuario === req.usuario.id_usuario;
  if (ehEleMesmo && ((req.body.perfil && req.body.perfil !== 'ADMIN') || req.body.ativo === false)) {
    throw new ErroHttp(400, 'Você não pode rebaixar nem desativar a sua própria conta');
  }
  if (req.body.email && (await usuariosRepo.emailEmUso(req.body.email, idUsuario))) {
    throw new ErroHttp(409, 'Já existe uma conta com esse e-mail');
  }
  res.json({ usuario: await usuariosRepo.atualizar(idUsuario, req.body) });
}));

router.delete('/:id', idValido(), assincrono(async (req, res) => {
  const idUsuario = Number(req.params.id);
  if (idUsuario === req.usuario.id_usuario) throw new ErroHttp(400, 'Você não pode excluir a sua própria conta');
  if (!(await usuariosRepo.excluir(idUsuario))) throw new ErroHttp(404, 'Usuário não encontrado');
  res.json({ ok: true });
}));

module.exports = router;
