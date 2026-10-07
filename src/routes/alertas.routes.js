const router = require('express').Router();
const alertasRepo = require('../repositorios/alertas');
const schemas = require('../validators');
const { validar, idValido } = require('../middleware/validate');
const { autenticar } = require('../middleware/auth');
const { assincrono, ErroHttp } = require('../utils/httpError');
const { ehAdmin, idsPropriedadesVisiveis } = require('../utils/acesso');

router.use(autenticar);

router.get('/', validar(schemas.consultaAlertas, 'query'), assincrono(async (req, res) => {
  const { apenasNaoLidos, limite } = req.query;
  const idsPropriedades = await idsPropriedadesVisiveis(req.usuario);
  res.json({ alertas: await alertasRepo.listar({ idsPropriedades, apenasNaoLidos, limite }) });
}));

router.patch('/:id/lido', idValido(), assincrono(async (req, res) => {
  const idAlerta = Number(req.params.id);
  const alerta = await alertasRepo.buscarPorId(idAlerta);
  if (!alerta) throw new ErroHttp(404, 'Alerta não encontrado');
  if (!ehAdmin(req.usuario)) {
    const idsPropriedades = await idsPropriedadesVisiveis(req.usuario);
    if (!idsPropriedades.includes(alerta.id_propriedade)) throw new ErroHttp(404, 'Alerta não encontrado');
  }
  await alertasRepo.marcarComoLido(idAlerta);
  res.json({ ok: true });
}));

module.exports = router;
