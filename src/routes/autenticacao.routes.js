const router = require('express').Router();
const bcrypt = require('bcryptjs');
const usuariosRepo = require('../repositorios/usuarios');
const schemas = require('../validators');
const { validar } = require('../middleware/validate');
const { autenticar } = require('../middleware/auth');
const { limitadorAutenticacao } = require('../middleware/rateLimit');
const { assincrono, ErroHttp } = require('../utils/httpError');
const { assinarToken } = require('../utils/token');
const env = require('../config/env');

const HASH_FALSO = bcrypt.hashSync('senha-falsa-Xx123456', 10); 

router.post('/registrar', limitadorAutenticacao, validar(schemas.registrar), assincrono(async (req, res) => {
  if (!env.permiteCadastroPublico) throw new ErroHttp(403, 'Cadastro público desativado. Peça a um administrador.');
  const { nome, email, senha } = req.body;
  if (await usuariosRepo.emailEmUso(email)) throw new ErroHttp(409, 'Já existe uma conta com esse e-mail');
  const senhaHash = await bcrypt.hash(senha, 12);
  const usuario = await usuariosRepo.criar({ nome, email, senhaHash, perfil: 'PRODUTOR' });
  res.status(201).json({ token: assinarToken(usuario), usuario });
}));

router.post('/login', limitadorAutenticacao, validar(schemas.login), assincrono(async (req, res) => {
  const { email, senha } = req.body;
  const usuario = await usuariosRepo.buscarPorEmailComSenha(email);
  const senhaOk = await bcrypt.compare(senha, usuario ? usuario.senha_hash : HASH_FALSO);
  if (!usuario || !senhaOk || !usuario.ativo) throw new ErroHttp(401, 'E-mail ou senha incorretos');

  await usuariosRepo.registrarLogin(usuario.id_usuario);
  delete usuario.senha_hash;
  res.json({ token: assinarToken(usuario), usuario });
}));

router.get('/eu', autenticar, (req, res) => res.json({ usuario: req.usuario }));

router.post('/trocar-senha', autenticar, validar(schemas.trocarSenha), assincrono(async (req, res) => {
  const comSenha = await usuariosRepo.buscarPorEmailComSenha(req.usuario.email);
  if (!(await bcrypt.compare(req.body.senhaAtual, comSenha.senha_hash))) throw new ErroHttp(400, 'Senha atual incorreta');
  const novoHash = await bcrypt.hash(req.body.novaSenha, 12);
  await usuariosRepo.atualizarSenha(req.usuario.id_usuario, novoHash);
  res.json({ token: assinarToken(req.usuario), usuario: req.usuario });
}));

module.exports = router;
