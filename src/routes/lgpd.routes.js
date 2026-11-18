const router = require('express').Router();
const usuariosRepo = require('../repositorios/usuarios');
const propriedadesRepo = require('../repositorios/propriedades');
const setoresRepo = require('../repositorios/setores');
const sensoresRepo = require('../repositorios/sensores');
const auditoriaRepo = require('../repositorios/auditoria');
const schemas = require('../validators');
const { validar } = require('../middleware/validate');
const { autenticar } = require('../middleware/auth');
const { assincrono, ErroHttp } = require('../utils/httpError');

function ipOrigem(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (Array.isArray(forwarded)) return forwarded[0] || null;
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.ip || null;
}

router.use(autenticar);

router.get('/me/data', assincrono(async (req, res) => {
  const propriedades = await propriedadesRepo.listar({ idUsuario: req.usuario.id_usuario, somenteVinculadas: true });
  const dados = await Promise.all(propriedades.map(async (propriedade) => {
    const setores = await setoresRepo.listarPorPropriedade(propriedade.id_propriedade);
    const sensores = await sensoresRepo.listarPorPropriedade(propriedade.id_propriedade);
    return {
      propriedade,
      setores,
      sensores,
    };
  }));

  res.json({
    exportadoEm: new Date().toISOString(),
    usuario: req.usuario,
    propriedades: dados,
  });
}));

router.delete('/me', validar(schemas.accountDelete), assincrono(async (req, res) => {
  if (req.body.confirm !== true) throw new ErroHttp(400, 'Confirme a exclusão da conta com confirm: true');

  await auditoriaRepo.registrar({
    idUsuario: req.usuario.id_usuario,
    acao: 'CONTA_EXCLUIDA_PELO_TITULAR',
    sucesso: true,
    detalhe: 'Solicitação de exclusão da conta pelo titular',
    ip: ipOrigem(req),
  });

  const removido = await usuariosRepo.excluir(req.usuario.id_usuario);
  if (!removido) throw new ErroHttp(404, 'Usuário não encontrado');

  res.json({ ok: true, idUsuario: req.usuario.id_usuario });
}));

module.exports = router;
